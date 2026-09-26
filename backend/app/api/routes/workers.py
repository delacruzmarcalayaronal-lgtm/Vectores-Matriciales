from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...core.deps import get_current_user, require_roles
from ...models import User
from ...schemas import WorkerResponse, WorkerStatus
from ...schemas.location import LocationResponse
from ...services.location_service import LocationService
from ..helpers import get_or_404
from ...models import Worker

router = APIRouter(tags=["workers"])

MAP_ROLES = ("admin", "manager")


def _worker_response(worker: Worker, user: User) -> WorkerResponse:
    return WorkerResponse(
        id=worker.id,
        userId=worker.userId,
        employeeCode=worker.employeeCode,
        name=user.name,
        position=worker.position,
        department=worker.department,
        isActive=worker.isActive,
        trackingEnabled=user.trackingEnabled,
    )


@router.get("/workers", response_model=list[WorkerResponse])
def list_workers(
    user: User = Depends(require_roles(*MAP_ROLES)),
    db: Session = Depends(get_db),
) -> list[WorkerResponse]:
    """Lista los trabajadores activos con su estado de rastreo."""
    service = LocationService(db)
    return [_worker_response(worker, owner) for worker, owner in service.repo.list_workers()]


@router.get("/workers/{worker_id}/status", response_model=WorkerStatus)
def worker_status(
    worker_id: str,
    user: User = Depends(require_roles(*MAP_ROLES)),
    db: Session = Depends(get_db),
) -> WorkerStatus:
    """Última ubicación y estado de un trabajador."""
    service = LocationService(db)
    worker = get_or_404(db, Worker, worker_id, "Trabajador")
    owner = db.get(User, worker.userId)
    location = service.get_latest_for_worker(worker.id)
    if location is None or owner is None:
        return WorkerStatus(
            workerId=worker.id,
            name=owner.name if owner else "",
            employeeCode=worker.employeeCode,
            status="offline",
        )
    minutes = service._minutes_ago(location["lastSeen"])
    return WorkerStatus(
        workerId=worker.id,
        name=owner.name,
        employeeCode=worker.employeeCode,
        latitude=location["latitude"],
        longitude=location["longitude"],
        accuracy=location["accuracy"],
        lastSeen=location["lastSeen"],
        minutesAgo=minutes,
        status=service.classify_status(minutes),
    )


@router.patch("/workers/{worker_id}/tracking")
def toggle_tracking(
    worker_id: str,
    body: dict,
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> dict:
    """Activa o desactiva el rastreo de un trabajador ({"trackingEnabled": bool})."""
    worker = get_or_404(db, Worker, worker_id, "Trabajador")
    owner = db.get(User, worker.userId)
    if owner is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    enabled = bool(body.get("trackingEnabled"))
    owner.trackingEnabled = enabled
    db.commit()
    return {"workerId": worker.id, "trackingEnabled": enabled}


@router.get("/workers/{worker_id}/history", response_model=list[LocationResponse])
def worker_history(
    worker_id: str,
    start: str | None = Query(default=None),
    end: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[LocationResponse]:
    """Historial de ubicaciones (admin/manager o el propio trabajador)."""
    worker = get_or_404(db, Worker, worker_id, "Trabajador")
    if user.role not in MAP_ROLES and worker.userId != user.id:
        raise HTTPException(status_code=403, detail="Sin permiso sobre este trabajador")
    service = LocationService(db)
    rows = service.get_worker_history(worker_id, start, end)
    return [
        LocationResponse(
            id=row.id,
            workerId=row.workerId,
            latitude=row.latitude,
            longitude=row.longitude,
            accuracy=row.accuracy,
            isWithinGeofence=row.isWithinGeofence,
            recordedAt=row.recordedAt,
        )
        for row in rows
    ]
