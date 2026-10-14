import { useState, useEffect, useCallback } from 'react';
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
} from 'recharts';
import {
  getAnalyticsSkills,
  getAnalyticsOccupations,
  getAnalyticsTrends,
} from '../services/api';
import type {
  SkillDemand,
  Occupation,
  TrendDataPoint,
  PaginatedResponse,
} from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Brain,
  BarChart3,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export default function SkillIntelligence() {
  // Filters & Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('demand_share');
  const [selectedOccupation, setSelectedOccupation] = useState<number | undefined>(undefined);
  const [searchFilter, setSearchFilter] = useState('');

  // Data States
  const [skillsData, setSkillsData] = useState<PaginatedResponse<SkillDemand> | null>(null);
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<SkillDemand | null>(null);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Occupations on mount
  useEffect(() => {
    let isMounted = true;
    getAnalyticsOccupations()
      .then((res) => {
        if (isMounted) setOccupations(res.data);
      })
      .catch((err) => {
        console.error('Failed to load occupations:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Skills with current pagination & filter
  const fetchSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAnalyticsSkills({
        page,
        page_size: pageSize,
        sort_by: sortBy,
        occupation_id: selectedOccupation,
      });
      setSkillsData(response.data);

      // Default select the first skill if none selected
      if (response.data.items.length > 0 && !selectedSkill) {
        setSelectedSkill(response.data.items[0]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch skill intelligence data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, selectedOccupation]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  // Fetch Trends when selectedSkill changes
  useEffect(() => {
    if (!selectedSkill) return;
    let isMounted = true;
    setTrendsLoading(true);

    getAnalyticsTrends({ skill_ids: String(selectedSkill.skill_id) })
      .then((res) => {
        if (isMounted) {
          const raw = res.data as unknown;
          let points: TrendDataPoint[] = [];
          if (Array.isArray(raw)) {
            points = raw.map((pt: any) => ({
              period: pt.period || (pt.period_start ? String(pt.period_start).substring(0, 7) : ''),
              value: pt.value !== undefined ? Number(pt.value) : (pt.posting_count !== undefined ? Number(pt.posting_count) : Number(pt.demand_share || 0)),
              skill_name: pt.skill_name,
            }));
          } else if (raw && typeof raw === 'object' && Array.isArray((raw as any).trends)) {
            const container = raw as { skill_name?: string; trends: any[] };
            points = container.trends.map((pt: any) => ({
              period: pt.period || (pt.period_start ? String(pt.period_start).substring(0, 7) : ''),
              value: pt.value !== undefined ? Number(pt.value) : (pt.posting_count !== undefined ? Number(pt.posting_count) : Number(pt.demand_share || 0)),
              skill_name: pt.skill_name || container.skill_name,
            }));
          }
          setTrendData(points);
        }
      })
      .catch((err) => {
        console.error('Failed to load trend data:', err);
        if (isMounted) setTrendData([]);
      })
      .finally(() => {
        if (isMounted) setTrendsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSkill]);

  // Filter skills client-side if search string is entered
  const displayedSkills = (skillsData?.items || []).filter((s) =>
    (s.skill_name || (s as { canonical_name?: string }).canonical_name || '')
      .toLowerCase()
      .includes(searchFilter.toLowerCase())
  );

  // Top skills data for horizontal bar chart
  const topBarData = (skillsData?.items || [])
    .slice(0, 7)
    .map((s) => ({
      name: s.skill_name || (s as { canonical_name?: string }).canonical_name || 'Skill',
      share: Number(((s.demand_share ?? 0) * 100).toFixed(1)),
      count: s.posting_count ?? 0,
    }))
    .reverse();

  if (loading && !skillsData) {
    return <LoadingSpinner message="Calculating skill demand distributions and growth rates..." />;
  }

  if (error && !skillsData) {
    return <ErrorMessage message={error} onRetry={fetchSkills} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Skill Intelligence & Labor Demand"
        description="Analyze in-demand skills, growth trajectories, and market penetration across occupations."
        action={
          <button
            onClick={fetchSkills}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            Refresh
          </button>
        }
      />

      {/* Filter and Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search skills in view..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          {/* Occupation Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedOccupation ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedOccupation(val ? Number(val) : undefined);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All Occupations</option>
              {occupations.map((occ) => (
                <option key={occ.id} value={occ.id}>
                  {occ.title}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="demand_share">Demand Share</option>
              <option value="posting_count">Posting Count</option>
              <option value="growth_rate">Growth Rate</option>
            </select>
          </div>
        </div>

        {/* Page Size Selector */}
        <div className="flex items-center gap-2 text-xs text-slate-500 self-end md:self-center">
          <span>Show:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Visual Analytics Row: Top Skills Chart + Historical Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top skills horizontal bar chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Top Skills by Demand Share</h2>
              <p className="text-xs text-slate-500 mt-0.5">Relative market frequency</p>
            </div>
            <div className="p-2 bg-teal-50 rounded-lg">
              <BarChart3 className="w-4 h-4 text-teal-600" />
            </div>
          </div>

          {topBarData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topBarData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    unit="%"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#334155', fontSize: 11 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    width={110}
                  />
                  <Tooltip
                    formatter={(val: unknown) => {
                      const num = typeof val === 'number' ? val : Number(val);
                      return [`${isNaN(num) ? '0.0' : num.toFixed(1)}%`, 'Demand Share'];
                    }}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="share" fill="#0d9488" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              No top skills data
            </div>
          )}
        </div>

        {/* Historical Trend Line Chart with Skill Selector */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-800">
                  Historical Trajectory: {selectedSkill ? (selectedSkill.skill_name || (selectedSkill as { canonical_name?: string }).canonical_name) : 'Select Skill'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Temporal monthly job posting frequency</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
            </div>

            {trendsLoading ? (
              <div className="h-56 flex items-center justify-center">
                <LoadingSpinner message="Loading trend history..." />
              </div>
            ) : trendData.length > 0 ? (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="period"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#0d9488"
                      strokeWidth={2.5}
                      dot={{ fill: '#0d9488', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-sm">
                <Sparkles className="w-6 h-6 text-slate-300 mb-2" />
                <p>Select any skill below to inspect historical trend line</p>
              </div>
            )}
          </div>

          {selectedSkill && (
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Total occurrences: <strong className="text-slate-700">{selectedSkill.posting_count.toLocaleString()}</strong>
              </span>
              <span>
                Current share: <strong className="text-teal-600">{(selectedSkill.demand_share * 100).toFixed(1)}%</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Skills Demand Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Skill Demand Matrix</h2>
          <span className="text-xs text-slate-500">
            Click row to plot trend trajectory
          </span>
        </div>

        {displayedSkills.length === 0 ? (
          <div className="py-12">
            <EmptyState
              title="No Skills Matching Criteria"
              description="No skills match your active search and occupation filters. Try clearing the filters."
              icon={<Brain className="w-8 h-8 text-slate-400" />}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-16 text-center">Rank</th>
                  <th className="py-3 px-4">Skill Name</th>
                  <th className="py-3 px-4 text-right">Posting Count</th>
                  <th className="py-3 px-4 w-52">Demand Share</th>
                  <th className="py-3 px-4 text-right">Growth Rate</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedSkills.map((skill, idx) => {
                  const rank = (page - 1) * pageSize + idx + 1;
                  const isSelected = selectedSkill?.skill_id === skill.skill_id;
                  const growth = skill.growth_rate;

                  return (
                    <tr
                      key={skill.skill_id}
                      onClick={() => setSelectedSkill(skill)}
                      className={`cursor-pointer transition-colors hover:bg-slate-50/80 ${
                        isSelected ? 'bg-teal-50/50' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center text-xs font-semibold text-slate-500">
                        #{rank}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isSelected ? 'bg-teal-600' : 'bg-slate-300'
                            }`}
                          />
                          <span>{skill.skill_name || (skill as { canonical_name?: string }).canonical_name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-700">
                        {skill.posting_count.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-teal-600 h-full rounded-full"
                              style={{
                                width: `${Math.min(skill.demand_share * 100 * 3, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-700 w-12 text-right">
                            {(skill.demand_share * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {growth !== null && growth !== undefined ? (
                          growth > 0 ? (
                            <span className="inline-flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              +{growth.toFixed(1)}%
                            </span>
                          ) : growth < 0 ? (
                            <span className="inline-flex items-center text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                              <TrendingDown className="w-3 h-3 mr-1" />
                              {growth.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
                              <Minus className="w-3 h-3 mr-1" />
                              0.0%
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSkill(skill);
                          }}
                          className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                            isSelected
                              ? 'bg-teal-600 text-white border-teal-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          Trend
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {skillsData && (
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
            <span className="text-xs text-slate-500">
              Showing{' '}
              <strong className="text-slate-700">
                {Math.min((page - 1) * pageSize + 1, skillsData.total)}
              </strong>{' '}
              to{' '}
              <strong className="text-slate-700">
                {Math.min(page * pageSize, skillsData.total)}
              </strong>{' '}
              of <strong className="text-slate-700">{skillsData.total}</strong> skills
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </button>
              <span className="text-xs font-medium text-slate-600 px-2">
                Page {skillsData.page} of {Math.max(1, skillsData.total_pages)}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(skillsData.total_pages, p + 1))}
                disabled={page >= skillsData.total_pages}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
