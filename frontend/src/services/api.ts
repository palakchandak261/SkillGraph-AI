import axios from 'axios';
import type {
  AnalyticsOverview,
  DatasetStatus,
  ForecastData,
  GraphData,
  ModelEvaluation,
  Occupation,
  PaginatedResponse,
  PipelineStatus,
  Skill,
  SkillDemand,
  SkillGapAnalysis,
  StudentProfile,
  TrendDataPoint,
  EmergingSkill,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Health
export const getHealth = () => api.get('/health');

// Datasets
export const getDatasetStatus = () =>
  api.get<DatasetStatus[]>('/datasets/status');

// Pipeline
export const runPipeline = (stages?: string[]) =>
  api.post<PipelineStatus>('/pipeline/run', { stages });

export const getPipelineStatus = () =>
  api.get<PipelineStatus>('/pipeline/status');

// Analytics
export const getAnalyticsOverview = () =>
  api.get<AnalyticsOverview>('/analytics/overview');

export const getAnalyticsSkills = (params?: {
  page?: number;
  page_size?: number;
  sort_by?: string;
  occupation_id?: number;
  min_demand?: number;
}) => api.get<PaginatedResponse<SkillDemand>>('/analytics/skills', { params });

export const getAnalyticsTrends = (params?: {
  skill_ids?: string;
  start_date?: string;
  end_date?: string;
}) => api.get<TrendDataPoint[]>('/analytics/trends', { params });

export const getAnalyticsOccupations = () =>
  api.get<Occupation[]>('/analytics/occupations');

// Skills
export const searchSkills = (query: string) =>
  api.get<Skill[]>('/skills/search', { params: { q: query } });

export const getSkillDetail = (skillId: number) =>
  api.get<Skill>(`/skills/${skillId}`);

export const getRelatedSkills = (skillId: number) =>
  api.get<Skill[]>(`/skills/${skillId}/related`);

// Graph
export const getGraph = (params?: {
  query?: string;
  depth?: number;
  min_weight?: number;
  node_type?: string;
}) => api.get<GraphData>('/graph', { params });

// Forecast
export const getForecast = (skillId: number) =>
  api.get<ForecastData>(`/forecast/${skillId}`);

export const getEmergingSkills = () =>
  api.get<EmergingSkill[]>('/analytics/emerging');

// Models
export const getModelEvaluation = () =>
  api.get<ModelEvaluation[]>('/models/evaluation');

// Recommendations
export const analyzeSkillGap = (profile: StudentProfile) =>
  api.post<SkillGapAnalysis>('/recommendations/analyze', profile);

export const getRecommendations = (profileId: number) =>
  api.get<SkillGapAnalysis>(`/recommendations/${profileId}`);

// -----------------------------------------------------------------------------
// Career Intelligence & Student Journey APIs
// -----------------------------------------------------------------------------
export const searchCareers = (query: string = '', limit: number = 15) =>
  api.get<import('../types').CareerSearchItem[]>('/careers/search', {
    params: { q: query, limit },
  });

export const getCareerOverview = (careerId: number) =>
  api.get<import('../types').CareerOverview>(`/careers/${careerId}/overview`);

export const getCareerSkills = (careerId: number, limit: number = 25) =>
  api.get<import('../types').CareerSkill[]>(`/careers/${careerId}/skills`, {
    params: { limit },
  });

export const getCareerTrends = (careerId: number) =>
  api.get<import('../types').CareerTrends>(`/careers/${careerId}/trends`);

export const getCareerForecast = (careerId: number) =>
  api.get<import('../types').CareerForecast>(`/careers/${careerId}/forecast`);

export const getCareerAlternatives = (careerId: number, limit: number = 5) =>
  api.get<import('../types').CareerAlternative[]>(`/careers/${careerId}/alternatives`, {
    params: { limit },
  });

export const saveStudentProfile = (payload: {
  name: string;
  target_career_id?: number | null;
  target_career_title?: string | null;
  experience_level?: string;
  education_level?: string;
  skills: import('../types').StudentSkillItem[];
  projects?: string[];
}) => api.post('/student/profile', payload);

export const analyzeStudentSkillGap = (payload: {
  candidate_skills: string[];
  career_id: number;
  proficiencies?: Record<string, string>;
}) => api.post<import('../types').StudentSkillGapResult>('/student/skill-gap', payload);

export const getStudentRoadmap = (payload: {
  candidate_skills: string[];
  career_id: number;
  proficiencies?: Record<string, string>;
}) => api.post<import('../types').StudentRoadmapData>('/student/roadmap', payload);

export const matchStudentCareers = (skills: string[], limit: number = 12) =>
  api.post<import('../types').StudentCareerMatch[]>('/student/career-matches', { skills }, {
    params: { limit },
  });

export const getCareerGraph = (careerId: number, studentSkills?: string[]) =>
  api.get<import('../types').CareerGraphPayload>(`/graph/career/${careerId}`, {
    params: { student_skills: studentSkills?.join(',') },
  });

export default api;

