import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useApi } from '../hooks/useApi';
import { getDatasetStatus } from '../services/api';
import type { DatasetStatus } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import {
  Database,
  Search,
  CheckCircle2,
  XCircle,
  ExternalLink,
  FileCode,
  Calendar,
  Layers,
  HardDrive,
  RefreshCw,
  Info,
} from 'lucide-react';

export default function DataExplorer() {
  const { data: datasets, loading, error, refetch } = useApi(getDatasetStatus);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDatasetName, setSelectedDatasetName] = useState<string | null>(null);

  // Filter datasets
  const filteredDatasets = useMemo(() => {
    if (!datasets) return [];
    if (!searchTerm.trim()) return datasets;
    const term = searchTerm.toLowerCase();
    return datasets.filter(
      (ds) =>
        ds.name.toLowerCase().includes(term) ||
        (ds.file_name && ds.file_name.toLowerCase().includes(term)) ||
        (ds.columns || []).some((col) => col.toLowerCase().includes(term)) ||
        (ds.processing_status || '').toLowerCase().includes(term)
    );
  }, [datasets, searchTerm]);

  // Selected dataset for detail inspector
  const activeDataset = useMemo(() => {
    if (!datasets || datasets.length === 0) return null;
    if (selectedDatasetName) {
      return datasets.find((d) => d.name === selectedDatasetName) || datasets[0];
    }
    return datasets[0];
  }, [datasets, selectedDatasetName]);

  // Helper formatters
  const formatBytes = (bytes: number | null) => {
    if (bytes === null || bytes === undefined || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'ready':
      case 'processed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            {status}
          </span>
        );
      case 'in_progress':
      case 'processing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 animate-pulse">
            {status}
          </span>
        );
      case 'failed':
      case 'error':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  // Prepare chart data for column counts and records
  const chartData = useMemo(() => {
    if (!datasets) return [];
    return datasets.map((ds) => ({
      name: ds.name.length > 18 ? ds.name.substring(0, 16) + '...' : ds.name,
      rows: ds.row_count || 0,
      columns: (ds.columns || []).length,
    }));
  }, [datasets]);

  if (loading) {
    return <LoadingSpinner message="Inspecting datasets and storage status..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        message={`Failed to fetch dataset statuses: ${error}`}
        onRetry={refetch}
      />
    );
  }

  if (!datasets || datasets.length === 0) {
    return (
      <EmptyState
        title="No Datasets Found"
        description="No job posting or taxonomy datasets have been registered yet. Run the ingestion pipeline to import datasets."
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dataset Explorer & Provenance"
        description="Inspect registered raw datasets, ingestion status, schema columns, and data hygiene metrics."
        action={
          <button
            onClick={refetch}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            Sync Status
          </button>
        }
      />

      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Datasets Tracked</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{datasets.length}</p>
          </div>
          <div className="p-2.5 bg-teal-50 rounded-lg text-teal-600">
            <Database className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Records Ingested</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">
              {datasets
                .reduce((acc, d) => acc + (d.row_count || 0), 0)
                .toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Aggregated Storage</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">
              {formatBytes(
                datasets.reduce((acc, d) => acc + (d.file_size || 0), 0)
              )}
            </p>
          </div>
          <div className="p-2.5 bg-purple-50 rounded-lg text-purple-600">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Fully Downloaded</p>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">
              {datasets.filter((d) => d.downloaded).length} / {datasets.length}
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search datasets, columns, status..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
          />
        </div>
        <p className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700">{filteredDatasets.length}</span> of{' '}
          {datasets.length} datasets
        </p>
      </div>

      {/* Dataset Status Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Dataset Name</th>
                <th className="py-3.5 px-4">Source / Origin</th>
                <th className="py-3.5 px-4 text-center">Downloaded</th>
                <th className="py-3.5 px-4 text-right">File Size</th>
                <th className="py-3.5 px-4 text-right">Row Count</th>
                <th className="py-3.5 px-4 text-center">Columns</th>
                <th className="py-3.5 px-4">Processing Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDatasets.map((dataset) => {
                const isSelected = activeDataset?.name === dataset.name;
                return (
                  <tr
                    key={dataset.name}
                    onClick={() => setSelectedDatasetName(dataset.name)}
                    className={`cursor-pointer transition-colors hover:bg-slate-50/80 ${
                      isSelected ? 'bg-teal-50/40' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-teal-600 shrink-0" />
                        <span>{dataset.name}</span>
                      </div>
                      {dataset.file_name && (
                        <span className="text-xs text-slate-400 font-mono block ml-6">
                          {dataset.file_name}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate">
                      {dataset.source_url ? (
                        <a
                          href={dataset.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline max-w-xs truncate"
                        >
                          <span className="truncate">{dataset.source_url}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">Local repository</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {dataset.downloaded ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 inline-block" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 inline-block" />
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-600">
                      {formatBytes(dataset.file_size)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                      {dataset.row_count !== null && dataset.row_count !== undefined
                        ? dataset.row_count.toLocaleString()
                        : '0'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {(dataset.columns || []).length} cols
                      </span>
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(dataset.processing_status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDatasetName(dataset.name);
                        }}
                        className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row Count and Column Count Distribution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800 mb-1">
            Dataset Record Volume (Row Count)
          </h2>
          <p className="text-xs text-slate-500 mb-4">Total records across each registered dataset</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                />
                <Tooltip
                  formatter={(val: unknown) => {
                    const num = typeof val === 'number' ? val : Number(val);
                    return [isNaN(num) ? '0' : num.toLocaleString(), 'Rows'];
                  }}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="rows" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Selected Dataset Detail Inspector */}
        {activeDataset && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-teal-600" />
                  <h2 className="text-base font-semibold text-slate-800">{activeDataset.name}</h2>
                </div>
                {getStatusBadge(activeDataset.processing_status)}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block mb-0.5">Coverage Span</span>
                  <div className="flex items-center gap-1 font-medium text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {formatDate(activeDataset.date_coverage_start)} -{' '}
                      {formatDate(activeDataset.date_coverage_end)}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block mb-0.5">License & Provenance</span>
                  <span className="font-medium text-slate-700 truncate block">
                    {activeDataset.license_info || 'Open Data / Academic'}
                  </span>
                </div>
              </div>

              {activeDataset.sha256_checksum && (
                <div className="mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                  <span className="text-slate-400 block mb-0.5">SHA-256 Checksum</span>
                  <span className="font-mono text-[11px] text-slate-600 break-all">
                    {activeDataset.sha256_checksum}
                  </span>
                </div>
              )}

              {/* Column tags display */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700">
                    Schema Columns ({(activeDataset.columns || []).length})
                  </span>
                  <span className="text-[11px] text-slate-400">Indexed for extraction</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-100">
                  {(activeDataset.columns || []).map((col) => (
                    <span
                      key={col}
                      className="px-2 py-0.5 bg-white text-slate-700 border border-slate-200 rounded text-xs font-mono"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Select any row in the table to view schema definitions and checksum metadata.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
