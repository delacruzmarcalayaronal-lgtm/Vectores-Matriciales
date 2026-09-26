from __future__ import annotations

from sqlalchemy import JSON, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, utcnow


class Operation(Base):
    __tablename__ = "operations"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    companyId: Mapped[str] = mapped_column(String(40), index=True)
    userId: Mapped[str] = mapped_column(String(40), default="")
    type: Mapped[str] = mapped_column(String(40))
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    inputVectors: Mapped[list] = mapped_column(JSON, default=list)
    inputMatrices: Mapped[list] = mapped_column(JSON, default=list)
    parameters: Mapped[dict] = mapped_column(JSON, default=dict)
    resultVectorId: Mapped[str | None] = mapped_column(String(40), nullable=True)
    resultMatrixId: Mapped[str | None] = mapped_column(String(40), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="completed")
    errorMessage: Mapped[str | None] = mapped_column(Text, nullable=True)
    executionTimeMs: Mapped[float] = mapped_column(Float, default=0.0)
    createdAt: Mapped[str] = mapped_column(String(40), default=utcnow)
