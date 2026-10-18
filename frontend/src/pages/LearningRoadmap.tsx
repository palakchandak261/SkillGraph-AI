import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Milestone,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  FolderGit2,
  BookOpen,
  Layers,
  ChevronRight,
  Compass,
  Zap,
} from 'lucide-react';
import { getStudentRoadmap } from '../services/api';
import type { StudentRoadmapData, RoadmapSkill, RoadmapProject } from '../types';
import { useStudent } from '../context/StudentContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const STATUS_OPTIONS: { id: 'not_started' | 'learning' | 'practiced' | 'confident'; label: string; color: string }[] = [
  { id: 'not_started', label: 'Not Started', color: 'bg-slate-100 text-slate-700' },
  { id: 'learning', label: 'Learning', color: 'bg-amber-100 text-amber-800' },
  { id: 'practiced', label: 'Practiced', color: 'bg-blue-100 text-blue-800' },
  { id: 'confident', label: 'Confident', color: 'bg-emerald-100 text-emerald-800' },
];

export default function LearningRoadmap() {
  const navigate = useNavigate();
  const { targetCareer, studentSkills, roadmapProgress, updateRoadmapProgress } = useStudent();
  const [roadmap, setRoadmap] = useState<StudentRoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const careerId = targetCareer?.career_id || 1;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const candidateSkillNames = studentSkills.map((s) => s.skill_name);
    const proficiencies = studentSkills.reduce((acc, s) => {
      acc[s.skill_name] = s.proficiency;
      return acc;
    }, {} as Record<string, string>);

    getStudentRoadmap({
      candidate_skills: candidateSkillNames,
      career_id: careerId,
      proficiencies,
    })
      .then((res) => {
        if (!isMounted) return;
        setRoadmap(res.data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to generate roadmap');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [careerId, studentSkills]);

  if (loading) {
    return <LoadingSpinner message="Generating tailored 4-phase learning progression and practical portfolio ideas..." />;
  }

  if (error || !roadmap) {
    return <ErrorMessage message={error || 'Roadmap unavailable'} onRetry={() => window.location.reload()} />;
  }

  // Count acquired/progressing skills
  const totalRoadmapSkills = roadmap.phases.reduce((acc, p) => acc + (p.skills?.length || 0), 0);
  const confidentCount = Object.values(roadmapProgress).filter((s) => s === 'confident').length;
  const learningCount = Object.values(roadmapProgress).filter((s) => s === 'learning' || s === 'practiced').length;

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Step 4 of 5: Learning Roadmap</span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-0.5">
            Personalized Learning Roadmap
          </h1>
          <p className="text-xs text-slate-500">
            Actionable 4-phase strategy to become job-ready for <span className="font-semibold text-slate-800">{roadmap.career_title}</span>
          </p>
        </div>

        <button
          onClick={() => navigate('/opportunities')}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
        >
          <span>See Matching Jobs (Step 5)</span> <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress Metric Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <Milestone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800">Your Study Progress</h3>
            <p className="text-xs text-slate-500">
              {confidentCount} of {totalRoadmapSkills} skills marked confident • {learningCount} currently in progress
            </p>
          </div>
        </div>

        <div className="w-full sm:w-64 space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-500">Curriculum Progress</span>
            <span className="text-teal-600">{Math.round((confidentCount / Math.max(1, totalRoadmapSkills)) * 100)}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-teal-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (confidentCount / Math.max(1, totalRoadmapSkills)) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4 Roadmap Phases */}
      <div className="space-y-6">
        {roadmap.phases.map((phase) => (
          <div
            key={phase.phase_number}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-800">
                  Phase {phase.phase_number}
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">{phase.title}</h2>
                <p className="text-xs text-slate-500">{phase.description}</p>
              </div>
            </div>

            {/* Skills in this Phase */}
            {phase.skills && phase.skills.length > 0 && (
              <div className="space-y-3">
                {phase.skills.map((sk) => {
                  const currentStatus = roadmapProgress[sk.skill_name] || sk.status || 'not_started';

                  return (
                    <div
                      key={sk.skill_name}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors text-xs"
                    >
                      <div className="space-y-0.5 max-w-xl">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{sk.skill_name}</span>
                          <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-white border border-slate-200 text-slate-600">
                            {sk.priority} Priority
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">{sk.reasoning}</p>
                      </div>

                      {/* Interactive Status Selector */}
                      <div className="flex items-center gap-1 shrink-0">
                        {STATUS_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => updateRoadmapProgress(sk.skill_name, opt.id)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                              currentStatus === opt.id
                                ? `${opt.color} font-bold shadow-xs ring-1 ring-slate-300`
                                : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Practical Projects in Phase 4 */}
            {phase.projects && phase.projects.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {phase.projects.map((proj, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-teal-50/40 border border-teal-100 space-y-2.5 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-teal-800 text-xs font-bold">
                        <FolderGit2 className="w-4 h-4 text-teal-600" />
                        <span>Recommended Portfolio Project</span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900">{proj.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{proj.description}</p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-teal-100/60 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                          Skills Practiced:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {proj.skills_practiced.map((s, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-medium text-slate-700"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        <strong className="text-slate-700">Deliverables:</strong> {proj.deliverables}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Step 5 Next CTA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 bg-gradient-to-r from-teal-50 to-indigo-50 border border-teal-200/80 rounded-3xl shadow-xs">
        <div>
          <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block mb-0.5">Ready to find real jobs?</span>
          <h3 className="font-bold text-slate-900 text-sm">
            See live job postings matching your current skills.
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Explore 1,000 real openings with salary ranges and direct application links.
          </p>
        </div>
        <button
          onClick={() => navigate('/opportunities')}
          className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer whitespace-nowrap"
        >
          <span>Continue to Step 5: Matching Jobs</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
