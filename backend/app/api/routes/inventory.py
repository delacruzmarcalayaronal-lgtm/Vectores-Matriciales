from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.deps import ensure_company, get_current_user, require_roles
from ...core.database import get_db
from ...models import Branch, InventoryMovement, Product, User, utcnow
from ...schemas import InventoryMovementOut, InventoryMovementUpsert
from ...services.audit import record_audit
from ...services.stock import apply_movement_to_stock, branch_stock
from ..helpers import get_or_404, new_id

router = APIRouter(tags=["inventory"])

INVENTORY_ROLES = ("admin", "manager", "operator")


@router.get("/companies/{company_id}/inventory/movements", response_model=list[InventoryMovementOut])
def list_movements(
    company_id: str,
    branchId: str | None = Query(default=None),
    productId: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[InventoryMovementOut]:
    ensure_company(user, company_id)
    query = select(InventoryMovement).where(InventoryMovement.companyId == company_id)
    if branchId:
        query = query.where(InventoryMovement.branchId == branchId)
    if productId:
        query = query.where(InventoryMovement.productId == productId)
    query = query.order_by(InventoryMovement.date.desc(), InventoryMovement.createdAt.desc())
    movements = db.scalars(query).all()
    return [InventoryMovementOut.model_validate(m) for m in movements]


@router.post(
    "/companies/{company_id}/inventory/movements",
    response_model=InventoryMovementOut,
    status_code=201,
)
def create_movement(
    company_id: str,
    body: InventoryMovementUpsert,
    request: Request,
    user: User = Depends(require_roles(*INVENTORY_ROLES)),
    db: Session = Depends(get_db),
) -> InventoryMovementOut:
    ensure_company(user, company_id)
    changes = body.model_dump(exclude_unset=True)
    branch_id = changes.get("branchId")
    product_id = changes.get("productId")
    movement_type = changes.get("type") or "in"
    quantity = changes.get("quantity")
    if not branch_id:
        raise HTTPException(status_code=400, detail="Selecciona una sede")
    if not product_id:
        raise HTTPException(status_code=400, detail="Selecciona un producto")
    if quantity is None:
        raise HTTPException(status_code=400, detail="Indica la cantidad")
    branch = get_or_404(db, Branch, branch_id, "Sede")
    if branch.companyId != company_id:
        raise HTTPException(status_code=400, detail="Sede no autorizada")
    product = get_or_404(db, Product, product_id, "Producto")
    if product.companyId != company_id:
        raise HTTPException(status_code=400, detail="Producto no autorizado")

    movement = InventoryMovement(
        id=new_id(),
        companyId=company_id,
        branchId=branch_id,
        productId=product_id,
        type=movement_type,
        quantity=int(quantity),
        reference=changes.get("reference") or "",
        notes=changes.get("notes"),
        date=changes.get("date") or utcnow(),
    )
    db.add(movement)
    apply_movement_to_stock(product, movement_type, int(quantity))
    record_audit(
        db, user, action="create", module="inventario",
        entity_type="inventory_movement", entity_id=movement.id,
        new_values={"type": movement_type, "quantity": quantity, "productId": product_id},
        request=request,
    )
    db.commit()
    db.refresh(movement)
    return InventoryMovementOut.model_validate(movement)


@router.get("/companies/{company_id}/branches/{branch_id}/inventory/stock")
def get_stock(
    company_id: str,
    branch_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    ensure_company(user, company_id)
    branch = get_or_404(db, Branch, branch_id, "Sede")
    if branch.companyId != company_id:
        raise HTTPException(status_code=400, detail="Sede no autorizada")
    return branch_stock(db, company_id, branch_id)
