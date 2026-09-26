from __future__ import annotations

import threading
from datetime import datetime, timedelta, timezone
from typing import Any

from ..api.helpers import new_id

LOCATION_TTL_MINUTES = 30
MAX_POINTS_PER_WORKER = 500


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class LocationCache:
    """Posiciones en memoria (RAM). Nunca se persisten en la base de datos.

    - Cada trabajador acumula su trail de la sesión actual.
    - Si un trabajador deja de enviar por > TTL, se purga su trail completo
      (la sesión se considera abandonada; el logout lo purga al instante).
    - Un reinicio del servidor vacía la caché por completo.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._points: dict[str, list[dict[str, Any]]] = {}
        self._profiles: dict[str, dict[str, str]] = {}

    def put(
        self,
        worker_id: str,
        name: str,
        code: str,
        latitude: float,
        longitude: float,
        accuracy: float | None,
        speed: float | None,
        heading: float | None,
        battery_level: int | None,
        is_within_geofence: bool,
    ) -> dict[str, Any]:
        now = _utcnow()
        point = {
            "id": new_id(),
            "workerId": worker_id,
            "latitude": latitude,
            "longitude": longitude,
            "accuracy": accuracy,
            "speed": speed,
            "heading": heading,
            "batteryLevel": battery_level,
            "isWithinGeofence": is_within_geofence,
            "recordedAt": now.isoformat(),
            "createdAt": now.isoformat(),
            "_at": now,
        }
        with self._lock:
            self._purge_expired_locked(now)
            trail = self._points.setdefault(worker_id, [])
            trail.append(point)
            if len(trail) > MAX_POINTS_PER_WORKER:
                del trail[: len(trail) - MAX_POINTS_PER_WORKER]
            self._profiles[worker_id] = {"name": name, "code": code}
        return point

    def latest_rows(self) -> list[dict[str, Any]]:
        """Último punto (no expirado) de cada trabajador, con su perfil."""
        now = _utcnow()
        with self._lock:
            self._purge_expired_locked(now)
            out: list[dict[str, Any]] = []
            for worker_id, trail in self._points.items():
                if not trail:
                    continue
                last = trail[-1]
                profile = self._profiles.get(worker_id, {})
                out.append(
                    {
                        "workerId": worker_id,
                        "workerName": profile.get("name", ""),
                        "employeeCode": profile.get("code", ""),
                        "latitude": last["latitude"],
                        "longitude": last["longitude"],
                        "accuracy": last["accuracy"],
                        "lastSeen": last["recordedAt"],
                    }
                )
            out.sort(key=lambda row: row["employeeCode"])
            return out

    def history(self, worker_id: str) -> list[dict[str, Any]]:
        """Trail completo (no expirado) del trabajador, ordenado por tiempo."""
        now = _utcnow()
        with self._lock:
            self._purge_expired_locked(now)
            trail = self._points.get(worker_id, [])
            return [dict(p) for p in trail]

    def remove(self, worker_id: str) -> None:
        with self._lock:
            self._points.pop(worker_id, None)
            self._profiles.pop(worker_id, None)

    def clear(self) -> None:
        with self._lock:
            self._points.clear()
            self._profiles.clear()

    def _purge_expired_locked(self, now: datetime) -> None:
        limit = now - timedelta(minutes=LOCATION_TTL_MINUTES)
        expired = [
            worker_id
            for worker_id, trail in self._points.items()
            if not trail or trail[-1]["_at"] < limit
        ]
        for worker_id in expired:
            self._points.pop(worker_id, None)
            self._profiles.pop(worker_id, None)


location_cache = LocationCache()
