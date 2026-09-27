from __future__ import annotations

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, utcnow


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    companyId: Mapped[str] = mapped_column(String(40), index=True)
    name: Mapped[str] = mapped_column(String(120))
    dni: Mapped[str | None] = mapped_column(String(20), nullable=True, unique=True, index=True)
    role: Mapped[str] = mapped_column(String(20), default="operator")
    avatar: Mapped[str | None] = mapped_column(Text, nullable=True)
    isActive: Mapped[bool] = mapped_column(default=True)
    trackingEnabled: Mapped[bool] = mapped_column(default=True)
    passwordHash: Mapped[str | None] = mapped_column(String(200), nullable=True)
    faceTemplate: Mapped[str | None] = mapped_column(Text, nullable=True)
    facePoints: Mapped[int | None] = mapped_column(Integer, nullable=True)
    faceThreshold: Mapped[int | None] = mapped_column(Integer, nullable=True)
    faceRegisteredAt: Mapped[str | None] = mapped_column(String(40), nullable=True)
    createdAt: Mapped[str] = mapped_column(String(40), default=utcnow)
    updatedAt: Mapped[str] = mapped_column(String(40), default=utcnow)

    @property
    def faceRegistered(self) -> bool:
        return self.faceTemplate is not None
