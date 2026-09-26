from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.deps import ensure_company, get_current_user
from ...core.database import get_db
from ...models import Branch, InventoryMovement, Operation, Product, Sale, Target, User
from ...schemas import (
    BranchOut,
    DashboardStatsOut,
    InventoryMovementOut,
    InventoryRotationOut,
    OperationOut,
    ProductOut,
    SalesByBranchOut,
    SaleOut,
    TargetComplianceOut,
    TargetOut,
    TopSellingProductOut,
)

router = APIRouter(tags=["reports"])


def _active_sales(
    db: Session, company_id: str, start: str | None = None, end: str | None = None
) -> list[Sale]:
    query = select(Sale).where(Sale.companyId == company_id, Sale.status != "cancelled")
    if start:
        query = query.where(Sale.date >= start)
    if end:
        end_value = f"{end}T23:59:59" if len(end) == 10 else end
        query = query.where(Sale.date <= end_value)
    query = query.order_by(Sale.date.desc())
    return list(db.scalars(query).all())


def _units_by_product(sales: list[Sale]) -> dict[str, dict[str, float]]:
    totals: dict[str, dict[str, float]] = {}
    for sale in sales:
        if sale.status != "confirmed":
            continue
        for detail in sale.details:
            entry = totals.setdefault(detail.productId, {"quantity": 0, "revenue": 0.0})
            entry["quantity"] += detail.quantity
            entry["revenue"] += detail.subtotal
    return totals


