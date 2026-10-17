"""
API Tests for FastAPI Copilot Backend.
Tests endpoints:
- GET /api/fleet/info
- GET /api/wells
- GET /api/well/{well_id} (valid and invalid format validation)
- POST /api/chat
- GET /api/benchmark/all
- POST /api/benchmark/run/{id}
"""
import pytest
from fastapi.testclient import TestClient
from backend.app import app

@pytest.fixture(scope="module")
def client():
    return TestClient(app)

def test_api_fleet_info(client):
    res = client.get("/api/fleet/info")
    assert res.status_code == 200
    data = res.json()
    assert data["total_wells"] == 200
    assert data["as_of_date"] == "2026-10-16"

def test_api_wells_list(client):
    res = client.get("/api/wells")
    assert res.status_code == 200
    wells = res.json()
    assert len(wells) == 200
    assert wells[0]["asset_id"] == "WELL-0001"

def test_api_well_details_valid(client):
    res = client.get("/api/well/WELL-0001")
    assert res.status_code == 200
    data = res.json()
    assert data["metadata"]["asset_id"] == "WELL-0001"
    assert data["current_status"]["well_type"] == "T200"

def test_api_well_details_invalid_format(client):
    # Security test: invalid format should be rejected with 400
    res = client.get("/api/well/invalid-well-name")
    assert res.status_code == 400

def test_api_well_details_not_found(client):
    res = client.get("/api/well/WELL-9999")
    assert res.status_code == 404

def test_api_chat_query(client):
    payload = {
        "user_name": "Michael Turner",
        "message": "Is WELL-0001 producing oil right now? Show me its status card."
    }
    res = client.post("/api/chat", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "text_answer" in data
    assert data["visual_type"] == "status_card"
    assert "evidence_citations" in data

def test_api_benchmark_list(client):
    res = client.get("/api/benchmark/all")
    assert res.status_code == 200
    scenarios = res.json()
    assert len(scenarios) == 18
    assert scenarios[0]["id"] == "Q1"

def test_api_benchmark_run_single(client):
    res = client.post("/api/benchmark/run/Q1")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "PASS"
    assert data["match_score"] == 100

def test_api_benchmark_run_invalid_format(client):
    # Security test: invalid scenario format rejected
    res = client.post("/api/benchmark/run/INVALID")
    assert res.status_code == 400
