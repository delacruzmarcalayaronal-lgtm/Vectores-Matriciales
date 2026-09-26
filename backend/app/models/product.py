from __future__ import annotations

from sqlalchemy import Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, utcnow


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
