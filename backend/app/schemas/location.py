from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from .worker import StatusKind


class LocationCreate(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy: float | None = Field(default=None, ge=0)
    speed: float | None = None
    heading: float | None = None
    batteryLevel: int | None = Field(default=None, ge=0, le=100)


class LocationResponse(BaseModel):
    id: str
    workerId: str
    latitude: float
    longitude: float
    accuracy: float | None = None
    isWithinGeofence: bool
    recordedAt: str


class WorkerLastLocation(BaseModel):
    workerId: str
    workerName: str
    employeeCode: str
    latitude: float
    longitude: float
    accuracy: float | None = None
    lastSeen: str
    minutesAgo: int
    status: StatusKind
    address: str | None = None
    distanceKm: float = 0.0


class ConsentCreate(BaseModel):
    consentStatus: Literal["accepted", "denied"]
    consentVersion: str = "v1"


class ConsentResponse(BaseModel):
    id: str
    workerId: str
    consentStatus: str
    consentedAt: str
