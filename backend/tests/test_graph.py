"""
Unit tests for SkillGraphEngine NetworkX graph engine and metrics.
"""
import pandas as pd
import pytest
from backend.app.graph.skill_graph import SkillGraphEngine


@pytest.fixture
def sample_extractions():
    """Synthetic extractions fixture."""
    return pd.DataFrame([
        {"job_id": 1, "canonical_skill": "Python"},
        {"job_id": 1, "canonical_skill": "SQL"},
        {"job_id": 1, "canonical_skill": "Docker"},
        {"job_id": 2, "canonical_skill": "Python"},
        {"job_id": 2, "canonical_skill": "SQL"},
        {"job_id": 2, "canonical_skill": "FastAPI"},
        {"job_id": 3, "canonical_skill": "Python"},
        {"job_id": 3, "canonical_skill": "Machine Learning"},
        {"job_id": 3, "canonical_skill": "PyTorch"},
        {"job_id": 4, "canonical_skill": "React"},
        {"job_id": 4, "canonical_skill": "TypeScript"},
    ])


@pytest.fixture
def sample_occupations():
    return pd.DataFrame([
        {"occupation_title": "Data Scientist", "skill_name": "Python", "importance": 0.95},
        {"occupation_title": "Data Scientist", "skill_name": "Machine Learning", "importance": 0.90},
        {"occupation_title": "Data Scientist", "skill_name": "SQL", "importance": 0.85},
    ])


def test_graph_construction(sample_extractions):
    engine = SkillGraphEngine(min_cooccurrence_weight=1)
    g = engine.build_from_extractions(sample_extractions)
    
    # Check nodes
    assert g.has_node("Python")
    assert g.has_node("SQL")
    assert g.has_node("React")
    
    # Check edges and co-occurrence weights
    assert g.has_edge("Python", "SQL")
    # Python & SQL appear together in Job 1 and Job 2 -> weight should be 2
    assert g["Python"]["SQL"]["weight"] == 2
    
    # Python & React do not appear in the same job
    assert not g.has_edge("Python", "React")


def test_graph_metrics(sample_extractions):
    engine = SkillGraphEngine(min_cooccurrence_weight=1)
    g = engine.build_from_extractions(sample_extractions)
    
    # Python is the most connected node
    py_deg = g.nodes["Python"]["degree"]
    assert py_deg > 0
    assert "betweenness" in g.nodes["Python"]
    assert "community" in g.nodes["Python"]


def test_focused_subgraph(sample_extractions):
    engine = SkillGraphEngine(min_cooccurrence_weight=1)
    engine.build_from_extractions(sample_extractions)
    
    sub = engine.get_focused_subgraph("Python", depth=1, min_weight=1)
    assert sub["total_nodes"] > 1
    node_ids = {n["id"] for n in sub["nodes"]}
    assert "Python" in node_ids
    assert "SQL" in node_ids
    # React should not be in 1-hop subgraph of Python
    assert "React" not in node_ids


def test_related_skills(sample_extractions):
    engine = SkillGraphEngine(min_cooccurrence_weight=1)
    engine.build_from_extractions(sample_extractions)
    
    related = engine.get_related_skills("Python", top_k=5)
    assert len(related) > 0
    # SQL should be top related (weight 2)
    assert related[0]["skill_name"] == "SQL"
    assert related[0]["weight"] == 2
