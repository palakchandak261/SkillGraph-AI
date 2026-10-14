import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useApi } from '../hooks/useApi';
import { getAnalyticsOverview } from '../services/api';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import {
  FileText,
  Brain,
  Building2,
  TrendingUp,
  Sparkles,
  Calendar,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Database,
  BarChart2,
} from 'lucide-react';

export default function Overview() {
  const { data, loading, error, refetch } = useApi(getAnalyticsOverview);

  if (loading) {
    return <LoadingSpinner message="Loading analytics overview..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        message={`Failed to load analytics overview: ${error}`}
        onRetry={refetch}
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="No Overview Data"
        description="Analytics overview data is not available yet. Please run the ingestion pipeline to generate market insights."
        icon={<Database className="w-8 h-8 text-slate-400" />}
        action={
          <button
            onClick={refetch}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        }
      />
    );
  }

  // Format date range
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const dateRangeDisplay =
    data.date_coverage_start && data.date_coverage_end
      ? `${formatDate(data.date_coverage_start)} - ${formatDate(data.date_coverage_end)}`
      : `${data.data_quality?.date_coverage_months || 0} Months`;

  // Sort top skills by demand share or count ascending for horizontal bar chart display
  const topSkillsChartData = [...(data.top_skills || [])]
    .slice(0, 8)
    .map((s) => ({
      name: s.skill_name,
      share: Number((s.demand_share * 100).toFixed(1)),
      count: s.posting_count,
    }))
    .reverse();

  // Trends data
  const trendsChartData = (data.recent_trends || []).map((t) => ({
    period: t.period,
    value: t.value,
  }));

  const quality = data.data_quality || {
    completeness: 0,
    duplicate_rate: 0,
    missing_description_rate: 0,
    date_coverage_months: 0,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Labor Market Intelligence Overview"
        description="Comprehensive real-time view of job posting analytics, skill extraction metrics, and market trends."
        action={
          <button
            onClick={refetch}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            Refresh Data
          </button>
        }
      />

      {/* 6 Stat Cards in a 3-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard
          title="Total Raw Postings"
          value={data.total_raw_postings}
          subtitle="Collected across datasets"
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Cleaned Postings"
          value={data.total_cleaned_postings}
          subtitle={`${data.total_raw_postings > 0 ? ((data.total_cleaned_postings / data.total_raw_postings) * 100).toFixed(1) : 0}% post-deduplication`}
          icon={FileText}
          color="teal"
        />
        <StatCard
          title="Skills Identified"
          value={data.total_skills}
          subtitle="Taxonomy mapped skills"
          icon={Brain}
          color="purple"
        />
        <StatCard
          title="Occupations Analyzed"
          value={data.total_occupations}
          subtitle="ESCO / O*NET mapped"
          icon={Building2}
          color="amber"
        />
        <StatCard
          title="Emerging Skills"
          value={data.emerging_skills_count}
          subtitle="High-growth frontier skills"
          icon={Sparkles}
          color="emerald"
        />
        <StatCard
          title="Date Coverage"
          value={dateRangeDisplay}
          subtitle={`${quality.date_coverage_months} active months of data`}
          icon={Calendar}
          color="teal"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Skills Horizontal Bar Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Top Skills by Market Demand</h2>
              <p className="text-xs text-slate-500 mt-0.5">Share of postings requesting skill (%)</p>
            </div>
            <div className="p-2 bg-teal-50 rounded-lg">
              <BarChart2 className="w-4 h-4 text-teal-600" />
            </div>
          </div>

          {topSkillsChartData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topSkillsChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    unit="%"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#334155', fontSize: 12 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    width={100}
                  />
                  <Tooltip
                    formatter={(val: unknown) => {
                      const num = typeof val === 'number' ? val : Number(val);
                      return [`${isNaN(num) ? '0.0' : num.toFixed(1)}%`, 'Demand Share'];
                    }}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f8',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="share"
                    fill="#0d9488"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-slate-400 text-sm">
              No top skills data available
            </div>
          )}
        </div>

        {/* Demand Trends Line Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Demand Trends Over Time</h2>
              <p className="text-xs text-slate-500 mt-0.5">Aggregated job posting volume trajectory</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
          </div>

          {trendsChartData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendsChartData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f8',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#0d9488"
                    strokeWidth={2.5}
                    dot={{ fill: '#0d9488', r: 4 }}
                    activeDot={{ r: 6, fill: '#0f766e' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-slate-400 text-sm">
              No trend data available
            </div>
          )}
        </div>
      </div>

      {/* Data Quality Summary Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Data Quality & Pipeline Integrity</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated data validation metrics across all processed job postings
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5" /> High Reliability
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Completeness */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-slate-600">Completeness</span>
              <span className="text-sm font-bold text-slate-800">
                {(quality.completeness * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-teal-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(quality.completeness * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">Required fields populated</p>
          </div>

          {/* Duplicate Rate */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-slate-600">Duplicate Rate</span>
              <span className="text-sm font-bold text-slate-800">
                {(quality.duplicate_rate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(quality.duplicate_rate * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">Filtered via fuzzy deduplication</p>
          </div>

          {/* Missing Description Rate */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-slate-600">Missing Descriptions</span>
              <span className="text-sm font-bold text-slate-800">
                {(quality.missing_description_rate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(quality.missing_description_rate * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">Postings lacking full text</p>
          </div>

          {/* Coverage Months */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-slate-600">Temporal Span</span>
              <span className="text-sm font-bold text-slate-800">
                {quality.date_coverage_months} Months
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-purple-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min((quality.date_coverage_months / 24) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">Sufficient for seasonal models</p>
          </div>
        </div>

        {data.last_pipeline_run && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Last ingestion pipeline execution: {new Date(data.last_pipeline_run).toLocaleString()}</span>
            </div>
            <span className="text-slate-400">SkillGraph AI Engine v1.0</span>
          </div>
        )}
      </div>
    </div>
  );
}
