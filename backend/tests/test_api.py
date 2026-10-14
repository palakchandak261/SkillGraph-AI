"""
Integration tests for FastAPI backend endpoints using Starlette/FastAPI TestClient.
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert data["version"] == "1.0.0"
    assert "database_connected" in data


def test_api_datasets_status():
    response = client.get("/api/datasets/status")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    # Check that at least LinkedIn or O*NET is present
    names = [d["name"] for d in data]
    assert any("LinkedIn" in n or "O*NET" in n for n in names)


def test_api_pipeline_status():
    response = client.get("/api/pipeline/status")
    assert response.status_code == 200
    data = response.json()
    assert "is_running" in data
    assert "stages" in data
    assert isinstance(data["stages"], list)


def test_api_analytics_overview():
    response = client.get("/api/analytics/overview")
    assert response.status_code == 200
    data = response.json()
    assert "total_raw_postings" in data
    assert "total_cleaned_postings" in data
    assert "total_skills" in data
    assert "top_skills" in data
    assert "data_quality" in data


def test_api_analytics_skills():
    response = client.get("/api/analytics/skills?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert len(data["items"]) <= 10


def test_api_skills_search():
    response = client.get("/api/skills/search?q=py")
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert isinstance(data["results"], list)
    assert "total" in data


def test_api_graph_query():
    response = client.get("/api/graph?query=python&depth=2&min_weight=1")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    assert "total_nodes" in data
    assert "total_edges" in data


def test_api_models_evaluation():
    response = client.get("/api/models/evaluation")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    model_types = [m["model_type"] for m in data]
    assert any("nlp" in mt or "forecast" in mt for mt in model_types)


def test_api_analytics_occupations():
    response = client.get("/api/analytics/occupations")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_api_analytics_emerging():
    response = client.get("/api/analytics/emerging")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_api_skill_gap_analysis():
    payload = {
        "profile_id": 1,
        "target_occupation_id": 1,
        "current_skills": ["Python", "SQL"],
        "target_skills": ["Python", "SQL", "Machine Learning", "Docker"],
    }
    response = client.post("/api/recommendations/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "skill_coverage" in data or "current_skills" in data
