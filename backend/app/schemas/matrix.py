from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from .vector import VectorSource


class MatrixOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    companyId: str
    name: str
    description: str
    rows: int
    cols: int
    values: list[list[float]]
    rowLabels: list[str]
    colLabels: list[str]
    source: VectorSource
    sourceConfig: dict | None = None
    createdAt: str
    updatedAt: str


class MatrixUpsert(BaseModel):
    name: str | None = None
    description: str | None = None
    rows: int | None = None
    cols: int | None = None
    values: list[list[float]] | None = None
    rowLabels: list[str] | None = None
    colLabels: list[str] | None = None
    source: VectorSource | None = None
    sourceConfig: dict | None = None
