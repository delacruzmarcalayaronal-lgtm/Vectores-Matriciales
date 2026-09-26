from __future__ import annotations

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, utcnow


class Worker(Base):
    """Perfil de trabajador para el módulo de rastreo (1 a 1 con User)."""

    __tablename__ = "workers"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    userId: Mapped[str] = mapped_column(String(40), ForeignKey("users.id"), unique=True, index=True)
    employeeCode: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    position: Mapped[str] = mapped_column(String(100), default="")
    department: Mapped[str] = mapped_column(String(100), default="")
    hireDate: Mapped[str | None] = mapped_column(String(40), nullable=True)
    isActive: Mapped[bool] = mapped_column(default=True)
    createdAt: Mapped[str] = mapped_column(String(40), default=utcnow)

    user = relationship("User", lazy="selectin")
