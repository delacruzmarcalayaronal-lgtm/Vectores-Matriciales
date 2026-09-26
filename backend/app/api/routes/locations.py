from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from ...core.config import settings
from ...core.database import get_db
from ...core.deps import get_current_user, require_roles
from ...models import User, Worker
from ...schemas import ConsentResponse, LocationResponse, WorkerLastLocation
from ...schemas.location import ConsentCreate, LocationCreate
from ...services.location_service import LocationService
from ...services.map_service import (
    generate_geofence_map,
    generate_worker_history_map,
    generate_workers_map,
)
from ..helpers import get_or_404

router = APIRouter(tags=["locations"])

MAP_ROLES = ("admin", "manager")


@router.post("/locations", response_model=LocationResponse, status_code=201)
def send_location(
    body: LocationCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LocationResponse:
    """Recibe la ubicación GPS del trabajador autenticado."""
    service = LocationService(db)
    return service.save_location(user, body)


@router.get("/locations/latest", response_model=list[WorkerLastLocation])
def latest_locations(
    user: User = Depends(require_roles(*MAP_ROLES)),
    db: Session = Depends(get_db),
) -> list[WorkerLastLocation]:
    """Última ubicación de todos los trabajadores (admin/manager)."""
    return LocationService(db).get_latest_locations()


@router.get("/locations/worker/{worker_id}/history", response_model=list[LocationResponse])
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


@router.get("/locations/map", response_class=HTMLResponse)
def workers_map(
    user: User = Depends(require_roles(*MAP_ROLES)),
    db: Session = Depends(get_db),
) -> HTMLResponse:
    """HTML de Folium con la ubicación actual de todos (listo para iframe)."""
    service = LocationService(db)
    html = generate_workers_map(service.get_latest_locations())
    return HTMLResponse(content=html, headers={"Cache-Control": "max-age=30"})


@router.get("/locations/map/history/{worker_id}", response_class=HTMLResponse)
def worker_history_map(
    worker_id: str,
    date: str | None = Query(default=None),
    user: User = Depends(require_roles(*MAP_ROLES)),
    db: Session = Depends(get_db),
) -> HTMLResponse:
    """HTML de Folium con el recorrido del trabajador."""
    worker = get_or_404(db, Worker, worker_id, "Trabajador")
    service = LocationService(db)
    if date:
        rows = service.repo.get_history_for_date(worker_id, date)
    else:
        rows = service.get_worker_history(worker_id, None, None)
    owner = db.get(User, worker.userId)
    html = generate_worker_history_map(rows, owner.name if owner else worker.employeeCode)
    return HTMLResponse(content=html, headers={"Cache-Control": "max-age=30"})


@router.get("/locations/outside-geofence", response_model=list[WorkerLastLocation])
def outside_geofence(
    lat: float = Query(default=settings.MAP_CENTER_LAT),
    lng: float = Query(default=settings.MAP_CENTER_LNG),
    radius_km: float = Query(default=settings.GEOFENCE_DEFAULT_RADIUS_KM, gt=0),
    user: User = Depends(require_roles(*MAP_ROLES)),
    db: Session = Depends(get_db),
) -> list[WorkerLastLocation]:
    """Trabajadores fuera del geofence (Haversine)."""
    service = LocationService(db)
    return service.get_workers_outside_geofence(lat, lng, radius_km)


@router.get("/locations/geofence-map", response_class=HTMLResponse)
def geofence_map(
    lat: float = Query(default=settings.MAP_CENTER_LAT),
    lng: float = Query(default=settings.MAP_CENTER_LNG),
    radius_km: float = Query(default=settings.GEOFENCE_DEFAULT_RADIUS_KM, gt=0),
    user: User = Depends(require_roles(*MAP_ROLES)),
    db: Session = Depends(get_db),
) -> HTMLResponse:
    """HTML de Folium con el geofence y los trabajadores fuera de zona."""
    service = LocationService(db)
    html = generate_geofence_map(service.get_latest_locations(), lat, lng, radius_km)
    return HTMLResponse(content=html, headers={"Cache-Control": "max-age=30"})


@router.post("/locations/consent", response_model=ConsentResponse, status_code=201)
def send_consent(
    body: ConsentCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConsentResponse:
    """Registra el consentimiento del trabajador (Ley 29733)."""
    service = LocationService(db)
    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")
    return service.register_consent(user, body, ip, user_agent[:500])
