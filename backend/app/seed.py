from __future__ import annotations

from sqlalchemy.orm import Session

from .api.helpers import new_id
from .core.security import hash_password
from .models import AuditLog, Company, User


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
