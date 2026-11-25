import pytest
from app.main import create_app
from fastapi.testclient import TestClient

from tests.conftest import make_settings


def test_health_reports_seasons(client):
    body = client.get("/health").json()
    assert body == {"status": "ok", "seasons": [2024]}


def test_seasons_and_races(client):
    assert client.get("/api/seasons").json() == {"seasons": [2024]}
    races = client.get("/api/seasons/2024/races").json()["races"]
    assert [r["data_status"] for r in races] == ["ok", "scheduled", "missing"]


def test_race_served_with_etag_and_304(client):
    first = client.get("/api/seasons/2024/races/1")
    assert first.status_code == 200
    etag = first.headers["etag"]
    assert "max-age" in first.headers["cache-control"]
    again = client.get("/api/seasons/2024/races/1", headers={"If-None-Match": etag})
    assert again.status_code == 304


@pytest.mark.parametrize(
    ("round_number", "fragment"),
    [(2, "not taken place"), (3, "not available yet")],
)
def test_unavailable_race_explains_why(client, round_number, fragment):
    response = client.get(f"/api/seasons/2024/races/{round_number}")
    assert response.status_code == 404
    body = response.json()
    assert body["error"] == "not_available"
    assert fragment in body["message"]
    assert body["data_status"] in {"scheduled", "missing"}


def test_unknown_race_is_404_not_500(client):
    assert client.get("/api/seasons/2024/races/30").status_code == 404
    assert client.get("/api/seasons/2019/races").status_code == 404


@pytest.mark.parametrize("path", [
    "/api/seasons/abc/races", "/api/seasons/1900/races", "/api/seasons/2024/races/0",
    "/api/seasons/2024/races/999", "/api/drivers/TOOLONG", "/api/drivers/V3R",
])
def test_bad_input_is_422_with_generic_message(client, path):
    response = client.get(path)
    assert response.status_code == 422
    assert response.json()["error"] == "invalid_request"


def test_path_traversal_is_rejected(client):
    for path in ("/api/drivers/..%2F..", "/api/seasons/2024/races/..%2Frace_1"):
        assert client.get(path).status_code in {404, 422}


def test_drivers(client):
    assert client.get("/api/drivers").json()[0]["code"] == "VER"
    assert client.get("/api/drivers/ver").json()["code"] == "VER"
    assert client.get("/api/drivers/HAM").status_code == 404
    dna = client.get("/api/drivers/VER/dna")
    assert dna.status_code == 404 and dna.json()["error"] == "not_available"


def test_root_level_routes_marked_deprecated(client):
    response = client.get("/seasons")
    assert response.status_code == 200
    assert response.headers["deprecation"] == "true"
    assert "deprecation" not in client.get("/api/seasons").headers


def test_security_headers_and_request_id(client):
    response = client.get("/api/seasons", headers={"X-Request-ID": "abcdef123456"})
    assert response.headers["x-request-id"] == "abcdef123456"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert "frame-ancestors 'none'" in response.headers["content-security-policy"]
    # an invalid inbound id is replaced, never echoed
    other = client.get("/api/seasons", headers={"X-Request-ID": "bad id!"})
    assert other.headers["x-request-id"] != "bad id!"


