import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sliders,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Shuffle,
  Plus,
  Trash2,
  Clock,
  Layers,
  Compass,
} from 'lucide-react';
import { simulateWhatIf, getCareerBridges, searchSkills } from '../services/api';
import { useStudent } from '../context/StudentContext';
import type { WhatIfResult, CareerBridge, Skill } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const POPULAR_SIMULATION_SKILLS = [
  'Docker',
  'Kubernetes',
  'AWS',
  'PyTorch',
  'PostgreSQL',
  'React',
  'GraphQL',
  'TypeScript',
  'FastAPI',
  'Git',
];

export default function CareerSimulator() {
  const { studentSkills, targetCareer, setTargetCareer } = useStudent();
  const navigate = useNavigate();

  // What-If State
  const [simulatedSkills, setSimulatedSkills] = useState<string[]>(['Docker', 'AWS']);
  const [skillInput, setSkillInput] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Skill[]>([]);
  const [whatIfResult, setWhatIfResult] = useState<WhatIfResult | null>(null);
  const [whatIfLoading, setWhatIfLoading] = useState<boolean>(false);

  // Career Bridges State
  const [bridges, setBridges] = useState<CareerBridge[]>([]);
  const [bridgesLoading, setBridgesLoading] = useState<boolean>(false);

  useEffect(() => {
    if (targetCareer) {
      runSimulation();
      fetchBridges();
    }
  }, [targetCareer]);

  const runSimulation = async (customSimSkills?: string[]) => {
    if (!targetCareer) return;
    setWhatIfLoading(true);
    try {
      const skillsToSimulate = customSimSkills || simulatedSkills;
      const current = studentSkills.map((s) => s.skill_name);
      const res = await simulateWhatIf({
        current_skills: current,
        simulated_skills: skillsToSimulate,
        target_career_id: targetCareer.career_id,
      });
      setWhatIfResult(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setWhatIfLoading(false);
    }
  };

  const fetchBridges = async () => {
    if (!targetCareer) return;
    setBridgesLoading(true);
    try {
      const res = await getCareerBridges(targetCareer.career_id, 6);
      setBridges(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setBridgesLoading(false);
    }
  };

  const handleAddSimSkill = (name: string) => {
    if (!name || simulatedSkills.includes(name)) return;
    const updated = [...simulatedSkills, name];
    setSimulatedSkills(updated);
    setSkillInput('');
    setSearchResults([]);
    runSimulation(updated);
  };

  const handleRemoveSimSkill = (name: string) => {
    const updated = simulatedSkills.filter((s) => s !== name);
    setSimulatedSkills(updated);
    runSimulation(updated);
  };

  const handleSearchSkills = async (q: string) => {
    setSkillInput(q);
    if (q.trim().length >= 2) {
      try {
        const res = await searchSkills(q);
        setSearchResults(Array.isArray(res.data) ? res.data : (res.data as any).results || []);
      } catch (err) {
        console.error(err);
      }
    } else {
      setSearchResults([]);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold mb-4 border border-purple-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Career & Skill Simulation</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">
            Career What-If Simulator & Bridge Finder
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Hypothetically test how learning new skills expands your role coverage, unlocks real jobs in the database,
            and discover adjacent career bridge transitions with high skill overlap.
          </p>
        </div>
      </div>

      {!targetCareer ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4">
          <Compass className="w-10 h-10 text-purple-600 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Select a Dream Career First</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Choose your target occupation to simulate how acquiring skills impacts your market readiness.
          </p>
          <button
            onClick={() => navigate('/careers')}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
          >
            Explore & Select Dream Career
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Feature 3: Career What-If Simulator Section */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-purple-600" />
                  What-If Skill Simulator: {targetCareer.title}
                </h2>
                <span className="text-xs text-slate-500">
                  Select hypothetical skills to add to your existing {studentSkills.length} skills and see the impact.
                </span>
              </div>

              {/* Add Skill Input */}
              <div className="relative w-72">
                <input
                  type="text"
                  placeholder="Add skill to simulate..."
                  value={skillInput}
                  onChange={(e) => handleSearchSkills(e.target.value)}
                  className="w-full pl-3 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                    {searchResults.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => handleAddSimSkill(s.canonical_name)}
                        className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-xs font-medium text-slate-800 flex justify-between items-center"
                      >
                        <span>{s.canonical_name}</span>
                        <Plus className="w-3.5 h-3.5 text-purple-600" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Simulated Skills Chips */}
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Simulated Skills Added ({simulatedSkills.length}):
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {simulatedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 rounded-xl bg-purple-50 text-purple-900 font-bold text-xs border border-purple-200 flex items-center gap-2 shadow-2xs"
                  >
                    <span>{skill}</span>
                    <button
                      onClick={() => handleRemoveSimSkill(skill)}
                      className="text-purple-400 hover:text-purple-700 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Quick Suggestions */}
              <div className="flex flex-wrap items-center gap-1.5 mt-3 text-xs">
                <span className="text-slate-400 font-medium">Quick add popular:</span>
                {POPULAR_SIMULATION_SKILLS.filter((s) => !simulatedSkills.includes(s)).slice(0, 5).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleAddSimSkill(s)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-[11px] transition-colors cursor-pointer"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulation Results Display */}
            {whatIfLoading ? (
              <LoadingSpinner message="Recomputing mathematical role coverage and matching jobs..." />
            ) : whatIfResult ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 flex flex-col justify-between">
                  <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                    Target Role Coverage
                  </span>
                  <div className="my-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-slate-900">
                        {whatIfResult.simulated_coverage}%
                      </span>
                      <span className="text-xs text-slate-400">
                        (was {whatIfResult.baseline_coverage}%)
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md inline-block mt-1">
                      +{whatIfResult.coverage_gain_pct}% Readiness Gain
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Weighted role readiness score
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Newly Unlocked Jobs
                  </span>
                  <div className="my-2">
                    <span className="text-3xl font-extrabold text-indigo-700">
                      +{whatIfResult.newly_unlocked_jobs_count}
                    </span>
                    <span className="text-xs text-slate-500 block mt-1">
                      {whatIfResult.simulated_matching_jobs_sample} total postings aligned
                    </span>
                  </div>
                  <button
                    onClick={() => navigate('/opportunities')}
                    className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View In Opportunity Matcher</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Newly Satisfied Skills
                  </span>
                  <div className="my-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {whatIfResult.skills_newly_satisfied.length > 0 ? (
                      whatIfResult.skills_newly_satisfied.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-medium text-[11px] border border-emerald-200"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">
                        Simulated skills are complementary
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {whatIfResult.simulation_disclaimer}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Feature 2: Career Bridge Finder Section */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Shuffle className="w-5 h-5 text-indigo-600" />
                  Career Bridge Finder (Adjacent Transitions)
                </h2>
                <p className="text-xs text-slate-500">
                  Alternative occupations sharing significant competencies with {targetCareer.title}.
                  Provides realistic bridging paths and estimated effort.
                </p>
              </div>
            </div>

            {bridgesLoading ? (
              <LoadingSpinner message="Analyzing skill graph transitions and bridging pathways..." />
            ) : bridges.length === 0 ? (
              <p className="text-xs text-slate-400">No adjacent career bridges detected.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bridges.map((b) => (
                  <div
                    key={b.target_career_id}
                    className="bg-slate-50/60 border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-sm font-extrabold text-slate-900">
                          {b.target_title}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-extrabold text-xs shrink-0">
                          {b.transfer_score}% Match
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-slate-500 mb-3">
                        <span className="block font-semibold text-slate-700">
                          Feasibility: <span className="text-emerald-700">{b.feasibility}</span>
                        </span>
                        <span className="block">
                          Estimated Transition: <strong>{b.estimated_bridging_effort}</strong>
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100 mb-3 leading-relaxed">
                        {b.transition_rationale}
                      </p>

                      <div className="space-y-2 text-xs mb-4">
                        <div>
                          <span className="text-emerald-700 font-bold block mb-1">
                            Shared Competencies ({b.shared_skills_count}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {b.shared_skills.slice(0, 4).map((s) => (
                              <span
                                key={s}
                                className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded font-medium text-[10px]"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-rose-700 font-bold block mb-1">
                            Key Missing Skills ({b.missing_skills_count}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {b.key_missing_skills.slice(0, 3).map((s) => (
                              <span
                                key={s}
                                className="px-1.5 py-0.5 bg-rose-50 text-rose-800 rounded font-medium text-[10px]"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setTargetCareer({
                          career_id: b.target_career_id,
                          title: b.target_title,
                          onet_code: b.onet_code,
                          description: null,
                          posting_count: b.posting_count,
                          demand_status: 'Moderate Observed Demand',
                          match_type: 'bridge_role',
                          matched_alias: null,
                        });
                        navigate(`/careers/${b.target_career_id}`);
                      }}
                      className="w-full py-2 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-xs font-bold text-indigo-700 transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>Switch to this Target Role</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
