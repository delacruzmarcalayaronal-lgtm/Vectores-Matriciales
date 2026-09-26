from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict

from .branch import BranchOut
from .product import ProductOut


class InventoryMovementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    companyId: str
    branchId: str
    productId: str
    type: Literal["in", "out", "adjustment", "transfer"]
    quantity: int
    reference: str
    notes: str | None = None
    date: str
    createdAt: str
    product: ProductOut | None = None
    branch: BranchOut | None = None


class InventoryMovementUpsert(BaseModel):
    branchId: str | None = None
    productId: str | None = None
    type: Literal["in", "out", "adjustment", "transfer"] | None = None
    quantity: int | None = None
    reference: str | None = None
    notes: str | None = None
    date: str | None = None
