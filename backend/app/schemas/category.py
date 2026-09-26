from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    companyId: str
    name: str
    description: str
    createdAt: str
    updatedAt: str


class CategoryUpsert(BaseModel):
    name: str | None = None
    description: str | None = None
