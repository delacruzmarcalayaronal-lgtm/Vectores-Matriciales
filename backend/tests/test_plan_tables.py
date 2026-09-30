from __future__ import annotations

from app.core.database import SessionLocal
from app.models import (
    MatrixValue,
    Operation,
    OperationInput,
    OperationResult,
    Role,
    Vector,
    VectorValue,
)
from app.seed import sync_plan


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestRolesTable:
    def test_roles_table_seeded_with_plan_roles(self, client):
        db = SessionLocal()
        try:
            roles = db.query(Role).all()
            names = {r.name for r in roles}
            assert names == {"admin", "manager", "analyst", "operator", "consulta"}
            consulta = next(r for r in roles if r.name == "consulta")
            assert consulta.label == "Consulta"
            assert consulta.permissions == ["dashboard", "reportes"]
            admin = next(r for r in roles if r.name == "admin")
            assert "usuarios" in admin.permissions and "reportes" in admin.permissions
        finally:
            db.close()

    def test_sync_plan_idempotent(self, client):
        db = SessionLocal()
        try:
            before = (
                db.query(Role).count(),
                db.query(VectorValue).count(),
                db.query(MatrixValue).count(),
                db.query(OperationInput).count(),
                db.query(OperationResult).count(),
            )
            sync_plan(db)
            after = (
                db.query(Role).count(),
                db.query(VectorValue).count(),
                db.query(MatrixValue).count(),
                db.query(OperationInput).count(),
                db.query(OperationResult).count(),
            )
            assert before == after
        finally:
            db.close()


class TestVectorValuesTable:
    def test_create_write_and_read(self, client, admin_token):
        r = client.post(
            "/api/v1/companies/1/vectors",
            headers=_auth(admin_token),
            json={"name": "Vector Plan Maestro", "values": [1.5, 2.5, 3.5]},
        )
        assert r.status_code == 201, r.text
        vector_id = r.json()["id"]

        db = SessionLocal()
        try:
            rows = (
                db.query(VectorValue)
                .filter(VectorValue.vectorId == vector_id)
                .order_by(VectorValue.position)
                .all()
            )
            assert [row.value for row in rows] == [1.5, 2.5, 3.5]
        finally:
            db.close()

        got = client.get(f"/api/v1/vectors/{vector_id}", headers=_auth(admin_token))
        assert got.status_code == 200
        assert got.json()["values"] == [1.5, 2.5, 3.5]

        upd = client.put(
            f"/api/v1/vectors/{vector_id}",
            headers=_auth(admin_token),
            json={"values": [9.0, 8.0]},
        )
        assert upd.status_code == 200, upd.text
        assert upd.json()["dimension"] == 2

        db = SessionLocal()
        try:
            rows = (
                db.query(VectorValue)
                .filter(VectorValue.vectorId == vector_id)
                .order_by(VectorValue.position)
                .all()
            )
            assert [row.value for row in rows] == [9.0, 8.0]
        finally:
            db.close()

        dele = client.delete(f"/api/v1/vectors/{vector_id}", headers=_auth(admin_token))
        assert dele.status_code == 200

        db = SessionLocal()
        try:
            assert (
                db.query(VectorValue).filter(VectorValue.vectorId == vector_id).count()
                == 0
            )
        finally:
            db.close()


class TestMatrixValuesTable:
    def test_create_and_roundtrip(self, client, admin_token):
        r = client.post(
            "/api/v1/companies/1/matrices",
            headers=_auth(admin_token),
            json={"name": "Matriz Plan Maestro", "values": [[1.0, 2.0], [3.0, 4.0]]},
        )
        assert r.status_code == 201, r.text
        matrix_id = r.json()["id"]

        db = SessionLocal()
        try:
            cells = (
                db.query(MatrixValue)
                .filter(MatrixValue.matrixId == matrix_id)
                .order_by(MatrixValue.row, MatrixValue.col)
                .all()
            )
            got = {(cell.row, cell.col): cell.value for cell in cells}
            assert got == {(0, 0): 1.0, (0, 1): 2.0, (1, 0): 3.0, (1, 1): 4.0}
        finally:
            db.close()

        got = client.get(f"/api/v1/matrices/{matrix_id}", headers=_auth(admin_token))
        assert got.status_code == 200
        assert got.json()["values"] == [[1.0, 2.0], [3.0, 4.0]]

        dele = client.delete(
            f"/api/v1/matrices/{matrix_id}", headers=_auth(admin_token)
        )
        assert dele.status_code == 200

        db = SessionLocal()
        try:
            assert (
                db.query(MatrixValue).filter(MatrixValue.matrixId == matrix_id).count()
                == 0
            )
        finally:
            db.close()


