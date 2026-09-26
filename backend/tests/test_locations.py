from __future__ import annotations

from app.services.location_service import LocationService

LIMA = {"latitude": -12.0464, "longitude": -77.0428}


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
