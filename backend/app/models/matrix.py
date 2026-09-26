from __future__ import annotations

from sqlalchemy import JSON, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, utcnow


class Matrix(Base):
    __tablename__ = "matrices"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    companyId: Mapped[str] = mapped_column(String(40), index=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    rows: Mapped[int] = mapped_column(Integer, default=0)
    cols: Mapped[int] = mapped_column(Integer, default=0)
    values: Mapped[list] = mapped_column(JSON, default=list)
    rowLabels: Mapped[list] = mapped_column(JSON, default=list)
    colLabels: Mapped[list] = mapped_column(JSON, default=list)
    source: Mapped[str] = mapped_column(String(20), default="manual")
    sourceConfig: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    createdAt: Mapped[str] = mapped_column(String(40), default=utcnow)
    updatedAt: Mapped[str] = mapped_column(String(40), default=utcnow)
