from __future__ import annotations

from time import perf_counter

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..algorithms.operations import run_operation
from ..models import Matrix, Operation, User, Vector
from ..api.helpers import get_or_404, new_id
from ..repositories.operation_repository import OperationRepository
from ..schemas import OperationExecuteIn, OperationOut, Page


class OperationService:
    """Flujo 9.3: FastAPI → Pydantic → Operation Service → NumPy → historial → JSON."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = OperationRepository(db)

    def list_page(
        self, company_id: str, page: int | None, page_size: int | None
    ) -> Page[OperationOut]:
        return self.repo.list_page(company_id, page, page_size)

    def execute(
        self, company_id: str, body: OperationExecuteIn, user: User
    ) -> Operation:
        vector_values: list[list[float]] = []
        for vector_id in body.inputVectorIds:
            vector = get_or_404(self.db, Vector, vector_id, "Vector")
            if vector.companyId != company_id:
                raise HTTPException(status_code=400, detail="Vector no autorizado")
            vector_values.append(list(vector.values))

        matrix_values: list[list[list[float]]] = []
        for matrix_id in body.inputMatrixIds:
            matrix = get_or_404(self.db, Matrix, matrix_id, "Matriz")
            if matrix.companyId != company_id:
                raise HTTPException(status_code=400, detail="Matriz no autorizada")
            matrix_values.append([list(row) for row in matrix.values])

        parameters = dict(body.parameters or {})
        parameters["vectorIds"] = list(body.inputVectorIds)
        parameters["matrixIds"] = list(body.inputMatrixIds)

        operation = Operation(
            id=new_id(),
            companyId=company_id,
            userId=user.id,
            type=body.type,
            name=body.name,
            description=body.description or "",
            inputVectors=list(body.inputVectorIds),
            inputMatrices=list(body.inputMatrixIds),
            parameters=parameters,
            status="pending",
        )

        start = perf_counter()
        try:
            result = run_operation(body.type, vector_values, matrix_values, parameters)
        except ValueError as exc:
            operation.status = "failed"
            operation.errorMessage = str(exc)
            operation.executionTimeMs = max(
                1, int(round((perf_counter() - start) * 1000))
            )
            self.repo.add(operation)
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        if result["kind"] == "vector":
            value = [float(x) for x in result["value"]]
            vector = Vector(
                id=new_id(),
                companyId=company_id,
                name=operation.name,
                description=f"Resultado de la operación: {operation.name}",
                dimension=len(value),
                values=value,
                source="manual",
            )
            self.db.add(vector)
            self.db.flush()
            operation.resultVectorId = vector.id
        elif result["kind"] == "matrix":
            value = [[float(x) for x in row] for row in result["value"]]
            rows, cols = len(value), len(value[0])
            matrix = Matrix(
                id=new_id(),
                companyId=company_id,
                name=operation.name,
                description=f"Resultado de la operación: {operation.name}",
                rows=rows,
                cols=cols,
                values=value,
                rowLabels=[f"Fila {i + 1}" for i in range(rows)],
                colLabels=[f"Columna {j + 1}" for j in range(cols)],
                source="manual",
            )
            self.db.add(matrix)
            self.db.flush()
            operation.resultMatrixId = matrix.id
        else:
            operation.parameters = {**parameters, "result": float(result["value"])}

        operation.status = "completed"
        operation.executionTimeMs = max(1, int(round((perf_counter() - start) * 1000)))
        self.repo.add(operation)
        return operation

    def get(self, operation_id: str) -> Operation:
        operation = self.repo.get(operation_id)
        if operation is None:
            raise HTTPException(status_code=404, detail="Operación no encontrada")
        return operation

    def delete(self, operation_id: str) -> None:
        operation = self.get(operation_id)
        self.repo.delete(operation)
