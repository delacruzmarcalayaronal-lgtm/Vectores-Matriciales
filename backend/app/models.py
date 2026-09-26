from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    legalName: Mapped[str] = mapped_column(String(200), default="")
    taxId: Mapped[str] = mapped_column(String(40), default="")
    address: Mapped[str] = mapped_column(String(255), default="")
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str] = mapped_column(String(50), default="")
    logo: Mapped[str | None] = mapped_column(String(255), nullable=True)
    createdAt: Mapped[str] = mapped_column(String(40), default=utcnow)
    updatedAt: Mapped[str] = mapped_column(String(40), default=utcnow)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    companyId: Mapped[str] = mapped_column(String(40), index=True)
    name: Mapped[str] = mapped_column(String(120))
    dni: Mapped[str | None] = mapped_column(String(20), nullable=True, unique=True, index=True)
    role: Mapped[str] = mapped_column(String(20), default="operator")
    avatar: Mapped[str | None] = mapped_column(Text, nullable=True)
    isActive: Mapped[bool] = mapped_column(default=True)
    passwordHash: Mapped[str | None] = mapped_column(String(200), nullable=True)
    createdAt: Mapped[str] = mapped_column(String(40), default=utcnow)
    updatedAt: Mapped[str] = mapped_column(String(40), default=utcnow)


