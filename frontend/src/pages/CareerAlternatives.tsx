import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shuffle,
  Briefcase,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Compass,
  Filter,
  Sparkles,
  GitCompare,
  Layers,
} from 'lucide-react';
import { matchStudentCareers } from '../services/api';
import type { StudentCareerMatch } from '../types';
import { useStudent } from '../context/StudentContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function CareerAlternatives() {
  const navigate = useNavigate();
  const { targetCareer, studentSkills, setTargetCareer } = useStudent();
  const [matches, setMatches] = useState<StudentCareerMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [tierFilter, setTierFilter] = useState<string>('All');
  const [minPostings, setMinPostings] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const skillNames = studentSkills.map((s) => s.skill_name);
    matchStudentCareers(skillNames, 18)
      .then((res) => {
        if (!isMounted) return;
        setMatches(res.data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to calculate career alternatives');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [studentSkills]);

  const filteredMatches = matches.filter((m) => {
    const matchesTier = tierFilter === 'All' || m.match_tier === tierFilter;
    const matchesVol = m.posting_count >= minPostings;
    return matchesTier && matchesVol;
  });

  if (loading) {
    return <LoadingSpinner message="Scanning occupational graph for career mobility pathways matching your skills..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Step 6 of Journey</span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-0.5">Career Alternatives & Mobility</h1>
          <p className="text-xs text-slate-500">
            Discover other high-demand careers that share competencies with your current profile
          </p>
        </div>

        <button
          onClick={() => navigate('/graph')}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
        >
          View Career Graph <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Target Role Reference Banner */}
      {targetCareer && (
        <div className="p-4 bg-teal-50/70 border border-teal-200/80 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <Compass className="w-4 h-4 text-teal-600" />
            <span className="text-teal-900">
              Current Target: <strong className="font-bold">{targetCareer.title}</strong>
            </span>
          </div>
          <span className="text-[11px] text-teal-700 font-medium">
            Comparing alternative pathways against your {studentSkills.length} saved skills
          </span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-700">Filter Tier:</span>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="All">All Tiers ({matches.length})</option>
            <option value="Strong Match">Strong Match (≥50% coverage)</option>
            <option value="Moderate Match">Moderate Match (30–49%)</option>
            <option value="Emerging Pathway">Emerging Pathway</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">Min Observed Postings:</span>
          <select
            value={minPostings}
            onChange={(e) => setMinPostings(Number(e.target.value))}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value={0}>Any Sample Size</option>
            <option value={1}>≥ 1 Postings</option>
            <option value={5}>≥ 5 Postings</option>
            <option value={10}>≥ 10 Postings</option>
          </select>
        </div>
      </div>

      {/* Career Mobility Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredMatches.map((m) => (
          <div
            key={m.career_id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      m.match_tier === 'Strong Match'
                        ? 'bg-emerald-100 text-emerald-800'
                        : m.match_tier === 'Moderate Match'
                        ? 'bg-teal-100 text-teal-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {m.match_tier}
                  </span>
                  <h3 className="font-bold text-base text-slate-900 mt-1">{m.title}</h3>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xl font-black text-teal-600 block">{m.skill_coverage}%</span>
                  <span className="text-[10px] text-slate-400 font-medium">Coverage</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                <span>Observed Postings: <strong className="text-slate-700">{m.posting_count}</strong></span>
                <span>•</span>
                <span>Shared Skills: <strong className="text-teal-700">{m.shared_skills_count}</strong></span>
              </div>

              {/* Shared Competencies */}
              <div className="space-y-1 text-xs">
                <span className="text-[11px] font-semibold text-slate-500 block">Skills You Have for This Role:</span>
                <div className="flex flex-wrap gap-1">
                  {m.shared_skills.slice(0, 4).map((s, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-100 text-[10px] font-medium"
                    >
                      ✓ {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Key Missing Competencies */}
              {m.missing_skills.length > 0 && (
                <div className="space-y-1 text-xs">
                  <span className="text-[11px] font-semibold text-slate-500 block">Required to Acquire:</span>
                  <div className="flex flex-wrap gap-1">
                    {m.missing_skills.slice(0, 3).map((s, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]"
                      >
                        + {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
              <button
                onClick={() => {
                  setTargetCareer({
                    career_id: m.career_id,
                    title: m.title,
                    onet_code: m.onet_code,
                    description: '',
                    posting_count: m.posting_count,
                    demand_status: m.match_tier,
                    match_type: 'switch',
                    matched_alias: null,
                  });
                  navigate(`/careers/${m.career_id}`);
                }}
                className="text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
              >
                Inspect Career <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
