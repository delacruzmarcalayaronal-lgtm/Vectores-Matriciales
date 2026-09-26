from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, utcnow


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
