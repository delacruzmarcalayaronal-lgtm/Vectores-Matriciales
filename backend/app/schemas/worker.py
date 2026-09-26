from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

StatusKind = Literal["active", "idle", "offline"]


class WorkerResponse(BaseModel):
    id: str
    userId: str
    employeeCode: str
    name: str
    position: str
    department: str
    isActive: bool
    trackingEnabled: bool


class WorkerStatus(BaseModel):
    workerId: str
    name: str
    employeeCode: str
    latitude: float | None = None
    longitude: float | None = None
    accuracy: float | None = None
    lastSeen: str | None = None
    minutesAgo: int | None = None
    status: StatusKind = "offline"
