"""Datos de demostración OPTATIVOS: sucursales, productos, ventas, vectores,
matrices, operaciones y metas.

La base de producción NO lleva datos demo (seed_if_empty solo crea empresa y
usuarios). Este módulo se carga por separado cuando las pruebas lo necesitan:

    python -m app.seed_demo           # solo sobre bases SQLite locales
    python -m app.seed_demo --force   # permite otras bases (con cuidado)

Es idempotente: si ya existen sucursales no hace nada.
"""
from __future__ import annotations

import os
import sys

from sqlalchemy.orm import Session

from .api.helpers import new_id
from .models import (
    AuditLog,
    Branch,
    Category,
    InventoryMovement,
    Matrix,
    Operation,
    Product,
    Sale,
    SaleDetail,
    Target,
    Vector,
)

TAX_RATE = 0.18


def _sale(
    db: Session,
    company_id: str,
    branch_id: str,
    user_id: str,
    number: str,
    date: str,
    rows: list[tuple[str, int, float]],
    ledger: list[tuple[str, float, list[tuple[str, int, float]]]],
    status: str = "confirmed",
    notes: str | None = None,
) -> Sale:
    subtotal = round(sum(qty * price for _, qty, price in rows), 2)
    tax = round(subtotal * TAX_RATE, 2)
    total = round(subtotal + tax, 2)
    sale = Sale(
        id=new_id(),
        companyId=company_id,
        branchId=branch_id,
        userId=user_id,
        saleNumber=number,
        date=f"{date}T12:00:00",
        subtotal=subtotal,
        tax=tax,
        total=total,
        status=status,
        notes=notes,
        createdAt=f"{date}T10:00:00",
        updatedAt=f"{date}T10:00:00",
    )
    for product_id, qty, price in rows:
        db.add(
            SaleDetail(
                id=new_id(),
                saleId=sale.id,
                productId=product_id,
                quantity=qty,
                unitPrice=price,
                discount=0,
                subtotal=round(qty * price, 2),
            )
        )
    db.add(sale)
    ledger.append((status, total, rows))
    return sale


