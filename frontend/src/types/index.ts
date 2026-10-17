export interface Skill {
  id: number;
  canonical_name: string;
  esco_id: string | null;
  onet_id: string | null;
  taxonomy_source: string | null;
  category: string | null;
  description: string | null;
  aliases: string[];
}

export interface Occupation {
  id: number;
  title: string;
  esco_code: string | null;
  onet_code: string | null;
  description: string | null;
  taxonomy_source: string | null;
  skill_count?: number;
}

export interface JobPosting {
  id: number;
  external_id: string | null;
  title: string;
  company: string | null;
  location: string | null;
  description: string | null;
  employment_type: string | null;
  posted_date: string | null;
  industry: string | null;
}

export interface AnalyticsOverview {
  total_raw_postings: number;
  total_cleaned_postings: number;
  total_skills: number;
  total_occupations: number;
  emerging_skills_count: number;
  last_pipeline_run: string | null;
  date_coverage_start: string | null;
  date_coverage_end: string | null;
  top_skills: SkillDemand[];
  recent_trends: TrendDataPoint[];
  data_quality: DataQuality;
}

export interface SkillDemand {
  skill_id: number;
  skill_name: string;
  posting_count: number;
  demand_share: number;
  growth_rate: number | null;
}

export interface TrendDataPoint {
  period: string;
  value: number;
  posting_count?: number;
  demand_share?: number;
  period_start?: string;
  skill_name?: string;
}

export interface DataQuality {
  completeness: number;
  duplicate_rate: number;
  missing_description_rate: number;
  date_coverage_months: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'skill' | 'occupation';
  size: number;
  community?: number;
  centrality?: number;
  demand_share?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  total_nodes: number;
  total_edges: number;
}

export interface ForecastData {
  skill_id: number;
  skill_name: string;
  historical: TrendDataPoint[];
  forecast: ForecastPoint[];
  model_name: string;
  metrics: ForecastMetrics;
  data_sufficient: boolean;
  warning: string | null;
  historical_start: string;
  historical_end: string;
}

export interface ForecastPoint {
  period: string;
  value: number;
  lower_bound: number | null;
  upper_bound: number | null;
}

export interface ForecastMetrics {
  mae: number | null;
  rmse: number | null;
  mase: number | null;
  baseline_mae: number | null;
  baseline_rmse: number | null;
}

export interface StudentProfile {
  id?: number;
  name: string;
  skills: number[];
  target_occupation_id: number | null;
  experience_level: string | null;
  location: string | null;
}

export interface SkillGapAnalysis {
  profile_id: number;
  target_occupation: string;
  skill_coverage: number;
  matched_skills: SkillMatch[];
  missing_skills: SkillRecommendation[];
  total_required: number;
  total_matched: number;
}

export interface SkillMatch {
  skill_id: number;
  skill_name: string;
  importance: number;
  matched: boolean;
}

export interface SkillRecommendation {
  skill_id: number;
  skill_name: string;
  priority_rank: number;
  relevance_score: number;
  demand_score: number;
  growth_score: number;
  composite_score: number;
  reasoning: string;
}

export interface ModelEvaluation {
  model_type: string;
  model_name: string;
  metrics: Record<string, number>;
  train_date_range: string | null;
  test_date_range: string | null;
  parameters: Record<string, unknown>;
  created_at: string;
}

export interface DatasetStatus {
  name: string;
  source_url: string;
  downloaded: boolean;
  file_name: string | null;
  file_size: number | null;
  row_count: number | null;
  columns: string[];
  date_coverage_start: string | null;
  date_coverage_end: string | null;
  processing_status: string;
  license_info: string | null;
  sha256_checksum: string | null;
}

export interface PipelineStage {
  stage: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string | null;
  completed_at: string | null;
  records_processed: number | null;
  records_output: number | null;
  error_message: string | null;
}

export interface PipelineStatus {
  is_running: boolean;
  stages: PipelineStage[];
  last_run: string | null;
}

