import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Compass,
  AlertCircle,
  HelpCircle,
  Save,
  GraduationCap,
  Layers,
  FileText,
  Upload,
  X,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useStudent } from '../context/StudentContext';
import { searchSkills, searchCareers, saveStudentProfile } from '../services/api';
import type { Skill, CareerSearchItem, StudentSkillItem } from '../types';
import ResumeUploadModal from '../components/ResumeUploadModal';

const POPULAR_SKILLS = [
  'Python',
  'SQL',
  'JavaScript',
  'React',
  'Git',
  'Docker',
  'Machine Learning',
  'Data Analysis',
  'AWS',
  'Problem Solving',
  'Communication',
  'Project Management',
];

export default function SkillsProfile() {
  const navigate = useNavigate();
  const {
    studentSkills,
    addSkill,
    removeSkill,
    updateSkillProficiency,
    targetCareer,
    setTargetCareer,
    experienceLevel,
    setExperienceLevel,
  } = useStudent();

  // Search skills
  const [skillQuery, setSkillQuery] = useState('');
  const [skillSuggestions, setSkillSuggestions] = useState<Skill[]>([]);
  const [isSearchingSkills, setIsSearchingSkills] = useState(false);

  // Target career search
  const [careerQuery, setCareerQuery] = useState('');
  const [careerSuggestions, setCareerSuggestions] = useState<CareerSearchItem[]>([]);
  const [isSearchingCareers, setIsSearchingCareers] = useState(false);

  // Custom skill input
  const [customSkillName, setCustomSkillName] = useState('');

  // Education level
  const [educationLevel, setEducationLevel] = useState('Undergraduate Degree');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);

  // Search skills autocomplete
  useEffect(() => {
    if (!skillQuery.trim()) {
      setSkillSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      setIsSearchingSkills(true);
      try {
        const res = await searchSkills(skillQuery.trim());
        const data = (res.data as any).results || res.data;
        setSkillSuggestions(Array.isArray(data) ? data.slice(0, 8) : []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingSkills(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [skillQuery]);

  // Search careers autocomplete
  useEffect(() => {
    if (!careerQuery.trim()) {
      setCareerSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      setIsSearchingCareers(true);
      try {
        const res = await searchCareers(careerQuery.trim(), 6);
        setCareerSuggestions(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingCareers(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [careerQuery]);

  const handleAddTaxonomySkill = (sk: Skill) => {
    addSkill({
      skill_id: sk.id,
      skill_name: sk.canonical_name,
      proficiency: 'intermediate',
      is_custom: false,
    });
    setSkillQuery('');
    setSkillSuggestions([]);
  };

  const handleAddCustomSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSkillName.trim()) return;
    addSkill({
      skill_name: customSkillName.trim(),
      proficiency: 'intermediate',
      is_custom: true,
    });
    setCustomSkillName('');
  };

  const handleSaveToBackend = async () => {
    setSaveStatus('Saving profile...');
    try {
      await saveStudentProfile({
        name: 'Student Profile',
        target_career_id: targetCareer?.career_id || null,
        target_career_title: targetCareer?.title || null,
        experience_level: experienceLevel,
        education_level: educationLevel,
        skills: studentSkills,
      });
      setSaveStatus('Saved successfully! Ready for gap analysis.');
      setTimeout(() => setSaveStatus(null), 3500);
    } catch (err) {
      console.error(err);
      setSaveStatus('Saved to local storage.');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Step 2 of 5: My Skills</span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-0.5">My Skills & Résumé</h1>
          <p className="text-xs text-slate-500">
            Tell us what you know. Add skills manually or upload your résumé (PDF / Word) in seconds.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsResumeModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Résumé (PDF / Word)</span>
          </button>
          <button
            onClick={() => navigate('/gap-analysis')}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <span>Analyze Skill Gap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {saveStatus && (
        <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-600" />
          {saveStatus}
        </div>
      )}

      {/* Target Career Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Target Dream Career</h2>
              <p className="text-xs text-slate-500">The career benchmark used to evaluate your skill gaps</p>
            </div>
          </div>
          {targetCareer && (
            <button
              onClick={() => setTargetCareer(null)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Change Career
            </button>
          )}
        </div>

        {targetCareer ? (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">{targetCareer.title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800">
                  {targetCareer.demand_status}
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{targetCareer.description}</p>
            </div>
            <button
              onClick={() => navigate(`/careers/${targetCareer.career_id}`)}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              View Intelligence <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={careerQuery}
              onChange={(e) => setCareerQuery(e.target.value)}
              placeholder="Search target career (e.g. Data Scientist, Cloud Engineer)..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
            {careerSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 overflow-hidden divide-y divide-slate-100">
                {careerSuggestions.map((item) => (
                  <button
                    key={item.career_id}
                    onClick={() => {
                      setTargetCareer(item);
                      setCareerQuery('');
                      setCareerSuggestions([]);
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-slate-800">{item.title}</span>
                    <span className="text-[10px] text-teal-600">{item.demand_status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Experience & Background Settings */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900">Background & Experience Level</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Career Stage</label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="student">College / University Student</option>
              <option value="fresher">Recent Graduate / Fresher</option>
              <option value="entry_level">Early Career Professional (1–2 yrs)</option>
              <option value="mid_level">Career Switcher</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Education Level</label>
            <select
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="Undergraduate Degree">Undergraduate (B.Tech, B.S., B.A.)</option>
              <option value="Master's Degree">Postgraduate (M.S., M.Tech, M.B.A.)</option>
              <option value="Doctorate">Doctoral / Ph.D.</option>
              <option value="Self-Taught / Bootcamp">Bootcamp / Self-Taught</option>
            </select>
          </div>
        </div>
      </div>

      {/* Skills Management Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">My Current Skills</h2>
              <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full text-xs font-semibold">
                {studentSkills.length} added
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Add skills you have studied, practiced, or used in coursework/projects
            </p>
          </div>
        </div>

        {/* Add Recognized Skill from Taxonomy */}
        <div className="relative">
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Search & Add Recognized Skills (from O*NET / ESCO Taxonomy)
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={skillQuery}
              onChange={(e) => setSkillQuery(e.target.value)}
              placeholder="Search recognized skills (e.g. Python, SQL, Docker, React, Machine Learning)..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          {skillSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 overflow-hidden divide-y divide-slate-100">
              {skillSuggestions.map((sk) => (
                <button
                  key={sk.id}
                  onClick={() => handleAddTaxonomySkill(sk)}
                  className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                >
                  <span className="font-semibold text-slate-800">{sk.canonical_name}</span>
                  <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded bg-slate-100">
                    {sk.category || 'Technical'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 1-Click Popular Skills */}
        <div className="pt-1">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
            Quick Add Popular Skills:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_SKILLS.map((name) => {
              const isAdded = studentSkills.some(
                (s) => s.skill_name.toLowerCase() === name.toLowerCase()
              );
              return (
                <button
                  key={name}
                  type="button"
                  disabled={isAdded}
                  onClick={() => {
                    if (!isAdded) {
                      addSkill({
                        skill_name: name,
                        proficiency: 'intermediate',
                        is_custom: false,
                      });
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isAdded
                      ? 'bg-teal-50 text-teal-700 border border-teal-200 cursor-default opacity-80'
                      : 'bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 border border-slate-200'
                  }`}
                >
                  {isAdded ? `✓ ${name}` : `+ ${name}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Add Custom Skill Form */}
        <form onSubmit={handleAddCustomSkill} className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={customSkillName}
            onChange={(e) => setCustomSkillName(e.target.value)}
            placeholder="Or type a custom skill name..."
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add Custom
          </button>
        </form>

        {/* Skills List with Proficiency Toggles */}
        <div className="space-y-2 pt-2">
          {studentSkills.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
              No skills added yet. Use the search bar above to start building your profile.
            </div>
          ) : (
            studentSkills.map((sk) => (
              <div
                key={sk.skill_name}
                className="p-3 bg-slate-50 hover:bg-slate-100/60 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-800">{sk.skill_name}</span>
                  {sk.is_custom ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                      Unmapped custom
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Recognized
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Proficiency Selector */}
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-slate-400 mr-1 hidden sm:inline">Proficiency:</span>
                    {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => updateSkillProficiency(sk.skill_name, level)}
                        className={`px-2.5 py-1 rounded-lg capitalize font-medium transition-all ${
                          sk.proficiency === level
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => removeSkill(sk.skill_name)}
                    className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition-colors"
                    title="Remove skill"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Next Step CTA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 bg-gradient-to-r from-teal-50 to-indigo-50 border border-teal-200/80 rounded-3xl shadow-xs">
        <div>
          <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block mb-0.5">Ready for the next step?</span>
          <h3 className="font-bold text-slate-900 text-sm">
            {targetCareer
              ? `Check your match for ${targetCareer.title}`
              : 'Analyze your skills against your dream career'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            You currently have {studentSkills.length} skills in your profile.
          </p>
        </div>
        <button
          onClick={() => navigate('/gap-analysis')}
          className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer whitespace-nowrap"
        >
          <span>Continue to Step 3: Skill Gap</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Disclaimers & Methodology Note */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700">Self-Reported Proficiency Transparency</p>
        <p>
          Self-reported proficiencies are treated as self-assessments rather than independently validated certifications.
          Beginner skills receive fractional weighting during skill gap coverage calculation to encourage practical depth.
        </p>
      </div>

      {/* Résumé Upload / Paste Modal */}
      <ResumeUploadModal
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
      />
    </div>
  );
}
