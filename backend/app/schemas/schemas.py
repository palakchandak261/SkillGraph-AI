from __future__ import annotations

"""Pydantic v2 schemas for API requests, responses, and validation."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator


# -----------------------------------------------------------------------------
# Base Schema Configuration
# -----------------------------------------------------------------------------
class ORMBase(BaseModel):
    """Base model with ORM serialization enabled."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# -----------------------------------------------------------------------------
# System & Pipeline Schemas
# -----------------------------------------------------------------------------
class HealthResponse(BaseModel):
    """System health and operational status response."""
    status: str = Field(..., description="Overall health status, e.g., 'healthy', 'degraded'")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    version: str = Field(..., description="Application version")
    database_connected: bool = Field(..., description="Whether database connection is verified")
    tables_count: int = Field(..., description="Number of database tables configured")


class DatasetStatusResponse(BaseModel):
    """Status metadata for an ingested or registered dataset source."""
    name: str
    source_url: str = ""
    downloaded: bool = False
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    row_count: Optional[int] = None
    columns: List[str] = Field(default_factory=list)
    date_coverage_start: Optional[str] = None
    date_coverage_end: Optional[str] = None
    processing_status: str = "unknown"
    license_info: Optional[str] = None
    sha256_checksum: Optional[str] = None


class PipelineRunRequest(BaseModel):
    """Request payload to trigger an automated pipeline stage."""
    stage: Optional[str] = Field(
        default=None,
        description="Pipeline stage name: 'ingestion', 'preprocessing', 'extraction', 'graph_building', 'forecasting'",
    )
    stages: Optional[List[str]] = Field(
        default=None,
        description="List of pipeline stage names to execute",
    )
    config: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Optional stage execution parameters",
    )


class PipelineStageResponse(BaseModel):
    """Execution status for a single pipeline stage."""
    stage: str
    status: str = "completed"
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    records_processed: Optional[int] = 0
    records_output: Optional[int] = 0
    error_message: Optional[str] = None


class PipelineStatusResponse(BaseModel):
    """Overall status and telemetry across all pipeline stages."""
    is_running: bool = False
    stages: List[PipelineStageResponse] = Field(default_factory=list)
    last_run: Optional[str] = None


class PipelineRunResponse(ORMBase):
    """Telemetry and status information for a pipeline run."""
    id: int
    stage: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    records_processed: int
    records_output: int
    error_message: Optional[str] = None
    config_json: Optional[Dict[str, Any]] = None


# -----------------------------------------------------------------------------
# Skill Schemas
# -----------------------------------------------------------------------------
class SkillResponse(ORMBase):
    """Canonical skill entity representation."""
    id: int
    canonical_name: str
    category: Optional[str] = None
    description: Optional[str] = None
    taxonomy_source: Optional[str] = None
    esco_id: Optional[str] = None
    onet_id: Optional[str] = None
    aliases: Optional[List[str]] = Field(default=None, alias="aliases_json")


class SkillSearchResponse(BaseModel):
    """Search results response for skill autocomplete and matching."""
    query: str
    total: int
    results: List[SkillResponse]


class TrendDataPoint(BaseModel):
    """Individual time bucket demand metric."""
    period_start: Optional[str] = Field(default=None, description="ISO formatted start date of the period")
    period: Optional[str] = None
    posting_count: int = 0
    demand_share: float = 0.0
    value: Optional[float] = None
    skill_name: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def populate_aliases(cls, data: Any):
        if isinstance(data, dict):
            if "period" not in data and "period_start" in data:
                data["period"] = str(data["period_start"])[:7]
            elif "period_start" not in data and "period" in data:
                data["period_start"] = f"{data['period']}-01"
            if "value" not in data:
                val = data.get("posting_count")
                if val is None:
                    val = data.get("demand_share", 0)
                data["value"] = float(val)
        return data


class DemandTrendResponse(BaseModel):
    """Historical demand time-series response for a specific skill."""
    skill_id: int
    skill_name: str
    trends: List[TrendDataPoint]


