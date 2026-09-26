from __future__ import annotations

from sqlalchemy import Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, utcnow


class WorkerLocation(Base):
    """Registro GPS de un trabajador (índice compuesto worker_id + recorded_at)."""

    __tablename__ = "worker_locations"
    __table_args__ = (
        Index("ix_worker_locations_worker_recorded", "workerId", "recordedAt"),
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    workerId: Mapped[str] = mapped_column(String(40), ForeignKey("workers.id"), index=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
    speed: Mapped[float | None] = mapped_column(Float, nullable=True)
    heading: Mapped[float | None] = mapped_column(Float, nullable=True)
    batteryLevel: Mapped[int | None] = mapped_column(Integer, nullable=True)
    isWithinGeofence: Mapped[bool] = mapped_column(default=True)
    recordedAt: Mapped[str] = mapped_column(String(40), default=utcnow, index=True)
    createdAt: Mapped[str] = mapped_column(String(40), default=utcnow)

    worker = relationship("Worker", lazy="selectin")


class ConsentLog(Base):
    """Log de consentimiento (Ley 29733 - Protección de Datos Personales, Perú)."""

    __tablename__ = "consent_logs"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    workerId: Mapped[str] = mapped_column(String(40), ForeignKey("workers.id"), index=True)
    consentStatus: Mapped[str] = mapped_column(String(20))
    consentVersion: Mapped[str] = mapped_column(String(20), default="v1")
    ipAddress: Mapped[str | None] = mapped_column(String(45), nullable=True)
    userAgent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    consentedAt: Mapped[str] = mapped_column(String(40), default=utcnow, index=True)
