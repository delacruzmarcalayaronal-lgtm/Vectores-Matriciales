from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict

VectorSource = Literal["manual", "sales", "inventory", "targets"]


class VectorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    companyId: str
    name: str
    description: str
    dimension: int
    values: list[float]
    source: VectorSource
    sourceConfig: dict | None = None
    createdAt: str
    updatedAt: str


class VectorUpsert(BaseModel):
    name: str | None = None
    description: str | None = None
    dimension: int | None = None
    values: list[float] | None = None
    source: VectorSource | None = None
    sourceConfig: dict | None = None