class RelatedSkillSummary(BaseModel):
    """Summary of a related skill extracted from graph relationships."""
    skill_id: int
    canonical_name: str
    category: Optional[str] = None
    weight: float
    relationship_type: str


class SkillDetailResponse(BaseModel):
    """Comprehensive skill profile including labor metrics and related graph skills."""
    skill: SkillResponse
    job_count: int
    demand_trend: Optional[List[TrendDataPoint]] = Field(default_factory=list)
    related_skills: Optional[List[RelatedSkillSummary]] = Field(default_factory=list)


class PaginatedSkillsResponse(BaseModel):
    """Paginated collection of canonical skills."""
    items: List[SkillResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class PaginatedSkillDemandResponse(BaseModel):
    """Paginated collection of skill demand metrics for the Skill Intelligence page."""
    items: List[SkillDemandItem]
    total: int
    page: int
    page_size: int
    total_pages: int


# -----------------------------------------------------------------------------
# Occupation Schemas
# -----------------------------------------------------------------------------
class OccupationResponse(ORMBase):
    """Canonical occupation entity representation."""
    id: int
    title: str
    esco_code: Optional[str] = None
    onet_code: Optional[str] = None
    description: Optional[str] = None
    taxonomy_source: Optional[str] = None
    skill_count: int = 0


# -----------------------------------------------------------------------------
# Analytics Schemas
# -----------------------------------------------------------------------------
class SkillMetricSummary(BaseModel):
    """Aggregated labor market metric for a skill."""
    skill_id: int
    canonical_name: str
    category: Optional[str] = None
    posting_count: int
    demand_share: float
    growth_rate: Optional[float] = None


class DataQualitySummary(BaseModel):
    """Data quality and completeness metrics summary."""
    completeness: float = 0.0
    duplicate_rate: float = 0.0
    missing_description_rate: float = 0.0
    date_coverage_months: int = 0


class SkillDemandItem(BaseModel):
    """Skill demand summary item for frontend display and intelligence views."""
    id: Optional[int] = None
    skill_id: int
    skill_name: str
    canonical_name: Optional[str] = None
    category: Optional[str] = None
    posting_count: int = 0
    demand_share: float = 0.0
    growth_rate: Optional[float] = None
    taxonomy_source: Optional[str] = None
    esco_id: Optional[str] = None
    onet_id: Optional[str] = None
    aliases: Optional[List[str]] = None

    @model_validator(mode="before")
    @classmethod
    def sync_aliases(cls, data: Any):
        if isinstance(data, dict):
            if "id" not in data and "skill_id" in data:
                data["id"] = data["skill_id"]
            elif "skill_id" not in data and "id" in data:
                data["skill_id"] = data["id"]
            if "canonical_name" not in data and "skill_name" in data:
                data["canonical_name"] = data["skill_name"]
            elif "skill_name" not in data and "canonical_name" in data:
                data["skill_name"] = data["canonical_name"]
        return data


class TrendPointItem(BaseModel):
    """Time series point for demand trends."""
    period: str
    value: float
    skill_name: Optional[str] = None


class AnalyticsOverview(BaseModel):
    """High-level labor market analytics overview."""
    total_raw_postings: int = 0
    total_cleaned_postings: int = 0
    total_skills: int = 0
    total_occupations: int = 0
    emerging_skills_count: int = 0
    last_pipeline_run: Optional[str] = None
    date_coverage_start: Optional[str] = None
    date_coverage_end: Optional[str] = None
    top_skills: List[SkillDemandItem] = Field(default_factory=list)
    recent_trends: List[TrendPointItem] = Field(default_factory=list)
    data_quality: DataQualitySummary = Field(default_factory=DataQualitySummary)
    total_jobs: int = 0
    total_sources: int = 0
    top_growing_skills: List[SkillMetricSummary] = Field(default_factory=list)
    top_in_demand_skills: List[SkillMetricSummary] = Field(default_factory=list)


# -----------------------------------------------------------------------------
# Knowledge Graph Schemas
# -----------------------------------------------------------------------------
class GraphNodeResponse(BaseModel):
    """Graph node representing a canonical skill or occupation."""
    id: str
    label: str
    type: str = "skill"
    category: Optional[str] = None
    size: float = 1.0
    community: Optional[int] = None
    centrality: Optional[float] = None
    demand_share: Optional[float] = None


class GraphEdgeResponse(BaseModel):
    """Graph edge representing co-occurrence or taxonomy link between entities."""
    id: str
    source: str
    target: str
    weight: float
    type: str = "co_occurrence"


class GraphResponse(BaseModel):
    """Complete network graph response with nodes and edges."""
    nodes: List[GraphNodeResponse]
    edges: List[GraphEdgeResponse]
    total_nodes: int
    total_edges: int


# -----------------------------------------------------------------------------
# Forecasting Schemas
# -----------------------------------------------------------------------------
class ForecastPoint(BaseModel):
    """Single forecasted point in time with prediction interval bounds."""
    period_start: str
    forecasted_value: float
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None


class ForecastResponse(BaseModel):
    """Forecast trajectory and performance metrics for a specific skill."""
    skill_id: int
    skill_name: str
    model_name: str
    metrics: Dict[str, Any] = Field(default_factory=dict)
    predictions: List[ForecastPoint]


class ForecastSkillResponse(BaseModel):
    """Summary of skills that have active forecast models trained."""
    skill_id: int
    skill_name: str
    available_models: List[str]
    selected_model: Optional[str] = None
    latest_period: Optional[str] = None


# -----------------------------------------------------------------------------
# Student & Career Recommendation Schemas
# -----------------------------------------------------------------------------
class StudentProfileCreate(BaseModel):
    """Schema for creating a new student/user profile."""
    name: str
    target_occupation_id: Optional[int] = None
    experience_level: Optional[str] = "intermediate"
    location: Optional[str] = None
    current_skill_ids: List[int] = Field(default_factory=list)


class StudentProfileResponse(ORMBase):
    """Schema for a student profile with associated skills."""
    id: int
    name: str
    target_occupation_id: Optional[int] = None
    target_occupation_title: Optional[str] = None
    experience_level: Optional[str] = None
    location: Optional[str] = None
    skills: List[SkillResponse] = Field(default_factory=list)
    created_at: datetime


class SkillRecommendationResponse(BaseModel):
    """Personalized skill recommendation with multi-factor scoring."""
    skill_id: int
    skill_name: str
    priority_rank: Optional[int] = None
    relevance_score: Optional[float] = None
    demand_score: Optional[float] = None
    growth_score: Optional[float] = None
    composite_score: Optional[float] = None
    reasoning: Optional[str] = None


class SkillMatchItem(BaseModel):
    """Detailed match status of a required occupation skill."""
    skill_id: int
    skill_name: str
    importance: float = 1.0
    matched: bool = False


class SkillGapAnalysisRequest(BaseModel):
    """Input payload for ad-hoc or profile-based skill gap analysis."""
    profile_id: Optional[int] = None
    target_occupation_id: Optional[int] = None
    current_skill_ids: List[int] = Field(default_factory=list)
    skills: Optional[List[int]] = None
    name: Optional[str] = None
    experience_level: Optional[str] = None
    location: Optional[str] = None


class SkillGapAnalysisResponse(BaseModel):
    """Detailed skill gap analysis and prioritized recommendations."""
    profile_id: Optional[int] = None
    target_occupation: Optional[str] = None
    skill_coverage: float = 0.0
    total_required: int = 0
    total_matched: int = 0
    matched_skills: List[SkillMatchItem] = Field(default_factory=list)
    missing_skills: List[SkillRecommendationResponse] = Field(default_factory=list)
    recommendations: List[SkillRecommendationResponse] = Field(default_factory=list)
    current_skills: List[SkillResponse] = Field(default_factory=list)


# -----------------------------------------------------------------------------
# Model Evaluation Schemas
# -----------------------------------------------------------------------------
class ModelEvaluationResponse(ORMBase):
    """Model performance benchmarks and metadata."""
    id: int
    model_type: str
    model_name: str
    dataset_version: Optional[str] = None
    train_date_range: Optional[str] = None
    test_date_range: Optional[str] = None
    metrics: Dict[str, Any] = Field(default_factory=dict, alias="metrics_json")
    parameters: Dict[str, Any] = Field(default_factory=dict, alias="parameters_json")
    artifact_path: Optional[str] = None
    created_at: datetime


# -----------------------------------------------------------------------------
# Career Intelligence & Student Journey Schemas
# -----------------------------------------------------------------------------
class CareerSearchItem(BaseModel):
    """Result item for career search and autocomplete."""
    career_id: int
    title: str
    onet_code: Optional[str] = None
    description: Optional[str] = None
    posting_count: int = 0
    demand_status: str
    match_type: str
    matched_alias: Optional[str] = None


class CareerOverviewResponse(BaseModel):
    """Detailed career overview for Page 2: Dream Career Intelligence."""
    career_id: int
    title: str
    onet_code: Optional[str] = None
    description: str
    related_titles: List[str] = Field(default_factory=list)
    posting_count: int = 0
    distinct_employers: int = 0
    distinct_skills_count: int = 0
    geographic_coverage: str
    date_coverage: str
    demand_status: str
    demand_status_evidence: str
    data_limitations: str


class CareerSkillItem(BaseModel):
    """Skill requirement for a target career."""
    skill_id: int
    skill_name: str
    posting_count: int = 0
    demand_percentage: float = 0.0
    importance_score: float = 0.0
    taxonomy_source: str
    in_taxonomy: bool = True
    category: str = "Technical"
    sample_size: int = 0
    related_skills: List[str] = Field(default_factory=list)


class CareerTrendsResponse(BaseModel):
    """Historical monthly trajectory for a career."""
    career_id: int
    title: str
    trends: List[TrendDataPoint] = Field(default_factory=list)
    recent_change: float = 0.0
    trend_direction: str = "stable"


class CareerForecastResponse(BaseModel):
    """Statistical time-series projection for a career."""
    career_id: int
    title: str
    is_eligible: bool
    insufficient_data_reason: Optional[str] = None
    model_name: Optional[str] = None
    evaluation: Optional[Dict[str, float]] = None
    historical_points: List[TrendDataPoint] = Field(default_factory=list)
    forecast_points: List[Dict[str, Any]] = Field(default_factory=list)
    confidence_level: float = 0.95


class CareerAlternativeItem(BaseModel):
    """Alternative career sharing competencies."""
    career_id: int
    title: str
    onet_code: Optional[str] = None
    posting_count: int = 0
    similarity_score: float = 0.0
    shared_skills: List[str] = Field(default_factory=list)
    shared_skills_count: int = 0
    distinctive_skills: List[str] = Field(default_factory=list)
    transition_rationale: str


class StudentSkillInput(BaseModel):
    """Skill item entered by student."""
    skill_id: Optional[int] = None
    skill_name: str
    proficiency: str = "intermediate"  # beginner, intermediate, advanced
    is_custom: bool = False


class StudentProfileCreateRequest(BaseModel):
    """Payload to create or update student profile."""
    name: str = "Student"
    target_career_id: Optional[int] = None
    target_career_title: Optional[str] = None
    experience_level: Optional[str] = "student"
    education_level: Optional[str] = None
    skills: List[StudentSkillInput] = Field(default_factory=list)
    projects: Optional[List[str]] = None


class StudentSkillGapRequest(BaseModel):
    """Payload for student skill-gap analysis."""
    candidate_skills: List[str] = Field(default_factory=list)
    career_id: int
    proficiencies: Optional[Dict[str, str]] = None


class StudentSkillGapResponse(BaseModel):
    """Response model for Page 4: Personalized Skill-Gap Analyzer."""
    career_id: int
    career_title: str
    skill_coverage: float
    formula_explanation: str
    matched_skills: List[Dict[str, Any]] = Field(default_factory=list)
    skills_to_improve: List[Dict[str, Any]] = Field(default_factory=list)
    important_missing: List[Dict[str, Any]] = Field(default_factory=list)
    optional_missing: List[Dict[str, Any]] = Field(default_factory=list)
    suggested_next_skill: Optional[Dict[str, str]] = None
    total_required: int = 0
    total_matched: int = 0


class RoadmapSkillItem(BaseModel):
    skill_name: str
    priority: str
    reasoning: str
    status: str = "not_started"


class RoadmapPhase(BaseModel):
    phase_number: int
    title: str
    description: str
    skills: Optional[List[RoadmapSkillItem]] = None
    projects: Optional[List[Dict[str, Any]]] = None


class StudentRoadmapResponse(BaseModel):
    """Response model for Page 5: Personalized Learning Roadmap."""
    career_id: int
    career_title: str
    skill_coverage: float
    phases: List[RoadmapPhase] = Field(default_factory=list)


class StudentCareerMatchItem(BaseModel):
    """Response item for Page 6: Career Alternatives and Mobility."""
    career_id: int
    title: str
    onet_code: Optional[str] = None
    posting_count: int = 0
    skill_coverage: float = 0.0
    shared_skills: List[str] = Field(default_factory=list)
    shared_skills_count: int = 0
    missing_skills: List[str] = Field(default_factory=list)
    missing_skills_count: int = 0
    match_tier: str


class CareerGraphResponse(BaseModel):
    """Response model for Page 7: Interactive Career and Skill Graph."""
    career_id: int
    career_title: str
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    total_nodes: int
    total_edges: int


# -----------------------------------------------------------------------------
# Innovative Features & Opportunity Matcher Schemas
# -----------------------------------------------------------------------------
class OpportunityMatchRequest(BaseModel):
    candidate_skills: List[str] = Field(default_factory=list)
    role_filter: Optional[str] = None
    location_filter: Optional[str] = None
    min_match_score: float = 20.0
    limit: int = 15
    offset: int = 0


class OpportunityMatchItem(BaseModel):
    job_id: int
    title: str
    company: str
    location: str
    employment_type: str
    salary_range: Optional[str] = None
    posted_date: Optional[str] = None
    source_name: str
    external_url: Optional[str] = None
    match_score: float
    match_tier: str
    matched_skills: List[str]
    matched_count: int
    missing_skills: List[str]
    missing_count: int
    total_job_skills: int
    relevance_explanation: str


class OpportunityMatchResponse(BaseModel):
    total_matched: int
    matches: List[OpportunityMatchItem]
    candidate_skills_evaluated: Optional[List[str]] = None
    message: Optional[str] = None


class ResumeParseRequest(BaseModel):
    resume_text: str
    experience_level_hint: Optional[str] = None


class ExtractedSkillItem(BaseModel):
    skill_id: int
    skill_name: str
    category: str
    proficiency: str
    confidence: float
    occurrences: int
    context_snippet: str


class ResumeParseResponse(BaseModel):
    extracted_skills: List[ExtractedSkillItem]
    total_skills_found: int
    word_count: int
    inferred_experience_level: str
    processing_time_ms: float
    privacy_notice: str


class WhatIfRequest(BaseModel):
    current_skills: List[str]
    simulated_skills: List[str]
    target_career_id: int


class SkillEvidenceRequest(BaseModel):
    skill_name: str
    evidence_type: str = "project_description"
    evidence_text: str


class LearningROIOptimizerRequest(BaseModel):
    candidate_skills: List[str]
    target_career_id: int
    weekly_hours: int = 10


class ProjectGeneratorRequest(BaseModel):
    target_career_title: str
    target_skills: List[str]
    experience_level: str = "student"