def seed_demo(db: Session) -> bool:
    """Carga el escenario demo. Devuelve True si cargó datos."""
    from .models import Company

    if db.query(Company).first() is None:
        print("seed_demo: primero debe existir la empresa (arranca la app o el seed base).")
        return False
    if db.query(Branch).first() is not None:
        return False

    branches = [
        ("br1", "Lima Centro", "LIM01", "Av. Nicolás de Pirola 1550", "Lima"),
        ("br2", "Arequipa", "AYQ01", "Av. Ejército 705", "Arequipa"),
        ("br3", "Trujillo", "TRU01", "Av. América Oeste 680", "Trujillo"),
        ("br4", "Cusco", "CUZ01", "Av. El Sol 412", "Cusco"),
    ]
    for branch_id, name, code, address, city in branches:
        db.add(
            Branch(
                id=branch_id,
                companyId="1",
                name=name,
                code=code,
                address=address,
                city=city,
                country="Perú",
                phone="+51 1 555 0100",
                isActive=True,
                createdAt="2026-01-12T10:00:00+00:00",
                updatedAt="2026-01-12T10:00:00+00:00",
            )
        )

    categories = [
        ("cat1", "Computadoras", "Laptops y equipos de escritorio"),
        ("cat2", "Periféricos", "Monitores, teclados y mouse"),
        ("cat3", "Accesorios", "Impresoras, audífonos y webcams"),
    ]
    for category_id, name, description in categories:
        db.add(Category(id=category_id, companyId="1", name=name, description=description))

    products = [
        ("p1", "cat1", "HP-EB840", "Laptop HP EliteBook 840 G11", 4599.0, 3600.0, 45, 10, "unidad"),
        ("p2", "cat1", "DEL-OP7010", "PC Desktop Dell OptiPlex 7010", 3299.0, 2500.0, 30, 8, "unidad"),
        ("p3", "cat2", "SAM-M24", 'Monitor Samsung 24" FHD', 799.0, 600.0, 12, 15, "unidad"),
        ("p4", "cat2", "LOG-KMM", "Teclado Mecánico Logitech G Pro", 299.0, 180.0, 200, 20, "unidad"),
        ("p5", "cat2", "LOG-M170", "Mouse Logitech M170", 99.0, 60.0, 350, 50, "unidad"),
        ("p6", "cat3", "EPS-L3250", "Impresora Epson L3250", 1099.0, 850.0, 15, 5, "unidad"),
        ("p7", "cat3", "JBL-T520", "Audífonos JBL Tune 520BT", 199.0, 120.0, 0, 10, "unidad"),
        ("p8", "cat3", "LOG-C920", "Webcam Logitech C920", 349.0, 250.0, 60, 12, "unidad"),
    ]
    for product_id, category_id, sku, name, price, cost, stock, min_stock, unit in products:
        db.add(
            Product(
                id=product_id,
                companyId="1",
                categoryId=category_id,
                sku=sku,
                name=name,
                description=name,
                unitPrice=price,
                costPrice=cost,
                stock=stock,
                minStock=min_stock,
                unit=unit,
                isActive=True,
                createdAt="2026-01-20T10:00:00+00:00",
                updatedAt="2026-09-01T10:00:00+00:00",
            )
        )

    ledger: list[tuple[str, float, list[tuple[str, int, float]]]] = []
    _sale(db, "1", "br1", "12345678", "V-0001", "2026-09-02", [("p1", 2, 4599.0), ("p4", 2, 299.0)], ledger)
    _sale(db, "1", "br2", "44444444", "V-0002", "2026-09-03", [("p3", 4, 799.0), ("p5", 4, 99.0)], ledger)
    _sale(db, "1", "br1", "22222222", "V-0003", "2026-09-05", [("p2", 3, 3299.0)], ledger)
    _sale(db, "1", "br3", "44444444", "V-0004", "2026-09-07", [("p6", 1, 1099.0), ("p8", 2, 349.0)], ledger)
    _sale(db, "1", "br4", "44444444", "V-0005", "2026-09-08", [("p5", 6, 99.0), ("p4", 1, 299.0)], ledger)
    _sale(db, "1", "br1", "12345678", "V-0006", "2026-09-10", [("p1", 1, 4599.0), ("p8", 1, 349.0)], ledger)
    _sale(db, "1", "br2", "22222222", "V-0007", "2026-09-11", [("p2", 2, 3299.0), ("p5", 3, 99.0)], ledger)
    _sale(db, "1", "br3", "44444444", "V-0008", "2026-09-13", [("p3", 3, 799.0), ("p4", 5, 299.0)], ledger)
    _sale(db, "1", "br4", "44444444", "V-0009", "2026-09-14", [("p6", 1, 1099.0)], ledger, status="draft")
    _sale(db, "1", "br1", "22222222", "V-0010", "2026-09-16", [("p2", 4, 3299.0), ("p4", 4, 299.0)], ledger)
    _sale(db, "1", "br2", "44444444", "V-0011", "2026-09-17", [("p1", 1, 4599.0), ("p5", 2, 99.0)], ledger)
    _sale(db, "1", "br3", "44444444", "V-0012", "2026-09-19", [("p8", 3, 349.0), ("p7", 2, 199.0)], ledger)
    _sale(db, "1", "br4", "44444444", "V-0013", "2026-09-21", [("p3", 2, 799.0), ("p6", 1, 1099.0)], ledger)
    _sale(db, "1", "br1", "12345678", "V-0014", "2026-09-23", [("p1", 3, 4599.0), ("p8", 2, 349.0)], ledger)
    _sale(db, "1", "br2", "22222222", "V-0015", "2026-09-12", [("p5", 10, 99.0)], ledger, status="cancelled")

    split = {"br1": 0.4, "br2": 0.25, "br3": 0.2, "br4": 0.15}
    for product_id, _, _, _, _, _, stock, _, _ in products:
        if stock <= 0:
            continue
        for branch_id, share in split.items():
            qty = int(stock * share)
            if qty <= 0:
                continue
            db.add(
                InventoryMovement(
                    id=new_id(),
                    companyId="1",
                    branchId=branch_id,
                    productId=product_id,
                    type="in",
                    quantity=qty,
                    reference="APERTURA",
                    notes="Stock inicial por sede",
                    date="2026-09-01T12:00:00",
                    createdAt="2026-09-01T08:00:00",
                )
            )
    db.add(
        InventoryMovement(
            id=new_id(),
            companyId="1",
            branchId="br1",
            productId="p4",
            type="adjustment",
            quantity=-8,
            reference="AJ-001",
            notes="Ajuste por inventario físico",
            date="2026-09-18T12:00:00",
            createdAt="2026-09-18T15:30:00",
        )
    )
    db.add(
        InventoryMovement(
            id=new_id(),
            companyId="1",
            branchId="br2",
            productId="p1",
            type="transfer",
            quantity=2,
            reference="TR-001",
            notes="Traslado a tienda asociada",
            date="2026-09-20T12:00:00",
            createdAt="2026-09-20T11:00:00",
        )
    )

    confirmed = [(total, rows) for status, total, rows in ledger if status == "confirmed"]
    total_revenue = round(sum(total for total, _ in confirmed), 2)
    units_by_product: dict[str, int] = {}
    for _, rows in confirmed:
        for product_id, qty, _price in rows:
            units_by_product[product_id] = units_by_product.get(product_id, 0) + qty

    targets = [
        ("t1", None, None, "2026-09", 95000.0, total_revenue, "sales"),
        ("t2", "br1", None, "2026-09", 30000.0, 32000.0, "sales"),
        ("t3", "br2", None, "2026-09", 20000.0, 17500.0, "sales"),
        ("t4", "br3", None, "2026-09", 15000.0, 12800.0, "sales"),
        ("t5", None, "p1", "2026-09", 15.0, float(units_by_product.get("p1", 0)), "units"),
        ("t6", None, "p5", "2026-09", 40.0, float(units_by_product.get("p5", 0)), "units"),
        ("t7", None, None, "2026-08", 55000.0, 51200.0, "sales"),
    ]
    for target_id, branch_id, product_id, period, target_value, achieved, target_type in targets:
        db.add(
            Target(
                id=target_id,
                companyId="1",
                branchId=branch_id,
                productId=product_id,
                period=period,
                targetValue=target_value,
                achievedValue=achieved,
                type=target_type,
                createdAt="2026-08-31T10:00:00+00:00",
                updatedAt="2026-09-23T10:00:00+00:00",
            )
        )

    vectors = [
        ("v1", "Ingresos por sede (S/.)", [28500.0, 17200.0, 14300.0, 9400.0]),
        ("v2", "Costos por sede (S/.)", [18200.0, 11100.0, 9700.0, 6300.0]),
        ("v3", "Crecimiento mensual (%)", [12.5, 8.2, 5.4, 3.1]),
        ("v4", "Ponderación estratégica", [0.4, 0.3, 0.2, 0.1]),
    ]
    for vector_id, name, values in vectors:
        db.add(
            Vector(
                id=vector_id,
                companyId="1",
                name=name,
                description="Vector generado en la fase de demostración",
                dimension=len(values),
                values=values,
                source="manual",
                createdAt="2026-09-15T10:00:00+00:00",
                updatedAt="2026-09-15T10:00:00+00:00",
            )
        )

    matrices = [
        ("m1", "Matriz de prioridades", [[4.0, 2.0, 1.0], [2.0, 5.0, 3.0], [1.0, 3.0, 6.0]]),
        ("m2", "Presupuesto Q3 (miles S/.)", [[120.0, 80.0, 45.0], [75.0, 130.0, 60.0], [40.0, 65.0, 110.0]]),
        ("m3", "Costos fijos por unidad", [[15.0, 8.0], [12.0, 20.0]]),
    ]
    for matrix_id, name, values in matrices:
        rows, cols = len(values), len(values[0])
        db.add(
            Matrix(
                id=matrix_id,
                companyId="1",
                name=name,
                description="Matriz de demostración",
                rows=rows,
                cols=cols,
                values=values,
                rowLabels=[f"Fila {i + 1}" for i in range(rows)],
                colLabels=[f"Columna {j + 1}" for j in range(cols)],
                source="manual",
                createdAt="2026-09-15T11:00:00+00:00",
                updatedAt="2026-09-15T11:00:00+00:00",
            )
        )

    db.add(
        Vector(
            id="v5",
            companyId="1",
            name="Margen por sede (S/.)",
            description="Resultado de la operación: Ingresos − Costos",
            dimension=4,
            values=[10300.0, 6100.0, 4600.0, 3100.0],
            source="manual",
            createdAt="2026-09-16T09:00:00+00:00",
            updatedAt="2026-09-16T09:00:00+00:00",
        )
    )
    db.add(
        Operation(
            id="op1",
            companyId="1",
            userId="33333333",
            type="vector_subtract",
            name="Margen por sede",
            description="Ingresos − Costos por sede",
            inputVectors=["v1", "v2"],
            inputMatrices=[],
            parameters={"vectorIds": ["v1", "v2"], "matrixIds": []},
            resultVectorId="v5",
            status="completed",
            executionTimeMs=2.0,
            createdAt="2026-09-16T09:00:00+00:00",
        )
    )
    db.add(
        Matrix(
            id="m4",
            companyId="1",
            name="Prioridad × Presupuesto",
            description="Resultado de la operación: m1 × m2",
            rows=3,
            cols=3,
            values=[[1140.0, 785.0, 680.0], [1475.0, 1515.0, 1535.0], [1765.0, 1755.0, 1675.0]],
            rowLabels=["Fila 1", "Fila 2", "Fila 3"],
            colLabels=["Columna 1", "Columna 2", "Columna 3"],
            source="manual",
            createdAt="2026-09-16T09:05:00+00:00",
            updatedAt="2026-09-16T09:05:00+00:00",
        )
    )
    db.add(
        Operation(
            id="op2",
            companyId="1",
            userId="33333333",
            type="matrix_multiply",
            name="Prioridad × Presupuesto",
            description="Producto de matrices de prioridades y presupuesto",
            inputVectors=[],
            inputMatrices=["m1", "m2"],
            parameters={"vectorIds": [], "matrixIds": ["m1", "m2"]},
            resultMatrixId="m4",
            status="completed",
            executionTimeMs=3.0,
            createdAt="2026-09-16T09:05:00+00:00",
        )
    )

    db.add(
        AuditLog(
            id=new_id(),
            companyId="1",
            userId="12345678",
            action="seed",
            module="configuracion",
            entityType="database",
            entityId="1",
            status="success",
            newValues={"note": "Datos de demostración creados"},
            createdAt="2026-09-24T09:00:00+00:00",
        )
    )
    db.commit()
    return True


def main() -> int:
    force = "--force" in sys.argv
    url = os.environ.get("DATABASE_URL", "")
    if not url.startswith("sqlite") and not force:
        print("seed_demo: DATABASE_URL no es SQLite; usa --force solo si estás seguro.")
        return 1

    from .core.database import SessionLocal

    db = SessionLocal()
    try:
        loaded = seed_demo(db)
        print("Datos demo cargados." if loaded else "seed_demo: sin cambios.")
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
