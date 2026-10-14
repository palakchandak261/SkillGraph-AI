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

