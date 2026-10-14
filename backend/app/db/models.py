"""SQLAlchemy ORM models for SkillGraph AI.

Tables:
- DatasetSource: Metadata on datasets imported/tracked
- JobPosting: Normalized job postings
- Skill: Canonical skill taxonomy entities
- Occupation: Canonical occupations (ESCO / O*NET / custom)
- JobSkill: Association between job postings and extracted skills
- OccupationSkill: Association between occupations and skills
- SkillRelationship: Graph edges between skills (co-occurrence, taxonomy, prerequisites)
- SkillDemandObservation: Aggregated time-series demand observations
- ForecastRun: Time-series forecasting runs and evaluated accuracy metrics
- ForecastResult: Granular point predictions and prediction intervals
- StudentProfile: User profiles for career navigation & gap analysis
- StudentSkill: Current skills possessed by user/student profiles
- SkillRecommendation: Personalized skill recommendations based on target occupation
- ModelEvaluationRun: Benchmark evaluation metrics across models and datasets
- PipelineRun: Execution logs and telemetry for ETL / ML pipeline stages
"""

from datetime import datetime
from typing import Any, List, Optional
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from backend.app.db.database import Base


class DatasetSource(Base):
    """Metadata regarding raw and processed dataset sources."""

    __tablename__ = "dataset_sources"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, index=True)
    source_url = Column(String(1024), nullable=True)
    download_timestamp = Column(DateTime, nullable=True)
    file_name = Column(String(255), nullable=True)
    file_size = Column(BigInteger, nullable=True)
    sha256_checksum = Column(String(64), nullable=True)
    license_info = Column(String(255), nullable=True)
    row_count = Column(Integer, nullable=True)
    columns_json = Column(JSON, nullable=True)
    date_coverage_start = Column(DateTime, nullable=True)
    date_coverage_end = Column(DateTime, nullable=True)
    processing_status = Column(String(50), default="pending", nullable=False, index=True)
    notes = Column(Text, nullable=True)

    # Relationships
    job_postings = relationship(
        "JobPosting",
        back_populates="source",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return f"<DatasetSource(id={self.id}, name='{self.name}', status='{self.processing_status}')>"


class JobPosting(Base):
    """Job postings ingestion and normalized attributes."""

    __tablename__ = "job_postings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_id = Column(
        Integer,
        ForeignKey("dataset_sources.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    external_id = Column(String(255), nullable=True, index=True)
    occupation_id = Column(
        Integer,
        ForeignKey("occupations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title = Column(String(512), nullable=False, index=True)
    normalized_title = Column(String(512), nullable=True, index=True)
    company = Column(String(255), nullable=True, index=True)
    location = Column(String(255), nullable=True)
    normalized_location = Column(String(255), nullable=True, index=True)
    description = Column(Text, nullable=True)
    employment_type = Column(String(100), nullable=True)
    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)
    salary_currency = Column(String(10), nullable=True)
    posted_date = Column(DateTime, nullable=True, index=True)
    scraped_date = Column(DateTime, nullable=True)
    industry = Column(String(255), nullable=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    source = relationship("DatasetSource", back_populates="job_postings")
    job_skills = relationship(
        "JobSkill",
        back_populates="job_posting",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return f"<JobPosting(id={self.id}, title='{self.title}', company='{self.company}')>"


class Skill(Base):
    """Canonical skill entity mapped across standard taxonomies."""

    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, autoincrement=True)
    canonical_name = Column(String(255), nullable=False, unique=True, index=True)
    esco_id = Column(String(255), nullable=True, index=True)
    onet_id = Column(String(255), nullable=True, index=True)
    taxonomy_source = Column(String(100), nullable=True, index=True)  # ESCO, O*NET, Lightcast, Custom
    category = Column(String(100), nullable=True, index=True)  # Technical, Soft, Tool, Domain
    description = Column(Text, nullable=True)
    aliases_json = Column(JSON, nullable=True)  # List of alternate surface forms
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    job_skills = relationship(
        "JobSkill",
        back_populates="skill",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    occupation_skills = relationship(
        "OccupationSkill",
        back_populates="skill",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    demand_observations = relationship(
        "SkillDemandObservation",
        back_populates="skill",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    forecast_runs = relationship(
        "ForecastRun",
        back_populates="skill",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    student_skills = relationship(
        "StudentSkill",
        back_populates="skill",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    recommendations = relationship(
        "SkillRecommendation",
        back_populates="skill",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    relationships_from = relationship(
        "SkillRelationship",
        foreign_keys="SkillRelationship.skill_id_1",
        back_populates="skill_1",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    relationships_to = relationship(
        "SkillRelationship",
        foreign_keys="SkillRelationship.skill_id_2",
        back_populates="skill_2",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return f"<Skill(id={self.id}, canonical_name='{self.canonical_name}', category='{self.category}')>"


class Occupation(Base):
    """Canonical occupation entity aligned with ESCO / O*NET codes."""

    __tablename__ = "occupations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False, index=True)
    esco_code = Column(String(100), nullable=True, index=True)
    onet_code = Column(String(100), nullable=True, index=True)
    description = Column(Text, nullable=True)
    taxonomy_source = Column(String(100), nullable=True)
    aliases_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    occupation_skills = relationship(
        "OccupationSkill",
        back_populates="occupation",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    demand_observations = relationship(
        "SkillDemandObservation",
        back_populates="occupation",
    )
    student_profiles = relationship(
        "StudentProfile",
        back_populates="target_occupation",
    )

    def __repr__(self) -> str:
        return f"<Occupation(id={self.id}, title='{self.title}', esco_code='{self.esco_code}')>"


class JobSkill(Base):
    """Link between a job posting and an extracted canonical skill."""

    __tablename__ = "job_skills"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(
        Integer,
        ForeignKey("job_postings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    skill_id = Column(
        Integer,
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    matched_phrase = Column(String(255), nullable=True)
    confidence = Column(Float, default=1.0, nullable=False)
    extraction_method = Column(String(100), nullable=True)  # spacy, regex, bert, llm
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    job_posting = relationship("JobPosting", back_populates="job_skills")
    skill = relationship("Skill", back_populates="job_skills")

    __table_args__ = (
        UniqueConstraint("job_id", "skill_id", name="uq_job_skill"),
        Index("ix_job_skill_lookup", "job_id", "skill_id"),
    )

    def __repr__(self) -> str:
        return f"<JobSkill(job_id={self.job_id}, skill_id={self.skill_id}, confidence={self.confidence})>"


class OccupationSkill(Base):
    """Association between an occupation and associated essential or optional skills."""

    __tablename__ = "occupation_skills"

    id = Column(Integer, primary_key=True, autoincrement=True)
    occupation_id = Column(
        Integer,
        ForeignKey("occupations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    skill_id = Column(
        Integer,
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    importance_score = Column(Float, nullable=True)
    taxonomy_source = Column(String(100), nullable=True)
    relationship_type = Column(String(50), nullable=True)  # essential, optional, core

    # Relationships
    occupation = relationship("Occupation", back_populates="occupation_skills")
    skill = relationship("Skill", back_populates="occupation_skills")

    __table_args__ = (
        UniqueConstraint("occupation_id", "skill_id", name="uq_occupation_skill"),
    )

    def __repr__(self) -> str:
        return f"<OccupationSkill(occupation_id={self.occupation_id}, skill_id={self.skill_id})>"


class SkillRelationship(Base):
    """Knowledge graph edges between skills (co-occurrence, prerequisite, taxonomy hierarchy)."""

    __tablename__ = "skill_relationships"

    id = Column(Integer, primary_key=True, autoincrement=True)
    skill_id_1 = Column(
        Integer,
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    skill_id_2 = Column(
        Integer,
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    relationship_type = Column(String(50), nullable=False, default="co_occurrence", index=True)
    weight = Column(Float, nullable=False, default=1.0)
    source = Column(String(100), nullable=True)  # jaccard, pmi, esco, embedding
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    skill_1 = relationship("Skill", foreign_keys=[skill_id_1], back_populates="relationships_from")
    skill_2 = relationship("Skill", foreign_keys=[skill_id_2], back_populates="relationships_to")

    __table_args__ = (
        UniqueConstraint("skill_id_1", "skill_id_2", "relationship_type", name="uq_skill_rel"),
        Index("ix_skill_rel_pair", "skill_id_1", "skill_id_2"),
    )

    def __repr__(self) -> str:
        return f"<SkillRelationship({self.skill_id_1} -> {self.skill_id_2}, weight={self.weight})>"


class SkillDemandObservation(Base):
    """Aggregated labor market demand metrics by skill and time period."""

    __tablename__ = "skill_demand_observations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    skill_id = Column(
        Integer,
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    period_start = Column(DateTime, nullable=False, index=True)
    period_end = Column(DateTime, nullable=False, index=True)
    posting_count = Column(Integer, default=0, nullable=False)
    total_postings = Column(Integer, default=0, nullable=False)
    demand_share = Column(Float, default=0.0, nullable=False)
    unique_employers = Column(Integer, default=0, nullable=False)
    occupation_id = Column(
        Integer,
        ForeignKey("occupations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    skill = relationship("Skill", back_populates="demand_observations")
    occupation = relationship("Occupation", back_populates="demand_observations")

    __table_args__ = (
        Index("ix_demand_obs_skill_period", "skill_id", "period_start"),
    )

    def __repr__(self) -> str:
        return f"<SkillDemandObservation(skill_id={self.skill_id}, period={self.period_start}, count={self.posting_count})>"


class ForecastRun(Base):
    """Metadata and backtest evaluation for forecasting runs on a skill."""

    __tablename__ = "forecast_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    skill_id = Column(
        Integer,
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    model_name = Column(String(100), nullable=False, index=True)  # ARIMA, Prophet, ETS, Ridge
    train_start = Column(DateTime, nullable=True)
    train_end = Column(DateTime, nullable=True)
    test_start = Column(DateTime, nullable=True)
    test_end = Column(DateTime, nullable=True)
    mae = Column(Float, nullable=True)
    rmse = Column(Float, nullable=True)
    mase = Column(Float, nullable=True)
    selected = Column(Boolean, default=False, nullable=False, index=True)
    parameters_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    skill = relationship("Skill", back_populates="forecast_runs")
    results = relationship(
        "ForecastResult",
        back_populates="forecast_run",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return f"<ForecastRun(id={self.id}, skill_id={self.skill_id}, model='{self.model_name}', rmse={self.rmse})>"


class ForecastResult(Base):
    """Individual projected data points and confidence intervals from a forecast run."""

    __tablename__ = "forecast_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    forecast_run_id = Column(
        Integer,
        ForeignKey("forecast_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    period_start = Column(DateTime, nullable=False, index=True)
    forecasted_value = Column(Float, nullable=False)
    lower_bound = Column(Float, nullable=True)
    upper_bound = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    forecast_run = relationship("ForecastRun", back_populates="results")

    def __repr__(self) -> str:
        return f"<ForecastResult(run_id={self.forecast_run_id}, period={self.period_start}, val={self.forecasted_value})>"


class StudentProfile(Base):
    """User/Student profile for skill assessment and learning recommendations."""

    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    target_occupation_id = Column(
        Integer,
        ForeignKey("occupations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    experience_level = Column(String(50), nullable=True)  # beginner, intermediate, advanced
    location = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    target_occupation = relationship("Occupation", back_populates="student_profiles")
    skills = relationship(
        "StudentSkill",
        back_populates="profile",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    recommendations = relationship(
        "SkillRecommendation",
        back_populates="profile",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return f"<StudentProfile(id={self.id}, name='{self.name}')>"


class StudentSkill(Base):
    """Skills currently acquired by a student profile."""

    __tablename__ = "student_skills"

    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(
        Integer,
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    skill_id = Column(
        Integer,
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    proficiency_level = Column(String(50), default="intermediate", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    profile = relationship("StudentProfile", back_populates="skills")
    skill = relationship("Skill", back_populates="student_skills")

    __table_args__ = (
        UniqueConstraint("profile_id", "skill_id", name="uq_profile_skill"),
    )

    def __repr__(self) -> str:
        return f"<StudentSkill(profile_id={self.profile_id}, skill_id={self.skill_id})>"


class SkillRecommendation(Base):
    """Personalized skill recommendations ranked by composite gap, demand, and growth scores."""

    __tablename__ = "skill_recommendations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(
        Integer,
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    skill_id = Column(
        Integer,
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    priority_rank = Column(Integer, nullable=True)
    relevance_score = Column(Float, nullable=True)
    demand_score = Column(Float, nullable=True)
    growth_score = Column(Float, nullable=True)
    composite_score = Column(Float, nullable=True)
    reasoning = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    profile = relationship("StudentProfile", back_populates="recommendations")
    skill = relationship("Skill", back_populates="recommendations")

    def __repr__(self) -> str:
        return f"<SkillRecommendation(profile_id={self.profile_id}, skill_id={self.skill_id}, rank={self.priority_rank})>"


class ModelEvaluationRun(Base):
    """Evaluation records and metrics for ML models across versions."""

    __tablename__ = "model_evaluation_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    model_type = Column(String(100), nullable=False, index=True)  # forecasting, extraction, recommendation
    model_name = Column(String(100), nullable=False, index=True)
    dataset_version = Column(String(100), nullable=True)
    train_date_range = Column(String(100), nullable=True)
    test_date_range = Column(String(100), nullable=True)
    metrics_json = Column(JSON, nullable=True)
    parameters_json = Column(JSON, nullable=True)
    artifact_path = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<ModelEvaluationRun(id={self.id}, model='{self.model_name}', type='{self.model_type}')>"


class PipelineRun(Base):
    """Status tracking and metrics for data and modeling pipeline executions."""

    __tablename__ = "pipeline_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    stage = Column(String(100), nullable=False, index=True)  # ingestion, normalization, extraction, graph, forecasting
    status = Column(String(50), nullable=False, default="pending", index=True)  # pending, running, completed, failed
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    records_processed = Column(Integer, default=0, nullable=False)
    records_output = Column(Integer, default=0, nullable=False)
    error_message = Column(Text, nullable=True)
    config_json = Column(JSON, nullable=True)

    def __repr__(self) -> str:
        return f"<PipelineRun(id={self.id}, stage='{self.stage}', status='{self.status}')>"
