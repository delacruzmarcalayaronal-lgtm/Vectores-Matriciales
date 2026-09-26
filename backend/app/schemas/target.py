from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict


class TargetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    companyId: str
    branchId: str | None = None
    productId: str | None = None
    period: str
    targetValue: float
    achievedValue: float
    type: Literal["sales", "units", "revenue"]
    createdAt: str
    updatedAt: str


class TargetUpsert(BaseModel):
    branchId: str | None = None
    productId: str | None = None
    period: str | None = None
    targetValue: float | None = None
    achievedValue: float | None = None
    type: Literal["sales", "units", "revenue"] | None = None
