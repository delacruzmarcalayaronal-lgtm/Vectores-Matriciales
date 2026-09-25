from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.deps import ensure_company, require_roles
from ...db import get_db
from ...models import Branch, InventoryMovement, Product, Sale, SaleDetail, User, utcnow
from ...schemas import Page, SaleOut, SaleUpsert
from ...services.audit import record_audit
from ...services.stock import apply_movement_to_stock
from ..helpers import apply_changes, get_or_404, new_id

router = APIRouter(tags=["sales"])

TAX_RATE = 0.18
SALES_ROLES = ("admin", "manager", "operator")


def _next_sale_number(db: Session, company_id: str) -> str:
    numbers = db.scalars(select(Sale.saleNumber).where(Sale.companyId == company_id)).all()
    max_n = 0
    for number in numbers:
        if number and number.startswith("V-"):
            try:
                max_n = max(max_n, int(number.split("-", 1)[1]))
            except ValueError:
                continue
    return f"V-{max_n + 1:04d}"


def _compute_totals(details: list[dict]) -> tuple[float, float, float]:
    subtotal = 0.0
    rows: list[dict] = []
    for detail in details:
        quantity = int(detail.get("quantity") or 1)
        unit_price = float(detail.get("unitPrice") or 0.0)
        discount = float(detail.get("discount") or 0.0)
        line = round(quantity * unit_price - discount, 2)
        rows.append(
            {
                "productId": detail.get("productId"),
                "quantity": quantity,
                "unitPrice": unit_price,
                "discount": discount,
                "subtotal": line,
            }
        )
        subtotal += line
    subtotal = round(subtotal, 2)
    tax = round(subtotal * TAX_RATE, 2)
    return subtotal, tax, round(subtotal + tax, 2), rows


@router.get("/companies/{company_id}/sales", response_model=Page[SaleOut])
def list_sales(
    company_id: str,
    branchId: str | None = Query(default=None),
    startDate: str | None = Query(default=None),
    endDate: str | None = Query(default=None),
    page: int | None = Query(default=None, ge=1),
    pageSize: int | None = Query(default=None, ge=1),
    user: User = Depends(require_roles(*SALES_ROLES)),
    db: Session = Depends(get_db),
) -> Page[SaleOut]:
    ensure_company(user, company_id)
    query = select(Sale).where(Sale.companyId == company_id)
    if branchId:
        query = query.where(Sale.branchId == branchId)
    if startDate:
        query = query.where(Sale.date >= startDate)
    if endDate:
        end = f"{endDate}T23:59:59" if len(endDate) == 10 else endDate
        query = query.where(Sale.date <= end)
    query = query.order_by(Sale.date.desc(), Sale.createdAt.desc())
    rows = list(db.scalars(query).all())
    total = len(rows)
    if page is not None:
        size = pageSize or 20
        rows = rows[(page - 1) * size : (page - 1) * size + size]
    return Page[SaleOut](data=[SaleOut.model_validate(s) for s in rows], total=total)


