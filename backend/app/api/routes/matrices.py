from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.deps import ensure_company, get_current_user, require_roles
from ...db import get_db
from ...models import Matrix, User
from ...schemas import MatrixOut, MatrixUpsert
from ...services.audit import record_audit
from ..helpers import apply_changes, get_or_404, new_id

router = APIRouter(tags=["matrices"])

MATRIX_ROLES = ("admin", "analyst")


def _normalize(values: list[list[float]] | None) -> list[list[float]]:
    if not values:
        raise HTTPException(status_code=400, detail="La matriz debe contener valores")
    width = len(values[0])
    if width == 0:
        raise HTTPException(status_code=400, detail="La matriz debe contener valores")
    normalized: list[list[float]] = []
    for row in values:
        if len(row) != width:
            raise HTTPException(status_code=400, detail="La matriz debe ser rectangular")
        normalized.append([float(x) for x in row])
    return normalized


@router.get("/companies/{company_id}/matrices", response_model=list[MatrixOut])
def list_matrices(
    company_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MatrixOut]:
    ensure_company(user, company_id)
    matrices = db.scalars(
        select(Matrix).where(Matrix.companyId == company_id).order_by(Matrix.createdAt.desc())
    ).all()
    return [MatrixOut.model_validate(m) for m in matrices]


@router.post("/companies/{company_id}/matrices", response_model=MatrixOut, status_code=201)
def create_matrix(
    company_id: str,
    body: MatrixUpsert,
    request: Request,
    user: User = Depends(require_roles(*MATRIX_ROLES)),
    db: Session = Depends(get_db),
) -> MatrixOut:
    ensure_company(user, company_id)
    changes = body.model_dump(exclude_unset=True)
    if not changes.get("name"):
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")
    values = _normalize(changes.get("values"))
    rows, cols = len(values), len(values[0])
    row_labels = changes.get("rowLabels")
    col_labels = changes.get("colLabels")
    matrix = Matrix(
        id=new_id(),
        companyId=company_id,
        name=changes.pop("name"),
        description=changes.pop("description", "") or "",
        rows=rows,
        cols=cols,
        values=values,
        rowLabels=row_labels if row_labels is not None else [f"Fila {i + 1}" for i in range(rows)],
        colLabels=col_labels if col_labels is not None else [f"Columna {j + 1}" for j in range(cols)],
        source=changes.pop("source", "manual") or "manual",
        sourceConfig=changes.pop("sourceConfig", None),
    )
    db.add(matrix)
    record_audit(
        db, user, action="create", module="matrices",
        entity_type="matrix", entity_id=matrix.id,
        new_values={"name": matrix.name, "rows": rows, "cols": cols}, request=request,
    )
    db.commit()
    db.refresh(matrix)
    return MatrixOut.model_validate(matrix)


@router.get("/matrices/{matrix_id}", response_model=MatrixOut)
def get_matrix(
    matrix_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MatrixOut:
    matrix = get_or_404(db, Matrix, matrix_id, "Matriz")
    ensure_company(user, matrix.companyId)
    return MatrixOut.model_validate(matrix)


@router.put("/matrices/{matrix_id}", response_model=MatrixOut)
def update_matrix(
    matrix_id: str,
    body: MatrixUpsert,
    request: Request,
    user: User = Depends(require_roles(*MATRIX_ROLES)),
    db: Session = Depends(get_db),
) -> MatrixOut:
    matrix = get_or_404(db, Matrix, matrix_id, "Matriz")
    ensure_company(user, matrix.companyId)
    changes = body.model_dump(exclude_unset=True)
    if "values" in changes:
        values = _normalize(changes["values"])
        changes["values"] = values
        changes["rows"] = len(values)
        changes["cols"] = len(values[0])
        if "rowLabels" not in changes:
            changes["rowLabels"] = [f"Fila {i + 1}" for i in range(len(values))]
        if "colLabels" not in changes:
            changes["colLabels"] = [f"Columna {j + 1}" for j in range(len(values[0]))]
    apply_changes(matrix, changes)
    record_audit(
        db, user, action="update", module="matrices",
        entity_type="matrix", entity_id=matrix.id, new_values=changes, request=request,
    )
    db.commit()
    db.refresh(matrix)
    return MatrixOut.model_validate(matrix)


@router.delete("/matrices/{matrix_id}", status_code=200)
def delete_matrix(
    matrix_id: str,
    request: Request,
    user: User = Depends(require_roles(*MATRIX_ROLES)),
    db: Session = Depends(get_db),
) -> dict:
    matrix = get_or_404(db, Matrix, matrix_id, "Matriz")
    ensure_company(user, matrix.companyId)
    record_audit(
        db, user, action="delete", module="matrices",
        entity_type="matrix", entity_id=matrix.id,
        old_values={"name": matrix.name}, request=request,
    )
    db.delete(matrix)
    db.commit()
    return {"message": "Matriz eliminada"}
