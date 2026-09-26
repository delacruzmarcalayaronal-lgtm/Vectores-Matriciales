from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict

from .product import ProductOut


class SaleDetailUpsert(BaseModel):
    productId: str | None = None
    quantity: int | None = None
    unitPrice: float | None = None
    discount: float | None = None
    subtotal: float | None = None


class SaleDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    saleId: str
    productId: str
    quantity: int
    unitPrice: float
    discount: float
    subtotal: float
    product: ProductOut | None = None


class SaleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    companyId: str
    branchId: str
    userId: str
    saleNumber: str
    date: str
    subtotal: float
    tax: float
    total: float
    status: Literal["draft", "confirmed", "cancelled"]
    notes: str | None = None
    createdAt: str
    updatedAt: str
    details: list[SaleDetailOut] = []


class SaleUpsert(BaseModel):
    branchId: str | None = None
    userId: str | None = None
    saleNumber: str | None = None
    date: str | None = None
    subtotal: float | None = None
    tax: float | None = None
    total: float | None = None
    status: Literal["draft", "confirmed", "cancelled"] | None = None
    notes: str | None = None
    details: list[SaleDetailUpsert] | None = None
