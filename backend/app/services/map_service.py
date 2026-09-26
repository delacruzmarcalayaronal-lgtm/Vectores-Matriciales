from __future__ import annotations

import folium

from ..core.config import settings
from ..models import WorkerLocation
from ..schemas.location import WorkerLastLocation

STATUS_COLORS = {"active": "green", "idle": "orange", "offline": "red"}

def _render(fmap: folium.Map) -> str:
    """HTML completo del documento Folium (sin el embed iframe de Jupyter)."""
    html = fmap.get_root().render()
    return html.replace("</body>", _POPUP_SCRIPT + "\n</body>")


_POPUP_SCRIPT = """
<script>
(function () {
  function resolveAddress(popupEl) {
    var t = popupEl.querySelector('[data-mf-lat]');
    var addr = popupEl.querySelector('.mf-addr');
    if (!t || !addr || addr.dataset.loading) return;
    addr.dataset.loading = '1';
    addr.textContent = 'Buscando dirección...';
    var lat = t.getAttribute('data-mf-lat');
    var lng = t.getAttribute('data-mf-lng');
    var url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=es&lat='
      + encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lng);
    fetch(url, { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        addr.textContent = (d && d.display_name) ? d.display_name : 'Dirección no disponible';
      })
      .catch(function () { addr.textContent = 'Dirección no disponible'; });
  }
  var observer = new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      Array.prototype.forEach.call(m.addedNodes, function (n) {
        if (n.nodeType !== 1) return;
        if (n.classList && n.classList.contains('leaflet-popup')) resolveAddress(n);
        else if (n.querySelector) {
          var p = n.querySelector('.leaflet-popup');
          if (p) resolveAddress(p);
        }
      });
    });
  });
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
})();
</script>
"""


def _distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    from .location_service import LocationService

    return LocationService.calculate_distance_km(lat1, lng1, lat2, lng2)


def _distance_label_html(km: float) -> str:
    text = f"{km:.2f} km" if km < 10 else f"{km:.1f} km"
    return (
        "<div style='background:#2563EB;color:#fff;padding:1px 7px;border-radius:999px;"
        "font:600 11px/1.6 sans-serif;white-space:nowrap;"
        "box-shadow:0 1px 4px rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.5);'>"
        f"{text}</div>"
    )


def _add_distance_ray(
    fmap: folium.Map, lat: float, lng: float, center_lat: float, center_lng: float
) -> float | None:
    """Dibuja la 'raya' sede -> trabajador con la distancia en km. Devuelve los km."""
    km = _distance_km(center_lat, center_lng, lat, lng)
    if km < 0.05:
        return None
    folium.PolyLine(
        [[center_lat, center_lng], [lat, lng]],
        color="#2563EB",
        weight=2,
        dash_array="7 7",
        opacity=0.8,
        tooltip=f"{km:.2f} km hasta la sede",
    ).add_to(fmap)
    folium.Marker(
        [(center_lat + lat) / 2, (center_lng + lng) / 2],
        icon=folium.DivIcon(
            html=_distance_label_html(km),
            icon_size=(76, 18),
            icon_anchor=(38, 9),
            class_name="mf-distance-label",
        ),
        interactive=False,
    ).add_to(fmap)
    return km


def _popup_html(
    name: str,
    code: str,
    seen: str,
    accuracy: float | None,
    status: str,
    lat: float,
    lng: float,
) -> str:
    acc = f"{accuracy:.0f} m" if accuracy is not None else "s/d"
    labels = {"active": "Activo", "idle": "Ocioso", "offline": "Sin conexión"}
    km = _distance_km(settings.MAP_CENTER_LAT, settings.MAP_CENTER_LNG, lat, lng)
    distance_line = (
        f"<b>Distancia a la sede:</b> {km:.2f} km<br>"
        if km >= 0.01
        else "<b>En la sede</b><br>"
    )
    return (
        f"<div style='font-family:sans-serif;font-size:12px'>"
        f"<b>{name}</b><br>Código: {code}<br>Última vez: {seen}<br>"
        f"Precisión: {acc}<br>Estado: {labels.get(status, status)}<br>"
        f"{distance_line}"
        f"<div style='margin-top:6px;border-top:1px solid #ddd;padding-top:4px'>"
        f"<b>Coordenadas:</b> "
        f"<span data-mf-lat='{lat:.6f}' data-mf-lng='{lng:.6f}'>{lat:.6f}, {lng:.6f}</span><br>"
        f"<a href='https://www.google.com/maps?q={lat},{lng}' target='_blank' rel='noopener'>"
        f"Abrir en Google Maps</a>"
        f"<div class='mf-addr' style='margin-top:4px;color:#444'></div>"
        f"</div></div>"
    )


