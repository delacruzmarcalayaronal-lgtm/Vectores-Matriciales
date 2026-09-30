from __future__ import annotations

from uuid import uuid4

from sqlalchemy import JSON, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, utcnow


class Vector(Base):
    __tablename__ = "vectors"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    companyId: Mapped[str] = mapped_column(String(40), index=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    dimension: Mapped[int] = mapped_column(Integer, default=0)
    valuesJson: Mapped[list] = mapped_column("values", JSON, default=list)
    source: Mapped[str] = mapped_column(String(20), default="manual")
    sourceConfig: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    createdAt: Mapped[str] = mapped_column(String(40), default=utcnow)
    updatedAt: Mapped[str] = mapped_column(String(40), default=utcnow)

    valueRows: Mapped[list[VectorValue]] = relationship(
        back_populates="vector",
        order_by=lambda: VectorValue.position.asc(),
        cascade="all, delete-orphan",
        lazy="selectin",
        foreign_keys="[VectorValue.vectorId]",
    )

    @property
    def values(self) -> list[float]:
        if self.valueRows:
            return [row.value for row in self.valueRows]
        return [float(x) for x in (self.valuesJson or [])]

    @values.setter
    def values(self, raw: list) -> None:
        values = [float(x) for x in raw]
        self.valuesJson = values
        self.valueRows = [
            VectorValue(id=uuid4().hex, position=index, value=value)
            for index, value in enumerate(values)
        ]


class VectorValue(Base):
    __tablename__ = "vector_values"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    vectorId: Mapped[str] = mapped_column(String(40), ForeignKey("vectors.id"), index=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    value: Mapped[float] = mapped_column(Float, default=0.0)

    vector: Mapped[Vector] = relationship(
        back_populates="valueRows", foreign_keys="[VectorValue.vectorId]"
    )
