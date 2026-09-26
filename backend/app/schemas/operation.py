from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict

OperationType = Literal[
    "vector_add",
    "vector_subtract",
    "vector_scalar_multiply",
    "vector_dot_product",
    "matrix_add",
    "matrix_subtract",
    "matrix_multiply",
    "matrix_transpose",
    "matrix_scalar_multiply",
    "linear_combination",
]


class OperationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    companyId: str
    userId: str
    type: str
    name: str
    description: str
    inputVectors: list[str]
    inputMatrices: list[str]
    parameters: dict
    resultVectorId: str | None = None
    resultMatrixId: str | None = None
    status: Literal["pending", "completed", "failed"]
    errorMessage: str | None = None
    executionTimeMs: float
    createdAt: str


class OperationExecuteIn(BaseModel):
    type: OperationType
    name: str
    description: str | None = None
    inputVectorIds: list[str] = []
    inputMatrixIds: list[str] = []
    parameters: dict = {}
