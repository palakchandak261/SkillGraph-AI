import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Sparkles,
  ArrowRight,
  Compass,
  CheckCircle2,
  TrendingUp,
  Brain,
  Network,
  Milestone,
  Shuffle,
  ShieldAlert,
  GraduationCap,
  Briefcase,
  FileText,
} from 'lucide-react';
import { searchCareers } from '../services/api';
import type { CareerSearchItem } from '../types';
import { useStudent } from '../context/StudentContext';
import ResumeUploadModal from '../components/ResumeUploadModal';

const EXAMPLE_CAREERS = [
  'Data Scientist',
  'Software Developer',
  'Machine Learning Engineer',
  'Data Analyst',
  'Cybersecurity Analyst',
  'Cloud Engineer',
  'Mechanical Design Engineer',
  'CAD Engineer',
  'Product Designer',
  'Business Analyst',
];

export default function Home() {
  const navigate = useNavigate();
  const { setTargetCareer } = useStudent();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CareerSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await searchCareers(searchQuery.trim(), 8);
        setSuggestions(res.data);
      } catch (err) {
        console.error('Error searching careers:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectCareer = (career: CareerSearchItem) => {
    setTargetCareer(career);
    navigate(`/careers/${career.career_id}`);
  };

  const handleSelectQuickChip = async (careerTitle: string) => {
    setSearchQuery(careerTitle);
    setIsLoading(true);
    try {
      const res = await searchCareers(careerTitle, 5);
      if (res.data.length > 0) {
        handleSelectCareer(res.data[0]);
      } else {
        navigate(`/careers?search=${encodeURIComponent(careerTitle)}`);
      }
    } catch {
      navigate('/careers');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-850 to-slate-900 text-white p-8 sm:p-12 lg:p-16 border border-slate-800 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 -mb-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            Simple AI Career Guide
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Find Your Dream Job & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-teal-200 to-blue-300">
              The Skills to Get Hired
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed max-w-2xl mx-auto">
            See exactly what skills employers want, find out what you are missing, and follow a clear step-by-step plan to reach your career goals.
          </p>

          {/* Autocomplete Career Search Field */}
          <div className="relative max-w-xl mx-auto pt-2 text-left">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search any job title (e.g. Data Scientist, Web Developer, Designer)..."
                className="w-full pl-12 pr-28 py-4 bg-white/10 hover:bg-white/15 focus:bg-white text-slate-100 focus:text-slate-900 placeholder-slate-400 border border-white/20 focus:border-teal-500 rounded-2xl text-sm font-medium shadow-lg backdrop-blur-md transition-all focus:outline-none focus:ring-4 focus:ring-teal-500/20"
              />
              <button
                type="button"
                onClick={() => {
                  if (suggestions.length > 0) handleSelectCareer(suggestions[0]);
                  else navigate(`/careers?q=${encodeURIComponent(searchQuery)}`);
                }}
                className="absolute right-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                Search <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Suggestions Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 overflow-hidden divide-y divide-slate-100">
                {suggestions.map((item) => (
                  <button
                    key={item.career_id}
                    onClick={() => {
                      handleSelectCareer(item);
                      setShowDropdown(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-start justify-between gap-3 cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-800">{item.title}</span>
                        {item.matched_alias && (
                          <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-mono">
                            Matches: {item.matched_alias}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{item.description}</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap bg-teal-50 text-teal-700 border border-teal-100">
                      {item.demand_status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Popular Career Chips */}
          {/* Live Data Trust Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/10 text-center">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="text-xl sm:text-2xl font-black text-teal-300">1,016</div>
              <div className="text-[11px] text-slate-300 font-medium mt-0.5">Verified Occupations</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="text-xl sm:text-2xl font-black text-blue-300">8,828</div>
              <div className="text-[11px] text-slate-300 font-medium mt-0.5">Extracted Skills</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="text-xl sm:text-2xl font-black text-emerald-300">1,000</div>
              <div className="text-[11px] text-slate-300 font-medium mt-0.5">Real Job Postings</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="text-xl sm:text-2xl font-black text-amber-300">100%</div>
              <div className="text-[11px] text-slate-300 font-medium mt-0.5">In-Memory Privacy</div>
            </div>
          </div>
        </div>
      </section>

      {/* Two Clear Starting Paths for Any User */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Path 1: Explore Dream Roles */}
        <div className="bg-white border-2 border-slate-200 hover:border-teal-500 rounded-3xl p-7 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
                <Compass className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200 uppercase tracking-wider">
                Path 1 · Career First
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                I have a dream job in mind
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mt-1">
                Explore any of 1,000+ job roles to see real salary ranges, whether jobs are growing, and the exact skills companies require.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Search 1,016 O*NET and ESCO occupations</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>See real monthly posting counts & forecast intervals</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Discover core vs. emerging technical competencies</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="button"
              onClick={() => navigate('/careers')}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-2xl text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Explore 1,000+ Careers</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Path 2: Skills & Resume First */}
        <div className="bg-white border-2 border-slate-200 hover:border-indigo-500 rounded-3xl p-7 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Brain className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                Path 2 · Skills First
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                I want to see what jobs fit my skills
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mt-1">
                Upload your résumé or add your skills in seconds. We match your profile against real job postings to calculate your match score.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Instant PDF & Word document parser (.pdf, .docx, .txt)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Zero data retention — your résumé is never saved to disk</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Get a prioritized skill gap list and customized learning plan</span>
              </div>
            </div>
          </div>

          <div className="pt-6 space-y-2">
            <button
              type="button"
              onClick={() => setIsResumeModalOpen(true)}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold rounded-2xl text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Upload Résumé (PDF / Word)</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="w-full py-2 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Or Pick Skills Manually</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </section>

      {/* Product Vision: The 6 Questions Answered */}
      <section className="space-y-4">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
            Career Guidance Powered by Evidence, Not Guesswork
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            SkillGraph AI connects real job postings and official taxonomies to answer six vital questions for your career.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              q: '1. Is my dream job currently in demand?',
              desc: 'Inspect verified posting counts and employer distributions from recent market observations.',
              icon: Briefcase,
              color: 'text-teal-600 bg-teal-50',
            },
            {
              q: '2. How is demand changing over time?',
              desc: 'View historical monthly posting volumes and statistically evaluated growth trajectories.',
              icon: TrendingUp,
              color: 'text-blue-600 bg-blue-50',
            },
            {
              q: '3. Which skills do employers actually require?',
              desc: 'Explore real skill frequencies extracted from job descriptions, categorized by technical depth.',
              icon: CheckCircle2,
              color: 'text-emerald-600 bg-emerald-50',
            },
            {
              q: '4. Which skills do I already possess?',
              desc: 'Compare your existing skill profile against target roles to see verified match rates.',
              icon: Brain,
              color: 'text-purple-600 bg-purple-50',
            },
            {
              q: '5. What should I learn first?',
              desc: 'Receive a personalized, prioritized 4-phase learning roadmap with practical portfolio projects.',
              icon: Milestone,
              color: 'text-amber-600 bg-amber-50',
            },
            {
              q: '6. What other careers can I pursue?',
              desc: 'Discover career mobility pathways and alternative occupations that value your current skills.',
              icon: Shuffle,
              color: 'text-indigo-600 bg-indigo-50',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">{item.q}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Primary User Journey Workflow: 7 Steps */}
      <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs space-y-6">
        <div>
          <span className="text-xs font-bold text-teal-600 tracking-wider uppercase">How It Works</span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mt-1">
            Your Simple 5-Step Career Path
          </h2>
          <p className="text-xs text-slate-500">
            A clear, straightforward process from discovering your dream role to landing your next job.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { step: '01', title: '1. Explore Careers', desc: 'Pick your dream job and see what skills employers are asking for.', to: '/careers' },
            { step: '02', title: '2. Add Your Skills', desc: 'Add skills or paste your résumé in 5 seconds to build your profile.', to: '/profile' },
            { step: '03', title: '3. Skill Gap Analysis', desc: 'See your match percentage and find out which key skills you need.', to: '/gap-analysis' },
            { step: '04', title: '4. Learning Roadmap', desc: 'Follow a phased plan with practical project ideas to build your skills.', to: '/roadmap' },
            { step: '05', title: '5. Matching Jobs', desc: 'Explore live jobs matching your abilities and apply directly.', to: '/opportunities' },
          ].map((s) => (
            <div
              key={s.step}
              onClick={() => navigate(s.to)}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-teal-300 hover:bg-teal-50/30 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-teal-600 bg-teal-100/70 px-2 py-0.5 rounded-md">
                    Step {s.step}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm group-hover:text-teal-700 transition-colors">
                  {s.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Helpful Trust & Guidance Notice */}
      <section className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex items-start gap-4 text-xs text-slate-600">
        <Sparkles className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-800">Real Data, Real Results</p>
          <p>
            SkillGraph AI analyzes real-world job postings and official labor market standards (O*NET and ESCO). Every requirement, salary estimate, and skill recommendation is backed by real employer data to help you make informed, confident career decisions.
          </p>
        </div>
      </section>

      {/* Résumé Upload Modal */}
      <ResumeUploadModal
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
        onSkillsApplied={(count) => {
          setIsResumeModalOpen(false);
          navigate('/profile');
        }}
      />
    </div>
  );
}
