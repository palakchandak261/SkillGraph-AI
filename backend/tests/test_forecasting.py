"""
Unit tests for SkillForecaster time-series aggregation, eligibility, model evaluation, and prediction intervals.
"""
import numpy as np
import pandas as pd
import pytest
from backend.app.forecasting.forecaster import SkillForecaster


@pytest.fixture
def sample_demand_df():
    """Synthetic monthly demand time series for testing."""
    records = []
    # 8 monthly observations for Python (sufficient)
    periods = ["2023-01", "2023-02", "2023-03", "2023-04", "2023-05", "2023-06", "2023-07", "2023-08"]
    shares = [12.0, 12.5, 13.0, 13.8, 14.2, 14.9, 15.3, 16.0]
    for p, s in zip(periods, shares):
        records.append({
            "canonical_skill": "Python",
            "period": p,
            "posting_count": int(s * 10),
            "total_postings": 1000,
            "demand_share": s,
            "unique_employers": 50,
        })
    
    # 2 monthly observations for Rust (sparse/insufficient)
    records.append({
        "canonical_skill": "Rust",
        "period": "2023-07",
        "posting_count": 5,
        "total_postings": 1000,
        "demand_share": 0.5,
        "unique_employers": 3,
    })
    records.append({
        "canonical_skill": "Rust",
        "period": "2023-08",
        "posting_count": 6,
        "total_postings": 1000,
        "demand_share": 0.6,
        "unique_employers": 4,
    })
    
    return pd.DataFrame(records)


def test_forecast_eligibility_insufficient_data(sample_demand_df):
    """Ensure skills with sparse historical coverage are flagged and not extrapolated blindly."""
    forecaster = SkillForecaster(min_periods_required=4)
    result = forecaster.evaluate_and_forecast_skill("Rust", sample_demand_df, forecast_horizon=6)
    
    assert result["data_sufficient"] is False
    assert "Insufficient historical data" in result["warning"]
    assert len(result["forecast"]) == 0
    assert len(result["historical"]) == 2


def test_forecast_eligible_skill(sample_demand_df):
    """Test full chronological evaluation, baseline comparison, and prediction intervals."""
    forecaster = SkillForecaster(min_periods_required=4)
    result = forecaster.evaluate_and_forecast_skill("Python", sample_demand_df, forecast_horizon=6)
    
    assert result["data_sufficient"] is True
    assert result["warning"] is None
    assert len(result["forecast"]) == 6
    assert len(result["historical"]) == 8
    
    # Verify evaluation metrics
    metrics = result["metrics"]
    assert metrics["mae"] is not None
    assert metrics["rmse"] is not None
    assert metrics["mase"] is not None
    assert metrics["baseline_mae"] is not None
    
    # Verify prediction interval bounds
    first_fc = result["forecast"][0]
    assert "lower_bound" in first_fc
    assert "upper_bound" in first_fc
    assert first_fc["lower_bound"] <= first_fc["value"] <= first_fc["upper_bound"]


def test_emerging_skills_classification(sample_demand_df):
    """Test ranking and trend direction classification."""
    forecaster = SkillForecaster()
    emerging = forecaster.identify_emerging_skills(sample_demand_df, min_total_postings=2)
    
    assert len(emerging) > 0
    names = [e["skill_name"] for e in emerging]
    assert "Python" in names
    
    py_record = next(e for e in emerging if e["skill_name"] == "Python")
    assert py_record["growth_rate"] > 0
    assert py_record["trend_direction"] == "rising"
