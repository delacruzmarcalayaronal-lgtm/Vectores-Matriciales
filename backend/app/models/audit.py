from __future__ import annotations

from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, utcnow


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
