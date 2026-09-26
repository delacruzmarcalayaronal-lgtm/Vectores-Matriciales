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
from .location_cache import location_cache


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
        """Registra la ubicación en caché RAM (nunca en la base de datos)."""
        if not user.trackingEnabled:
            from fastapi import HTTPException

            raise HTTPException(
                status_code=403,
                detail="Rastreo desactivado: no se ha dado consentimiento",
            )
        worker = self.repo.ensure_worker(user)
        self.db.commit()
        within = self.is_within_geofence(data.latitude, data.longitude)
        point = location_cache.put(
            worker_id=worker.id,
            name=user.name,
            code=worker.employeeCode,
            latitude=data.latitude,
            longitude=data.longitude,
            accuracy=data.accuracy,
            speed=data.speed,
            heading=data.heading,
            battery_level=data.batteryLevel,
            is_within_geofence=within,
        )
        return LocationResponse(
            id=point["id"],
            workerId=point["workerId"],
            latitude=point["latitude"],
            longitude=point["longitude"],
            accuracy=point["accuracy"],
            isWithinGeofence=point["isWithinGeofence"],
            recordedAt=point["recordedAt"],
        )

    def get_latest_locations(self) -> list[WorkerLastLocation]:
        out: list[WorkerLastLocation] = []
        for row in location_cache.latest_rows():
            minutes = self._minutes_ago(row["lastSeen"])
            out.append(
                WorkerLastLocation(
                    workerId=row["workerId"],
                    workerName=row["workerName"],
                    employeeCode=row["employeeCode"],
                    latitude=row["latitude"],
                    longitude=row["longitude"],
                    accuracy=row["accuracy"],
                    lastSeen=row["lastSeen"],
                    minutesAgo=minutes,
                    status=self.classify_status(minutes),
                )
            )
        return out

    def get_latest_for_worker(self, worker_id: str) -> dict | None:
        """Última posición en caché de un trabajador (None si no tiene)."""
        for row in location_cache.latest_rows():
            if row["workerId"] == worker_id:
                return row
        return None

    def get_worker_history(
        self, worker_id: str, start: str | None, end: str | None
    ) -> list[WorkerLocation]:
        rows: list[WorkerLocation] = []
        for point in location_cache.history(worker_id):
            recorded = point["recordedAt"]
            if start and recorded < start:
                continue
            if end and recorded > end:
                continue
            rows.append(
                WorkerLocation(
                    id=point["id"],
                    workerId=point["workerId"],
                    latitude=point["latitude"],
                    longitude=point["longitude"],
                    accuracy=point["accuracy"],
                    speed=point["speed"],
                    heading=point["heading"],
                    batteryLevel=point["batteryLevel"],
                    isWithinGeofence=point["isWithinGeofence"],
                    recordedAt=point["recordedAt"],
                    createdAt=point["createdAt"],
                )
            )
        return rows

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
