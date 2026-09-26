from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    companyId: str
    userId: str
    action: str
    module: str
    entityType: str
    entityId: str
    oldValues: dict | None = None
    newValues: dict | None = None
    ipAddress: str | None = None
    userAgent: str | None = None
    status: Literal["success", "failure"]
    errorMessage: str | None = None
    createdAt: str
