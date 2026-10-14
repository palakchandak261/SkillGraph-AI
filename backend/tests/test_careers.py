"""
Automated tests for Career Intelligence, Skill-Gap, Roadmap, Mobility, and Career Graph endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_career_search_endpoint():
    response = client.get("/api/careers/search?q=Data")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    first = data[0]
    assert "career_id" in first
    assert "title" in first
    assert "demand_status" in first


def test_career_overview_endpoint():
    # First search for a valid career
    search_res = client.get("/api/careers/search?q=Developer")
    assert search_res.status_code == 200
    careers = search_res.json()
    assert len(careers) > 0
    c_id = careers[0]["career_id"]

    overview_res = client.get(f"/api/careers/{c_id}/overview")
    assert overview_res.status_code == 200
    overview = overview_res.json()
    assert overview["career_id"] == c_id
    assert "description" in overview
    assert "demand_status" in overview
    assert "data_limitations" in overview


def test_career_skills_endpoint():
    search_res = client.get("/api/careers/search?q=Engineer")
    careers = search_res.json()
    c_id = careers[0]["career_id"]

    skills_res = client.get(f"/api/careers/{c_id}/skills?limit=10")
    assert skills_res.status_code == 200
    skills = skills_res.json()
    assert isinstance(skills, list)
    if skills:
        assert "skill_name" in skills[0]
        assert "demand_percentage" in skills[0]


def test_career_trends_endpoint():
    search_res = client.get("/api/careers/search?q=Manager")
    careers = search_res.json()
    c_id = careers[0]["career_id"]

    trends_res = client.get(f"/api/careers/{c_id}/trends")
    assert trends_res.status_code == 200
    trends = trends_res.json()
    assert "trends" in trends
    assert "trend_direction" in trends


def test_career_forecast_endpoint():
    search_res = client.get("/api/careers/search?q=Manager")
    careers = search_res.json()
    c_id = careers[0]["career_id"]

    fc_res = client.get(f"/api/careers/{c_id}/forecast")
    assert fc_res.status_code == 200
    fc = fc_res.json()
    assert "is_eligible" in fc


def test_career_alternatives_endpoint():
    search_res = client.get("/api/careers/search?q=Data")
    careers = search_res.json()
    c_id = careers[0]["career_id"]

    alt_res = client.get(f"/api/careers/{c_id}/alternatives?limit=3")
    assert alt_res.status_code == 200
    alts = alt_res.json()
    assert isinstance(alts, list)


def test_student_skill_gap_analysis():
    search_res = client.get("/api/careers/search?q=Software")
    careers = search_res.json()
    c_id = careers[0]["career_id"]

    payload = {
        "candidate_skills": ["Python", "SQL", "Git"],
        "career_id": c_id,
        "proficiencies": {"Python": "intermediate", "SQL": "beginner"},
    }
    gap_res = client.post("/api/student/skill-gap", json=payload)
    assert gap_res.status_code == 200
    data = gap_res.json()
    assert "skill_coverage" in data
    assert "matched_skills" in data
    assert "important_missing" in data
    assert "formula_explanation" in data


def test_student_roadmap_generation():
    search_res = client.get("/api/careers/search?q=Data")
    careers = search_res.json()
    c_id = careers[0]["career_id"]

    payload = {
        "candidate_skills": ["Python"],
        "career_id": c_id,
    }
    roadmap_res = client.post("/api/student/roadmap", json=payload)
    assert roadmap_res.status_code == 200
    data = roadmap_res.json()
    assert "phases" in data
    assert len(data["phases"]) == 4


def test_student_career_matches_mobility():
    payload = {"skills": ["Python", "SQL", "Machine Learning"]}
    match_res = client.post("/api/student/career-matches", json=payload)
    assert match_res.status_code == 200
    data = match_res.json()
    assert isinstance(data, list)


def test_career_graph_endpoint():
    search_res = client.get("/api/careers/search?q=Manager")
    careers = search_res.json()
    c_id = careers[0]["career_id"]

    graph_res = client.get(f"/api/graph/career/{c_id}?student_skills=Python,SQL")
    assert graph_res.status_code == 200
    data = graph_res.json()
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) > 0
