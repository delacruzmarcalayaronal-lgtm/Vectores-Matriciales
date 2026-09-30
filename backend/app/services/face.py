"""Verificación facial: descriptor, umbral y puntaje de coincidencia.

El descriptor viaja desde el frontend como un embedding ArcFace plano de
1024 valores (modelo faceres de @vladmandic/human, normalizado a longitud 1).
A diferencia de la geometría/apariencia anteriores, el embedding es
invariante al encuadre, la resolución y el fondo: mide quién es la persona.

El puntaje es el coseno entre la plantilla guardada y la sonda, recortado a
[0, 1] y expresado luego como porcentaje contra el umbral (30–85, por defecto
60). Calibrado con rostros reales: la misma persona en distinta fuente/encuadre
queda ≥ ~0.67 y una persona ajena ≤ ~0.46; entre familiares rara vez se pasa
de 0.5.
"""

from __future__ import annotations

import math

GEOM_POINTS = 400
EMBED_DIM = 1024
VECTOR_DIM = EMBED_DIM

MAX_POINTS = GEOM_POINTS
MIN_THRESHOLD = 30
MAX_THRESHOLD = 85
DEFAULT_THRESHOLD = 60

FACE_TEMPLATE_VERSION = 3


def clamp_threshold(value: int | None, fallback: int | None = None) -> int:
    """Umbral dentro del rango 30–85; si falta, usa el respaldo o el valor por defecto."""
    if value is None:
        value = fallback if fallback is not None else DEFAULT_THRESHOLD
    try:
        value = int(value)
    except (TypeError, ValueError):
        value = DEFAULT_THRESHOLD
    return max(MIN_THRESHOLD, min(MAX_THRESHOLD, value))


def validate_vector(vector: list[float]) -> list[float]:
    if len(vector) != VECTOR_DIM:
        raise ValueError(f"El descriptor facial debe tener {VECTOR_DIM} valores (recibido {len(vector)})")
    cleaned: list[float] = []
    for raw in vector:
        try:
            value = float(raw)
        except (TypeError, ValueError) as exc:
            raise ValueError("El descriptor facial contiene valores no numéricos") from exc
        if not math.isfinite(value):
            raise ValueError("El descriptor facial contiene valores inválidos")
        cleaned.append(max(-1.0, min(1.0, value)))
    return cleaned


def _normalize(values: list[float]) -> list[float] | None:
    total = sum(value * value for value in values)
    if total <= 1e-12:
        return None
    inv = 1.0 / math.sqrt(total)
    return [value * inv for value in values]


def face_score(stored: list[float], probe: list[float]) -> float:
    """Coincidencia 0–1 (coseno) entre la plantilla guardada y la sonda."""
    if len(stored) != VECTOR_DIM or len(probe) != VECTOR_DIM:
        return 0.0
    a = _normalize(stored)
    b = _normalize(probe)
    if a is None or b is None:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    return max(0.0, min(1.0, dot))


def score_ok(score: float, threshold: int) -> bool:
    return score * 100 >= threshold