@router.get("/companies/{company_id}/reports/dashboard", response_model=DashboardStatsOut)
def dashboard(
    company_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DashboardStatsOut:
    ensure_company(user, company_id)
    branches = {b.id: b for b in db.scalars(select(Branch).where(Branch.companyId == company_id))}
    products = {p.id: p for p in db.scalars(select(Product).where(Product.companyId == company_id))}

    confirmed = [s for s in _active_sales(db, company_id) if s.status == "confirmed"]
    total_revenue = round(sum(s.total for s in confirmed), 2)
    low_stock = sum(1 for p in products.values() if p.stock <= p.minStock)

    units = _units_by_product(confirmed)
    top_entries = sorted(units.items(), key=lambda kv: kv[1]["revenue"], reverse=True)[:5]
    top_products = [
        TopSellingProductOut(
            product=ProductOut.model_validate(products[pid]),
            quantity=entry["quantity"],
            revenue=round(entry["revenue"], 2),
        )
        for pid, entry in top_entries
        if pid in products
    ]

    by_branch: dict[str, dict[str, float]] = {}
    for sale in confirmed:
        entry = by_branch.setdefault(sale.branchId, {"revenue": 0.0, "quantity": 0})
        entry["revenue"] += sale.total
        entry["quantity"] += sum(d.quantity for d in sale.details)
    sales_by_branch = [
        SalesByBranchOut(
            branch=BranchOut.model_validate(branches[bid]),
            revenue=round(entry["revenue"], 2),
            quantity=entry["quantity"],
        )
        for bid, entry in by_branch.items()
        if bid in branches
    ]

    recent_sales = db.scalars(
        select(Sale)
        .where(Sale.companyId == company_id, Sale.status != "cancelled")
        .order_by(Sale.createdAt.desc())
        .limit(5)
    ).all()
    recent_movements = db.scalars(
        select(InventoryMovement)
        .where(InventoryMovement.companyId == company_id)
        .order_by(InventoryMovement.createdAt.desc())
        .limit(5)
    ).all()

    return DashboardStatsOut(
        totalSales=len(confirmed),
        totalRevenue=total_revenue,
        totalProducts=len(products),
        lowStockProducts=low_stock,
        topSellingProducts=top_products,
        salesByBranch=sales_by_branch,
        recentSales=[SaleOut.model_validate(s) for s in recent_sales],
        recentMovements=[InventoryMovementOut.model_validate(m) for m in recent_movements],
    )


@router.get(
    "/companies/{company_id}/reports/sales-by-branch",
    response_model=list[SalesByBranchOut],
)
def sales_by_branch(
    company_id: str,
    startDate: str | None = Query(default=None),
    endDate: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SalesByBranchOut]:
    ensure_company(user, company_id)
    branches = db.scalars(
        select(Branch).where(Branch.companyId == company_id).order_by(Branch.name)
    ).all()
    sales = [s for s in _active_sales(db, company_id, startDate, endDate) if s.status == "confirmed"]

    by_branch: dict[str, dict[str, float]] = {}
    for sale in sales:
        entry = by_branch.setdefault(sale.branchId, {"revenue": 0.0, "quantity": 0})
        entry["revenue"] += sale.total
        entry["quantity"] += sum(d.quantity for d in sale.details)

    return [
        SalesByBranchOut(
            branch=BranchOut.model_validate(branch),
            revenue=round(by_branch.get(branch.id, {}).get("revenue", 0.0), 2),
            quantity=int(by_branch.get(branch.id, {}).get("quantity", 0)),
        )
        for branch in branches
    ]


@router.get(
    "/companies/{company_id}/reports/sales-by-product",
    response_model=list[TopSellingProductOut],
)
def sales_by_product(
    company_id: str,
    startDate: str | None = Query(default=None),
    endDate: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TopSellingProductOut]:
    ensure_company(user, company_id)
    products = {p.id: p for p in db.scalars(select(Product).where(Product.companyId == company_id))}
    sales = _active_sales(db, company_id, startDate, endDate)
    units = _units_by_product(sales)
    ranked = sorted(units.items(), key=lambda kv: kv[1]["revenue"], reverse=True)[:50]
    return [
        TopSellingProductOut(
            product=ProductOut.model_validate(products[pid]),
            quantity=entry["quantity"],
            revenue=round(entry["revenue"], 2),
        )
        for pid, entry in ranked
        if pid in products
    ]


@router.get(
    "/companies/{company_id}/reports/target-compliance",
    response_model=list[TargetComplianceOut],
)
def target_compliance(
    company_id: str,
    startDate: str | None = Query(default=None),
    endDate: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TargetComplianceOut]:
    ensure_company(user, company_id)
    targets = db.scalars(
        select(Target).where(Target.companyId == company_id).order_by(Target.period.desc())
    ).all()
    results = []
    for target in targets:
        compliance = (target.achievedValue / target.targetValue) * 100 if target.targetValue else 0.0
        results.append(
            TargetComplianceOut(
                target=TargetOut.model_validate(target),
                compliance=round(compliance, 1),
            )
        )
    return results


@router.get(
    "/companies/{company_id}/reports/inventory-rotation",
    response_model=list[InventoryRotationOut],
)
def inventory_rotation(
    company_id: str,
    branchId: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[InventoryRotationOut]:
    ensure_company(user, company_id)
    products = db.scalars(
        select(Product).where(Product.companyId == company_id, Product.isActive.is_(True)).order_by(Product.name)
    ).all()
    sales = [s for s in _active_sales(db, company_id) if s.status == "confirmed"]
    if branchId:
        sales = [s for s in sales if s.branchId == branchId]
    units = _units_by_product(sales)

    results = []
    for product in products:
        sold = units.get(product.id, {}).get("quantity", 0.0)
        avg_stock = (product.stock + sold) / 2
        rotation = round(sold / avg_stock, 2) if avg_stock > 0 else 0.0
        daily_rate = sold / 30
        days_of_stock = round(product.stock / daily_rate) if daily_rate > 0 else 999
        results.append(
            InventoryRotationOut(
                product=ProductOut.model_validate(product),
                rotation=rotation,
                daysOfStock=days_of_stock,
            )
        )
    return results


@router.get(
    "/companies/{company_id}/reports/operations",
    response_model=list[OperationOut],
)
def operation_results(
    company_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[OperationOut]:
    ensure_company(user, company_id)
    operations = db.scalars(
        select(Operation)
        .where(Operation.companyId == company_id, Operation.status == "completed")
        .order_by(Operation.createdAt.desc())
    ).all()
    return [OperationOut.model_validate(o) for o in operations]
