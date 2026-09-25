from __future__ import annotations

import os
import sys

import httpx

BASE = os.environ.get("SMOKE_BASE", "http://127.0.0.1:8000")
API = f"{BASE}/api/v1"

results: list[tuple[str, bool, str]] = []


def check(name: str, condition: bool, extra: str = "") -> None:
    results.append((name, bool(condition), extra))
    print(("PASS" if condition else "FAIL"), "-", name, ("| " + extra[:220]) if extra else "")


def main() -> int:
    health = httpx.get(f"{BASE}/health", timeout=10)
    check("health", health.status_code == 200 and health.json()["status"] == "ok", health.text)

    client = httpx.Client(base_url=API, timeout=15)

    r = client.post("/auth/login", json={"dni": "12345678"})
    check("login admin", r.status_code == 200, r.text[:200])
    if r.status_code != 200:
        return 1
    payload = r.json()
    token = payload["accessToken"]
    client.headers["Authorization"] = f"Bearer {token}"
    check("login trae usuario+tokens", payload["user"]["role"] == "admin" and payload["refreshToken"])

    r = client.post("/auth/login", json={"dni": "99999999"})
    check("dni inexistente -> 400 message", r.status_code == 400 and "message" in r.json(), r.text)
    r = client.post("/auth/login", json={"dni": "12345"})
    check("dni corto -> 400", r.status_code == 400, r.text)

    r = client.get("/auth/me")
    check("GET /auth/me", r.status_code == 200 and r.json()["dni"] == "12345678", r.text[:150])

    r = client.get("/companies/1/branches")
    check("4 sucursales", r.status_code == 200 and len(r.json()) == 4, r.text[:150])

    r = client.get("/companies/1/products")
    check("8 productos", r.status_code == 200 and len(r.json()) == 8, str(len(r.json())))

    r = client.get("/companies/1/sales", params={"page": 1, "pageSize": 5})
    body = r.json()
    check(
        "ventas paginadas {data,total}",
        r.status_code == 200 and len(body["data"]) == 5 and body["total"] == 15,
        f"status={r.status_code} total={body.get('total')} len={len(body.get('data', []))}",
    )

    r = client.get("/companies/1/sales", params={"branchId": "br1"})
    check("ventas por sede", r.status_code == 200 and all(s["branchId"] == "br1" for s in r.json()["data"]))

    r = client.get("/companies/1/reports/dashboard")
    dash = r.json() if r.status_code == 200 else {}
    check(
        "dashboard con datos",
        r.status_code == 200
        and dash.get("totalSales", 0) > 0
        and dash.get("totalRevenue", 0) > 0
        and len(dash.get("salesByBranch", [])) == 4
        and len(dash.get("topSellingProducts", [])) > 0
        and dash.get("lowStockProducts", 0) >= 1,
        f"sales={dash.get('totalSales')} rev={dash.get('totalRevenue')} low={dash.get('lowStockProducts')}",
    )

    r = client.post(
        "/companies/1/products",
        json={"name": "Producto Smoke", "unitPrice": 10.0, "costPrice": 5.0, "stock": 5, "minStock": 2},
    )
    check("POST producto", r.status_code == 201, r.text[:200])
    product_id = r.json()["id"] if r.status_code == 201 else "none"

    r = client.put(f"/products/{product_id}", json={"unitPrice": 15.0})
    check("PUT producto", r.status_code == 200 and r.json()["unitPrice"] == 15.0, r.text[:150])

    r = client.delete(f"/products/{product_id}")
    check("DELETE producto", r.status_code == 200, r.text[:100])

    r = client.post("/companies/1/branches", json={"name": "Sede Smoke", "code": "SMK01", "city": "Lima"})
    check("POST sede", r.status_code == 201, r.text[:200])
    branch_id = r.json()["id"] if r.status_code == 201 else "none"
    r = client.delete(f"/branches/{branch_id}")
    check("DELETE sede", r.status_code == 200)

    r = client.post("/companies/1/vectors", json={"name": "Vector Smoke", "values": [1.0, 2.0, 3.0, 4.0]})
    check("POST vector", r.status_code == 201, r.text[:200])

    r = client.post(
        "/companies/1/operations",
        json={
            "type": "vector_add",
            "name": "Suma smoke",
            "description": "",
            "inputVectorIds": ["v1", "v2"],
            "inputMatrixIds": [],
            "parameters": {},
        },
    )
    op = r.json() if r.status_code == 201 else {}
    check(
        "operación vector_add completa",
        r.status_code == 201 and op.get("status") == "completed" and op.get("resultVectorId"),
        r.text[:250],
    )

    r = client.post(
        "/companies/1/operations",
        json={
            "type": "matrix_multiply",
            "name": "Multiplicación smoke",
            "inputVectorIds": [],
            "inputMatrixIds": ["m1", "m2"],
            "parameters": {},
        },
    )
    op = r.json() if r.status_code == 201 else {}
    check(
        "operación matrix_multiply completa",
        r.status_code == 201 and op.get("status") == "completed" and op.get("resultMatrixId"),
        r.text[:250],
    )

    r = client.post(
        "/companies/1/operations",
        json={
            "type": "vector_dot_product",
            "name": "Punto smoke",
            "inputVectorIds": ["v1", "v2"],
            "inputMatrixIds": [],
            "parameters": {},
        },
    )
    op = r.json() if r.status_code == 201 else {}
    check(
        "producto punto -> escalar en parameters.result",
        r.status_code == 201 and op.get("parameters", {}).get("result") is not None,
        r.text[:250],
    )

    r = client.post(
        "/companies/1/operations",
        json={
            "type": "linear_combination",
            "name": "Combinación smoke",
            "inputVectorIds": ["v1", "v2"],
            "inputMatrixIds": [],
            "parameters": {"weights": {}},
        },
    )
    check("combinación lineal", r.status_code == 201 and r.json().get("status") == "completed", r.text[:250])

    r = client.post("/companies/1/vectors", json={"name": "Vector corto", "values": [1.0, 2.0]})
    short_id = r.json()["id"] if r.status_code == 201 else "none"
    r = client.post(
        "/companies/1/operations",
        json={
            "type": "vector_add",
            "name": "Operación inválida",
            "inputVectorIds": ["v1", short_id],
            "inputMatrixIds": [],
            "parameters": {},
        },
    )
    check("operación inválida -> 400 + status failed", r.status_code == 400 and "message" in r.json(), r.text[:250])
    failed = client.get("/companies/1/operations", params={"page": 1, "pageSize": 50}).json()
    check(
        "operación fallida registrada",
        any(o["status"] == "failed" for o in failed["data"]),
    )
    client.delete(f"/vectors/{short_id}")

    operator = httpx.post(f"{API}/auth/login", json={"dni": "44444444"}, timeout=15)
    op_headers = {"Authorization": f"Bearer {operator.json()['accessToken']}"}
    r = httpx.post(f"{API}/companies/1/products", json={"name": "X"}, headers=op_headers, timeout=15)
    check("operator no puede crear productos (403)", r.status_code == 403, r.text[:150])
    r = httpx.get(f"{API}/companies/1/audit", headers=op_headers, timeout=15)
    check("operator no ve auditoría (403)", r.status_code == 403, r.text[:150])
    r = httpx.post(
        f"{API}/companies/1/sales",
        json={"branchId": "br1", "details": [{"productId": "p1", "quantity": 1, "unitPrice": 4599.0}]},
        headers=op_headers,
        timeout=15,
    )
    check("operator sí crea ventas (201)", r.status_code == 201, r.text[:250])

    analyst = httpx.post(f"{API}/auth/login", json={"dni": "33333333"}, timeout=15)
    analyst_headers = {"Authorization": f"Bearer {analyst.json()['accessToken']}"}
    r = httpx.get(f"{API}/companies/1/audit?page=1&pageSize=5", headers=analyst_headers, timeout=15)
    check(
        "analyst sí ve auditoría paginada",
        r.status_code == 200 and r.json()["total"] >= 5 and len(r.json()["data"]) <= 5,
        r.text[:200],
    )

    r = client.get("/companies/1/branches/br1/inventory/stock")
    stock = r.json() if r.status_code == 200 else {}
    check("stock por sede", r.status_code == 200 and len(stock) >= 5, str(stock)[:200])

    r = client.post(
        "/companies/1/inventory/movements",
        json={"branchId": "br1", "productId": "p5", "type": "in", "quantity": 10, "reference": "SMK"},
    )
    check("POST movimiento inventario", r.status_code == 201, r.text[:200])

    r = client.post(
        "/companies/1/users",
        json={"name": "Usuario Smoke", "password": "secreto123", "dni": "55555555", "role": "operator"},
    )
    check("POST usuario", r.status_code == 201, r.text[:200])
    user_id = r.json()["id"] if r.status_code == 201 else "none"
    r = client.put(f"/users/{user_id}", json={"role": "analyst"})
    check("PUT usuario", r.status_code == 200 and r.json()["role"] == "analyst", r.text[:150])
    r = client.delete(f"/users/{user_id}")
    check("DELETE usuario", r.status_code == 200, r.text[:150])

    r = httpx.post(f"{API}/auth/refresh", json={"refreshToken": payload["refreshToken"]}, timeout=15)
    check("refresh emite nuevos tokens", r.status_code == 200 and "accessToken" in r.json(), r.text[:200])
    r = httpx.post(f"{API}/auth/refresh", json={"refreshToken": token}, timeout=15)
    check("access token no sirve como refresh (401)", r.status_code == 401, r.text[:150])

    r = client.post("/auth/register", json={"dni": "77777777", "name": "Usuario Nuevo"})
    check("register devuelve sesión", r.status_code == 200 and r.json()["user"]["role"] == "operator", r.text[:200])
    r = client.post("/auth/register", json={"dni": "77777777", "name": "Otro Nombre"})
    check("dni duplicado -> 400", r.status_code == 400, r.text[:150])

    r = client.get("/companies/1/reports/sales-by-branch")
    check("reporte ventas por sede", r.status_code == 200 and len(r.json()) == 4, r.text[:150])
    r = client.get("/companies/1/reports/sales-by-product")
    check("reporte ventas por producto", r.status_code == 200 and len(r.json()) > 0, r.text[:150])
    r = client.get("/companies/1/reports/target-compliance")
    check("reporte metas", r.status_code == 200 and len(r.json()) == 7, r.text[:150])
    r = client.get("/companies/1/reports/inventory-rotation")
    check("reporte rotación", r.status_code == 200 and len(r.json()) == 8, r.text[:150])
    r = client.get("/companies/1/reports/operations")
    check("reporte operaciones", r.status_code == 200 and len(r.json()) >= 2, r.text[:150])

    r = client.get("/vectors/does-not-exist")
    check("404 con message", r.status_code == 404 and "message" in r.json(), r.text[:150])

    r = httpx.get(f"{API}/companies/1/branches", timeout=15)
    check("sin token -> 401", r.status_code == 401, r.text[:150])

    r = client.post("/auth/logout")
    check("logout", r.status_code == 200, r.text[:150])

    fails = [name for name, ok, _ in results if not ok]
    print(f"\n{len(results) - len(fails)}/{len(results)} verificaciones OK")
    if fails:
        print("FALLAS:", ", ".join(fails))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
