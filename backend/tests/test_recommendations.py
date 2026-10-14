"""
Unit tests for SkillRecommender personalized skill-gap analysis and recommendation engine.
"""
import pytest
from backend.app.recommendations.recommender import SkillRecommender


@pytest.fixture
def target_requirements():
    return [
        {"skill_name": "Python", "importance": 0.90, "demand_share": 35.0},
        {"skill_name": "SQL", "importance": 0.80, "demand_share": 28.0},
        {"skill_name": "Machine Learning", "importance": 0.85, "demand_share": 22.0},
        {"skill_name": "Docker", "importance": 0.60, "demand_share": 18.0},
        {"skill_name": "Kubernetes", "importance": 0.50, "demand_share": 12.0},
    ]


def test_full_skill_coverage(target_requirements):
    """When candidate has all required skills, coverage should be 100%."""
    rec = SkillRecommender()
    candidate_skills = ["Python", "SQL", "Machine Learning", "Docker", "Kubernetes"]
    
    result = rec.analyze_skill_gap(
        candidate_skills=candidate_skills,
        target_occupation="Data Scientist",
        target_requirements=target_requirements,
    )
    
    assert result["skill_coverage"] == 100.0
    assert len(result["matched_skills"]) == 5
    assert len(result["missing_skills"]) == 0


def test_partial_skill_coverage(target_requirements):
    """Verify transparent mathematical coverage formula."""
    rec = SkillRecommender()
    # Candidate only has Python (0.90) and SQL (0.80) out of total (0.90 + 0.80 + 0.85 + 0.60 + 0.50 = 3.65)
    # Expected coverage = (1.70 / 3.65) * 100 = 46.6%
    candidate_skills = ["Python", "SQL"]
    
    result = rec.analyze_skill_gap(
        candidate_skills=candidate_skills,
        target_occupation="Data Scientist",
        target_requirements=target_requirements,
    )
    
    assert 46.0 <= result["skill_coverage"] <= 47.0
    assert len(result["matched_skills"]) == 2
    assert len(result["missing_skills"]) == 3
    
    # Missing skills should be Machine Learning, Docker, Kubernetes
    missing_names = [m["skill_name"] for m in result["missing_skills"]]
    assert "Machine Learning" in missing_names
    assert "Docker" in missing_names
    assert "Kubernetes" in missing_names


def test_priority_ranking_and_reasoning(target_requirements):
    """Verify composite priority score ordering and explainability."""
    rec = SkillRecommender()
    candidate_skills = ["Python"]
    growth_scores = {"Machine Learning": 25.0, "Docker": 5.0, "Kubernetes": 18.0}
    
    result = rec.analyze_skill_gap(
        candidate_skills=candidate_skills,
        target_occupation="Data Scientist",
        target_requirements=target_requirements,
        growth_scores=growth_scores,
    )
    
    missing = result["missing_skills"]
    assert len(missing) == 4
    
    # Ranks should be 1, 2, 3, 4
    ranks = [m["priority_rank"] for m in missing]
    assert ranks == [1, 2, 3, 4]
    
    # Composite scores should be descending
    scores = [m["composite_score"] for m in missing]
    assert scores == sorted(scores, reverse=True)
    
    # Each recommendation must have non-empty grounded reasoning
    for m in missing:
        assert len(m["reasoning"]) > 10
        assert "Data Scientist" in m["reasoning"] or "requirement" in m["reasoning"] or "competence" in m["reasoning"]