class TestOperationChildrenTables:
    def test_inputs_and_results_persisted(self, client, admin_token):
        headers = _auth(admin_token)
        va = client.post(
            "/api/v1/companies/1/vectors",
            headers=headers,
            json={"name": "Entrada A", "values": [1.0, 2.0, 3.0]},
        ).json()["id"]
        vb = client.post(
            "/api/v1/companies/1/vectors",
            headers=headers,
            json={"name": "Entrada B", "values": [4.0, 5.0, 6.0]},
        ).json()["id"]

        r = client.post(
            "/api/v1/companies/1/operations",
            headers=headers,
            json={
                "type": "vector_add",
                "name": "Suma del plan",
                "inputVectorIds": [va, vb],
            },
        )
        assert r.status_code == 201, r.text
        operation = r.json()
        operation_id = operation["id"]
        assert operation["status"] == "completed"
        assert operation["resultVectorId"]

        db = SessionLocal()
        try:
            inputs = (
                db.query(OperationInput)
                .filter(OperationInput.operationId == operation_id)
                .order_by(OperationInput.position)
                .all()
            )
            assert len(inputs) == 2
            assert [i.kind for i in inputs] == ["vector", "vector"]
            assert [i.refId for i in inputs] == [va, vb]
            assert [i.label for i in inputs] == ["Entrada A", "Entrada B"]
            assert [i.values for i in inputs] == [[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]]

            results = (
                db.query(OperationResult)
                .filter(OperationResult.operationId == operation_id)
                .all()
            )
            assert len(results) == 1
            assert results[0].kind == "vector"
            assert results[0].refId == operation["resultVectorId"]
            assert results[0].values == [5.0, 7.0, 9.0]

            demo = db.query(Operation).filter(Operation.id == "op1").first()
            if demo is not None:
                assert len(demo.inputRows) == 2
                assert len(demo.resultRows) == 1
        finally:
            db.close()

        got = client.get(f"/api/v1/operations/{operation_id}", headers=headers)
        assert got.status_code == 200
        assert got.json()["inputVectors"] == [va, vb]


class TestConsultaRole:
    def test_dashboard_reports_ok_and_math_403(self, client, admin_token):
        create = client.post(
            "/api/v1/companies/1/users",
            headers=_auth(admin_token),
            json={
                "name": "Rosa Vílchez",
                "dni": "55555555",
                "role": "consulta",
                "password": "Matrix@2026",
            },
        )
        assert create.status_code == 201, create.text
        assert create.json()["role"] == "consulta"

        login = client.post("/api/v1/auth/login", json={"dni": "55555555"})
        assert login.status_code == 200, login.text
        token = login.json()["accessToken"]
        headers = _auth(token)

        me = client.get("/api/v1/auth/me", headers=headers)
        assert me.status_code == 200
        assert me.json()["role"] == "consulta"

        dashboard = client.get("/api/v1/companies/1/reports/dashboard", headers=headers)
        assert dashboard.status_code == 200

        vectors = client.get("/api/v1/companies/1/vectors", headers=headers)
        assert vectors.status_code == 403

        create_vector = client.post(
            "/api/v1/companies/1/vectors",
            headers=headers,
            json={"name": "No debe crearse", "values": [1.0]},
        )
        assert create_vector.status_code == 403

        execute = client.post(
            "/api/v1/companies/1/operations",
            headers=headers,
            json={"type": "vector_add", "name": "No debe ejecutarse", "inputVectorIds": []},
        )
        assert execute.status_code == 403
