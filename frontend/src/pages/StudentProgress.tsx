import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Milestone,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Brain,
  Compass,
  Trophy,
  Zap,
  RotateCcw,
} from 'lucide-react';
import { useStudent } from '../context/StudentContext';
import { analyzeStudentSkillGap, matchStudentCareers } from '../services/api';
import type { StudentSkillGapResult, StudentCareerMatch } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

export default function StudentProgress() {
  const navigate = useNavigate();
  const {
    targetCareer,
    studentSkills,
    roadmapProgress,
    updateRoadmapProgress,
    resetProfile,
  } = useStudent();

  const [gapResult, setGapResult] = useState<StudentSkillGapResult | null>(null);
  const [unlockedCareers, setUnlockedCareers] = useState<StudentCareerMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const careerId = targetCareer?.career_id || 1;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const skillNames = studentSkills.map((s) => s.skill_name);
    const proficiencies = studentSkills.reduce((acc, s) => {
      acc[s.skill_name] = s.proficiency;
      return acc;
    }, {} as Record<string, string>);

    Promise.all([
      analyzeStudentSkillGap({
        candidate_skills: skillNames,
        career_id: careerId,
        proficiencies,
      }),
      matchStudentCareers(skillNames, 6),
    ])
      .then(([gapRes, matchRes]) => {
        if (!isMounted) return;
        setGapResult(gapRes.data);
        setUnlockedCareers(matchRes.data);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [careerId, studentSkills, roadmapProgress]);

  if (loading) {
    return <LoadingSpinner message="Calculating your updated career readiness and unlocked opportunities..." />;
  }

  const confidentSkills = Object.entries(roadmapProgress)
    .filter(([_, s]) => s === 'confident')
    .map(([k]) => k);

  const learningSkills = Object.entries(roadmapProgress)
    .filter(([_, s]) => s === 'learning' || s === 'practiced')
    .map(([k]) => k);

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Step 8 of Journey</span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-0.5">My Learning Progress</h1>
          <p className="text-xs text-slate-500">
            Track your skill growth, role readiness, and careers unlocked along the way.
          </p>
        </div>

        <button
          onClick={resetProfile}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Reset Profile
        </button>
      </div>

      {/* Target Milestone Readiness Card */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-slate-900 text-white rounded-3xl p-8 border border-teal-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl">
          <div className="flex items-center gap-2 text-teal-300 text-xs font-bold uppercase tracking-wider">
            <Trophy className="w-4 h-4 text-teal-400" />
            <span>Target Role Alignment</span>
          </div>
          <h2 className="text-3xl font-black text-white">
            {gapResult?.career_title || targetCareer?.title || 'Data Scientist'}
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your modeled skill coverage is currently{' '}
            <strong className="text-teal-300 font-bold">{gapResult?.skill_coverage || 0}%</strong>.
            You have matched {gapResult?.total_matched || 0} of {gapResult?.total_required || 0} key employer requirements.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => navigate('/roadmap')}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
            >
              Continue Roadmap <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate('/gap-analysis')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs transition-colors"
            >
              Inspect Skill Gaps
            </button>
          </div>
        </div>

        {/* Big Percentage Circle */}
        <div className="w-36 h-36 rounded-full bg-white/10 border-4 border-teal-500/80 flex flex-col items-center justify-center shrink-0 backdrop-blur-md shadow-2xl">
          <span className="text-3xl font-black text-teal-300">{gapResult?.skill_coverage || 0}%</span>
          <span className="text-[10px] uppercase font-bold text-slate-300">Readiness</span>
        </div>
      </div>

      {/* Skills Mastery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Confident Skills */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-base text-slate-900">Confident Skills</h3>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              {confidentSkills.length} mastered
            </span>
          </div>

          {confidentSkills.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Mark skills as "Confident" on your learning roadmap to track them here.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {confidentSkills.map((sk) => (
                <span
                  key={sk}
                  className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold"
                >
                  ✓ {sk}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Skills in Progress */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-base text-slate-900">Currently Learning</h3>
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
              {learningSkills.length} in progress
            </span>
          </div>

          {learningSkills.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Mark skills as "Learning" or "Practiced" to focus your active study sessions.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {learningSkills.map((sk) => (
                <span
                  key={sk}
                  className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold"
                >
                  ⚡ {sk}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Unlocked Alternative Careers */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900">Alternative Careers Unlocked by Your Skills</h3>
            <p className="text-xs text-slate-500">
              As you acquire skills, your qualifications expand into multiple high-demand domains
            </p>
          </div>
          <button
            onClick={() => navigate('/alternatives')}
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            All Alternatives <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
          {unlockedCareers.slice(0, 3).map((c) => (
            <div
              key={c.career_id}
              onClick={() => navigate(`/careers/${c.career_id}`)}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-teal-300 hover:bg-teal-50/20 transition-all cursor-pointer space-y-2"
            >
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  {c.match_tier}
                </span>
                <span className="font-mono font-bold text-xs text-teal-700">{c.skill_coverage}%</span>
              </div>
              <h4 className="font-bold text-sm text-slate-900">{c.title}</h4>
              <p className="text-[11px] text-slate-500">
                Shares {c.shared_skills_count} core skills with your current profile
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
