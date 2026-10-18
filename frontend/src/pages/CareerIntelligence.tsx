import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  ComposedChart,
} from 'recharts';
import {
  Search,
  Briefcase,
  Building2,
  Brain,
  Calendar,
  Globe2,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowRight,
  Sparkles,
  Layers,
  Compass,
  GitCompare,
  Plus,
} from 'lucide-react';
import {
  getCareerOverview,
  getCareerSkills,
  getCareerTrends,
  getCareerForecast,
  getCareerAlternatives,
  searchCareers,
} from '../services/api';
import type {
  CareerOverview,
  CareerSkill,
  CareerTrends,
  CareerForecast,
  CareerAlternative,
  CareerSearchItem,
} from '../types';
import { useStudent } from '../context/StudentContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function CareerIntelligence() {
  const { careerId } = useParams<{ careerId: string }>();
  const navigate = useNavigate();
  const { targetCareer, setTargetCareer, addSkill, studentSkills } = useStudent();

  // Active career ID (fallback to targetCareer or default 1)
  const activeId = careerId ? Number(careerId) : targetCareer?.career_id || 1;

  // Search autocomplete state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<CareerSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Data states
  const [overview, setOverview] = useState<CareerOverview | null>(null);
  const [skills, setSkills] = useState<CareerSkill[]>([]);
  const [trends, setTrends] = useState<CareerTrends | null>(null);
  const [forecast, setForecast] = useState<CareerForecast | null>(null);
  const [alternatives, setAlternatives] = useState<CareerAlternative[]>([]);

  // Filter/Sort for skills table
  const [skillSearch, setSkillSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Comparison drawer state
  const [isComparing, setIsComparing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch career data
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      getCareerOverview(activeId),
      getCareerSkills(activeId, 30),
      getCareerTrends(activeId),
      getCareerForecast(activeId),
      getCareerAlternatives(activeId, 4),
    ])
      .then(([ovRes, skRes, trRes, fcRes, altRes]) => {
        if (!isMounted) return;
        setOverview(ovRes.data);
        setSkills(skRes.data);
        setTrends(trRes.data);
        setForecast(fcRes.data);
        setAlternatives(altRes.data);

        // Update target career in context if not set or different
        if (!targetCareer || targetCareer.career_id !== activeId) {
          setTargetCareer({
            career_id: ovRes.data.career_id,
            title: ovRes.data.title,
            onet_code: ovRes.data.onet_code,
            description: ovRes.data.description,
            posting_count: ovRes.data.posting_count,
            demand_status: ovRes.data.demand_status,
            match_type: 'selected',
            matched_alias: null,
          });
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load career intelligence');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeId]);

  // Live career search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchCareers(searchQuery.trim(), 6);
        setSearchSuggestions(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Filtered skills
  const filteredSkills = useMemo(() => {
    return skills.filter((s) => {
      const matchesName = s.skill_name.toLowerCase().includes(skillSearch.toLowerCase());
      const matchesCat = selectedCategory === 'All' || s.category === selectedCategory;
      return matchesName && matchesCat;
    });
  }, [skills, skillSearch, selectedCategory]);

  // Top skills bar chart data
  const topSkillsChartData = useMemo(() => {
    return skills.slice(0, 8).map((s) => ({
      name: s.skill_name,
      demand: s.demand_percentage,
      postings: s.posting_count,
    })).reverse();
  }, [skills]);

  // Combined historical & forecast chart data
  const combinedChartData = useMemo(() => {
    if (!trends) return [];
    const hist = trends.trends.map((t) => ({
      period: t.period,
      historical: t.posting_count,
      forecast: null as number | null,
      lower: null as number | null,
      upper: null as number | null,
    }));

    if (forecast && forecast.is_eligible && forecast.forecast_points.length > 0) {
      // Connect last historical point to forecast
      const lastHist = hist[hist.length - 1];
      const fcPoints = forecast.forecast_points.map((f, idx) => ({
        period: f.period,
        historical: idx === 0 && lastHist ? lastHist.historical : null,
        forecast: f.forecasted_value,
        lower: f.lower_bound,
        upper: f.upper_bound,
      }));
      return [...hist, ...fcPoints];
    }
    return hist;
  }, [trends, forecast]);

  const categories = useMemo(() => {
    const set = new Set(skills.map((s) => s.category));
    return ['All', ...Array.from(set)];
  }, [skills]);

  if (loading) {
    return <LoadingSpinner message="Synthesizing empirical career intelligence and skill distributions..." />;
  }

  if (error || !overview) {
    return <ErrorMessage message={error || 'Career not found'} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Step Indicator & Career Title Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-teal-500 to-teal-700 text-white rounded-2xl shadow-xs">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-200/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Step 1 of 5: Explore Careers
              </span>
              {targetCareer?.career_id === activeId ? (
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Your Dream Career Goal
                </span>
              ) : null}
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-0.5">{overview.title}</h1>
          </div>
        </div>

        {/* Career Search Autocomplete */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search another career..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
          />
          {searchSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 overflow-hidden divide-y divide-slate-100">
              {searchSuggestions.map((item) => (
                <button
                  key={item.career_id}
                  onClick={() => {
                    navigate(`/careers/${item.career_id}`);
                    setSearchQuery('');
                    setSearchSuggestions([]);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-xs cursor-pointer"
                >
                  <span className="font-semibold text-slate-800">{item.title}</span>
                  <span className="text-[10px] text-teal-600 font-medium">{item.demand_status}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {targetCareer?.career_id !== activeId && (
            <button
              type="button"
              onClick={() => {
                setTargetCareer({
                  career_id: overview.career_id,
                  title: overview.title,
                  onet_code: overview.onet_code,
                  description: overview.description,
                  posting_count: overview.posting_count,
                  demand_status: overview.demand_status,
                  match_type: 'selected',
                  matched_alias: null,
                });
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Set this role as your dream career goal"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Set as My Dream Career</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsComparing(!isComparing)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <GitCompare className="w-3.5 h-3.5 text-slate-500" />
            <span>{isComparing ? 'Close Comparison' : 'Compare'}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <span>Next: Add My Skills</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Career Comparison Drawer (if open) */}
      {isComparing && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-2xl border border-slate-700 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-teal-300 uppercase tracking-wider">Career Comparison Matrix</h3>
              <p className="text-xs text-slate-300">Compare {overview.title} against alternative pathways</p>
            </div>
            <button
              onClick={() => setIsComparing(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            {/* Current Career Column */}
            <div className="bg-white/10 p-4 rounded-xl border border-teal-500/40 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 block">Baseline Role</span>
              <h4 className="font-bold text-sm text-white">{overview.title}</h4>
              <p className="text-xs text-slate-300">Observed Postings: {overview.posting_count}</p>
              <p className="text-xs text-slate-300">Status: {overview.demand_status}</p>
              <div className="pt-2 border-t border-white/10 text-[11px] text-teal-200">
                Core: {skills.slice(0, 3).map((s) => s.skill_name).join(', ')}
              </div>
            </div>

            {/* Alternative Columns */}
            {alternatives.slice(0, 3).map((alt) => (
              <div key={alt.career_id} className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    {Math.round(alt.similarity_score * 100)}% Skill Similarity
                  </span>
                  <h4 className="font-bold text-sm text-white">{alt.title}</h4>
                  <p className="text-xs text-slate-300">Postings: {alt.posting_count}</p>
                  <p className="text-[11px] text-slate-400 leading-snug mt-1">{alt.transition_rationale}</p>
                </div>
                <button
                  onClick={() => navigate(`/careers/${alt.career_id}`)}
                  className="mt-3 w-full py-1.5 bg-teal-600/80 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold transition-all"
                >
                  Inspect Role
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* A. CAREER OVERVIEW */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row items-start justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-700">
                SOC {overview.onet_code || 'N/A'}
              </span>
              <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {overview.demand_status}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">{overview.title}</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{overview.description}</p>

            {overview.related_titles.length > 0 && (
              <div className="pt-2">
                <span className="text-xs font-semibold text-slate-400 block mb-1">
                  Commonly Reported Job Titles in Postings:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {overview.related_titles.map((title, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
                    >
                      {title}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Metrics Badge */}
          <div className="grid grid-cols-2 gap-3 w-full md:w-72 shrink-0">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-400 block font-medium">Observed Postings</span>
              <span className="text-lg font-bold text-slate-800">{overview.posting_count}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-400 block font-medium">Verified Employers</span>
              <span className="text-lg font-bold text-slate-800">{overview.distinct_employers}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-400 block font-medium">Distinct Skills</span>
              <span className="text-lg font-bold text-teal-600">{overview.distinct_skills_count}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-400 block font-medium">Observation Span</span>
              <span className="text-xs font-semibold text-slate-700 block truncate">{overview.date_coverage}</span>
            </div>
          </div>
        </div>

        {/* Evidence & Methodology Note */}
        <div className="p-3.5 bg-teal-50/60 rounded-xl border border-teal-100 flex items-start gap-3 text-xs text-teal-900">
          <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-teal-950">Evidence & Classification Rationale</p>
            <p className="text-teal-800">{overview.demand_status_evidence}</p>
          </div>
        </div>
      </div>

      {/* B & C. CAREER DEMAND TREND & FORECASTING */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-800">Historical Posting Trajectory & Projection</h3>
                <p className="text-xs text-slate-500">
                  Monthly job posting frequency with Holt-Winters forecast interval
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {trends?.trend_direction === 'increasing' ? (
                  <>
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">+{trends?.recent_change}%</span>
                  </>
                ) : trends?.trend_direction === 'decreasing' ? (
                  <>
                    <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                    <span className="text-red-700">{trends?.recent_change}%</span>
                  </>
                ) : (
                  <>
                    <Minus className="w-3.5 h-3.5 text-slate-500" />
                    <span>Stable</span>
                  </>
                )}
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={combinedChartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="historical"
                    stroke="#0d9488"
                    strokeWidth={2.5}
                    name="Historical Postings"
                    dot={{ fill: '#0d9488', r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    name="Forecast Projection"
                    dot={{ fill: '#3b82f6', r: 3 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="upper"
                    stroke="none"
                    fill="#93c5fd"
                    fillOpacity={0.25}
                    name="95% Confidence Upper"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" /> Solid teal: Historical observations
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Dashed blue: Model forecast
            </span>
          </div>
        </div>

        {/* Statistical Evaluation & Limitations Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider">Modeling Transparency</span>
              <h3 className="font-bold text-base text-slate-800 mt-0.5">Forecast Reliability</h3>
            </div>

            {forecast && forecast.is_eligible ? (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <span className="text-slate-400 block font-medium">Model Architecture</span>
                  <span className="font-semibold text-slate-800">{forecast.model_name}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">MAE (Mean Error)</span>
                    <span className="font-bold text-slate-700">{forecast.evaluation?.mae ?? 'N/A'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">RMSE</span>
                    <span className="font-bold text-slate-700">{forecast.evaluation?.rmse ?? 'N/A'}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Projections utilize expanding-window chronological validation on monthly posting observations.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Forecast Notice</span>
                </div>
                <p>{forecast?.insufficient_data_reason || 'Insufficient data for time-series projection.'}</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            {overview.data_limitations}
          </div>
        </div>
      </div>

      {/* D. CAREER SKILL REQUIREMENTS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Required Competencies</span>
            <h3 className="font-bold text-xl text-slate-900 mt-0.5">
              Empirical Skill Requirements for {overview.title}
            </h3>
            <p className="text-xs text-slate-500">
              Ranked by employer posting frequency and official O*NET occupational standards
            </p>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                placeholder="Filter skills..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Top Skills Visual Distribution Bar */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <span className="text-xs font-semibold text-slate-700 block mb-2">
            Top Requested Skills Distribution (% of Postings)
          </span>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSkillsChartData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" unit="%" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#1e293b', fontSize: 11 }} width={120} />
                <Tooltip
                  formatter={(val: unknown) => {
                    const num = typeof val === 'number' ? val : Number(val);
                    return [`${isNaN(num) ? '0' : num.toFixed(1)}%`, 'Demand Share'];
                  }}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="demand" fill="#0d9488" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Full Skills Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-3">Skill Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Demand Share</th>
                <th className="py-3 px-3">Source & Taxonomy</th>
                <th className="py-3 px-3">Frequently Associated Skills</th>
                <th className="py-3 px-3 text-center">My Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSkills.map((sk) => {
                const isHeld = studentSkills.some(
                  (s) => s.skill_name.toLowerCase() === sk.skill_name.toLowerCase()
                );

                return (
                  <tr key={sk.skill_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {sk.skill_name}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                        {sk.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-teal-700">
                      {sk.demand_percentage.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] text-slate-600">
                        {sk.taxonomy_source} {sk.in_taxonomy && '✓'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {sk.related_skills.slice(0, 3).map((r, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {isHeld ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Added
                        </span>
                      ) : (
                        <button
                          onClick={() => addSkill({ skill_name: sk.skill_name, proficiency: 'intermediate' })}
                          className="px-2 py-1 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-700 rounded text-[11px] font-medium transition-all inline-flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> I Have This
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Next Step in 5-Step Journey Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center sm:text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-200">
            Next Step in Your Journey
          </span>
          <h3 className="text-xl font-extrabold text-white">
            Ready to see how your current skills match this career?
          </h3>
          <p className="text-xs text-teal-100 max-w-xl">
            Upload your PDF/Word résumé or add skills manually in Step 2. Then proceed to Step 3 to see your skill gap analysis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="px-5 py-3 bg-white hover:bg-slate-50 text-teal-800 font-extrabold rounded-2xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Proceed to Step 2: Add Skills & Résumé</span>
            <ArrowRight className="w-4 h-4 text-teal-700" />
          </button>
        </div>
      </div>
    </div>
  );
}
