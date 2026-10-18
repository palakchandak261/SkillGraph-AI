import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Compass,
  Brain,
  Target,
  Milestone,
  Briefcase,
  Sliders,
  FolderGit2,
  Shuffle,
  BarChart2,
  Network,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FileText,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { useStudent } from '../context/StudentContext';
import ResumeUploadModal from './ResumeUploadModal';

const mainNavItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/careers', icon: Compass, label: '1. Explore Careers' },
  { to: '/profile', icon: Brain, label: '2. My Skills & Résumé' },
  { to: '/gap-analysis', icon: Target, label: '3. Skill Gap Analysis' },
  { to: '/roadmap', icon: Milestone, label: '4. Learning Roadmap' },
  { to: '/opportunities', icon: Briefcase, label: '5. Matching Jobs' },
];

const toolNavItems = [
  { to: '/simulator', icon: Sliders, label: 'What-If Simulator' },
  { to: '/projects', icon: FolderGit2, label: 'AI Project Ideas' },
  { to: '/alternatives', icon: Shuffle, label: 'Career Alternatives' },
  { to: '/dashboard', icon: BarChart2, label: 'Market Trends' },
  { to: '/graph', icon: Network, label: 'Career Graph' },
];

const journeySteps = [
  { num: 1, label: 'Career', path: '/careers', checkKey: 'career' },
  { num: 2, label: 'Skills', path: '/profile', checkKey: 'skills' },
  { num: 3, label: 'Gap Analysis', path: '/gap-analysis', checkKey: 'gap' },
  { num: 4, label: 'Roadmap', path: '/roadmap', checkKey: 'roadmap' },
  { num: 5, label: 'Matching Jobs', path: '/opportunities', checkKey: 'jobs' },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const { targetCareer, studentSkills } = useStudent();
  const navigate = useNavigate();
  const location = useLocation();

  const isStepCompleted = (key: string) => {
    if (key === 'career') return Boolean(targetCareer);
    if (key === 'skills') return studentSkills.length > 0;
    if (key === 'gap') return Boolean(targetCareer && studentSkills.length > 0);
    if (key === 'roadmap') return Boolean(targetCareer && studentSkills.length > 0);
    if (key === 'jobs') return studentSkills.length > 0;
    return false;
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 antialiased">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-64'
        } bg-white border-r border-slate-200 flex flex-col transition-all duration-200 shrink-0 z-30`}
      >
        {/* Brand Logo */}
        <div
          onClick={() => navigate('/')}
          className="h-16 flex items-center px-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50/50 transition-colors"
        >
          <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="ml-3">
              <span className="font-extrabold text-base tracking-tight text-slate-900 block leading-tight">
                SkillGraph <span className="text-teal-600">AI</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium block">
                Career Intelligence System
              </span>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav className="flex-1 py-4 px-2 space-y-6 overflow-y-auto">
          {/* Main 5-Step Journey Section */}
          <div className="space-y-1">
            {!collapsed && (
              <span className="px-3 text-[10px] font-bold text-teal-700 uppercase tracking-wider block mb-1">
                Your 5-Step Journey
              </span>
            )}
            {mainNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </NavLink>
            ))}
          </div>

          {/* Smart Tools Section */}
          <div className="space-y-1 pt-4 border-t border-slate-100">
            {!collapsed && (
              <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Explore & Smart Tools
              </span>
            )}
            {toolNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`
                }
              >
                <item.icon className="w-4 h-4 shrink-0 text-slate-400" />
                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="h-12 flex items-center justify-center border-t border-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar with 5-Step Stepper & Quick Actions */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20 gap-4">
          {/* Left: Active Dream Career Indicator */}
          <div className="flex items-center gap-3 shrink-0">
            {targetCareer ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium hidden sm:inline">Target Role:</span>
                <button
                  type="button"
                  onClick={() => navigate(`/careers/${targetCareer.career_id}`)}
                  className="font-bold text-slate-900 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 px-2.5 py-1 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 max-w-[160px] sm:max-w-none truncate"
                  title="Click to view career details"
                >
                  <span className="truncate">{targetCareer.title}</span>
                </button>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 hidden md:inline">
                  {targetCareer.demand_status}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Compass className="w-4 h-4 text-teal-600 shrink-0" />
                <span className="hidden sm:inline">No career picked:</span>
                <button
                  onClick={() => navigate('/careers')}
                  className="text-teal-600 hover:underline font-semibold cursor-pointer"
                >
                  Explore Careers
                </button>
              </div>
            )}
          </div>

          {/* Center: Interactive 5-Step Journey Stepper (Visible on medium+ screens) */}
          <div className="hidden xl:flex items-center gap-1.5 py-1 px-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
            {journeySteps.map((step, idx) => {
              const isActive = location.pathname.startsWith(step.path);
              const completed = isStepCompleted(step.checkKey);

              return (
                <div key={step.num} className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => navigate(step.path)}
                    className={`px-2.5 py-1 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-teal-600 text-white font-bold shadow-xs'
                        : completed
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold border border-emerald-200/60'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 font-medium'
                    }`}
                  >
                    {completed ? (
                      <Check className={`w-3 h-3 ${isActive ? 'text-white' : 'text-emerald-600'}`} />
                    ) : (
                      <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {step.num}
                      </span>
                    )}
                    <span>{step.label}</span>
                  </button>
                  {idx < journeySteps.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Actions: Quick Resume Upload & Skills Count */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsResumeModalOpen(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Upload your PDF or Word résumé to instantly extract skills"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload Résumé</span>
              <span className="sm:hidden">CV</span>
            </button>

            <button
              onClick={() => navigate('/profile')}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="View your added skills"
            >
              <Brain className="w-3.5 h-3.5 text-teal-600" />
              <span>{studentSkills.length} <span className="hidden sm:inline">Skills</span></span>
            </button>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Résumé Upload Modal Accessible from Any Page */}
      <ResumeUploadModal
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
        onSkillsApplied={(count) => {
          setIsResumeModalOpen(false);
          // If the user was on another page, navigate to profile so they see their skills
          if (location.pathname !== '/profile' && location.pathname !== '/gap-analysis') {
            navigate('/profile');
          }
        }}
      />
    </div>
  );
}
