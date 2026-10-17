import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Home,
  Compass,
  Brain,
  Target,
  Milestone,
  Shuffle,
  Network,
  Trophy,
  LayoutDashboard,
  Database,
  FlaskConical,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  BarChart2,
  Briefcase,
  Radar,
  Sliders,
  GitFork,
  FolderGit2,
  ShieldCheck,
} from 'lucide-react';
import { useStudent } from '../context/StudentContext';

const studentNavItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/dashboard', icon: BarChart2, label: 'Market Dashboard' },
  { to: '/careers', icon: Compass, label: 'Explore Careers' },
  { to: '/profile', icon: Brain, label: 'My Skills' },
  { to: '/gap-analysis', icon: Target, label: 'Skill Gap & Résumé' },
  { to: '/roadmap', icon: Milestone, label: 'Learning Roadmap' },
  { to: '/opportunities', icon: Briefcase, label: 'Opportunity Matcher' },
  { to: '/simulator', icon: Sliders, label: 'What-If Simulator' },
  { to: '/transferable', icon: GitFork, label: 'Transferable Skills' },
  { to: '/projects', icon: FolderGit2, label: 'AI Project Generator' },
  { to: '/future-radar', icon: Radar, label: 'Future Skill Radar' },
  { to: '/alternatives', icon: Shuffle, label: 'Career Alternatives' },
  { to: '/graph', icon: Network, label: 'Career Graph' },
  { to: '/progress', icon: Trophy, label: 'My Progress' },
];

const systemNavItems = [
  { to: '/system/admin', icon: ShieldCheck, label: 'Data Quality & Admin' },
  { to: '/system/overview', icon: LayoutDashboard, label: 'System Overview' },
  { to: '/system/data', icon: Database, label: 'Data Provenance' },
  { to: '/system/pipeline', icon: Settings, label: 'Pipeline Telemetry' },
  { to: '/system/evaluation', icon: FlaskConical, label: 'Model Benchmarks' },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const { targetCareer, studentSkills } = useStudent();
  const navigate = useNavigate();

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
          className="h-16 flex items-center px-4 border-b border-slate-100 cursor-pointer"
        >
          <div className="p-1.5 rounded-xl bg-teal-600 text-white shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="ml-3">
              <span className="font-extrabold text-base tracking-tight text-slate-900 block leading-tight">
                SkillGraph <span className="text-teal-600">AI</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium block">
                Career Intelligence Platform
              </span>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav className="flex-1 py-4 px-2 space-y-6 overflow-y-auto">
          {/* Primary Student Journey Section */}
          <div className="space-y-1">
            {!collapsed && (
              <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Career Journey
              </span>
            )}
            {studentNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-teal-50 text-teal-800 shadow-2xs font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <item.icon className="w-4 h-4 shrink-0 text-slate-500" />
                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </NavLink>
            ))}
          </div>

          {/* Secondary System & Transparency Section */}
          <div className="space-y-1 pt-4 border-t border-slate-100">
            {!collapsed && (
              <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                System & Data Insights
              </span>
            )}
            {systemNavItems.map((item) => (
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
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            {targetCareer ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">Target Dream Role:</span>
                <span
                  onClick={() => navigate(`/careers/${targetCareer.career_id}`)}
                  className="font-bold text-slate-900 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                >
                  {targetCareer.title}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  {targetCareer.demand_status}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Compass className="w-4 h-4 text-teal-600" />
                <span>No dream career selected yet.</span>
                <button
                  onClick={() => navigate('/careers')}
                  className="text-teal-600 hover:underline font-semibold"
                >
                  Explore Careers
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/profile')}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-2 transition-colors"
            >
              <Brain className="w-3.5 h-3.5 text-teal-600" />
              <span>{studentSkills.length} Skills Added</span>
            </button>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
