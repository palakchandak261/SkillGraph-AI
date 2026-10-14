"""
Unit tests for ETL pipeline and data cleaning routines.
"""
import pandas as pd
import numpy as np
import pytest
from backend.app.services.etl_pipeline import DataPipeline


@pytest.fixture
def sample_raw_df():
    """Synthetic test fixture for ETL testing."""
    return pd.DataFrame({
        "Job ID": [101, 102, 103, 104, 105],
        "Job Title": [
            "Senior Data Scientist - Remote",
            "Software Engineer (Hybrid)",
            "Data Scientist",
            "Senior Data Scientist - Remote",  # Duplicate
            "Product Manager",
        ],
        "Company Name": ["Acme Corp", "Beta Tech", "Acme Corp", "Acme Corp", "Gamma LLC"],
        "Job Description": [
            "<p>Looking for a <b>Data Scientist</b> with Python and SQL experience.</p>",
            "Software developer with TypeScript and React experience.",
            "Analyze data and build machine learning models in Python.",
            "<p>Looking for a <b>Data Scientist</b> with Python and SQL experience.</p>",  # Duplicate description
            None,  # Missing description
        ],
        "Listed Time": [
            1695000000000,  # Millisecond unix timestamp
            1695100000000,
            1695200000000,
            1695000000000,
            1695300000000,
        ],
        "Job Location": ["New York, NY", " San Francisco , CA ", "Remote", "New York, NY", "Austin, TX"],
    })


def test_standardize_columns(sample_raw_df, tmp_path):
    pipeline = DataPipeline(data_dir=str(tmp_path))
    df = pipeline.standardize_columns(sample_raw_df)
    
    assert "job_id" in df.columns
    assert "job_title" in df.columns
    assert "company_name" in df.columns
    assert "job_description" in df.columns
    assert "listed_time" in df.columns
    assert "job_location" in df.columns


def test_html_cleaning_and_text_normalization(sample_raw_df, tmp_path):
    pipeline = DataPipeline(data_dir=str(tmp_path))
    df = pipeline.standardize_columns(sample_raw_df)
    df = pipeline.normalize_text(df)
    
    clean_desc = df["job_description"].iloc[0]
    assert "<p>" not in clean_desc
    assert "<b>" not in clean_desc
    assert "Looking for a Data Scientist" in clean_desc


def test_date_parsing(sample_raw_df, tmp_path):
    pipeline = DataPipeline(data_dir=str(tmp_path))
    df = pipeline.standardize_columns(sample_raw_df)
    df = pipeline.validate_types(df)
    
    # listed_time should be converted from milliseconds timestamp to datetime
    assert pd.api.types.is_datetime64_any_dtype(df["listed_time"])
    assert df["listed_time"].dt.year.iloc[0] == 2023


def test_duplicate_removal(sample_raw_df, tmp_path):
    pipeline = DataPipeline(data_dir=str(tmp_path))
    df = pipeline.standardize_columns(sample_raw_df)
    df = pipeline.normalize_text(df)
    
    initial_len = len(df)
    df_dedup = pipeline.remove_duplicates(df)
    
    assert len(df_dedup) < initial_len
    # Duplicate row 104 should be dropped
    assert len(df_dedup) == 4


def test_normalize_title_and_location(sample_raw_df, tmp_path):
    pipeline = DataPipeline(data_dir=str(tmp_path))
    df = pipeline.standardize_columns(sample_raw_df)
    df = pipeline.normalize_fields(df)
    
    # "Senior Data Scientist - Remote" normalized to "Senior Data Scientist"
    assert "Senior Data Scientist" in df["normalized_title"].iloc[0]
    # Location spacing normalized
    assert df["normalized_location"].iloc[1] == "San Francisco, CA"
