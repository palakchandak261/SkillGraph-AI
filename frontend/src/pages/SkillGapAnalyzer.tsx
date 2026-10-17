import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  Target,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Info,
  Layers,
  Compass,
  HelpCircle,
  Milestone,
  FileText,
  Upload,
  X,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { analyzeStudentSkillGap, parseResumeText } from '../services/api';
import type { StudentSkillGapResult, ResumeParseResponse } from '../types';
import { useStudent } from '../context/StudentContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function SkillGapAnalyzer() {
  const navigate = useNavigate();
  const { targetCareer, studentSkills, addSkill } = useStudent();
  const [result, setResult] = useState<StudentSkillGapResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resume Modal State
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [parsingResume, setParsingResume] = useState(false);
  const [parsedData, setParsedData] = useState<ResumeParseResponse | null>(null);

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

    analyzeStudentSkillGap({
      candidate_skills: candidateSkillNames,
      career_id: careerId,
      proficiencies,
    })
      .then((res) => {
        if (!isMounted) return;
        setResult(res.data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to analyze skill gap');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [careerId, studentSkills]);

  const handleParseResume = async () => {
    if (!resumeText.trim()) return;
    setParsingResume(true);
    try {
      const res = await parseResumeText({ resume_text: resumeText });
      setParsedData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setParsingResume(false);
    }
  };

  const handleApplyParsedSkills = () => {
    if (!parsedData) return;
    parsedData.extracted_skills.forEach((s) => {
      addSkill({
        skill_name: s.skill_name,
        proficiency: s.proficiency,
        is_custom: false,
      });
    });
    setResumeModalOpen(false);
    setParsedData(null);
    setResumeText('');
  };

  if (loading) {
    return <LoadingSpinner message="Calculating multi-factor skill gap alignment and coverage score..." />;
  }

  if (error || !result) {
    return <ErrorMessage message={error || 'Gap analysis unavailable'} onRetry={() => window.location.reload()} />;
  }

  const coverageScore = result.skill_coverage;
  const pieData = [
    { name: 'Matched & Strengthened', value: coverageScore, color: '#0d9488' },
    { name: 'Uncovered Role Gap', value: Math.max(0, 100 - coverageScore), color: '#e2e8f0' },
  ];

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Step 4 of Journey</span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-0.5">Personalized Skill-Gap Analysis</h1>
          <p className="text-xs text-slate-500">
            Comparing your profile against verified requirements for <span className="font-semibold text-slate-800">{result.career_title}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setResumeModalOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-teal-600" />
            <span>Upload / Paste Résumé</span>
          </button>

          <button
            onClick={() => navigate('/roadmap')}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <span>View Roadmap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Coverage Score & Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coverage Donut Gauge */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Skill Coverage Score
          </span>
          <div className="relative w-44 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: unknown) => `${Number(v).toFixed(1)}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-extrabold text-slate-900">{coverageScore}%</span>
              <span className="text-[10px] font-semibold text-teal-600 uppercase">Coverage</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            You match {result.total_matched} of {result.total_required} modeled role requirements.
          </p>
        </div>

        {/* Suggested Next Skill to Learn */}
        <div className="bg-gradient-to-br from-teal-900 to-slate-900 text-white p-6 rounded-2xl border border-teal-800 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-teal-300 text-xs font-bold uppercase tracking-wider">
              <Zap className="w-4 h-4 text-teal-400" />
              <span>Recommended Next Priority</span>
            </div>
            {result.suggested_next_skill ? (
              <>
                <h3 className="text-2xl font-black text-white">{result.suggested_next_skill.skill_name}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {result.suggested_next_skill.reasoning}
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-300">You have high coverage across all primary role requirements!</p>
            )}
          </div>

          <button
            onClick={() => navigate('/roadmap')}
            className="mt-4 w-full py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            Start Learning Roadmap <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Summary Breakdown Metrics */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider text-[11px]">
            Alignment Breakdown
          </h3>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-100">
              <span className="font-medium">Skills Already Covered:</span>
              <span className="font-bold">{result.matched_skills.length}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-amber-50 text-amber-900 rounded-xl border border-amber-100">
              <span className="font-medium">Need Strengthening:</span>
              <span className="font-bold">{result.skills_to_improve.length}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-red-50 text-red-900 rounded-xl border border-red-100">
              <span className="font-medium">Important Missing:</span>
              <span className="font-bold">{result.important_missing.length}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 text-slate-700 rounded-xl border border-slate-100">
              <span className="font-medium">Optional / Secondary:</span>
              <span className="font-bold">{result.optional_missing.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Formula & Weighting Methodology Box */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-800">Mathematical Weighting Formula</p>
          <p>{result.formula_explanation}</p>
        </div>
      </div>

      {/* 1. Skills Covered */}
      {result.matched_skills.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-base text-slate-900">
              Skills Already Covered ({result.matched_skills.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {result.matched_skills.map((sk) => (
              <div
                key={sk.skill_id}
                className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-emerald-950">{sk.skill_name}</span>
                  <span className="text-[10px] capitalize px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 font-semibold">
                    {sk.proficiency}
                  </span>
                </div>
                <span className="text-[11px] text-emerald-800 mt-2">
                  Observed in {sk.demand_percentage}% of target postings
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Skills Needing Strengthening */}
      {result.skills_to_improve.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-base text-slate-900">
              Skills to Deepen & Strengthen ({result.skills_to_improve.length})
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            You reported beginner familiarity with these skills, but employers heavily rely on them for this role.
          </p>
          <div className="space-y-2">
            {result.skills_to_improve.map((sk) => (
              <div
                key={sk.skill_id}
                className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900">{sk.skill_name}</span>
                  <p className="text-[11px] text-amber-800 mt-0.5">{sk.reasoning}</p>
                </div>
                <span className="px-2.5 py-1 rounded-lg font-semibold text-[11px] bg-amber-200/80 text-amber-900">
                  Needs Practice
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Important Missing Skills Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              High-Priority Missing Skills ({result.important_missing.length})
            </h3>
            <p className="text-xs text-slate-500">
              Ranked by multi-factor composite priority score (role relevance + market demand + career leverage)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-3 text-center w-12">Rank</th>
                <th className="py-3 px-3">Skill Name</th>
                <th className="py-3 px-3 text-right">Demand %</th>
                <th className="py-3 px-3 text-right">Composite Score</th>
                <th className="py-3 px-3">Recommendation Reasoning</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.important_missing.map((sk) => (
                <tr key={sk.skill_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 text-center font-bold text-slate-500 font-mono">
                    #{sk.priority_rank}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900">{sk.skill_name}</td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-teal-700">
                    {sk.demand_percentage.toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                    {sk.composite_score.toFixed(3)}
                  </td>
                  <td className="py-3 px-3 text-slate-600 max-w-md">{sk.reasoning}</td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => navigate('/roadmap')}
                      className="text-teal-600 hover:text-teal-700 font-semibold"
                    >
                      Plan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Résumé Parsing Modal */}
      {resumeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Instant Résumé Skill Extraction
                </h3>
              </div>
              <button
                onClick={() => {
                  setResumeModalOpen(false);
                  setParsedData(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Privacy Assurance Banner */}
            <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-2xl flex items-start gap-2.5 text-xs text-teal-950">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>
                <strong>Privacy Guaranteed:</strong> Résumé text is processed entirely in-memory for competency identification
                and is never permanently stored, indexed, or shared.
              </span>
            </div>

            {!parsedData ? (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">
                  Paste Résumé or Bio Text:
                </label>
                <textarea
                  rows={8}
                  placeholder="Paste your resume work experience, skills section, or bio here (e.g. 'Software Engineer with experience in Python, FastAPI, Docker, and PostgreSQL...')"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white resize-none"
                />

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setResumeModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleParseResume}
                    disabled={parsingResume || !resumeText.trim()}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{parsingResume ? 'Extracting Skills...' : 'Extract Skills Now'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Found {parsedData.total_skills_found} Verified Skills
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Processed in {parsedData.processing_time_ms}ms ({parsedData.word_count} words analyzed)
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full capitalize">
                    Level: {parsedData.inferred_experience_level.replace('_', ' ')}
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-100 rounded-2xl p-3 bg-slate-50">
                  {parsedData.extracted_skills.map((sk) => (
                    <div
                      key={sk.skill_id}
                      className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 block">{sk.skill_name}</span>
                        <span className="text-[10px] text-slate-400">{sk.context_snippet}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200 capitalize">
                        {sk.proficiency}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setParsedData(null)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                  >
                    &larr; Re-paste Résumé
                  </button>

                  <button
                    onClick={handleApplyParsedSkills}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Apply {parsedData.total_skills_found} Skills to My Profile</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

