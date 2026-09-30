from __future__ import annotations

from sqlalchemy import JSON, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

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

    inputRows: Mapped[list[OperationInput]] = relationship(
        back_populates="operation",
        order_by=lambda: OperationInput.position.asc(),
        cascade="all, delete-orphan",
        lazy="selectin",
        foreign_keys="[OperationInput.operationId]",
    )
    resultRows: Mapped[list[OperationResult]] = relationship(
        back_populates="operation",
        cascade="all, delete-orphan",
        lazy="selectin",
        foreign_keys="[OperationResult.operationId]",
    )


class OperationInput(Base):
    __tablename__ = "operation_inputs"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    operationId: Mapped[str] = mapped_column(String(40), ForeignKey("operations.id"), index=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    kind: Mapped[str] = mapped_column(String(20), default="vector")
    refId: Mapped[str] = mapped_column(String(40), default="")
    label: Mapped[str] = mapped_column(String(160), default="")
    values: Mapped[list] = mapped_column(JSON, default=list)
    createdAt: Mapped[str] = mapped_column(String(40), default=utcnow)

    operation: Mapped[Operation] = relationship(
        back_populates="inputRows", foreign_keys="[OperationInput.operationId]"
    )


class OperationResult(Base):
    __tablename__ = "operation_results"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    operationId: Mapped[str] = mapped_column(String(40), ForeignKey("operations.id"), index=True)
    kind: Mapped[str] = mapped_column(String(20), default="vector")
    refId: Mapped[str | None] = mapped_column(String(40), nullable=True)
    values: Mapped[list] = mapped_column(JSON, default=list)
    createdAt: Mapped[str] = mapped_column(String(40), default=utcnow)

    operation: Mapped[Operation] = relationship(
        back_populates="resultRows", foreign_keys="[OperationResult.operationId]"
    )
