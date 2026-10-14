import { useState, useEffect, useCallback } from 'react';
import {
  getPipelineStatus,
  runPipeline,
  getDatasetStatus,
} from '../services/api';
import type { PipelineStatus, DatasetStatus, PipelineStage } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import {
  Play,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Database,
  Layers,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  FileCode,
  AlertTriangle,
  X,
  Server,
} from 'lucide-react';

const AVAILABLE_STAGES = [
  { id: 'ingestion', label: 'Dataset Ingestion & Validation' },
  { id: 'preprocessing', label: 'Deduplication & Hygiene Cleaning' },
  { id: 'extraction', label: 'Skill Extraction & Normalization' },
  { id: 'graph_building', label: 'Knowledge Graph Topology Generation' },
  { id: 'forecasting', label: 'Predictive Demand Time-Series Engine' },
];

export default function Pipeline() {
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [datasets, setDatasets] = useState<DatasetStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Run Modal & Trigger State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [selectedStages, setSelectedStages] = useState<string[]>(
    AVAILABLE_STAGES.map((s) => s.id)
  );

  // Expandable Error State
  const [expandedErrors, setExpandedErrors] = useState<Record<string, boolean>>({});

  // Fetch pipeline status and dataset provenance
  const fetchData = useCallback(async () => {
    try {
      const [pipeRes, dataRes] = await Promise.all([
        getPipelineStatus(),
        getDatasetStatus(),
      ]);
      setPipelineStatus(pipeRes.data);
      setDatasets(dataRes.data);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query pipeline status';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Polling when pipeline is running
  useEffect(() => {
    if (!pipelineStatus?.is_running) return;

    const interval = setInterval(() => {
      getPipelineStatus()
        .then((res) => {
          setPipelineStatus(res.data);
        })
        .catch((err) => {
          console.error('Polling error:', err);
        });
    }, 3000);

    return () => clearInterval(interval);
  }, [pipelineStatus?.is_running]);

  const handleToggleStageSelection = (stageId: string) => {
    setSelectedStages((prev) =>
      prev.includes(stageId) ? prev.filter((id) => id !== stageId) : [...prev, stageId]
    );
  };

  const handleRunPipeline = async () => {
    setIsTriggering(true);
    try {
      const res = await runPipeline(
        selectedStages.length === AVAILABLE_STAGES.length ? undefined : selectedStages
      );
      setPipelineStatus(res.data);
      setIsConfirmOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to trigger pipeline run';
      setError(msg);
    } finally {
      setIsTriggering(false);
    }
  };

  const toggleErrorExpand = (stageKey: string) => {
    setExpandedErrors((prev) => ({
      ...prev,
      [stageKey]: !prev[stageKey],
    }));
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const formatDuration = (startStr: string | null, endStr: string | null) => {
    if (!startStr) return '—';
    const start = new Date(startStr).getTime();
    const end = endStr ? new Date(endStr).getTime() : Date.now();
    const sec = Math.floor((end - start) / 1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    return `${min}m ${sec % 60}s`;
  };

  if (loading && !pipelineStatus) {
    return <LoadingSpinner message="Checking ingestion pipeline and compute worker status..." />;
  }

  if (error && !pipelineStatus) {
    return <ErrorMessage message={error} onRetry={fetchData} />;
  }

  const isRunning = pipelineStatus?.is_running ?? false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data & ML Pipeline Orchestration"
        description="Monitor automated ETL ingestion, skill extraction pipelines, model training runs, and dataset provenance."
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
            >
              <RotateCw className={`w-4 h-4 text-slate-500 ${isRunning ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setIsConfirmOpen(true)}
              disabled={isRunning}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg shadow-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-4 h-4 fill-white" />
              {isRunning ? 'Pipeline In Progress...' : 'Run Pipeline'}
            </button>
          </div>
        }
      />

      {/* Pipeline Status Summary Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              isRunning
                ? 'bg-amber-100 text-amber-700 animate-pulse'
                : 'bg-teal-50 text-teal-600'
            }`}
          >
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-800">
                {isRunning ? 'Pipeline Execution Active' : 'Pipeline Idle / Ready'}
              </h2>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isRunning
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isRunning ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'
                  }`}
                />
                {isRunning ? 'Processing' : 'Idle'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Last execution completed: {formatDate(pipelineStatus?.last_run || null)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-slate-600">
          <div className="text-right">
            <span className="text-slate-400 block">Registered Stages</span>
            <span className="text-base font-bold text-slate-800">
              {pipelineStatus?.stages?.length || 5} Stages
            </span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-right">
            <span className="text-slate-400 block">Deduplicated Postings</span>
            <span className="text-base font-bold text-teal-700">
              {datasets.reduce((acc, d) => acc + (d.row_count || 0), 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Pipeline Stage Execution Timeline Cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-base font-semibold text-slate-800 mb-1">
          Pipeline Execution Stages
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Sequential workflow progression with step-level validation and output logs
        </p>

        <div className="space-y-4">
          {(pipelineStatus?.stages || []).map((stage, idx) => {
            const hasError = !!stage.error_message;
            const isExpanded = !!expandedErrors[stage.stage];

            // Status Styling
            let statusBadge = (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Pending
              </span>
            );

            if (stage.status === 'completed') {
              statusBadge = (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Completed
                </span>
              );
            } else if (stage.status === 'running') {
              statusBadge = (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  Running
                </span>
              );
            } else if (stage.status === 'failed') {
              statusBadge = (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                  Failed
                </span>
              );
            }

            return (
              <div
                key={stage.stage}
                className={`rounded-xl border p-4 transition-all ${
                  stage.status === 'running'
                    ? 'border-amber-300 bg-amber-50/20 shadow-xs'
                    : stage.status === 'failed'
                    ? 'border-red-200 bg-red-50/30'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-white'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shadow-xs">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800 capitalize">
                        {stage.stage.replace(/_/g, ' ')}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Duration: {formatDuration(stage.started_at, stage.completed_at)}
                        </span>
                        {stage.started_at && (
                          <span>Started: {new Date(stage.started_at).toLocaleTimeString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    {/* Processed / Output Stats */}
                    <div className="text-right text-xs">
                      {stage.records_processed !== null && (
                        <span className="text-slate-500 block">
                          Processed: <strong className="text-slate-700">{stage.records_processed.toLocaleString()}</strong>
                        </span>
                      )}
                      {stage.records_output !== null && (
                        <span className="text-teal-600 block font-medium">
                          Yield: {stage.records_output.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {statusBadge}

                    {/* Expand Error Button if failed */}
                    {hasError && (
                      <button
                        onClick={() => toggleErrorExpand(stage.stage)}
                        className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 font-medium underline"
                      >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        Error Logs
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable Error Details */}
                {hasError && isExpanded && (
                  <div className="mt-3 p-3 bg-red-100/70 border border-red-200 rounded-lg text-xs font-mono text-red-800 overflow-x-auto whitespace-pre-wrap">
                    <div className="flex items-center gap-1.5 font-bold mb-1 text-red-900">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      Stage Execution Exception:
                    </div>
                    {stage.error_message}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Dataset Provenance & Ingestion Cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Dataset Provenance & Storage Integrity
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified cryptographic hashes and ingestion status of registered corpus data
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Verified Source Checksums
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {datasets.map((dataset) => (
            <div
              key={dataset.name}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all space-y-2.5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-teal-600 shrink-0" />
                  <h4 className="text-sm font-bold text-slate-800 truncate">{dataset.name}</h4>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                    dataset.downloaded
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {dataset.downloaded ? 'Synced' : 'Missing'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Row Count</span>
                  <span className="font-semibold text-slate-700">
                    {dataset.row_count ? dataset.row_count.toLocaleString() : '0'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Columns</span>
                  <span className="font-semibold text-slate-700">
                    {(dataset.columns || []).length} indexed
                  </span>
                </div>
              </div>

              {dataset.sha256_checksum && (
                <div className="pt-2 border-t border-slate-200/60 text-[11px]">
                  <span className="text-slate-400 block">SHA-256</span>
                  <span className="font-mono text-slate-600 truncate block">
                    {dataset.sha256_checksum.substring(0, 24)}...
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Modal Before Running Pipeline */}
      {isConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
                  <Play className="w-5 h-5 fill-teal-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Launch Pipeline Run</h3>
                  <p className="text-xs text-slate-500">
                    Configure execution stages to run synchronously or end-to-end
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConfirmOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stage Selector Checkboxes */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Select Pipeline Stages
              </span>
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {AVAILABLE_STAGES.map((s) => {
                  const checked = selectedStages.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none hover:text-slate-900"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleStageSelection(s.id)}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                      />
                      <span className="font-medium">{s.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Running the pipeline may trigger large language model inference and dataset
                deduplication. This process will update global analytics and forecasts.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRunPipeline}
                disabled={isTriggering || selectedStages.length === 0}
                className="px-5 py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-sm inline-flex items-center gap-2"
              >
                {isTriggering ? (
                  <>
                    <LoadingSpinner message="" /> Initiating...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" /> Confirm & Execute
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
