"""
Unit and integration tests for SkillGraph AI innovative intelligence features.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_providers_status():
    """Verify provider connectivity and metadata status check."""
    resp = client.get("/api/providers/status")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 3
    names = [p["provider"] for p in data]
    assert any("ESCO" in n for n in names)
    assert any("Adzuna" in n for n in names)
    assert any("O*NET" in n for n in names)


def test_providers_test_endpoint():
    """Test pinging an individual provider."""
    resp = client.get("/api/providers/test/onet")
    assert resp.status_code == 200
    data = resp.json()
    assert data["provider_key"] == "onet"
    assert "connection" in data
    assert "sample_records" in data


def test_early_warning_signals():
    """Verify Early Warning System detects demand velocity signals."""
    resp = client.get("/api/features/early-warning?min_postings=1")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    if data:
        first = data[0]
        assert "skill_name" in first
        assert "signal_type" in first
        assert "headline" in first
        assert "explanation" in first


def test_career_bridges():
    """Verify Career Bridge Finder identifies transition roles."""
    resp = client.get("/api/features/career-bridges/143?limit=4")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    if data:
        b = data[0]
        assert "target_title" in b
        assert "transfer_score" in b
        assert "shared_skills" in b
        assert "feasibility" in b


def test_simulate_what_if():
    """Verify Career What-If Simulator delta recalculation."""
    payload = {
        "current_skills": ["Python", "SQL"],
        "simulated_skills": ["PyTorch", "Docker"],
        "target_career_id": 143,
    }
    resp = client.post("/api/features/what-if", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "baseline_coverage" in data
    assert "simulated_coverage" in data
    assert "coverage_gain_pct" in data
    assert data["simulated_coverage"] >= data["baseline_coverage"]


def test_detect_transferable_skills():
    """Verify Hidden and Transferable Skill Detector."""
    skills = ["Python", "JavaScript"]
    resp = client.post("/api/features/transferable-skills", json=skills)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


def test_evaluate_skill_evidence():
    """Verify Evidence-Based Skill Verification record generation."""
    payload = {
        "skill_name": "Python",
        "evidence_type": "github_repo",
        "evidence_text": "Built a scalable automated FastAPI pipeline with extensive unit tests in Python.",
    }
    resp = client.post("/api/features/evidence", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["skill_name"] == "Python"
    assert data["is_corroborated"] is True
    assert "confidence_score" in data
    assert "verification_explanation" in data


def test_learning_roi_optimizer():
    """Verify Learning ROI & Priority Optimizer."""
    payload = {
        "candidate_skills": ["Python"],
        "target_career_id": 143,
        "weekly_hours": 12,
    }
    resp = client.post("/api/features/roi-optimizer", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    if data:
        item = data[0]
        assert "priority_score" in item
        assert "factor_breakdown" in item
        assert "estimated_study_hours" in item


def test_project_ideas_generator():
    """Verify AI Portfolio Project Recommendation Generator."""
    payload = {
        "target_career_title": "Data Scientist",
        "target_skills": ["Python", "Machine Learning", "SQL", "Docker"],
        "experience_level": "student",
    }
    resp = client.post("/api/features/project-ideas", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 2
    proj = data[0]
    assert "title" in proj
    assert "milestones" in proj
    assert "deliverables" in proj
    assert "evaluation_criteria" in proj


def test_skill_half_life():
    """Verify Skill Half-Life and Obsolescence Monitor."""
    # Test with known skill ID 1
    resp = client.get("/api/features/skill-half-life/1")
    assert resp.status_code == 200
    data = resp.json()
    assert "skill_name" in data
    assert "status" in data


def test_opportunity_matcher():
    """Verify Opportunity Matcher matches user to real job postings."""
    payload = {
        "candidate_skills": ["Python", "SQL", "Git"],
        "min_match_score": 10.0,
        "limit": 5,
    }
    resp = client.post("/api/opportunities/match", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_matched" in data
    assert "matches" in data
    assert isinstance(data["matches"], list)
    if data["matches"]:
        match = data["matches"][0]
        assert "title" in match
        assert "company" in match
        assert "match_score" in match
        assert "matched_skills" in match
        assert "relevance_explanation" in match


def test_resume_parser():
    """Verify Privacy-Preserving Résumé Parser."""
    payload = {
        "resume_text": (
            "Senior Software Engineer with 5+ years of experience developing microservices "
            "using Python, FastAPI, Docker, and PostgreSQL. Experienced in Git workflows and SQL optimization."
        ),
        "experience_level_hint": "mid_level",
    }
    resp = client.post("/api/resume/parse", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "extracted_skills" in data
    assert data["total_skills_found"] >= 3
    names = [s["skill_name"].lower() for s in data["extracted_skills"]]
    assert "python" in names
    assert "docker" in names
    assert "privacy_notice" in data


def test_market_dashboard():
    """Verify Market Intelligence Dashboard macro analytics."""
    resp = client.get("/api/market/dashboard")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_job_postings" in data
    assert "top_in_demand_skills" in data
    assert "fast_growing_skills" in data
    assert "location_distribution" in data
    assert "frequent_co_occurrences" in data


def test_data_quality_report():
    """Verify Data Quality and Market Confidence Monitor report."""
    resp = client.get("/api/data-quality/report")
    assert resp.status_code == 200
    data = resp.json()
    assert "market_confidence_index" in data
    assert "confidence_factors" in data
    assert "records_audit" in data
    assert "registered_datasources" in data