class Branch(Base):
    __tablename__ = "branches"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    companyId: Mapped[str] = mapped_column(String(40), index=True)
    name: Mapped[str] = mapped_column(String(120))
    code: Mapped[str] = mapped_column(String(20), default="")
    address: Mapped[str] = mapped_column(String(255), default="")
    city: Mapped[str] = mapped_column(String(100), default="")
    country: Mapped[str] = mapped_column(String(100), default="")
    phone: Mapped[str] = mapped_column(String(50), default="")
    isActive: Mapped[bool] = mapped_column(default=True)
    createdAt: Mapped[str] = mapped_column(String(40), default=utcnow)
    updatedAt: Mapped[str] = mapped_column(String(40), default=utcnow)


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    companyId: Mapped[str] = mapped_column(String(40), index=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    createdAt: Mapped[str] = mapped_column(String(40), default=utcnow)
    updatedAt: Mapped[str] = mapped_column(String(40), default=utcnow)


class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    companyId: Mapped[str] = mapped_column(String(40), index=True)
    categoryId: Mapped[str] = mapped_column(String(40), default="")
    sku: Mapped[str] = mapped_column(String(40), default="")
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    unitPrice: Mapped[float] = mapped_column(Float, default=0.0)
    costPrice: Mapped[float] = mapped_column(Float, default=0.0)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    minStock: Mapped[int] = mapped_column(Integer, default=0)
    unit: Mapped[str] = mapped_column(String(30), default="unidad")
    isActive: Mapped[bool] = mapped_column(default=True)
    createdAt: Mapped[str] = mapped_column(String(40), default=utcnow)
    updatedAt: Mapped[str] = mapped_column(String(40), default=utcnow)


class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    companyId: Mapped[str] = mapped_column(String(40), index=True)
    branchId: Mapped[str] = mapped_column(String(40), index=True)
    userId: Mapped[str] = mapped_column(String(40), default="")
    saleNumber: Mapped[str] = mapped_column(String(40), default="")
    date: Mapped[str] = mapped_column(String(40), default=utcnow)
    subtotal: Mapped[float] = mapped_column(Float, default=0.0)
    tax: Mapped[float] = mapped_column(Float, default=0.0)
    total: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(20), default="confirmed")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    createdAt: Mapped[str] = mapped_column(String(40), default=utcnow)
    updatedAt: Mapped[str] = mapped_column(String(40), default=utcnow)

    details: Mapped[list["SaleDetail"]] = relationship(
        "SaleDetail",
        back_populates="sale",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class SaleDetail(Base):
    __tablename__ = "sale_details"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    saleId: Mapped[str] = mapped_column(String(40), ForeignKey("sales.id"), index=True)
    productId: Mapped[str] = mapped_column(String(40), ForeignKey("products.id"), index=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unitPrice: Mapped[float] = mapped_column(Float, default=0.0)
    discount: Mapped[float] = mapped_column(Float, default=0.0)
    subtotal: Mapped[float] = mapped_column(Float, default=0.0)

    sale: Mapped["Sale"] = relationship("Sale", back_populates="details")
    product: Mapped["Product | None"] = relationship("Product")


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    companyId: Mapped[str] = mapped_column(String(40), index=True)
    branchId: Mapped[str] = mapped_column(String(40), ForeignKey("branches.id"), index=True)
    productId: Mapped[str] = mapped_column(String(40), ForeignKey("products.id"), index=True)
    type: Mapped[str] = mapped_column(String(20), default="in")
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    reference: Mapped[str] = mapped_column(String(80), default="")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    date: Mapped[str] = mapped_column(String(40), default=utcnow)
    createdAt: Mapped[str] = mapped_column(String(40), default=utcnow)

    product: Mapped["Product | None"] = relationship("Product")
    branch: Mapped["Branch | None"] = relationship("Branch")


class Target(Base):
    __tablename__ = "targets"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    companyId: Mapped[str] = mapped_column(String(40), index=True)
    branchId: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    productId: Mapped[str | None] = mapped_column(String(40), nullable=True)
    period: Mapped[str] = mapped_column(String(20), default="")
    targetValue: Mapped[float] = mapped_column(Float, default=0.0)
    achievedValue: Mapped[float] = mapped_column(Float, default=0.0)
    type: Mapped[str] = mapped_column(String(20), default="sales")
    createdAt: Mapped[str] = mapped_column(String(40), default=utcnow)
    updatedAt: Mapped[str] = mapped_column(String(40), default=utcnow)


class Vector(Base):
    __tablename__ = "vectors"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    companyId: Mapped[str] = mapped_column(String(40), index=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    dimension: Mapped[int] = mapped_column(Integer, default=0)
    values: Mapped[list] = mapped_column(JSON, default=list)
    source: Mapped[str] = mapped_column(String(20), default="manual")
    sourceConfig: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    createdAt: Mapped[str] = mapped_column(String(40), default=utcnow)
    updatedAt: Mapped[str] = mapped_column(String(40), default=utcnow)


class Matrix(Base):
    __tablename__ = "matrices"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    companyId: Mapped[str] = mapped_column(String(40), index=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    rows: Mapped[int] = mapped_column(Integer, default=0)
    cols: Mapped[int] = mapped_column(Integer, default=0)
    values: Mapped[list] = mapped_column(JSON, default=list)
    rowLabels: Mapped[list] = mapped_column(JSON, default=list)
    colLabels: Mapped[list] = mapped_column(JSON, default=list)
    source: Mapped[str] = mapped_column(String(20), default="manual")
    sourceConfig: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    createdAt: Mapped[str] = mapped_column(String(40), default=utcnow)
    updatedAt: Mapped[str] = mapped_column(String(40), default=utcnow)


class Operation(Base):
    __tablename__ = "operations"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    companyId: Mapped[str] = mapped_column(String(40), index=True)
    userId: Mapped[str] = mapped_column(String(40), default="")
    type: Mapped[str] = mapped_column(String(40))
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    inputVectors: Mapped[list] = mapped_column(JSON, default=list)
    inputMatrices: Mapped[list] = mapped_column(JSON, default=list)
    parameters: Mapped[dict] = mapped_column(JSON, default=dict)
    resultVectorId: Mapped[str | None] = mapped_column(String(40), nullable=True)
    resultMatrixId: Mapped[str | None] = mapped_column(String(40), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="completed")
    errorMessage: Mapped[str | None] = mapped_column(Text, nullable=True)
    executionTimeMs: Mapped[float] = mapped_column(Float, default=0.0)
    createdAt: Mapped[str] = mapped_column(String(40), default=utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    companyId: Mapped[str] = mapped_column(String(40), index=True)
    userId: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    type: Mapped[str] = mapped_column(String(40), default="system")
    title: Mapped[str] = mapped_column(String(160))
    message: Mapped[str] = mapped_column(Text, default="")
    link: Mapped[str] = mapped_column(String(255), default="/dashboard")
    dedupKey: Mapped[str] = mapped_column(String(120), default="")
    createdAt: Mapped[str] = mapped_column(String(40), default=utcnow, index=True)
    updatedAt: Mapped[str] = mapped_column(String(40), default=utcnow)

    reads: Mapped[list["NotificationRead"]] = relationship(
        "NotificationRead",
        back_populates="notification",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class NotificationRead(Base):
    __tablename__ = "notification_reads"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    notificationId: Mapped[str] = mapped_column(
        String(40), ForeignKey("notifications.id"), index=True
    )
    userId: Mapped[str] = mapped_column(String(40), index=True)
    readAt: Mapped[str | None] = mapped_column(String(40), nullable=True)
    dismissedAt: Mapped[str | None] = mapped_column(String(40), nullable=True)
    createdAt: Mapped[str] = mapped_column(String(40), default=utcnow)

    notification: Mapped["Notification"] = relationship("Notification", back_populates="reads")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    companyId: Mapped[str] = mapped_column(String(40), index=True)
    userId: Mapped[str] = mapped_column(String(40), default="")
    action: Mapped[str] = mapped_column(String(40))
    module: Mapped[str] = mapped_column(String(40), default="")
    entityType: Mapped[str] = mapped_column(String(40), default="")
    entityId: Mapped[str] = mapped_column(String(40), default="")
    oldValues: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    newValues: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ipAddress: Mapped[str | None] = mapped_column(String(60), nullable=True)
    userAgent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="success")
    errorMessage: Mapped[str | None] = mapped_column(Text, nullable=True)
    createdAt: Mapped[str] = mapped_column(String(40), default=utcnow, index=True)