def _trace_popup_html(title: str, when: str, lat: float, lng: float) -> str:
    km = _distance_km(settings.MAP_CENTER_LAT, settings.MAP_CENTER_LNG, lat, lng)
    distance_line = (
        f"<b>Distancia a la sede:</b> {km:.2f} km<br>"
        if km >= 0.01
        else "<b>En la sede</b><br>"
    )
    return (
        f"<div style='font-family:sans-serif;font-size:12px'>"
        f"<b>{title}</b><br>{when}<br>"
        f"{distance_line}"
        f"<div style='margin-top:6px;border-top:1px solid #ddd;padding-top:4px'>"
        f"<b>Coordenadas:</b> "
        f"<span data-mf-lat='{lat:.6f}' data-mf-lng='{lng:.6f}'>{lat:.6f}, {lng:.6f}</span><br>"
        f"<a href='https://www.google.com/maps?q={lat},{lng}' target='_blank' rel='noopener'>"
        f"Abrir en Google Maps</a>"
        f"<div class='mf-addr' style='margin-top:4px;color:#444'></div>"
        f"</div></div>"
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
        _add_distance_ray(
            fmap, row.latitude, row.longitude, settings.MAP_CENTER_LAT, settings.MAP_CENTER_LNG
        )
        folium.Marker(
            location=[row.latitude, row.longitude],
            popup=folium.Popup(
                _popup_html(
                    row.workerName, row.employeeCode, row.lastSeen, row.accuracy, row.status,
                    row.latitude, row.longitude,
                ),
                max_width=280,
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
    else:
        # encuadrar la sede y a todos los trabajadores (con su raya de distancia)
        bounds = [[settings.MAP_CENTER_LAT, settings.MAP_CENTER_LNG]]
        bounds += [[row.latitude, row.longitude] for row in locations]
        fmap.fit_bounds(bounds, padding=(45, 45), max_zoom=16)
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
        popup=folium.Popup(
            _trace_popup_html("Inicio del recorrido", str(first.recordedAt), first.latitude, first.longitude),
            max_width=280,
        ),
        tooltip=f"{worker_name} - inicio",
        icon=folium.Icon(color="green", icon="play"),
    ).add_to(fmap)
    folium.Marker(
        location=[last.latitude, last.longitude],
        popup=folium.Popup(
            _trace_popup_html("Última ubicación", str(last.recordedAt), last.latitude, last.longitude),
            max_width=280,
        ),
        tooltip=f"{worker_name} - fin",
        icon=folium.Icon(color="red", icon="stop"),
    ).add_to(fmap)
    # llevar la vista hasta la ubicación real del trabajador (no quedarse en la sede)
    if len(locations) == 1:
        fmap.setView(points[0], 17)
    else:
        fmap.fit_bounds(points, padding=(50, 50), max_zoom=17)
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
        _add_distance_ray(fmap, row.latitude, row.longitude, center_lat, center_lng)
        folium.Marker(
            location=[row.latitude, row.longitude],
            popup=folium.Popup(
                _popup_html(
                    row.workerName, row.employeeCode, row.lastSeen, row.accuracy, row.status,
                    row.latitude, row.longitude,
                ),
                max_width=280,
            ),
            tooltip=f"{row.workerName} ({'fuera de zona' if outside else 'dentro'})",
            icon=folium.Icon(color=color, icon="user"),
        ).add_to(fmap)
    # encuadrar el geofence (círculo) y a todos los trabajadores
    from math import cos, radians

    dlat = radius_km / 111.0
    dlng = radius_km / max(1.0, 111.0 * abs(cos(radians(center_lat))))
    bounds = [
        [center_lat - dlat, center_lng - dlng],
        [center_lat + dlat, center_lng + dlng],
    ]
    bounds += [[row.latitude, row.longitude] for row in locations]
    fmap.fit_bounds(bounds, padding=(45, 45), max_zoom=16)
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
