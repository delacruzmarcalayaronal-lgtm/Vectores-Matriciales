from __future__ import annotations

import math
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from ..core.config import settings
from ..models import User, WorkerLocation, utcnow
from ..schemas.location import (
    ConsentCreate,
    ConsentResponse,
    LocationCreate,
    LocationResponse,
    WorkerLastLocation,
)
from ..repositories.location_repository import LocationRepository


class LocationService:
    """Lógica de negocio del rastreo: geofencing, estados y consentimiento."""

    def __init__(self, db: Session) -> None:
        self.repo = LocationRepository(db)
        self.db = db

    # ---------- geofencing (Haversine) ----------

    @staticmethod
    def calculate_distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Distancia entre dos puntos geográficos en kilómetros (Haversine)."""
        radius = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(dlng / 2) ** 2
        )
        return 2 * radius * math.asin(math.sqrt(a))

    def is_within_geofence(self, latitude: float, longitude: float) -> bool:
        distance = self.calculate_distance_km(
            latitude, longitude, settings.MAP_CENTER_LAT, settings.MAP_CENTER_LNG
        )
        return distance <= settings.GEOFENCE_DEFAULT_RADIUS_KM

    @staticmethod
    def classify_status(minutes_ago: int) -> str:
        """'active' <5min, 'idle' <30min, 'offline' >=30min."""
        if minutes_ago < 5:
            return "active"
        if minutes_ago < 30:
            return "idle"
        return "offline"

    @staticmethod
    def _minutes_ago(iso_datetime: str) -> int:
        try:
            recorded = datetime.fromisoformat(iso_datetime)
            if recorded.tzinfo is None:
                recorded = recorded.replace(tzinfo=timezone.utc)
            delta = datetime.now(timezone.utc) - recorded
            return max(0, int(delta.total_seconds() // 60))
        except ValueError:
            return 9999

    # ---------- ubicaciones ----------

    def save_location(self, user: User, data: LocationCreate) -> LocationResponse:
        """Guarda la ubicación del usuario y calcula el geofence."""
        if not user.trackingEnabled:
            from fastapi import HTTPException

            raise HTTPException(
                status_code=403,
                detail="Rastreo desactivado: no se ha dado consentimiento",
            )
        worker = self.repo.ensure_worker(user)
        within = self.is_within_geofence(data.latitude, data.longitude)
        location = self.repo.create_location(worker.id, data, within)
        self.db.commit()
        self.db.refresh(location)
        return LocationResponse(
            id=location.id,
            workerId=location.workerId,
            latitude=location.latitude,
            longitude=location.longitude,
            accuracy=location.accuracy,
            isWithinGeofence=location.isWithinGeofence,
            recordedAt=location.recordedAt,
        )

    def get_latest_locations(self) -> list[WorkerLastLocation]:
        out: list[WorkerLastLocation] = []
        for worker, user, location in self.repo.get_latest_rows():
            minutes = self._minutes_ago(location.recordedAt)
            out.append(
                WorkerLastLocation(
                    workerId=worker.id,
                    workerName=user.name,
                    employeeCode=worker.employeeCode,
                    latitude=location.latitude,
                    longitude=location.longitude,
                    accuracy=location.accuracy,
                    lastSeen=location.recordedAt,
                    minutesAgo=minutes,
                    status=self.classify_status(minutes),
                )
            )
        return out

    def get_worker_history(
        self, worker_id: str, start: str | None, end: str | None
    ) -> list[WorkerLocation]:
        return self.repo.get_history(worker_id, start, end)

    def get_workers_outside_geofence(
        self, lat: float, lng: float, radius_km: float
    ) -> list[WorkerLastLocation]:
        return [
            row
            for row in self.get_latest_locations()
            if self.calculate_distance_km(lat, lng, row.latitude, row.longitude) > radius_km
        ]

    # ---------- consentimiento (Ley 29733) ----------

    def register_consent(
        self,
        user: User,
        body: ConsentCreate,
        ip_address: str | None,
        user_agent: str | None,
    ) -> ConsentResponse:
        worker = self.repo.ensure_worker(user)
        log_id = self.repo.add_consent(
            worker.id, body.consentStatus, body.consentVersion, ip_address, user_agent
        )
        user.trackingEnabled = body.consentStatus == "accepted"
        self.db.commit()
        return ConsentResponse(
            id=log_id,
            workerId=worker.id,
            consentStatus=body.consentStatus,
            consentedAt=utcnow(),
        )
