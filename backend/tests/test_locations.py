from __future__ import annotations

import pytest

from app.services.location_service import LocationService

# sede estándar (SENATI Sede Central, Av. Alfredo Mendiola 3520-3540): dentro del geofence
SEDE = {"latitude": -11.9998026, "longitude": -77.0616537}
LIMA = SEDE


class TestHaversine:
    def test_same_point_is_zero(self):
        assert LocationService.calculate_distance_km(-12.0, -77.0, -12.0, -77.0) == 0.0

    def test_known_distance_lima_callao(self):
        # Lima centro -> Callao ~12 km (tolerancia 2 km)
        km = LocationService.calculate_distance_km(-12.0464, -77.0428, -12.0496, -77.1455)
        assert 9 <= km <= 15

    def test_classify_status(self):
        assert LocationService.classify_status(2) == "active"
        assert LocationService.classify_status(10) == "idle"
        assert LocationService.classify_status(45) == "offline"


class TestConsentAndLocations:
    def test_consent_accepted_then_location(self, client, operator_token):
        headers = {"Authorization": f"Bearer {operator_token}"}
        r = client.post(
            "/api/v1/locations/consent",
            json={"consentStatus": "accepted", "consentVersion": "v1"},
            headers=headers,
        )
        assert r.status_code == 201, r.text
        assert r.json()["consentStatus"] == "accepted"

        r = client.post("/api/v1/locations", json=LIMA, headers=headers)
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["isWithinGeofence"] is True
        assert body["workerId"]

    def test_location_outside_geofence(self, client, operator_token):
        headers = {"Authorization": f"Bearer {operator_token}"}
        r = client.post(
            "/api/v1/locations",
            json={"latitude": -2.0, "longitude": -78.0},
            headers=headers,
        )
        assert r.status_code == 201, r.text
        assert r.json()["isWithinGeofence"] is False

    def test_invalid_latitude_rejected(self, client, operator_token):
        headers = {"Authorization": f"Bearer {operator_token}"}
        r = client.post(
            "/api/v1/locations", json={"latitude": 123.0, "longitude": 0.0}, headers=headers
        )
        assert r.status_code == 422

    def test_consent_denied_blocks_tracking(self, client, analyst_token):
        headers = {"Authorization": f"Bearer {analyst_token}"}
        r = client.post(
            "/api/v1/locations/consent",
            json={"consentStatus": "denied"},
            headers=headers,
        )
        assert r.status_code == 201, r.text
        r = client.post("/api/v1/locations", json=LIMA, headers=headers)
        assert r.status_code == 403

    def test_requires_auth(self, client):
        assert client.get("/api/v1/locations/latest").status_code == 401
        assert client.post("/api/v1/locations", json=LIMA).status_code == 401


