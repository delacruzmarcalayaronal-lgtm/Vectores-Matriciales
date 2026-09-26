from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    companyId: str
    categoryId: str
    sku: str
    name: str
    description: str
    unitPrice: float
    costPrice: float
    stock: int
    minStock: int
    unit: str
    isActive: bool
    createdAt: str
    updatedAt: str


class ProductUpsert(BaseModel):
    categoryId: str | None = None
    sku: str | None = None
    name: str | None = None
    description: str | None = None
    unitPrice: float | None = None
    costPrice: float | None = None
    stock: int | None = None
    minStock: int | None = None
    unit: str | None = None
    isActive: bool | None = None
