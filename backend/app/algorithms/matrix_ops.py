from __future__ import annotations

from typing import Any

import numpy as np

from .vector_ops import OperationResultValue, _scalar


def _as_matrix(values: list[list[float]], label: str = "matriz") -> np.ndarray:
    arr = np.asarray(values, dtype=float)
    if arr.ndim != 2 or arr.size == 0:
        raise ValueError(f"La {label} debe ser una matriz no vacía")
    return arr


def _require_same_shape(a: np.ndarray, b: np.ndarray) -> None:
    if a.shape != b.shape:
        raise ValueError("Las matrices deben tener las mismas dimensiones")


def matrix_add(matrices: list[list[list[float]]], parameters: dict[str, Any]) -> OperationResultValue:
    if len(matrices) != 2:
        raise ValueError("Se requieren exactamente 2 matrices")
    a, b = (_as_matrix(m, f"matriz {i + 1}") for i, m in enumerate(matrices))
    _require_same_shape(a, b)
    return {"kind": "matrix", "value": (a + b).tolist()}


def matrix_subtract(matrices: list[list[list[float]]], parameters: dict[str, Any]) -> OperationResultValue:
    if len(matrices) != 2:
        raise ValueError("Se requieren exactamente 2 matrices")
    a, b = (_as_matrix(m, f"matriz {i + 1}") for i, m in enumerate(matrices))
    _require_same_shape(a, b)
    return {"kind": "matrix", "value": (a - b).tolist()}


def matrix_multiply(matrices: list[list[list[float]]], parameters: dict[str, Any]) -> OperationResultValue:
    if len(matrices) != 2:
        raise ValueError("Se requieren exactamente 2 matrices")
    a, b = (_as_matrix(m, f"matriz {i + 1}") for i, m in enumerate(matrices))
    if a.shape[1] != b.shape[0]:
        raise ValueError("Las columnas de la primera matriz deben coincidir con las filas de la segunda")
    return {"kind": "matrix", "value": (a @ b).tolist()}


def matrix_transpose(matrices: list[list[list[float]]], parameters: dict[str, Any]) -> OperationResultValue:
    if len(matrices) != 1:
        raise ValueError("Se requiere exactamente 1 matriz")
    return {"kind": "matrix", "value": _as_matrix(matrices[0]).T.tolist()}


def matrix_scalar_multiply(matrices: list[list[list[float]]], parameters: dict[str, Any]) -> OperationResultValue:
    if len(matrices) != 1:
        raise ValueError("Se requiere exactamente 1 matriz")
    return {"kind": "matrix", "value": (_as_matrix(matrices[0]) * _scalar(parameters)).tolist()}
