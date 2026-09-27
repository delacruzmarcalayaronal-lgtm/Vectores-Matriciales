"""Verificación facial: descriptor, umbral y puntaje de coincidencia.

El descriptor viaja desde el frontend como un vector plano:
  - geometría: 400 puntos (x, y, z) de profundidad normalizados  -> 1200 valores
  - apariencia: miniatura 24x24 en escala de grises normalizada    ->  576 valores
Total: 1776 valores en [-1, 1].

El puntaje es una correlación (Pearson) ponderada: la geometría aporta 15%
y la apariencia 85%. El resultado va de 0 a 1 y se compara contra el umbral
de confianza expresado en porcentaje (30 a 70).
"""

from __future__ import annotations

import math

GEOM_POINTS = 400
GEOM_DIM = GEOM_POINTS * 3
APP_DIM = 24 * 24
VECTOR_DIM = GEOM_DIM + APP_DIM

MAX_POINTS = GEOM_POINTS
MIN_THRESHOLD = 30
MAX_THRESHOLD = 70
DEFAULT_THRESHOLD = 50

GEOM_WEIGHT = 0.15
APP_WEIGHT = 0.85


def clamp_threshold(value: int | None, fallback: int | None = None) -> int:
    """Umbral dentro del rango 30–70; si falta, usa el respaldo o el valor por defecto."""
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


def _pearson(a: list[float], b: list[float]) -> float:
    n = len(a)
    if n == 0 or n != len(b):
        return 0.0
    mean_a = sum(a) / n
    mean_b = sum(b) / n
    num = 0.0
    var_a = 0.0
    var_b = 0.0
    for x, y in zip(a, b):
        da = x - mean_a
        db = y - mean_b
        num += da * db
        var_a += da * da
        var_b += db * db
    if var_a <= 1e-12 or var_b <= 1e-12:
        return 0.0
    corr = num / math.sqrt(var_a * var_b)
    return max(-1.0, min(1.0, corr))


def face_score(stored: list[float], probe: list[float]) -> float:
    """Coincidencia 0–1 entre la plantilla guardada y el rostro capturado."""
    if len(stored) != VECTOR_DIM or len(probe) != VECTOR_DIM:
        return 0.0
    geom = max(0.0, _pearson(stored[:GEOM_DIM], probe[:GEOM_DIM]))
    app = max(0.0, _pearson(stored[GEOM_DIM:], probe[GEOM_DIM:]))
    score = GEOM_WEIGHT * geom + APP_WEIGHT * app
    return max(0.0, min(1.0, score))


def score_ok(score: float, threshold: int) -> bool:
    return score * 100 >= threshold
