from __future__ import annotations

from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from .api.helpers import new_id
from .core.security import hash_password
from .models import (
    AuditLog,
    Company,
    Matrix,
    MatrixValue,
    Operation,
    OperationInput,
    OperationResult,
    Role,
    User,
    Vector,
    VectorValue,
)

# Catálogo de roles y permisos (tabla `roles` del Plan Maestro, sección 13).
# Los permisos reflejan los módulos reales del sistema (frontend ROLE_MODULES).
ROLES_SEED: list[tuple[str, str, str, list[str]]] = [
    (
        "admin",
        "Administrador",
        "Usuarios, empresa, ventas, inventario, matrices, vectores, operaciones, reportes y configuración",
        [
            "dashboard", "empresa", "sucursales", "productos", "ventas", "inventario",
            "vectores", "matrices", "operaciones", "combinaciones", "historial",
            "reportes", "usuarios", "identidad", "geografia", "configuracion",
        ],
    ),
    (
        "manager",
        "Gerente",
        "Empresa, sucursales, productos, ventas, inventario, reportes y geografía",
        [
            "dashboard", "empresa", "sucursales", "productos", "ventas", "inventario",
            "reportes", "identidad", "geografia", "configuracion",
        ],
    ),
    (
        "analyst",
        "Analista",
        "Vectores, matrices, operaciones, combinaciones lineales e historial",
        [
            "dashboard", "vectores", "matrices", "operaciones", "combinaciones",
            "historial", "identidad", "configuracion",
        ],
    ),
    (
        "operator",
        "Operario",
        "Ventas e inventario",
        ["dashboard", "ventas", "inventario", "identidad", "configuracion"],
    ),
    (
        "consulta",
        "Consulta",
        "Dashboard y reportes autorizados",
        ["dashboard", "reportes"],
    ),
]


def ensure_roles(db: Session) -> None:
    """Crea (si faltan) las filas de la tabla `roles`."""
    for name, label, description, permissions in ROLES_SEED:
        exists = db.scalar(select(Role).where(Role.name == name))
        if exists is None:
            db.add(
                Role(
                    id=uuid4().hex,
                    name=name,
                    label=label,
                    description=description,
                    permissions=list(permissions),
                )
            )
    db.commit()


def _backfill_vector_values(db: Session) -> None:
    for vector in db.scalars(select(Vector)).all():
        if vector.valueRows or not vector.valuesJson:
            continue
        for index, raw in enumerate(vector.valuesJson):
            vector.valueRows.append(
                VectorValue(id=uuid4().hex, vectorId=vector.id, position=index, value=float(raw))
            )
    db.flush()


def _backfill_matrix_values(db: Session) -> None:
    for matrix in db.scalars(select(Matrix)).all():
        if matrix.valueRows or not matrix.valuesJson:
            continue
        for row_index, row in enumerate(matrix.valuesJson):
            for col_index, raw in enumerate(row):
                matrix.valueRows.append(
                    MatrixValue(
                        id=uuid4().hex,
                        matrixId=matrix.id,
                        row=row_index,
                        col=col_index,
                        value=float(raw),
                    )
                )
    db.flush()


def _backfill_operation_children(db: Session) -> None:
    for operation in db.scalars(select(Operation)).all():
        if not operation.inputRows:
            position = 0
            for vector_id in operation.inputVectors or []:
                vector = db.get(Vector, vector_id)
                operation.inputRows.append(
                    OperationInput(
                        id=uuid4().hex,
                        operationId=operation.id,
                        position=position,
                        kind="vector",
                        refId=vector_id,
                        label=vector.name if vector else "",
                        values=[float(x) for x in (vector.valuesJson or [])] if vector else [],
                    )
                )
                position += 1
            for matrix_id in operation.inputMatrices or []:
                matrix = db.get(Matrix, matrix_id)
                operation.inputRows.append(
                    OperationInput(
                        id=uuid4().hex,
                        operationId=operation.id,
                        position=position,
                        kind="matrix",
                        refId=matrix_id,
                        label=matrix.name if matrix else "",
                        values=[list(r) for r in (matrix.valuesJson or [])] if matrix else [],
                    )
                )
                position += 1
        if not operation.resultRows:
            if operation.resultVectorId:
                vector = db.get(Vector, operation.resultVectorId)
                operation.resultRows.append(
                    OperationResult(
                        id=uuid4().hex,
                        operationId=operation.id,
                        kind="vector",
                        refId=operation.resultVectorId,
                        values=[float(x) for x in (vector.valuesJson or [])] if vector else [],
                    )
                )
            elif operation.resultMatrixId:
                matrix = db.get(Matrix, operation.resultMatrixId)
                operation.resultRows.append(
                    OperationResult(
                        id=uuid4().hex,
                        operationId=operation.id,
                        kind="matrix",
                        refId=operation.resultMatrixId,
                        values=[list(r) for r in (matrix.valuesJson or [])] if matrix else [],
                    )
                )
            elif operation.parameters and operation.parameters.get("result") is not None:
                operation.resultRows.append(
                    OperationResult(
                        id=uuid4().hex,
                        operationId=operation.id,
                        kind="scalar",
                        refId=None,
                        values=[float(operation.parameters["result"])],
                    )
                )
    db.flush()


def sync_plan(db: Session) -> None:
    """Sincroniza las tablas del Plan Maestro (idempotente, seguro por arranque).

    - roles: catálogo de roles y permisos (los 5 roles del sistema, incluido Consulta).
    - vector_values / matrix_values: valores normalizados fuera de las columnas JSON.
    - operation_inputs / operation_results: entradas y resultados de cada operación.
    """
    try:
        ensure_roles(db)
        _backfill_vector_values(db)
        _backfill_matrix_values(db)
        _backfill_operation_children(db)
        db.commit()
    except Exception:
        db.rollback()
        raise



def seed_if_empty(db: Session) -> None:
    """Crea solo los datos base (empresa y usuarios de acceso).

    Los datos operativos (sucursales, productos, ventas, vectores,
    matrices, etc.) se cargan desde la interfaz por el usuario.
    """
    if db.query(Company).first() is not None:
        return

    company = Company(
        id="1",
        name="MatrixFlow Comercial S.A.C.",
        legalName="MatrixFlow Comercial Sociedad Anónima Cerrada",
        taxId="20123456789",
        address="Av. Javier Prado Este 1234, San Borja",
        city="Lima",
        country="Perú",
        phone="+51 1 555 0123",
        createdAt="2026-01-10T10:00:00+00:00",
        updatedAt="2026-01-10T10:00:00+00:00",
    )
    db.add(company)

    users = [
        ("12345678", "Administrador MatrixFlow", "admin"),
        ("22222222", "Carmen Salazar", "manager"),
        ("33333333", "Diego Quispe", "analyst"),
        ("44444444", "Lucía Huamán", "operator"),
    ]
    for dni, name, role in users:
        db.add(
            User(
                id=dni,
                companyId="1",
                name=name,
                dni=dni,
                role=role,
                passwordHash=hash_password("Matrix@2026"),
                createdAt="2026-01-15T10:00:00+00:00",
                updatedAt="2026-01-15T10:00:00+00:00",
            )
        )

    db.add(
        AuditLog(
            id=new_id(),
            companyId="1",
            userId="",
            action="seed",
            module="configuracion",
            entityType="database",
            entityId="1",
            status="success",
            newValues={"note": "Datos base creados (empresa y usuarios)"},
            createdAt="2026-01-10T10:05:00+00:00",
        )
    )

    db.commit()
