from __future__ import annotations

from typing import Any

import numpy as np

from .vector_ops import OperationResultValue, _as_vector


def linear_combination(vectors: list[list[float]], parameters: dict[str, Any]) -> OperationResultValue:
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
