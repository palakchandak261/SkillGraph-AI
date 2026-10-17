import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  Layers,
  MapPin,
  Building2,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  CheckCircle,
  Database,
  Briefcase,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { getMarketDashboard } from '../services/api';
import type { MarketDashboardData } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function MarketDashboard() {
  const [data, setData] = useState<MarketDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');

  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMarketDashboard({
        role_filter: roleFilter || undefined,
        location_filter: locationFilter || undefined,
      });
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load market dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-4 border border-indigo-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Macro Labor Market Intelligence</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">
            Career Intelligence Dashboard
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            Comprehensive market-wide analytics derived from real ingested postings, official O*NET 31.0 standards,
            and ESCO skill taxonomies. Analyze macro skill velocity, co-occurrences, and geographic distributions.
          </p>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" />
              <span>
                Verified Coverage: <strong className="text-white">1,000 Postings</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>
                Taxonomy Scope: <strong className="text-white">8,828 Skills</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              <span>
                Occupations: <strong className="text-white">1,016 Roles</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Filter by role (e.g. Data Scientist, Frontend, DevOps)..."
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div className="md:col-span-4 relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Filter by location (e.g. Remote, Bengaluru, London)..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter Market Data</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRoleFilter('');
                setLocationFilter('');
                fetchData();
              }}
              title="Reset Filters"
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <LoadingSpinner message="Aggregating labor market distributions and skill co-occurrence telemetry..." />
      ) : error || !data ? (
        <ErrorMessage message={error || 'Failed to load data'} onRetry={fetchData} />
      ) : (
        <div className="space-y-8">
          {/* Top In-Demand Skills Chart & Velocity Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Chart: Top Skills */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-indigo-600" />
                      Highest In-Demand Skills (% of Postings)
                    </h2>
                    <span className="text-xs text-slate-400">
                      Based on empirical extraction across {data.total_job_postings} job listings
                    </span>
                  </div>
                  <button
                    onClick={() => navigate('/careers')}
                    className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Target Dream Role</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.top_in_demand_skills}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis
                        type="number"
                        unit="%"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        domain={[0, 'dataMax + 5']}
                      />
                      <YAxis
                        dataKey="skill_name"
                        type="category"
                        tick={{ fontSize: 11, fill: '#1e293b', fontWeight: 600 }}
                        width={70}
                      />
                      <Tooltip
                        formatter={(val: any) => [`${val}% demand share`, 'Demand Share']}
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          borderColor: '#334155',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="demand_share" radius={[0, 6, 6, 0]}>
                        {data.top_in_demand_skills.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index < 3 ? '#4f46e5' : '#818cf8'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
                <span>
                  Date Coverage: <strong>{data.date_range.start} to {data.date_range.end}</strong>
                </span>
                <span className="text-indigo-600 font-semibold">{data.data_freshness}</span>
              </div>
            </div>

            {/* Fast Growing & Declining Cards */}
            <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
              {/* Growing */}
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-3xl p-6 shadow-2xs">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-xl bg-emerald-600 text-white">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">
                      Surging Demand Skills
                    </h3>
                    <span className="text-[11px] text-emerald-700">Highest growth momentum</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {data.fast_growing_skills.map((s) => (
                    <div
                      key={s.skill_name}
                      className="bg-white rounded-xl p-3 border border-emerald-100 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">{s.skill_name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{s.category}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                        {s.growth_rate}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Declining */}
              <div className="bg-rose-50/60 border border-rose-200/80 rounded-3xl p-6 shadow-2xs">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-xl bg-rose-600 text-white">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-rose-950 uppercase tracking-wider">
                      Contracting Observed Demand
                    </h3>
                    <span className="text-[11px] text-rose-700">Consolidating / legacy tools</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {data.declining_demand_skills.map((s) => (
                    <div
                      key={s.skill_name}
                      className="bg-white rounded-xl p-3 border border-rose-100 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">{s.skill_name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{s.category}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 font-extrabold text-xs">
                        {s.growth_rate}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Co-Occurring Skill Pairs & Location Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Frequently Co-Occurring Skills */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
              <h3 className="text-base font-extrabold text-slate-900 mb-1 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Frequently Co-Required Skill Pairs
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Knowledge graph co-occurrence edges representing technologies demanded together in real postings.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.frequent_co_occurrences.map((pair, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{pair.skill_a}</span>
                      <span className="text-xs text-slate-400 font-medium">+</span>
                      <span className="font-bold text-xs text-slate-900">{pair.skill_b}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                      {pair.co_occurrence_count} edges
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Location Distribution */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
              <h3 className="text-base font-extrabold text-slate-900 mb-1 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                Geographic Posting Concentration
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Distribution of verified job opportunities by metropolitan hub and remote listings.
              </p>

              <div className="space-y-2.5">
                {data.location_distribution.map((loc) => {
                  const pct = Math.round((loc.count / maxPostingLoc(data.location_distribution)) * 100);
                  return (
                    <div key={loc.location} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>{loc.location}</span>
                        <span className="text-slate-400 font-normal">{loc.count} postings</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function maxPostingLoc(list: { location: string; count: number }[]) {
  if (!list.length) return 1;
  return Math.max(...list.map((x) => x.count));
}
