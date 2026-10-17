import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderGit2,
  Sparkles,
  Award,
  Layers,
  Clock,
  CheckCircle2,
  FileText,
  Sliders,
  ArrowRight,
  Compass,
  Cpu,
} from 'lucide-react';
import { generateProjectIdeas, optimizeLearningROI } from '../services/api';
import { useStudent } from '../context/StudentContext';
import type { ProjectIdea, LearningROIOptimization } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ProjectGenerator() {
  const { studentSkills, targetCareer } = useStudent();
  const navigate = useNavigate();

  // Project Generator State
  const [projects, setProjects] = useState<ProjectIdea[]>([]);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(false);

  // Learning ROI Optimizer State
  const [roiList, setRoiList] = useState<LearningROIOptimization[]>([]);
  const [weeklyHours, setWeeklyHours] = useState<number>(10);
  const [loadingRoi, setLoadingRoi] = useState<boolean>(false);

  useEffect(() => {
    if (targetCareer) {
      fetchProjects();
      fetchRoi(weeklyHours);
    }
  }, [targetCareer]);

  const fetchProjects = async () => {
    if (!targetCareer) return;
    setLoadingProjects(true);
    try {
      const skills = studentSkills.map((s) => s.skill_name);
      const res = await generateProjectIdeas({
        target_career_title: targetCareer.title,
        target_skills: skills.length ? skills : ['Python', 'SQL', 'FastAPI', 'Docker'],
        experience_level: 'student',
      });
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchRoi = async (hours: number) => {
    if (!targetCareer) return;
    setLoadingRoi(true);
    try {
      const skills = studentSkills.map((s) => s.skill_name);
      const res = await optimizeLearningROI({
        candidate_skills: skills,
        target_career_id: targetCareer.career_id,
        weekly_hours: hours,
      });
      setRoiList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRoi(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-4 border border-amber-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Applied Portfolio & Priority Optimizer</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">
            AI Portfolio Project Generator & Learning Priority Optimizer
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Turn skill gaps into verifiable engineering artifacts. Generate structured portfolio specifications
            aligned with real job-market evidence, and optimize your study order based on multi-role versatility.
          </p>
        </div>
      </div>

      {!targetCareer ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4">
          <Compass className="w-10 h-10 text-amber-600 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Select a Dream Career First</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Choose your target occupation to generate tailored portfolio project specifications and learning ROI optimizations.
          </p>
          <button
            onClick={() => navigate('/careers')}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
          >
            Explore & Select Dream Career
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Feature 7: AI Portfolio Projects Section */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-amber-600" />
                Recommended Portfolio Projects for {targetCareer.title}
              </h2>
              <p className="text-xs text-slate-500">
                Verifiable, production-grade project specifications that demonstrate practical competency to engineering leads.
              </p>
            </div>

            {loadingProjects ? (
              <LoadingSpinner message="Generating structured portfolio specifications..." />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="bg-slate-50/70 border border-slate-200 rounded-2xl p-6 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-base font-extrabold text-slate-900">
                          {proj.title}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-xs shrink-0">
                          {proj.difficulty}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                        <strong>Objective:</strong> {proj.objective}
                      </p>

                      <div className="mb-4">
                        <span className="text-xs font-bold text-slate-700 block mb-1.5">
                          Skills Practiced:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {proj.primary_skills.map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-semibold border border-amber-200"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Milestones */}
                      <div className="mb-4 space-y-1.5">
                        <span className="text-xs font-bold text-slate-700 block mb-1">
                          Key Milestones:
                        </span>
                        {proj.milestones.map((m, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <span>{m}</span>
                          </div>
                        ))}
                      </div>

                      {/* Deliverables */}
                      <div className="mb-4 p-3 bg-white rounded-xl border border-slate-100 text-xs space-y-1 text-slate-600">
                        <span className="font-bold text-slate-800 block">Deliverables:</span>
                        {proj.deliverables.map((d, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <FileText className="w-3 h-3 text-slate-400" />
                            <span>{d}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200/80 text-[11px] text-slate-500">
                      <strong>Market Evidence:</strong> {proj.job_evidence}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Feature 6: Learning ROI & Priority Optimizer Section */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-amber-600" />
                  Learning Priority & ROI Optimizer
                </h2>
                <p className="text-xs text-slate-500">
                  Calculates optimal learning sequence considering target role frequency, versatility across other jobs, and available weekly study hours.
                </p>
              </div>

              {/* Weekly Hours Slider */}
              <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-xs">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-slate-700">Weekly Available Hours:</span>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="5"
                  value={weeklyHours}
                  onChange={(e) => {
                    const h = Number(e.target.value);
                    setWeeklyHours(h);
                    fetchRoi(h);
                  }}
                  className="w-24 accent-amber-600"
                />
                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  {weeklyHours} hrs/wk
                </span>
              </div>
            </div>

            {loadingRoi ? (
              <LoadingSpinner message="Calculating multi-factor learning ROI matrix..." />
            ) : roiList.length === 0 ? (
              <p className="text-xs text-slate-400">
                All identified core skills are already covered in your profile!
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Skill Name</th>
                      <th className="py-3 px-4">Priority Score</th>
                      <th className="py-3 px-4">Factor Breakdown</th>
                      <th className="py-3 px-4">Market Versatility</th>
                      <th className="py-3 px-4">Estimated Effort</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roiList.map((item) => (
                      <tr key={item.skill_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-extrabold text-slate-900">
                          #{item.rank}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{item.skill_name}</span>
                          <span className="text-[10px] text-slate-400">{item.category}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-extrabold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                            {item.priority_score} pts
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-500 space-y-0.5">
                          <div>Demand: <strong>{item.factor_breakdown.role_demand_weight}</strong> / 35</div>
                          <div>Versatility: <strong>{item.factor_breakdown.market_versatility_weight}</strong> / 20</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {item.multi_role_presence}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <strong>{item.estimated_study_hours} hrs</strong> ({item.estimated_duration_weeks})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
