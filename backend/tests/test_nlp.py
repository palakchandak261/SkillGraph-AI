"""
Unit tests for NLP skill extraction, alias normalization, and false-positive prevention.
"""
import pandas as pd
import pytest
from backend.app.nlp.skill_extractor import SkillExtractor


@pytest.fixture
def extractor(tmp_path):
    ext = SkillExtractor(data_dir=str(tmp_path))
    ext.load_common_tech_skills()
    ext.build_patterns()
    return ext


def test_alias_normalization(extractor):
    """Test that skill aliases resolve to canonical names."""
    # 'js' maps to 'javascript'
    assert extractor.alias_map.get("js") == "javascript"
    # 'k8s' maps to 'kubernetes'
    assert extractor.alias_map.get("k8s") == "kubernetes"
    # 'postgres' maps to 'postgresql'
    assert extractor.alias_map.get("postgres") == "postgresql"
    # 'py' maps to 'python'
    assert extractor.alias_map.get("py") == "python"


def test_exact_skill_extraction(extractor):
    """Test extraction of canonical skill phrases from realistic text."""
    text = "We are seeking a Backend Engineer with strong Python and Docker experience, building APIs with FastAPI."
    results = extractor.extract_skills(text)
    
    extracted_names = {r["canonical_skill"] for r in results}
    assert "Python" in extracted_names
    assert "Docker" in extracted_names
    assert "FastAPI" in extracted_names


def test_alias_skill_extraction(extractor):
    """Test extraction of aliases and verification of canonical mapping."""
    text = "Experience with Postgres database, K8s cluster administration, and Reactjs frontends."
    results = extractor.extract_skills(text)
    
    extracted_names = {r["canonical_skill"] for r in results}
    assert "PostgreSQL" in extracted_names
    assert "Kubernetes" in extracted_names
    assert "React" in extracted_names


def test_false_positive_prevention(extractor):
    """Ensure sub-word occurrences do not trigger false positive matches."""
    # Words like 'good' should not trigger 'go', 'bar' should not trigger 'r', 'train' should not trigger 'r'
    text = "Looking for a good worker who can manage daily tasks and deliver quality work."
    results = extractor.extract_skills(text)
    extracted_names = {r["canonical_skill"].lower() for r in results}
    
    assert "go" not in extracted_names
    assert "r" not in extracted_names


def test_extraction_evaluation_metrics(extractor):
    """Test precision, recall, and F1 computation."""
    predictions = pd.DataFrame([
        {"job_id": 1, "canonical_skill": "Python"},
        {"job_id": 1, "canonical_skill": "SQL"},
        {"job_id": 1, "canonical_skill": "Java"},  # False positive
        {"job_id": 2, "canonical_skill": "React"},
    ])
    ground_truth = pd.DataFrame([
        {"job_id": 1, "canonical_skill": "Python"},
        {"job_id": 1, "canonical_skill": "SQL"},
        {"job_id": 1, "canonical_skill": "Docker"},  # False negative
        {"job_id": 2, "canonical_skill": "React"},
    ])
    
    eval_metrics = extractor.evaluate_extraction(predictions, ground_truth)
    assert "precision" in eval_metrics
    assert "recall" in eval_metrics
    assert "f1" in eval_metrics
    assert eval_metrics["precision"] == 0.75  # 3 TP / 4 Pred
    assert eval_metrics["recall"] == 0.75     # 3 TP / 4 True
    assert eval_metrics["f1"] == 0.75
