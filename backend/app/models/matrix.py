from __future__ import annotations

from uuid import uuid4

from sqlalchemy import JSON, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, utcnow


class Matrix(Base):
    __tablename__ = "matrices"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    companyId: Mapped[str] = mapped_column(String(40), index=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    rows: Mapped[int] = mapped_column(Integer, default=0)
    cols: Mapped[int] = mapped_column(Integer, default=0)
    valuesJson: Mapped[list] = mapped_column("values", JSON, default=list)
    rowLabels: Mapped[list] = mapped_column(JSON, default=list)
    colLabels: Mapped[list] = mapped_column(JSON, default=list)
    source: Mapped[str] = mapped_column(String(20), default="manual")
    sourceConfig: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    createdAt: Mapped[str] = mapped_column(String(40), default=utcnow)
    updatedAt: Mapped[str] = mapped_column(String(40), default=utcnow)

    valueRows: Mapped[list[MatrixValue]] = relationship(
        back_populates="matrix",
        order_by=lambda: (MatrixValue.row.asc(), MatrixValue.col.asc()),
        cascade="all, delete-orphan",
        lazy="selectin",
        foreign_keys="[MatrixValue.matrixId]",
    )

    @property
    def values(self) -> list[list[float]]:
        if not self.valueRows:
            return [list(row) for row in (self.valuesJson or [])]
        grid = [[0.0 for _ in range(self.cols or 0)] for _ in range(self.rows or 0)]
        for cell in self.valueRows:
            if 0 <= cell.row < len(grid) and 0 <= cell.col < len(grid[cell.row]):
                grid[cell.row][cell.col] = cell.value
        return grid

    @values.setter
    def values(self, raw: list) -> None:
        grid = [[float(x) for x in row] for row in raw]
        self.valuesJson = grid
        rows: list[MatrixValue] = []
        for row_index, row in enumerate(grid):
            for col_index, value in enumerate(row):
                rows.append(
                    MatrixValue(
                        id=uuid4().hex, row=row_index, col=col_index, value=value
                    )
                )
        self.valueRows = rows


class MatrixValue(Base):
    __tablename__ = "matrix_values"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    matrixId: Mapped[str] = mapped_column(String(40), ForeignKey("matrices.id"), index=True)
    row: Mapped[int] = mapped_column(Integer, default=0)
    col: Mapped[int] = mapped_column(Integer, default=0)
    value: Mapped[float] = mapped_column(Float, default=0.0)

    matrix: Mapped[Matrix] = relationship(
        back_populates="valueRows", foreign_keys="[MatrixValue.matrixId]"
    )
