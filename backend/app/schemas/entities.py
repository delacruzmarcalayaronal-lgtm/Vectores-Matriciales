from __future__ import annotations

from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    data: list[T]
    total: int


class CompanyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    legalName: str
    taxId: str
    address: str
    city: str | None = None
    country: str | None = None
    phone: str
    email: str
    logo: str | None = None
    createdAt: str
    updatedAt: str


class CompanyUpsert(BaseModel):
    name: str | None = None
    legalName: str | None = None
    taxId: str | None = None
    address: str | None = None
    city: str | None = None
    country: str | None = None
    phone: str | None = None
    email: str | None = None
    logo: str | None = None


class BranchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    companyId: str
    name: str
    code: str
    address: str
    city: str
    country: str
    phone: str
    email: str
    isActive: bool
    createdAt: str
    updatedAt: str


class BranchUpsert(BaseModel):
    name: str | None = None
    code: str | None = None
    address: str | None = None
    city: str | None = None
    country: str | None = None
    phone: str | None = None
    email: str | None = None
    isActive: bool | None = None


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    companyId: str
    name: str
    description: str
    createdAt: str
    updatedAt: str


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


class TargetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    companyId: str
    branchId: str | None = None
    productId: str | None = None
    period: str
    targetValue: float
    achievedValue: float
    type: Literal["sales", "units", "revenue"]
    createdAt: str
    updatedAt: str


class TargetUpsert(BaseModel):
    branchId: str | None = None
    productId: str | None = None
    period: str | None = None
    targetValue: float | None = None
    achievedValue: float | None = None
    type: Literal["sales", "units", "revenue"] | None = None


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    companyId: str
    userId: str
    action: str
    module: str
    entityType: str
    entityId: str
    oldValues: dict | None = None
    newValues: dict | None = None
    ipAddress: str | None = None
    userAgent: str | None = None
    status: Literal["success", "failure"]
    errorMessage: str | None = None
    createdAt: str
