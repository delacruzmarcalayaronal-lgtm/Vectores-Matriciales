from __future__ import annotations

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, utcnow


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
