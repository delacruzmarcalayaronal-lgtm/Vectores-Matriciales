from __future__ import annotations

API = "/api/v1"


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestAuth:
    def test_health(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_login_admin(self, client):
        r = client.post(f"{API}/auth/login", json={"dni": "12345678"})
        assert r.status_code == 200
        body = r.json()
        assert body["user"]["role"] == "admin"
        assert body["accessToken"]

    def test_login_dni_inexistente(self, client):
        r = client.post(f"{API}/auth/login", json={"dni": "00000000"})
        assert r.status_code >= 400
        assert "message" in r.json()

    def test_sin_token_401(self, client):
        r = client.get(f"{API}/companies/1/users")
        assert r.status_code == 401
        assert r.json()["code"] == "unauthorized"

    def test_token_invalido_401(self, client):
        r = client.get(f"{API}/companies/1/users", headers=_auth("token-falso"))
        assert r.status_code == 401


class TestRBAC:
    def test_admin_lista_usuarios(self, client, admin_token):
        r = client.get(f"{API}/companies/1/users", headers=_auth(admin_token))
        assert r.status_code == 200
        assert len(r.json()) >= 4

    def test_manager_sin_acceso_usuarios(self, client, manager_token):
        r = client.get(f"{API}/companies/1/users", headers=_auth(manager_token))
        assert r.status_code == 403
        assert r.json()["code"] == "forbidden"

    def test_analyst_sin_acceso_usuarios(self, client, analyst_token):
        r = client.get(f"{API}/companies/1/users", headers=_auth(analyst_token))
        assert r.status_code == 403

    def test_operator_sin_acceso_usuarios(self, client, operator_token):
        r = client.get(f"{API}/companies/1/users", headers=_auth(operator_token))
        assert r.status_code == 403

    def test_analyst_puede_vectores(self, client, analyst_token):
        r = client.get(f"{API}/companies/1/vectors", headers=_auth(analyst_token))
        assert r.status_code == 200

    def test_operator_no_puede_vectores(self, client, operator_token):
        r = client.get(f"{API}/companies/1/vectors", headers=_auth(operator_token))
        assert r.status_code == 403

    def test_operator_puede_ventas(self, client, operator_token):
        r = client.get(f"{API}/companies/1/sales", headers=_auth(operator_token))
        assert r.status_code == 200

    def test_analyst_no_puede_ventas(self, client, analyst_token):
        r = client.get(f"{API}/companies/1/sales", headers=_auth(analyst_token))
        assert r.status_code == 403


class TestOperationsAPI:
    def test_vector_add_completado(self, client, admin_token):
        r = client.post(
            f"{API}/companies/1/operations",
            headers=_auth(admin_token),
            json={
                "type": "vector_add",
                "name": "Suma pytest",
                "inputVectorIds": ["v1", "v2"],
                "inputMatrixIds": [],
                "parameters": {},
            },
        )
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["status"] == "completed"
        assert body["resultVectorId"]

    def test_dimension_incompatible_400(self, client, admin_token):
        r = client.post(
            f"{API}/companies/1/vectors",
            headers=_auth(admin_token),
            json={"name": "Vector corto pytest", "values": [1.0]},
        )
        assert r.status_code == 201
        short_id = r.json()["id"]

        r = client.post(
            f"{API}/companies/1/operations",
            headers=_auth(admin_token),
            json={
                "type": "vector_add",
                "name": "Suma inválida pytest",
                "inputVectorIds": ["v1", short_id],
                "inputMatrixIds": [],
                "parameters": {},
            },
        )
        assert r.status_code == 400
        assert "message" in r.json()

    def test_operacion_guardada_en_historial(self, client, admin_token):
        r = client.get(
            f"{API}/companies/1/operations",
            headers=_auth(admin_token),
            params={"page": 1, "pageSize": 50},
        )
        assert r.status_code == 200
        body = r.json()
        assert "data" in body and "total" in body
        assert any(o["status"] == "completed" for o in body["data"])

    def test_404_con_message(self, client, admin_token):
        r = client.get(f"{API}/vectors/no-existe", headers=_auth(admin_token))
        assert r.status_code == 404
        body = r.json()
        assert body["code"] == "not_found"
        assert "message" in body


class TestAuditAndReports:
    def test_auditoria_registra_eventos(self, client, admin_token):
        r = client.get(f"{API}/companies/1/audit", headers=_auth(admin_token))
        assert r.status_code == 200
        body = r.json()
        assert body["total"] > 0
        entry = body["data"][0]
        assert entry["action"]
        assert entry["userId"]

    def test_reporte_dashboard_con_datos(self, client, admin_token):
        r = client.get(f"{API}/companies/1/reports/dashboard", headers=_auth(admin_token))
        assert r.status_code == 200
        body = r.json()
        assert body["totalSales"] > 0
        assert body["totalRevenue"] > 0

    def test_ventas_paginadas(self, client, admin_token):
        r = client.get(
            f"{API}/companies/1/sales",
            headers=_auth(admin_token),
            params={"page": 1, "pageSize": 5},
        )
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body["data"], list)
        assert body["total"] >= 15


class TestPerfilYNotificaciones:
    def test_update_me_persiste_foto_y_nombre(self, client, admin_token):
        r = client.put(
            f"{API}/auth/me",
            headers=_auth(admin_token),
            json={"name": "Admin Editado", "avatar": "data:image/jpeg;base64,AAAA"},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["name"] == "Admin Editado"
        assert body["avatar"].startswith("data:image/")

        r2 = client.get(f"{API}/auth/me", headers=_auth(admin_token))
        assert r2.status_code == 200
        assert r2.json()["name"] == "Admin Editado"
        assert r2.json()["avatar"]

    def test_update_me_borra_foto_con_null(self, client, admin_token):
        r = client.put(
            f"{API}/auth/me", headers=_auth(admin_token), json={"avatar": None}
        )
        assert r.status_code == 200, r.text
        assert r.json()["avatar"] is None

    def test_update_me_rol_solo_admin(self, client, operator_token):
        r = client.put(
            f"{API}/auth/me", headers=_auth(operator_token), json={"role": "admin"}
        )
        assert r.status_code == 200, r.text
        assert r.json()["role"] == "operator"

    def test_update_me_foto_invalida_400(self, client, admin_token):
        r = client.put(
            f"{API}/auth/me", headers=_auth(admin_token), json={"avatar": "no-es-imagen"}
        )
        assert r.status_code == 400

    def test_notifications_dismiss_all(self, client, admin_token):
        for i in range(2):
            r = client.post(
                f"{API}/companies/1/notifications",
                headers=_auth(admin_token),
                json={
                    "type": "system",
                    "title": f"TmpDismiss {i}",
                    "message": "temporal",
                    "link": "/dashboard",
                    "dedupKey": f"tmp-dismiss-{i}",
                },
            )
            assert r.status_code == 201, r.text

        r = client.post(
            f"{API}/companies/1/notifications/dismiss-all", headers=_auth(admin_token)
        )
        assert r.status_code == 200, r.text
        assert r.json()["count"] >= 2

        r = client.get(f"{API}/companies/1/notifications", headers=_auth(admin_token))
        titles = [n["title"] for n in r.json()]
        assert not any(t.startswith("TmpDismiss") for t in titles)
