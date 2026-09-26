from __future__ import annotations

from typing import Any

import numpy as np

OperationResultValue = dict[str, Any]


def _as_vector(values: list[float], label: str = "vector") -> np.ndarray:
    arr = np.asarray(values, dtype=float)
    if arr.ndim != 1 or arr.size == 0:
        raise ValueError(f"El {label} debe contener al menos un valor")
    return arr


def _require_same_dim(a: np.ndarray, b: np.ndarray) -> None:
    if a.shape != b.shape:
        raise ValueError("Los vectores deben tener la misma dimensión")


def _scalar(parameters: dict[str, Any]) -> float:
    raw = parameters.get("scalar")
    if raw is None:
        raise ValueError("Se requiere el parámetro 'scalar'")
    try:
        return float(raw)
    except (TypeError, ValueError):
        raise ValueError("El parámetro 'scalar' debe ser un número")


def vector_add(vectors: list[list[float]], parameters: dict[str, Any]) -> OperationResultValue:
    if len(vectors) != 2:
        raise ValueError("Se requieren exactamente 2 vectores")
    a, b = (_as_vector(v, f"vector {i + 1}") for i, v in enumerate(vectors))
    _require_same_dim(a, b)
    return {"kind": "vector", "value": (a + b).tolist()}


def vector_subtract(vectors: list[list[float]], parameters: dict[str, Any]) -> OperationResultValue:
    if len(vectors) != 2:
        raise ValueError("Se requieren exactamente 2 vectores")
    a, b = (_as_vector(v, f"vector {i + 1}") for i, v in enumerate(vectors))
    _require_same_dim(a, b)
    return {"kind": "vector", "value": (a - b).tolist()}


def vector_scalar_multiply(vectors: list[list[float]], parameters: dict[str, Any]) -> OperationResultValue:
    if len(vectors) != 1:
        raise ValueError("Se requiere exactamente 1 vector")
    a = _as_vector(vectors[0])
    return {"kind": "vector", "value": (a * _scalar(parameters)).tolist()}


def vector_dot_product(vectors: list[list[float]], parameters: dict[str, Any]) -> OperationResultValue:
    if len(vectors) != 2:
        raise ValueError("Se requieren exactamente 2 vectores")
    a, b = (_as_vector(v, f"vector {i + 1}") for i, v in enumerate(vectors))
    _require_same_dim(a, b)
    return {"kind": "scalar", "value": float(np.dot(a, b))}
