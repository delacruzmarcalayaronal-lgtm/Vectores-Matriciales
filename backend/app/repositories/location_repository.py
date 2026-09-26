from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..api.helpers import new_id
from ..models import User, Worker, WorkerLocation, utcnow
from ..schemas.location import LocationCreate


class LocationRepository:
    """Acceso a datos del rastreo de trabajadores."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_worker_for_user(self, user: User) -> Worker | None:
        return self.db.scalar(select(Worker).where(Worker.userId == user.id))

    def ensure_worker(self, user: User) -> Worker:
        """Crea el perfil de trabajador si no existe (employeeCode = DNI)."""
        worker = self.get_worker_for_user(user)
        if worker is not None:
            return worker
        worker = Worker(
            id=new_id(),
            userId=user.id,
            employeeCode=user.dni or user.id,
            position="",
            department="",
        )
        self.db.add(worker)
        self.db.flush()
        return worker

    def create_location(
        self, worker_id: str, data: LocationCreate, is_within_geofence: bool
    ) -> WorkerLocation:
        now = utcnow()
        location = WorkerLocation(
            id=new_id(),
            workerId=worker_id,
            latitude=data.latitude,
            longitude=data.longitude,
            accuracy=data.accuracy,
            speed=data.speed,
            heading=data.heading,
            batteryLevel=data.batteryLevel,
            isWithinGeofence=is_within_geofence,
            recordedAt=now,
            createdAt=now,
        )
        self.db.add(location)
        return location

    def get_latest_by_worker(self, worker_id: str) -> WorkerLocation | None:
        return self.db.scalar(
            select(WorkerLocation)
            .where(WorkerLocation.workerId == worker_id)
            .order_by(WorkerLocation.recordedAt.desc())
            .limit(1)
        )

    def get_latest_rows(self) -> list[tuple[Worker, User, WorkerLocation]]:
        """Última ubicación de cada trabajador activo (worker, user, location)."""
        workers = self.db.scalars(
            select(Worker).where(Worker.isActive.is_(True)).order_by(Worker.employeeCode)
        ).all()
        rows: list[tuple[Worker, User, WorkerLocation]] = []
        for worker in workers:
            location = self.get_latest_by_worker(worker.id)
            user = self.db.get(User, worker.userId)
            if location is not None and user is not None:
                rows.append((worker, user, location))
        return rows

    def get_history(
        self, worker_id: str, start: str | None, end: str | None
    ) -> list[WorkerLocation]:
        stmt = (
            select(WorkerLocation)
            .where(WorkerLocation.workerId == worker_id)
            .order_by(WorkerLocation.recordedAt)
        )
        if start:
            stmt = stmt.where(WorkerLocation.recordedAt >= start)
        if end:
            stmt = stmt.where(WorkerLocation.recordedAt <= end)
        return list(self.db.scalars(stmt).all())

    def get_history_for_date(self, worker_id: str, date: str) -> list[WorkerLocation]:
        start = f"{date}T00:00:00"
        end = f"{date}T23:59:59.999999"
        return self.get_history(worker_id, start, end)

    def list_workers(self) -> list[tuple[Worker, User]]:
        workers = self.db.scalars(
            select(Worker).where(Worker.isActive.is_(True)).order_by(Worker.employeeCode)
        ).all()
        out: list[tuple[Worker, User]] = []
        for worker in workers:
            user = self.db.get(User, worker.userId)
            if user is not None:
                out.append((worker, user))
        return out

    def get_worker(self, worker_id: str) -> Worker | None:
        return self.db.get(Worker, worker_id)

    def add_consent(
        self,
        worker_id: str,
        consent_status: str,
        consent_version: str,
        ip_address: str | None,
        user_agent: str | None,
    ) -> str:
        from ..models import ConsentLog

        log = ConsentLog(
            id=new_id(),
            workerId=worker_id,
            consentStatus=consent_status,
            consentVersion=consent_version,
            ipAddress=ip_address,
            userAgent=user_agent,
            consentedAt=datetime.now(timezone.utc).isoformat(),
        )
        self.db.add(log)
        self.db.flush()
        return log.id
