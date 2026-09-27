from __future__ import annotations

import threading
import time

import requests

NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
USER_AGENT = "MatrixFlow-Track/1.0"
MIN_INTERVAL_SECONDS = 1.1  # política de uso de Nominatim: 1 req/s
MAX_CACHE_ENTRIES = 500

_lock = threading.Lock()
_cache: dict[str, str] = {}
_pending: set[str] = set()
_last_call = 0.0


def _key(latitude: float, longitude: float) -> str:
    """Clave ~11 m de resolución: direcciones cercanas comparten resultado."""
    return f"{latitude:.4f},{longitude:.4f}"


def reverse_address(latitude: float, longitude: float) -> str | None:
    """Dirección desde la caché; si falta, lanza la búsqueda en segundo plano.

    Nunca bloquea la respuesta: la primera llamada devuelve None y la
    siguiente petición (o el siguiente refetch de 60 s) ya trae la dirección.
    """
    key = _key(latitude, longitude)
    with _lock:
        cached = _cache.get(key)
        if cached is not None:
            return cached
        if key in _pending:
            return None
        _pending.add(key)
    worker = threading.Thread(
        target=_fetch, args=(key, latitude, longitude), daemon=True
    )
    worker.start()
    return None


def _fetch(key: str, latitude: float, longitude: float) -> None:
    global _last_call
    try:
        with _lock:
            wait = MIN_INTERVAL_SECONDS - (time.monotonic() - _last_call)
        if wait > 0:
            time.sleep(wait)
        with _lock:
            _last_call = time.monotonic()
        response = requests.get(
            NOMINATIM_URL,
            params={
                "format": "jsonv2",
                "zoom": 18,
                "accept-language": "es",
                "lat": latitude,
                "lon": longitude,
            },
            headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
            timeout=6,
        )
        name = ""
        if response.status_code == 200:
            name = (response.json().get("display_name") or "").strip()
        if name:
            with _lock:
                _cache[key] = name
                while len(_cache) > MAX_CACHE_ENTRIES:
                    _cache.pop(next(iter(_cache)))
    except Exception:
        pass  # sin red: se reintenta en la siguiente petición
    finally:
        with _lock:
            _pending.discard(key)
