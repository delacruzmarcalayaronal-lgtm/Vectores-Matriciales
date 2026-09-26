from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, utcnow


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
