from __future__ import annotations

from typing import Any

from .linear_comb import linear_combination
from .matrix_ops import (
    matrix_add,
    matrix_multiply,
    matrix_scalar_multiply,
    matrix_subtract,
    matrix_transpose,
)
from .vector_ops import (
    OperationResultValue,
    vector_add,
    vector_dot_product,
    vector_scalar_multiply,
    vector_subtract,
)

__all__ = [
    "OperationResultValue",
    "linear_combination",
    "matrix_add",
    "matrix_multiply",
    "matrix_scalar_multiply",
    "matrix_subtract",
    "matrix_transpose",
    "run_operation",
    "vector_add",
    "vector_dot_product",
    "vector_scalar_multiply",
    "vector_subtract",
]


def run_operation(
    op_type: str,
    vectors: list[list[float]],
    matrices: list[list[list[float]]],
    parameters: dict[str, Any],
) -> OperationResultValue:
    if op_type == "vector_add":
        return vector_add(vectors, parameters)

    if op_type == "vector_subtract":
        return vector_subtract(vectors, parameters)

    if op_type == "vector_scalar_multiply":
        return vector_scalar_multiply(vectors, parameters)

    if op_type == "vector_dot_product":
        return vector_dot_product(vectors, parameters)

    if op_type == "matrix_add":
        return matrix_add(matrices, parameters)

    if op_type == "matrix_subtract":
        return matrix_subtract(matrices, parameters)

    if op_type == "matrix_multiply":
        return matrix_multiply(matrices, parameters)

    if op_type == "matrix_transpose":
        return matrix_transpose(matrices, parameters)

    if op_type == "matrix_scalar_multiply":
        return matrix_scalar_multiply(matrices, parameters)

    if op_type == "linear_combination":
        return linear_combination(vectors, parameters)

    raise ValueError(f"Tipo de operación no soportado: {op_type}")
