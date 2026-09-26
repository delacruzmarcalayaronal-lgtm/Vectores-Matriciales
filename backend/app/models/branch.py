from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, utcnow


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
