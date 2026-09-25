from __future__ import annotations

from typing import Any

import numpy as np

OperationResultValue = dict[str, Any]


def _as_vector(values: list[float], label: str = "vector") -> np.ndarray:
    arr = np.asarray(values, dtype=float)
    if arr.ndim != 1 or arr.size == 0:
        raise ValueError(f"El {label} debe contener al menos un valor")
    return arr


def _as_matrix(values: list[list[float]], label: str = "matriz") -> np.ndarray:
    arr = np.asarray(values, dtype=float)
    if arr.ndim != 2 or arr.size == 0:
        raise ValueError(f"La {label} debe ser una matriz no vacía")
    return arr


def _require_same_dim(a: np.ndarray, b: np.ndarray) -> None:
    if a.shape != b.shape:
        raise ValueError("Los vectores deben tener la misma dimensión")


def _require_same_shape(a: np.ndarray, b: np.ndarray) -> None:
    if a.shape != b.shape:
        raise ValueError("Las matrices deben tener las mismas dimensiones")


def _scalar(parameters: dict[str, Any]) -> float:
    raw = parameters.get("scalar")
    if raw is None:
        raise ValueError("Se requiere el parámetro 'scalar'")
    try:
        return float(raw)
    except (TypeError, ValueError):
        raise ValueError("El parámetro 'scalar' debe ser un número")


def run_operation(
    op_type: str,
    vectors: list[list[float]],
    matrices: list[list[list[float]]],
    parameters: dict[str, Any],
) -> OperationResultValue:
    if op_type == "vector_add":
        if len(vectors) != 2:
            raise ValueError("Se requieren exactamente 2 vectores")
        a, b = (_as_vector(v, f"vector {i + 1}") for i, v in enumerate(vectors))
        _require_same_dim(a, b)
        return {"kind": "vector", "value": (a + b).tolist()}

    if op_type == "vector_subtract":
        if len(vectors) != 2:
            raise ValueError("Se requieren exactamente 2 vectores")
        a, b = (_as_vector(v, f"vector {i + 1}") for i, v in enumerate(vectors))
        _require_same_dim(a, b)
        return {"kind": "vector", "value": (a - b).tolist()}

    if op_type == "vector_scalar_multiply":
        if len(vectors) != 1:
            raise ValueError("Se requiere exactamente 1 vector")
        a = _as_vector(vectors[0])
        return {"kind": "vector", "value": (a * _scalar(parameters)).tolist()}

    if op_type == "vector_dot_product":
        if len(vectors) != 2:
            raise ValueError("Se requieren exactamente 2 vectores")
        a, b = (_as_vector(v, f"vector {i + 1}") for i, v in enumerate(vectors))
        _require_same_dim(a, b)
        return {"kind": "scalar", "value": float(np.dot(a, b))}

    if op_type == "matrix_add":
        if len(matrices) != 2:
            raise ValueError("Se requieren exactamente 2 matrices")
        a, b = (_as_matrix(m, f"matriz {i + 1}") for i, m in enumerate(matrices))
        _require_same_shape(a, b)
        return {"kind": "matrix", "value": (a + b).tolist()}

    if op_type == "matrix_subtract":
        if len(matrices) != 2:
            raise ValueError("Se requieren exactamente 2 matrices")
        a, b = (_as_matrix(m, f"matriz {i + 1}") for i, m in enumerate(matrices))
        _require_same_shape(a, b)
        return {"kind": "matrix", "value": (a - b).tolist()}

    if op_type == "matrix_multiply":
        if len(matrices) != 2:
            raise ValueError("Se requieren exactamente 2 matrices")
        a, b = (_as_matrix(m, f"matriz {i + 1}") for i, m in enumerate(matrices))
        if a.shape[1] != b.shape[0]:
            raise ValueError("Las columnas de la primera matriz deben coincidir con las filas de la segunda")
        return {"kind": "matrix", "value": (a @ b).tolist()}

    if op_type == "matrix_transpose":
        if len(matrices) != 1:
            raise ValueError("Se requiere exactamente 1 matriz")
        return {"kind": "matrix", "value": _as_matrix(matrices[0]).T.tolist()}

    if op_type == "matrix_scalar_multiply":
        if len(matrices) != 1:
            raise ValueError("Se requiere exactamente 1 matriz")
        return {"kind": "matrix", "value": (_as_matrix(matrices[0]) * _scalar(parameters)).tolist()}

    if op_type == "linear_combination":
        if not vectors:
            raise ValueError("Se requiere al menos 1 vector")
        prepared = [_as_vector(v, f"vector {i + 1}") for i, v in enumerate(vectors)]
        first = prepared[0]
        for i, v in enumerate(prepared[1:], start=2):
            if v.shape != first.shape:
                raise ValueError("Todos los vectores deben tener la misma dimensión")
        raw_weights = parameters.get("weights")
        ids = parameters.get("vectorIds") or []
        if isinstance(raw_weights, dict) and ids:
            weights = [float(raw_weights.get(vid, 1.0)) for vid in ids]
        elif isinstance(raw_weights, dict) and len(raw_weights) == len(prepared):
            weights = [float(w) for w in raw_weights.values()]
        elif isinstance(raw_weights, list) and len(raw_weights) == len(prepared):
            weights = [float(w) for w in raw_weights]
        else:
            weights = [1.0] * len(prepared)
        if len(weights) != len(prepared):
            raise ValueError("Se requiere un peso por cada vector")
        result = np.zeros_like(first)
        for weight, vector in zip(weights, prepared):
            result = result + weight * vector
        return {"kind": "vector", "value": result.tolist()}

    raise ValueError(f"Tipo de operación no soportado: {op_type}")
