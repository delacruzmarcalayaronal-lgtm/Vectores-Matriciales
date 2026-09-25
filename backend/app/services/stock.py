from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import InventoryMovement, Product


def apply_movement_to_stock(product: Product, movement_type: str, quantity: int) -> None:
    if movement_type in ("in", "adjustment"):
        product.stock = max(0, product.stock + quantity)
    elif movement_type in ("out", "transfer"):
        product.stock = max(0, product.stock - quantity)
    product.updatedAt = _utcnow()


def _utcnow() -> str:
    from ..models import utcnow

    return utcnow()


def branch_stock(db: Session, company_id: str, branch_id: str) -> dict[str, int]:
    products = db.scalars(
        select(Product).where(Product.companyId == company_id, Product.isActive.is_(True))
    ).all()
    movements = db.scalars(
        select(InventoryMovement).where(
            InventoryMovement.companyId == company_id,
            InventoryMovement.branchId == branch_id,
        )
    ).all()

    balances: dict[str, int] = {}
    total_by_product: dict[str, int] = {}
    for movement in movements:
        delta = movement.quantity
        if movement.type in ("out", "transfer"):
            delta = -movement.quantity
        balances[movement.productId] = balances.get(movement.productId, 0) + delta
        total_by_product[movement.productId] = total_by_product.get(movement.productId, 0) + 1

    result: dict[str, int] = {}
    for product in products:
        if total_by_product.get(product.id, 0) > 0:
            result[product.id] = balances.get(product.id, 0)
        else:
            result[product.id] = product.stock
    return result
