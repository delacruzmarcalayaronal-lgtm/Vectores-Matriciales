from __future__ import annotations

from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, utcnow


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
