import React, { useState, useEffect } from 'react';
import {
  Radar,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Clock,
  Sparkles,
  Search,
  Activity,
  Info,
  Calendar,
  Layers,
  CheckCircle,
} from 'lucide-react';
import {
  getEarlyWarningSignals,
  getSkillHalfLife,
  searchSkills,
} from '../services/api';
import type { EarlyWarningSignal, SkillHalfLife, Skill } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function FutureSkillRadar() {
  const [signals, setSignals] = useState<EarlyWarningSignal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Skill half life inspector
  const [selectedSkillId, setSelectedSkillId] = useState<number>(1);
  const [halfLifeData, setHalfLifeData] = useState<SkillHalfLife | null>(null);
  const [halfLifeLoading, setHalfLifeLoading] = useState<boolean>(false);

  // Skill search
  const [skillSearchQuery, setSkillSearchQuery] = useState<string>('');
  const [skillSearchResults, setSkillSearchResults] = useState<Skill[]>([]);

  useEffect(() => {
    fetchSignals();
    loadHalfLife(1);
  }, []);

  const fetchSignals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getEarlyWarningSignals({ lookback_periods: 4, min_postings: 2 });
      setSignals(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load early warning signals');
    } finally {
      setLoading(false);
    }
  };

  const loadHalfLife = async (id: number) => {
    setHalfLifeLoading(true);
    try {
      const res = await getSkillHalfLife(id);
      setHalfLifeData(res.data);
      setSelectedSkillId(id);
    } catch (err) {
      console.error(err);
    } finally {
      setHalfLifeLoading(false);
    }
  };

  const handleSearchSkills = async (q: string) => {
    setSkillSearchQuery(q);
    if (q.trim().length >= 2) {
      try {
        const res = await searchSkills(q);
        setSkillSearchResults(Array.isArray(res.data) ? res.data : (res.data as any).results || []);
      } catch (err) {
        console.error(err);
      }
    } else {
      setSkillSearchResults([]);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-500/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold mb-4 border border-sky-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Predictive Demand & Obsolescence Radar</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">
            Future Skill Radar & Early-Warning System
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed mb-4">
            Detect meaningful velocity changes, sudden demand shifts, and stability half-lives across 8,828 skills.
            Empirical statistical models identify emerging surges while guarding against false obsolescence claims.
          </p>

          <div className="p-3 bg-white/10 rounded-2xl border border-white/10 text-xs text-slate-300 flex items-start gap-2 max-w-2xl">
            <Info className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
            <span>
              <strong>Scientific Validation Notice:</strong> Predictions and signals are derived from historical
              posting observations with 95% Bayesian confidence intervals. Changes reflect current labor market signals,
              not speculative hype.
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Calculating demand velocity spikes and half-life decay trajectories..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchSignals} />
      ) : (
        <div className="space-y-8">
          {/* Feature 1: Skill Demand Early-Warning System */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-sky-600" />
                  Skill Demand Early-Warning System (Signals & Alerts)
                </h2>
                <p className="text-xs text-slate-500">
                  Identifies statistically significant demand share shifts between recent and historical collection windows.
                </p>
              </div>
              <span className="text-xs font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
                {signals.length} Active Signals
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {signals.map((sig) => (
                <div
                  key={sig.skill_id}
                  onClick={() => loadHalfLife(sig.skill_id)}
                  className={`bg-white rounded-2xl border p-5 shadow-xs transition-all hover:shadow-md cursor-pointer flex flex-col justify-between ${
                    sig.signal_type === 'surge_alert'
                      ? 'border-emerald-200 hover:border-emerald-400'
                      : sig.signal_type === 'decline_warning'
                      ? 'border-rose-200 hover:border-rose-400'
                      : 'border-slate-200 hover:border-sky-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {sig.category}
                      </span>
                      <span
                        className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                          sig.relative_change_pct > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {sig.relative_change_pct > 0 ? '+' : ''}
                        {sig.relative_change_pct}%
                      </span>
                    </div>

                    <h3 className="text-sm font-extrabold text-slate-900 mb-1">
                      {sig.skill_name}
                    </h3>
                    <p className="text-xs font-semibold text-slate-700 mb-2">
                      {sig.headline}
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed mb-3">
                      {sig.explanation}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>{sig.sample_postings} sample postings</span>
                    <span className="text-sky-600 font-semibold hover:underline">
                      Inspect Half-Life &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feature 10: Skill Half-Life & Obsolescence Monitor */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-sky-600" />
                  Skill Half-Life & Obsolescence Monitor
                </h2>
                <p className="text-xs text-slate-500">
                  Evaluates skill stability, decay rates, and macro longevity based on time-series history.
                </p>
              </div>

              {/* Autocomplete Skill Selector */}
              <div className="relative w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search skill to inspect..."
                  value={skillSearchQuery}
                  onChange={(e) => handleSearchSkills(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                />
                {skillSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                    {skillSearchResults.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          loadHalfLife(s.id);
                          setSkillSearchQuery('');
                          setSkillSearchResults([]);
                        }}
                        className="px-3 py-2 hover:bg-sky-50 cursor-pointer text-xs font-medium text-slate-800 flex justify-between items-center"
                      >
                        <span>{s.canonical_name}</span>
                        <span className="text-[10px] text-slate-400">{s.category}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {halfLifeLoading ? (
              <LoadingSpinner message="Calculating skill trajectory and decay modeling..." />
            ) : halfLifeData ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-6">
                <div className="md:col-span-4 space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-400">Inspected Skill</span>
                    <h3 className="text-xl font-extrabold text-slate-900">
                      {halfLifeData.skill_name}
                    </h3>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Status:</span>
                      <strong className="text-slate-800 capitalize">{halfLifeData.status.replace('_', ' ')}</strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Trajectory:</span>
                      <strong className="text-sky-700">{halfLifeData.trajectory}</strong>
                    </div>
                    {halfLifeData.estimated_half_life && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Estimated Longevity:</span>
                        <strong className="text-emerald-700 font-extrabold">
                          {halfLifeData.estimated_half_life}
                        </strong>
                      </div>
                    )}
                    {halfLifeData.obsolescence_risk && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Obsolescence Risk:</span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                            halfLifeData.obsolescence_risk === 'Very Low' || halfLifeData.obsolescence_risk === 'Low'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {halfLifeData.obsolescence_risk}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-8 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6 text-xs text-slate-600 leading-relaxed">
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-sky-600" />
                      Analytical Rationale & Stability Summary
                    </h4>
                    <p className="mb-3">
                      {halfLifeData.message || (
                        <>
                          Historical observation indicates that <strong>{halfLifeData.skill_name}</strong> maintains{' '}
                          an annualized momentum of {halfLifeData.annualized_momentum_pct}%. With an average historical
                          demand share of {halfLifeData.historical_mean_share_pct}%, it remains a vital component of modern
                          industry workflows.
                        </>
                      )}
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-400">
                    {halfLifeData.disclaimer ||
                      'Decreased frequency in job postings represents shifting tool popularity, not outright obsolescence.'}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