export interface EmergingSkill {
  skill_id: number;
  skill_name: string;
  growth_rate: number;
  demand_share: number;
  posting_count: number;
  trend_direction: 'rising' | 'stable' | 'declining';
  confidence: string;
  data_periods: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// -----------------------------------------------------------------------------
// Career Intelligence & Student Journey Interfaces
// -----------------------------------------------------------------------------
export interface CareerSearchItem {
  career_id: number;
  title: string;
  onet_code: string | null;
  description: string | null;
  posting_count: number;
  demand_status: string;
  match_type: string;
  matched_alias: string | null;
}

export interface CareerOverview {
  career_id: number;
  title: string;
  onet_code: string | null;
  description: string;
  related_titles: string[];
  posting_count: number;
  distinct_employers: number;
  distinct_skills_count: number;
  geographic_coverage: string;
  date_coverage: string;
  demand_status: string;
  demand_status_evidence: string;
  data_limitations: string;
}

export interface CareerSkill {
  skill_id: number;
  skill_name: string;
  posting_count: number;
  demand_percentage: number;
  importance_score: number;
  taxonomy_source: string;
  in_taxonomy: boolean;
  category: string;
  sample_size: number;
  related_skills: string[];
}

export interface CareerTrends {
  career_id: number;
  title: string;
  trends: TrendDataPoint[];
  recent_change: number;
  trend_direction: 'increasing' | 'stable' | 'decreasing';
}

export interface CareerForecast {
  career_id: number;
  title: string;
  is_eligible: boolean;
  insufficient_data_reason: string | null;
  model_name: string | null;
  evaluation: {
    mae: number;
    rmse: number;
    mase: number;
  } | null;
  historical_points: TrendDataPoint[];
  forecast_points: {
    period: string;
    forecasted_value: number;
    lower_bound: number;
    upper_bound: number;
  }[];
  confidence_level: number;
}

export interface CareerAlternative {
  career_id: number;
  title: string;
  onet_code: string | null;
  posting_count: number;
  similarity_score: number;
  shared_skills: string[];
  shared_skills_count: number;
  distinctive_skills: string[];
  transition_rationale: string;
}

export interface StudentSkillItem {
  skill_id?: number;
  skill_name: string;
  proficiency: 'beginner' | 'intermediate' | 'advanced';
  is_custom?: boolean;
}

export interface StudentSkillGapResult {
  career_id: number;
  career_title: string;
  skill_coverage: number;
  formula_explanation: string;
  matched_skills: {
    skill_id: number;
    skill_name: string;
    proficiency: string;
    importance_score: number;
    demand_percentage: number;
    status: string;
    reasoning: string;
  }[];
  skills_to_improve: {
    skill_id: number;
    skill_name: string;
    proficiency: string;
    importance_score: number;
    demand_percentage: number;
    status: string;
    reasoning: string;
  }[];
  important_missing: {
    skill_id: number;
    skill_name: string;
    priority_rank: number;
    importance_score: number;
    demand_percentage: number;
    composite_score: number;
    category: string;
    reasoning: string;
  }[];
  optional_missing: {
    skill_id: number;
    skill_name: string;
    priority_rank: number;
    importance_score: number;
    demand_percentage: number;
    composite_score: number;
    category: string;
    reasoning: string;
  }[];
  suggested_next_skill: {
    skill_name: string;
    reasoning: string;
  } | null;
  total_required: number;
  total_matched: number;
}

export interface RoadmapSkill {
  skill_name: string;
  priority: string;
  reasoning: string;
  status: 'not_started' | 'learning' | 'practiced' | 'confident';
}

export interface RoadmapProject {
  title: string;
  skills_practiced: string[];
  description: string;
  deliverables: string;
}

export interface RoadmapPhaseData {
  phase_number: number;
  title: string;
  description: string;
  skills?: RoadmapSkill[];
  projects?: RoadmapProject[];
}

export interface StudentRoadmapData {
  career_id: number;
  career_title: string;
  skill_coverage: number;
  phases: RoadmapPhaseData[];
}

export interface StudentCareerMatch {
  career_id: number;
  title: string;
  onet_code: string | null;
  posting_count: number;
  skill_coverage: number;
  shared_skills: string[];
  shared_skills_count: number;
  missing_skills: string[];
  missing_skills_count: number;
  match_tier: string;
}

export interface CareerGraphPayload {
  career_id: number;
  career_title: string;
  nodes: {
    id: string;
    label: string;
    type: 'career' | 'skill';
    status: 'target_career' | 'student_owned' | 'target_required' | 'alternative_career';
    category?: string;
    size: number;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    weight: number;
    type: string;
  }[];
  total_nodes: number;
  total_edges: number;
}

export interface OpportunityMatchItem {
  job_id: number;
  title: string;
  company: string;
  location: string;
  employment_type: string;
  salary_range: string | null;
  posted_date: string | null;
  source_name: string;
  external_url: string | null;
  match_score: number;
  match_tier: string;
  matched_skills: string[];
  matched_count: number;
  missing_skills: string[];
  missing_count: number;
  total_job_skills: number;
  relevance_explanation: string;
}

export interface OpportunityMatchResponse {
  total_matched: number;
  matches: OpportunityMatchItem[];
  candidate_skills_evaluated?: string[];
  message?: string;
}

export interface ExtractedSkillItem {
  skill_id: number;
  skill_name: string;
  category: string;
  proficiency: 'beginner' | 'intermediate' | 'advanced';
  confidence: number;
  occurrences: number;
  context_snippet: string;
}

export interface ResumeParseResponse {
  extracted_skills: ExtractedSkillItem[];
  total_skills_found: number;
  word_count: number;
  inferred_experience_level: string;
  processing_time_ms: number;
  privacy_notice: string;
}

export interface EarlyWarningSignal {
  skill_id: number;
  skill_name: string;
  category: string;
  signal_type: 'surge_alert' | 'decline_warning' | 'momentum_shift' | 'stable';
  urgency: 'high' | 'medium' | 'low';
  headline: string;
  explanation: string;
  recent_share_pct: number;
  baseline_share_pct: number;
  relative_change_pct: number;
  sample_postings: number;
  reliability_warning: string | null;
}

export interface CareerBridge {
  target_career_id: number;
  target_title: string;
  onet_code: string | null;
  transfer_score: number;
  jaccard_similarity: number;
  feasibility: string;
  estimated_bridging_effort: string;
  shared_skills: string[];
  shared_skills_count: number;
  key_missing_skills: string[];
  missing_skills_count: number;
  posting_count: number;
  transition_rationale: string;
}

export interface WhatIfResult {
  target_career_id: number;
  target_title: string;
  baseline_coverage: number;
  simulated_coverage: number;
  coverage_gain_pct: number;
  simulated_skills_added: string[];
  skills_newly_satisfied: string[];
  remaining_high_priority_gaps: string[];
  baseline_matching_jobs_sample: number;
  simulated_matching_jobs_sample: number;
  newly_unlocked_jobs_count: number;
  baseline_career_matches_count: number;
  simulated_career_matches_count: number;
  simulation_disclaimer: string;
}

export interface TransferableSkill {
  declared_skill: string;
  suggested_skill: string;
  category: string;
  transfer_confidence: number;
  relationship_type: string;
  rationale: string;
  user_status: 'pending_confirmation' | 'accepted' | 'rejected';
}

export interface SkillEvidenceResult {
  skill_name: string;
  evidence_type: string;
  evidence_strength: string;
  confidence_score: number;
  is_corroborated: boolean;
  verification_explanation: string;
  disclaimer: string;
  verified_at: string;
}

export interface LearningROIOptimization {
  rank: number;
  skill_id: number;
  skill_name: string;
  category: string;
  priority_score: number;
  factor_breakdown: {
    role_demand_weight: number;
    role_importance_weight: number;
    market_versatility_weight: number;
    skill_gap_weight: number;
  };
  multi_role_presence: string;
  estimated_study_hours: number;
  estimated_duration_weeks: string;
  learning_rationale: string;
}

export interface ProjectIdea {
  id: string;
  title: string;
  difficulty: string;
  primary_skills: string[];
  objective: string;
  scope: string;
  milestones: string[];
  deliverables: string[];
  evaluation_criteria: string[];
  job_evidence: string;
}

export interface SkillHalfLife {
  skill_id: number;
  skill_name: string;
  status: string;
  trajectory: string;
  annualized_momentum_pct?: number;
  estimated_half_life?: string | null;
  obsolescence_risk?: string;
  total_observed_periods?: number;
  historical_mean_share_pct?: number;
  message?: string;
  disclaimer?: string;
}

export interface MarketDashboardData {
  total_job_postings: number;
  total_distinct_skills: number;
  total_occupations: number;
  date_range: {
    start: string;
    end: string;
  };
  top_in_demand_skills: {
    skill_id: number;
    skill_name: string;
    category: string;
    posting_count: number;
    demand_share: number;
  }[];
  fast_growing_skills: {
    skill_name: string;
    growth_rate: string;
    category: string;
  }[];
  declining_demand_skills: {
    skill_name: string;
    growth_rate: string;
    category: string;
  }[];
  location_distribution: {
    location: string;
    count: number;
  }[];
  frequent_co_occurrences: {
    skill_a: string;
    skill_b: string;
    co_occurrence_count: number;
    relationship_type: string;
  }[];
  recent_postings: {
    id: number;
    title: string;
    company: string;
    location: string;
    posted_date: string | null;
    industry: string;
  }[];
  data_freshness: string;
}

export interface DataQualityReport {
  market_confidence_index: number;
  confidence_tier: string;
  confidence_factors: {
    sample_volume_score: number;
    field_completeness_score: number;
    nlp_extraction_coverage_score: number;
    data_freshness_score: number;
  };
  records_audit: {
    total_postings_evaluated: number;
    duplicate_rate_pct: number;
    missing_description_pct: number;
    missing_company_pct: number;
    missing_location_pct: number;
    missing_posted_date_pct: number;
    skill_extraction_coverage_pct: number;
  };
  registered_datasources: {
    id: number;
    name: string;
    row_count: number;
    file_size_mb: number;
    license: string | null;
    checksum: string | null;
    status: string;
    date_coverage: string;
  }[];
  recent_pipeline_telemetry: {
    stage: string;
    status: string;
    records_processed: number;
    records_output: number;
    timestamp: string | null;
  }[];
  transparency_notice: string;
}

export interface DataProviderStatus {
  provider: string;
  provider_key: string;
  category: string;
  status: string;
  status_code?: number;
  requires_auth: boolean;
  auth_provided?: boolean;
  latency_ms?: number;
  notes: string;
  local_records?: number;
  skills_mapped?: number;
}


