from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class CompanyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    legalName: str
    taxId: str
    address: str
    city: str | None = None
    country: str | None = None
    phone: str
    logo: str | None = None
    createdAt: str
    updatedAt: str


class CompanyUpsert(BaseModel):
    name: str | None = None
    legalName: str | None = None
    taxId: str | None = None
    address: str | None = None
    city: str | None = None
    country: str | None = None
    phone: str | None = None
    logo: str | None = None