class TestAdminMap:
    def test_latest_locations(self, client, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = client.get("/api/v1/locations/latest", headers=headers)
        assert r.status_code == 200, r.text
        rows = r.json()
        assert len(rows) >= 1
        assert {"workerId", "workerName", "latitude", "longitude", "status"} <= set(rows[0])

    def test_workers_list(self, client, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = client.get("/api/v1/workers", headers=headers)
        assert r.status_code == 200, r.text
        assert len(r.json()) >= 1

    def test_workers_forbidden_for_operator(self, client, operator_token):
        r = client.get("/api/v1/workers", headers={"Authorization": f"Bearer {operator_token}"})
        assert r.status_code == 403

    def test_map_html(self, client, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = client.get("/api/v1/locations/map", headers=headers)
        assert r.status_code == 200
        assert "text/html" in r.headers["content-type"]
        assert "leaflet" in r.text.lower()

    def test_geofence_map_html(self, client, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = client.get("/api/v1/locations/geofence-map", headers=headers)
        assert r.status_code == 200
        assert "leaflet" in r.text.lower()

    def test_outside_geofence_query(self, client, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        # centro muy lejano -> todo queda fuera
        r = client.get(
            "/api/v1/locations/outside-geofence",
            params={"lat": 0.0, "lng": 0.0, "radius_km": 0.1},
            headers=headers,
        )
        assert r.status_code == 200, r.text
        assert len(r.json()) >= 1

    def test_worker_history(self, client, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = client.get("/api/v1/workers", headers=headers)
        worker_id = r.json()[0]["id"]
        r = client.get(f"/api/v1/workers/{worker_id}/history", headers=headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_worker_history_map(self, client, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = client.get("/api/v1/workers", headers=headers)
        worker_id = r.json()[0]["id"]
        r = client.get(f"/api/v1/locations/map/history/{worker_id}", headers=headers)
        assert r.status_code == 200
        assert "leaflet" in r.text.lower()

    def test_worker_status(self, client, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = client.get("/api/v1/workers", headers=headers)
        found_with_location = False
        for worker in r.json():
            s = client.get(f"/api/v1/workers/{worker['id']}/status", headers=headers)
            assert s.status_code == 200
            body = s.json()
            assert body["status"] in ("active", "idle", "offline")
            if body["latitude"] is not None:
                found_with_location = True
        assert found_with_location, "ningún worker con ubicación registrada"

    def test_live_map_shows_distance_to_headquarters(self, client, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        if not client.get("/api/v1/locations/latest", headers=headers).json():
            pytest.skip("sin ubicaciones en la caché de sesión")
        r = client.get("/api/v1/locations/map", headers=headers)
        assert r.status_code == 200
        assert "Distancia a la sede" in r.text or "mf-distance-label" in r.text

    def test_live_map_fits_sede_and_workers(self, client, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        if not client.get("/api/v1/locations/latest", headers=headers).json():
            pytest.skip("sin ubicaciones en la caché de sesión")
        r = client.get("/api/v1/locations/map", headers=headers)
        assert r.status_code == 200
        assert "fitBounds" in r.text

    def test_history_map_zooms_to_worker(self, client, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        workers = client.get("/api/v1/workers", headers=headers).json()
        target = None
        for worker in workers:
            history = client.get(
                f"/api/v1/workers/{worker['id']}/history", headers=headers
            ).json()
            if history:
                target = worker["id"]
                break
        if target is None:
            pytest.skip("sin historial en la caché de sesión")
        r = client.get(f"/api/v1/locations/map/history/{target}", headers=headers)
        assert r.status_code == 200
        assert "fitBounds" in r.text or "setView" in r.text


class TestSessionPrivacy:
    """La posición vive solo en RAM: nada en BD, el logout la purga."""

    def test_location_never_persisted_in_database(self, client, operator_token):
        headers = {"Authorization": f"Bearer {operator_token}"}
        client.post(
            "/api/v1/locations/consent",
            json={"consentStatus": "accepted", "consentVersion": "v1"},
            headers=headers,
        )
        r = client.post("/api/v1/locations", json=SEDE, headers=headers)
        assert r.status_code == 201, r.text

        from sqlalchemy import create_engine, text

        from app.core.config import settings

        engine = create_engine(settings.DATABASE_URL)
        try:
            with engine.connect() as conn:
                count = conn.execute(text("SELECT count(*) FROM worker_locations")).scalar()
        finally:
            engine.dispose()
        assert count == 0, "las posiciones no deben persistirse en la base de datos"

    def test_logout_purges_position_and_disables_tracking(
        self, client, admin_token, operator_token
    ):
        op = {"Authorization": f"Bearer {operator_token}"}
        admin = {"Authorization": f"Bearer {admin_token}"}
        client.post(
            "/api/v1/locations/consent",
            json={"consentStatus": "accepted", "consentVersion": "v1"},
            headers=op,
        )
        r = client.post("/api/v1/locations", json=SEDE, headers=op)
        assert r.status_code == 201, r.text

        latest = client.get("/api/v1/locations/latest", headers=admin).json()
        assert any(row["employeeCode"] == "44444444" for row in latest), "debe verse en caché"

        r = client.post("/api/v1/auth/logout", headers=op)
        assert r.status_code == 200, r.text

        latest = client.get("/api/v1/locations/latest", headers=admin).json()
        assert not any(
            row["employeeCode"] == "44444444" for row in latest
        ), "el logout debe purgar la posición de la caché"

        r = client.post("/api/v1/locations", json=SEDE, headers=op)
        assert r.status_code == 403, "el logout debe apagar el rastreo"

        # restaurar estado para los tests siguientes
        client.post(
            "/api/v1/locations/consent",
            json={"consentStatus": "accepted", "consentVersion": "v1"},
            headers=op,
        )
        client.post("/api/v1/locations", json=SEDE, headers=op)

    def test_cache_expires_after_ttl(self):
        from datetime import datetime, timedelta, timezone

        from app.services.location_cache import LocationCache

        cache = LocationCache()
        cache.put("w-ttl", "Test", "9999", -11.99, -77.06, 5.0, None, None, None, True)
        assert len(cache.latest_rows()) == 1

        with cache._lock:
            for point in cache._points["w-ttl"]:
                point["_at"] = datetime.now(timezone.utc) - timedelta(minutes=31)
        assert cache.latest_rows() == []
        assert cache.history("w-ttl") == []
