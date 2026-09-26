from __future__ import annotations

import folium

from ..core.config import settings
from ..models import WorkerLocation
from ..schemas.location import WorkerLastLocation

STATUS_COLORS = {"active": "green", "idle": "orange", "offline": "red"}

def _render(fmap: folium.Map) -> str:
    """HTML completo del documento Folium (sin el embed iframe de Jupyter)."""
    return fmap.get_root().render()


def _popup_html(name: str, code: str, seen: str, accuracy: float | None, status: str) -> str:
    acc = f"{accuracy:.0f} m" if accuracy is not None else "s/d"
    labels = {"active": "Activo", "idle": "Ocioso", "offline": "Sin conexión"}
    return (
        f"<div style='font-family:sans-serif;font-size:12px'>"
        f"<b>{name}</b><br>Código: {code}<br>Última vez: {seen}<br>"
        f"Precisión: {acc}<br>Estado: {labels.get(status, status)}</div>"
    )


def generate_workers_map(locations: list[WorkerLastLocation]) -> str:
    """Mapa Folium con la última ubicación de cada trabajador."""
    fmap = folium.Map(
        location=[settings.MAP_CENTER_LAT, settings.MAP_CENTER_LNG],
        zoom_start=settings.MAP_ZOOM,
        tiles="OpenStreetMap",
    )
    for row in locations:
        color = STATUS_COLORS.get(row.status, "gray")
        folium.Marker(
            location=[row.latitude, row.longitude],
            popup=folium.Popup(
                _popup_html(row.workerName, row.employeeCode, row.lastSeen, row.accuracy, row.status),
                max_width=260,
            ),
            tooltip=f"{row.workerName} ({row.status})",
            icon=folium.Icon(color=color, icon="user"),
        ).add_to(fmap)
        if row.accuracy:
            folium.Circle(
                location=[row.latitude, row.longitude],
                radius=row.accuracy,
                color=color,
                fill=True,
                fill_opacity=0.1,
            ).add_to(fmap)
    if not locations:
        folium.Marker(
            location=[settings.MAP_CENTER_LAT, settings.MAP_CENTER_LNG],
            tooltip="Sin trabajadores con ubicación",
            icon=folium.Icon(color="gray", icon="info-sign"),
        ).add_to(fmap)
    folium.LayerControl().add_to(fmap)
    return _render(fmap)


def generate_worker_history_map(
    locations: list[WorkerLocation], worker_name: str
) -> str:
    """Mapa Folium con el recorrido (PolyLine) de un trabajador."""
    fmap = folium.Map(
        location=[settings.MAP_CENTER_LAT, settings.MAP_CENTER_LNG],
        zoom_start=settings.MAP_ZOOM,
        tiles="OpenStreetMap",
    )
    if not locations:
        folium.Marker(
            location=[settings.MAP_CENTER_LAT, settings.MAP_CENTER_LNG],
            tooltip="Sin historial",
            icon=folium.Icon(color="gray", icon="info-sign"),
        ).add_to(fmap)
        return _render(fmap)

    points = [[row.latitude, row.longitude] for row in locations]
    folium.PolyLine(points, color="#2563EB", weight=3, opacity=0.8).add_to(fmap)
    first, last = locations[0], locations[-1]
    folium.Marker(
        location=[first.latitude, first.longitude],
        popup=folium.Popup(f"Inicio del recorrido: {first.recordedAt}", max_width=240),
        tooltip=f"{worker_name} - inicio",
        icon=folium.Icon(color="green", icon="play"),
    ).add_to(fmap)
    folium.Marker(
        location=[last.latitude, last.longitude],
        popup=folium.Popup(f"Última ubicación: {last.recordedAt}", max_width=240),
        tooltip=f"{worker_name} - fin",
        icon=folium.Icon(color="red", icon="stop"),
    ).add_to(fmap)
    folium.LayerControl().add_to(fmap)
    return _render(fmap)


def generate_geofence_map(
    locations: list[WorkerLastLocation],
    center_lat: float,
    center_lng: float,
    radius_km: float,
) -> str:
    """Mapa Folium con el geofence y los trabajadores fuera de zona en rojo."""
    fmap = folium.Map(
        location=[center_lat, center_lng],
        zoom_start=settings.MAP_ZOOM,
        tiles="OpenStreetMap",
    )
    folium.Circle(
        location=[center_lat, center_lng],
        radius=radius_km * 1000,
        color="#2563EB",
        fill=True,
        fill_opacity=0.08,
        tooltip=f"Geofence {radius_km} km",
    ).add_to(fmap)
    for row in locations:
        outside = _is_outside(row, center_lat, center_lng, radius_km)
        color = "red" if outside else "green"
        folium.Marker(
            location=[row.latitude, row.longitude],
            popup=folium.Popup(
                _popup_html(row.workerName, row.employeeCode, row.lastSeen, row.accuracy, row.status),
                max_width=260,
            ),
            tooltip=f"{row.workerName} ({'fuera de zona' if outside else 'dentro'})",
            icon=folium.Icon(color=color, icon="user"),
        ).add_to(fmap)
    folium.LayerControl().add_to(fmap)
    return _render(fmap)


def _is_outside(
    row: WorkerLastLocation, center_lat: float, center_lng: float, radius_km: float
) -> bool:
    from .location_service import LocationService

    distance = LocationService.calculate_distance_km(
        center_lat, center_lng, row.latitude, row.longitude
    )
    return distance > radius_km
