from __future__ import annotations

from time import perf_counter

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...algorithms.operations import run_operation
from ...core.deps import ensure_company, get_current_user, require_roles
from ...db import get_db
from ...models import Matrix, Operation, User, Vector
from ...schemas import OperationExecuteIn, OperationOut, Page
from ...services.audit import record_audit
from ..helpers import get_or_404, new_id

router = APIRouter(tags=["operations"])

OPERATION_ROLES = ("admin", "analyst")


@router.get("/companies/{company_id}/operations", response_model=Page[OperationOut])
def list_operations(
    company_id: str,
    page: int | None = Query(default=None, ge=1),
    pageSize: int | None = Query(default=None, ge=1),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Page[OperationOut]:
    ensure_company(user, company_id)
    query = (
        select(Operation)
        .where(Operation.companyId == company_id)
        .order_by(Operation.createdAt.desc())
    )
    rows = list(db.scalars(query).all())
    total = len(rows)
    if page is not None:
        size = pageSize or 20
        rows = rows[(page - 1) * size : (page - 1) * size + size]
    return Page[OperationOut](data=[OperationOut.model_validate(o) for o in rows], total=total)


@router.post("/companies/{company_id}/operations", response_model=OperationOut, status_code=201)
def execute_operation(
    company_id: str,
    body: OperationExecuteIn,
    request: Request,
    user: User = Depends(require_roles(*OPERATION_ROLES)),
    db: Session = Depends(get_db),
) -> OperationOut:
    ensure_company(user, company_id)

    vector_values: list[list[float]] = []
    for vector_id in body.inputVectorIds:
        vector = get_or_404(db, Vector, vector_id, "Vector")
        if vector.companyId != company_id:
            raise HTTPException(status_code=400, detail="Vector no autorizado")
        vector_values.append(list(vector.values))

    matrix_values: list[list[list[float]]] = []
    for matrix_id in body.inputMatrixIds:
        matrix = get_or_404(db, Matrix, matrix_id, "Matriz")
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
        operation.executionTimeMs = max(1, int(round((perf_counter() - start) * 1000)))
        db.add(operation)
        record_audit(
            db, user, action="execute", module="operaciones",
            entity_type="operation", entity_id=operation.id, status="failure",
            error=str(exc), request=request,
        )
        db.commit()
        raise HTTPException(status_code=400, detail=str(exc))

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
        db.add(vector)
        db.flush()
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
        db.add(matrix)
        db.flush()
        operation.resultMatrixId = matrix.id
    else:
        operation.parameters = {**parameters, "result": float(result["value"])}

    operation.status = "completed"
    operation.executionTimeMs = max(1, int(round((perf_counter() - start) * 1000)))
    db.add(operation)
    record_audit(
        db, user, action="execute", module="operaciones",
        entity_type="operation", entity_id=operation.id,
        new_values={"type": body.type, "name": body.name}, request=request,
    )
    db.commit()
    db.refresh(operation)
    return OperationOut.model_validate(operation)


@router.get("/operations/{operation_id}", response_model=OperationOut)
def get_operation(
    operation_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OperationOut:
    operation = get_or_404(db, Operation, operation_id, "Operación")
    ensure_company(user, operation.companyId)
    return OperationOut.model_validate(operation)


@router.delete("/operations/{operation_id}", status_code=200)
def delete_operation(
    operation_id: str,
    request: Request,
    user: User = Depends(require_roles(*OPERATION_ROLES)),
    db: Session = Depends(get_db),
) -> dict:
    operation = get_or_404(db, Operation, operation_id, "Operación")
    ensure_company(user, operation.companyId)
    record_audit(
        db, user, action="delete", module="operaciones",
        entity_type="operation", entity_id=operation.id,
        old_values={"name": operation.name}, request=request,
    )
    db.delete(operation)
    db.commit()
    return {"message": "Operación eliminada"}