@router.post("/companies/{company_id}/sales", response_model=SaleOut, status_code=201)
def create_sale(
    company_id: str,
    body: SaleUpsert,
    request: Request,
    user: User = Depends(require_roles(*SALES_ROLES)),
    db: Session = Depends(get_db),
) -> SaleOut:
    ensure_company(user, company_id)
    changes = body.model_dump(exclude_unset=True)
    detail_inputs = changes.pop("details", None)

    branch_id = changes.get("branchId")
    if not branch_id:
        raise HTTPException(status_code=400, detail="Selecciona una sede")
    branch = get_or_404(db, Branch, branch_id, "Sede")
    if branch.companyId != company_id:
        raise HTTPException(status_code=400, detail="Sede no autorizada")

    status_value = changes.get("status") or "confirmed"
    sale = Sale(
        id=new_id(),
        companyId=company_id,
        branchId=branch_id,
        userId=changes.get("userId") or user.id,
        saleNumber=changes.get("saleNumber") or _next_sale_number(db, company_id),
        date=changes.get("date") or utcnow(),
        status=status_value,
        notes=changes.get("notes"),
    )

    if detail_inputs is not None:
        details_payload = []
        for detail in detail_inputs:
            product_id = detail.get("productId")
            if not product_id:
                raise HTTPException(status_code=400, detail="Cada detalle requiere un producto")
            product = get_or_404(db, Product, product_id, "Producto")
            if product.companyId != company_id:
                raise HTTPException(status_code=400, detail="Producto no autorizado")
            if detail.get("unitPrice") is None:
                detail["unitPrice"] = product.unitPrice
            details_payload.append({**detail, "productId": product_id})
        subtotal, tax, total, rows = _compute_totals(details_payload)
        sale.subtotal = subtotal
        sale.tax = tax
        sale.total = total
        for row in rows:
            db.add(SaleDetail(id=new_id(), saleId=sale.id, **row))
            if status_value == "confirmed":
                product = db.get(Product, row["productId"])
                if product is not None:
                    apply_movement_to_stock(product, "out", row["quantity"])
                    db.add(
                        InventoryMovement(
                            id=new_id(),
                            companyId=company_id,
                            branchId=branch_id,
                            productId=row["productId"],
                            type="out",
                            quantity=row["quantity"],
                            reference=sale.saleNumber,
                            notes="Venta registrada",
                            date=sale.date,
                        )
                    )
    else:
        sale.subtotal = float(changes.get("subtotal") or 0.0)
        sale.tax = float(changes.get("tax") or 0.0)
        sale.total = float(changes.get("total") or 0.0)

    db.add(sale)
    record_audit(
        db, user, action="create", module="ventas",
        entity_type="sale", entity_id=sale.id,
        new_values={"saleNumber": sale.saleNumber, "total": sale.total}, request=request,
    )
    db.commit()
    db.refresh(sale)
    return SaleOut.model_validate(sale)


@router.get("/sales/{sale_id}", response_model=SaleOut)
def get_sale(
    sale_id: str,
    user: User = Depends(require_roles(*SALES_ROLES)),
    db: Session = Depends(get_db),
) -> SaleOut:
    sale = get_or_404(db, Sale, sale_id, "Venta")
    ensure_company(user, sale.companyId)
    return SaleOut.model_validate(sale)


@router.put("/sales/{sale_id}", response_model=SaleOut)
def update_sale(
    sale_id: str,
    body: SaleUpsert,
    request: Request,
    user: User = Depends(require_roles(*SALES_ROLES)),
    db: Session = Depends(get_db),
) -> SaleOut:
    sale = get_or_404(db, Sale, sale_id, "Venta")
    ensure_company(user, sale.companyId)
    changes = body.model_dump(exclude_unset=True)
    detail_inputs = changes.pop("details", None)

    if detail_inputs is not None:
        for existing in list(sale.details):
            db.delete(existing)
        db.flush()
        details_payload = []
        for detail in detail_inputs:
            product_id = detail.get("productId")
            if not product_id:
                raise HTTPException(status_code=400, detail="Cada detalle requiere un producto")
            get_or_404(db, Product, product_id, "Producto")
            if detail.get("unitPrice") is None:
                detail["unitPrice"] = db.get(Product, product_id).unitPrice
            details_payload.append({**detail, "productId": product_id})
        subtotal, tax, total, rows = _compute_totals(details_payload)
        changes["subtotal"] = subtotal
        changes["tax"] = tax
        changes["total"] = total
        for row in rows:
            db.add(SaleDetail(id=new_id(), saleId=sale.id, **row))

    apply_changes(sale, changes)
    record_audit(
        db, user, action="update", module="ventas",
        entity_type="sale", entity_id=sale.id, new_values=changes, request=request,
    )
    db.commit()
    db.refresh(sale)
    return SaleOut.model_validate(sale)


@router.delete("/sales/{sale_id}", status_code=200)
def delete_sale(
    sale_id: str,
    request: Request,
    user: User = Depends(require_roles(*SALES_ROLES)),
    db: Session = Depends(get_db),
) -> dict:
    sale = get_or_404(db, Sale, sale_id, "Venta")
    ensure_company(user, sale.companyId)
    record_audit(
        db, user, action="delete", module="ventas",
        entity_type="sale", entity_id=sale.id,
        old_values={"saleNumber": sale.saleNumber, "total": sale.total}, request=request,
    )
    db.delete(sale)
    db.commit()
    return {"message": "Venta eliminada"}
