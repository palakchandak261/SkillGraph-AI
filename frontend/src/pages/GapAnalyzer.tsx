import { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  getAnalyticsOccupations,
  searchSkills,
  analyzeSkillGap,
} from '../services/api';
import type {
  Occupation,
  Skill,
  SkillGapAnalysis,
  StudentProfile,
} from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import {
  UserCheck,
  Search,
  Plus,
  X,
  Briefcase,
  Award,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Brain,
  MapPin,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

interface SelectedSkillTag {
  id: number;
  name: string;
}

export default function GapAnalyzer() {
  // Form State
  const [profileName, setProfileName] = useState('Alex Morgan');
  const [targetOccupationId, setTargetOccupationId] = useState<number | ''>('');
  const [experienceLevel, setExperienceLevel] = useState('mid');
  const [location, setLocation] = useState('United States');

  // Skill Search & Tag Selection
  const [skillSearchQuery, setSkillSearchQuery] = useState('');
  const [searchedSkills, setSearchedSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<SelectedSkillTag[]>([
    { id: 1, name: 'Python' },
    { id: 2, name: 'SQL' },
    { id: 3, name: 'Git' },
  ]);
  const [isSearchingSkills, setIsSearchingSkills] = useState(false);

  // Available Occupations
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [occupationsLoading, setOccupationsLoading] = useState(true);

  // Analysis Result State
  const [analysis, setAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Fetch Occupations on mount
  useEffect(() => {
    let isMounted = true;
    getAnalyticsOccupations()
      .then((res) => {
        if (isMounted) {
          setOccupations(res.data);
          if (res.data.length > 0) {
            setTargetOccupationId(res.data[0].id);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load occupations:', err);
      })
      .finally(() => {
        if (isMounted) setOccupationsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Skill Autocomplete Search
  useEffect(() => {
    if (!skillSearchQuery.trim() || skillSearchQuery.length < 2) {
      setSearchedSkills([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingSkills(true);
      try {
        const res = await searchSkills(skillSearchQuery.trim());
        setSearchedSkills(res.data);
      } catch (err) {
        console.error('Skill search failed:', err);
      } finally {
        setIsSearchingSkills(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [skillSearchQuery]);

  const handleAddSkill = (skill: Skill) => {
    if (!selectedSkills.some((s) => s.id === skill.id)) {
      setSelectedSkills((prev) => [
        ...prev,
        { id: skill.id, name: skill.canonical_name },
      ]);
    }
    setSkillSearchQuery('');
    setSearchedSkills([]);
  };

  const handleRemoveSkill = (id: number) => {
    setSelectedSkills((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmitAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOccupationId) {
      setAnalysisError('Please choose a target occupation.');
      return;
    }

    const profile: StudentProfile = {
      name: profileName || 'Anonymous Candidate',
      skills: selectedSkills.map((s) => s.id),
      target_occupation_id: Number(targetOccupationId),
      experience_level: experienceLevel,
      location: location || null,
    };

    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await analyzeSkillGap(profile);
      setAnalysis(res.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Skill gap evaluation failed';
      setAnalysisError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  // CSV Report Generator
  const handleDownloadReport = () => {
    if (!analysis) return;

    const rows: (string | number)[][] = [
      ['SkillGraph AI - Career Skill Gap Analysis Report'],
      ['Candidate Name', profileName],
      ['Target Occupation', analysis.target_occupation],
      ['Skill Coverage Score', `${(analysis.skill_coverage * 100).toFixed(1)}%`],
      ['Total Required Skills', analysis.total_required],
      ['Total Matched Skills', analysis.total_matched],
      [],
      ['--- MATCHED & ACQUIRED SKILLS ---'],
      ['Skill ID', 'Skill Name', 'Importance Weight', 'Status'],
      ...analysis.matched_skills.map((m) => [
        m.skill_id,
        m.skill_name,
        m.importance.toFixed(2),
        m.matched ? 'Acquired' : 'Missing',
      ]),
      [],
      ['--- RECOMMENDED LEARNING PRIORITIES (UPSKILLING PATH) ---'],
      [
        'Priority Rank',
        'Skill Name',
        'Composite Score',
        'Relevance Score',
        'Market Demand',
        'Growth Score',
        'Curricular Recommendation',
      ],
      ...analysis.missing_skills.map((s) => [
        s.priority_rank,
        s.skill_name,
        s.composite_score.toFixed(2),
        s.relevance_score.toFixed(2),
        s.demand_score.toFixed(2),
        s.growth_score.toFixed(2),
        `"${s.reasoning.replace(/"/g, '""')}"`,
      ]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      rows.map((row) => row.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `skillgap_report_${profileName.toLowerCase().replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Donut chart data
  const coveragePercent = analysis ? Math.round(analysis.skill_coverage * 100) : 0;
  const pieData = [
    { name: 'Matched Skills', value: coveragePercent, color: '#0d9488' },
    { name: 'Missing Skills', value: Math.max(0, 100 - coveragePercent), color: '#e2e8f0' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidate Skill Gap & Career Pathway Analyzer"
        description="Compare candidate skill profiles against market occupation benchmarks to generate prioritized upskilling curricula."
      />

      {/* Assessment Form Card */}
      <form
        onSubmit={handleSubmitAnalysis}
        className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Candidate Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Candidate Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                required
                placeholder="Enter candidate name..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Target Occupation Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Target Occupation
            </label>
            <div className="relative">
              <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={targetOccupationId}
                onChange={(e) => setTargetOccupationId(Number(e.target.value))}
                required
                disabled={occupationsLoading}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              >
                <option value="">Select target role...</option>
                {occupations.map((occ) => (
                  <option key={occ.id} value={occ.id}>
                    {occ.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Experience Level & Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Seniority Level
              </label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white capitalize"
              >
                <option value="entry">Entry Level</option>
                <option value="mid">Mid-Senior</option>
                <option value="senior">Senior Lead</option>
                <option value="executive">Executive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Market Location
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Remote, US"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Current Skills Tag Selector with Autocomplete */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Current Acquired Skills ({selectedSkills.length})
          </label>

          {/* Skill Tag Pills */}
          <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg min-h-16 items-center">
            {selectedSkills.map((skill) => (
              <span
                key={skill.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-teal-800 font-medium text-xs rounded-full border border-teal-200 shadow-xs"
              >
                <Brain className="w-3 h-3 text-teal-600" />
                {skill.name}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill.id)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}

            {selectedSkills.length === 0 && (
              <span className="text-xs text-slate-400">
                No skills added yet. Type below to add candidate competencies.
              </span>
            )}
          </div>

          {/* Skill Autocomplete Input */}
          <div className="relative mt-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={skillSearchQuery}
              onChange={(e) => setSkillSearchQuery(e.target.value)}
              placeholder="Search taxonomy to add skills (e.g. PyTorch, React, Cloud, SQL)..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />

            {/* Dropdown suggestions */}
            {searchedSkills.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-30 divide-y divide-slate-100">
                {searchedSkills.map((sk) => (
                  <button
                    key={sk.id}
                    type="button"
                    onClick={() => handleAddSkill(sk)}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-teal-50 flex items-center justify-between transition-colors"
                  >
                    <span className="font-medium text-slate-800">{sk.canonical_name}</span>
                    <span className="text-[11px] text-teal-600 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">
            Calculates role alignment vector and computes weighted gap priority rank.
          </p>
          <button
            type="submit"
            disabled={analyzing}
            className="px-6 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {analyzing ? (
              <>
                <LoadingSpinner message="" /> Analyzing Gap...
              </>
            ) : (
              <>
                <Award className="w-4 h-4" /> Run Gap Analysis
              </>
            )}
          </button>
        </div>
      </form>

      {/* Analysis Error */}
      {analysisError && <ErrorMessage message={analysisError} />}

      {/* Analysis Results Display */}
      {analysis && (
        <div className="space-y-6">
          {/* Header Result Summary with Donut Chart */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                  Target: {analysis.target_occupation}
                </span>
                <span className="text-xs text-slate-400">Analysis #{analysis.profile_id}</span>
              </div>

              <h2 className="text-2xl font-bold text-slate-800">
                {profileName}'s Market Readiness: {coveragePercent}%
              </h2>

              <p className="text-sm text-slate-600 max-w-xl">
                The candidate fulfills{' '}
                <strong className="text-teal-700">{analysis.total_matched}</strong> out of{' '}
                <strong className="text-slate-800">{analysis.total_required}</strong> critical skills
                demanded by employers for this target occupation.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <div className="bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">Matched Skills</span>
                  <span className="text-base font-bold text-emerald-600">
                    {analysis.total_matched}
                  </span>
                </div>
                <div className="bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">Missing Skills</span>
                  <span className="text-base font-bold text-amber-600">
                    {analysis.missing_skills.length}
                  </span>
                </div>
                <div className="bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">Priority Learning Actions</span>
                  <span className="text-base font-bold text-blue-600">
                    {analysis.missing_skills.filter((s) => s.composite_score > 0.6).length} High Priority
                  </span>
                </div>
              </div>
            </div>

            {/* Donut Chart Visualization */}
            <div className="flex flex-col items-center justify-center shrink-0 w-52 h-52 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: unknown) => [`${value}%`, 'Share']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-extrabold text-teal-700">{coveragePercent}%</span>
                <span className="text-[11px] text-slate-500 font-medium">Coverage</span>
              </div>
            </div>

            {/* Download CSV Report Action */}
            <div className="self-end lg:self-center">
              <button
                onClick={handleDownloadReport}
                className="px-4 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors inline-flex items-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" /> Export CSV Report
              </button>
            </div>
          </div>

          {/* Matched vs Missing Skills Badges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Matched Skills */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-semibold text-slate-800">
                  Acquired & Matched Skills ({analysis.matched_skills.filter((m) => m.matched).length})
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Competencies already present in the candidate profile matching benchmark requirements
              </p>
              <div className="flex flex-wrap gap-2">
                {analysis.matched_skills
                  .filter((m) => m.matched)
                  .map((match) => (
                    <span
                      key={match.skill_id}
                      className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {match.skill_name}
                    </span>
                  ))}
              </div>
            </div>

            {/* Missing Skills */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-semibold text-slate-800">
                  Identified Gaps ({analysis.missing_skills.length})
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Required skills absent from candidate profile, weighted by market severity
              </p>
              <div className="flex flex-wrap gap-2">
                {analysis.missing_skills.map((miss) => (
                  <span
                    key={miss.skill_id}
                    className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                    {miss.skill_name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Learning Priority Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-800">
                  Prioritized Learning Pathway & Recommendations
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Algorithmic ranking combining occupational relevance, posting demand, and growth momentum
                </p>
              </div>
              <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                Ranked by Composite Score
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-16 text-center">Rank</th>
                    <th className="py-3 px-4">Recommended Skill</th>
                    <th className="py-3 px-4 text-center">Relevance</th>
                    <th className="py-3 px-4 text-center">Market Demand</th>
                    <th className="py-3 px-4 text-center">Growth</th>
                    <th className="py-3 px-4 text-right">Composite Score</th>
                    <th className="py-3 px-4 w-80">Reasoning & Curricular Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analysis.missing_skills.map((rec) => (
                    <tr key={rec.skill_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                            rec.priority_rank === 1
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : rec.priority_rank <= 3
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          #{rec.priority_rank}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-teal-600" />
                          <span>{rec.skill_name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-xs font-medium text-slate-700">
                          {(rec.relevance_score * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-xs font-medium text-slate-700">
                          {(rec.demand_score * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-xs font-semibold text-emerald-600">
                          +{(rec.growth_score * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="px-2.5 py-1 rounded bg-teal-50 text-teal-800 font-bold text-xs border border-teal-200">
                          {rec.composite_score.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 leading-relaxed">
                        {rec.reasoning}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
