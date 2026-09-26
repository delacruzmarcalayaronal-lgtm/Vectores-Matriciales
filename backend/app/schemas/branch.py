from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class BranchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    companyId: str
    name: str
    code: str
    address: str
    city: str
    country: str
    phone: str
    isActive: bool
    createdAt: str
    updatedAt: str


class BranchUpsert(BaseModel):
    name: str | None = None
    code: str | None = None
    address: str | None = None
    city: str | None = None
    country: str | None = None
    phone: str | None = None
    isActive: bool | None = None