def test_cors_allows_configured_origin_only(client):
    ok = client.options("/api/seasons", headers={
        "Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert "access-control-allow-credentials" not in ok.headers
    bad = client.get("/api/seasons", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in bad.headers


def test_unhandled_error_never_leaks_details(data_dir):
    app = create_app(make_settings(data_dir))

    @app.get("/boom")
    def boom():
        raise RuntimeError("secret mongodb://user:pass@host/db and a path /srv/app")

    response = TestClient(app, raise_server_exceptions=False).get("/boom")
    assert response.status_code == 500
    body = response.json()
    assert body["error"] == "internal_error"
    assert "secret" not in response.text and "mongodb" not in response.text
    assert body["request_id"] == response.headers["x-request-id"]


def test_rate_limit(data_dir):
    limited = TestClient(create_app(make_settings(data_dir, rate_limit_per_minute=3)))
    codes = [limited.get("/api/seasons").status_code for _ in range(5)]
    assert codes == [200, 200, 200, 429, 429]
    assert limited.get("/health").status_code == 200  # health checks are exempt


def test_docs_disabled_by_default_in_production(data_dir):
    app = create_app(make_settings(data_dir, env="production", docs_enabled=False))
    c = TestClient(app)
    assert c.get("/docs").status_code == 404
    assert "strict-transport-security" in c.get("/api/seasons").headers


def test_missing_data_dir_degrades_instead_of_crashing(tmp_path):
    c = TestClient(create_app(make_settings(tmp_path / "nope")))
    assert c.get("/health").json()["status"] == "degraded"
    assert c.get("/api/seasons").status_code == 404


def test_head_requests_work_for_pingers_and_cdns(client):
    for path in ("/", "/health", "/api/seasons", "/api/seasons/2024/races/1", "/api/drivers"):
        response = client.head(path)
        assert response.status_code == 200, path
    assert client.head("/api/seasons/2024/races/1").headers["etag"]


def test_rate_limit_uses_real_client_only_when_proxy_is_trusted(data_dir):
    def codes(trust: bool) -> list[int]:
        c = TestClient(create_app(make_settings(data_dir, rate_limit_per_minute=2, trust_proxy=trust)))
        # two different real clients behind one proxy; a client-supplied first hop must be ignored
        ips = ["9.9.9.9, 1.1.1.1", "9.9.9.9, 2.2.2.2", "9.9.9.9, 1.1.1.1", "9.9.9.9, 1.1.1.1"]
        return [c.get("/api/seasons", headers={"X-Forwarded-For": ip}).status_code for ip in ips]

    assert codes(trust=True) == [200, 200, 200, 429]   # client 1.1.1.1 is limited, 2.2.2.2 is not
    assert codes(trust=False) == [200, 200, 429, 429]  # without trust, everyone shares the proxy address


def test_conditional_get_accepts_weak_etags_lists_and_star(client):
    # Render's proxy turns "abc" into W/"abc" when it compresses the response
    etag = client.get("/api/seasons/2024/races/1").headers["etag"]
    for header in (f"W/{etag}", f'"nope", {etag}', f'W/"nope", W/{etag}', "*"):
        response = client.get("/api/seasons/2024/races/1", headers={"If-None-Match": header})
        assert response.status_code == 304, header
    for header in ('"something-else"', 'W/"something-else"', ""):
        assert client.get("/api/seasons/2024/races/1", headers={"If-None-Match": header}).status_code == 200, header


def test_standings(client):
    body = client.get("/api/seasons/2024/standings").json()
    assert body["season"] == 2024 and body["rounds"][0]["round"] == 1
    assert client.head("/api/seasons/2024/standings").headers["etag"]
    missing = client.get("/api/seasons/2023/standings")
    assert missing.status_code == 404 and missing.json()["error"] == "not_available"
    assert client.get("/api/seasons/1900/standings").status_code == 422


def test_ratings_endpoints(client):
    assert client.get("/api/ratings").json()["ratings"][0]["code"] == "VER"
    assert client.get("/api/ratings/model").json()["version"] == "ratings-v1"
    assert client.get("/api/ratings/ver").json()["history"] == [[2024, 1, 1500, 1500]]
    assert client.head("/api/ratings").headers["etag"]
    missing = client.get("/api/ratings/HAM")
    assert missing.status_code == 404 and missing.json()["error"] == "not_available"
    assert client.get("/api/ratings/TOOLONG").status_code == 422
    assert client.get("/api/ratings/model").headers["cache-control"].startswith("public")


def test_forecast_endpoints(client):
    assert client.get("/api/predictions/next").json()["races"][0]["round"] == 22
    assert client.get("/api/predictions/championship").json()["version"] == "forecast-v1"
    assert client.get("/api/predictions/review").json() == []
    assert client.get("/api/predictions/model").json()["version"] == "forecast-v1"
    assert client.head("/api/predictions/next").headers["etag"]
    assert client.get("/api/predictions/model").headers["cache-control"].startswith("public")
    assert client.get("/api/predictions/unknown").status_code == 404


def test_forecasts_say_not_available_when_unpublished(client, tmp_path):
    for path in (tmp_path / "predictions").glob("*.json"):
        path.unlink()
    response = client.get("/api/predictions/next")
    assert response.status_code == 404 and response.json()["error"] == "not_available"


def test_duels_and_circuits(client):
    assert client.get("/api/seasons/2024/duels").json() == {"season": 2024, "duels": []}
    assert client.get("/api/seasons/2030/duels").status_code == 404
    assert client.get("/api/circuits").json()[0]["slug"] == "sakhir"
    assert client.get("/api/circuits/sakhir").json()["slug"] == "sakhir"
    assert client.get("/api/circuits/nowhere").status_code == 404
    assert client.get("/api/circuits/Bad_Slug!").status_code == 422
    assert client.head("/api/circuits").headers["etag"]


def test_lap_detail(client):
    assert client.get("/api/seasons/2024/races/1/laps").json()["laps"] == 57
    assert client.get("/api/seasons/2024/races/9/laps").status_code == 404
    assert client.head("/api/seasons/2024/races/1/laps").headers["etag"]


def test_team_pace(client):
    assert client.get("/api/seasons/2024/team-pace").json()["teams"] == []
    assert client.get("/api/seasons/2030/team-pace").status_code == 404
