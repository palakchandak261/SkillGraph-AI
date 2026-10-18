import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Search,
  MapPin,
  Building2,
  ExternalLink,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArrowRight,
  Filter,
  DollarSign,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { matchOpportunities } from '../services/api';
import { useStudent } from '../context/StudentContext';
import type { OpportunityMatchItem } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';

export default function OpportunityMatcher() {
  const { studentSkills, targetCareer, addSkill } = useStudent();
  const navigate = useNavigate();

  const [matches, setMatches] = useState<OpportunityMatchItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [minMatch, setMinMatch] = useState<number>(20);

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const skillNames = studentSkills.map((s) => s.skill_name);
      const res = await matchOpportunities({
        candidate_skills: skillNames,
        role_filter: roleFilter || undefined,
        location_filter: locationFilter || undefined,
        min_match_score: minMatch,
        limit: 30,
      });
      setMatches(res.data.matches || []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to match job opportunities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [minMatch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMatches();
  };

  const strongMatchesCount = matches.filter((m) => m.match_score >= 50).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold mb-4 border border-teal-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Step 5 of 5: Matching Jobs</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">
            Opportunity Matcher & Live Jobs
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            Explore verified job postings matched against your {studentSkills.length} declared skills.
            Transparent relevancy scores show exactly which requirements you satisfy and which gaps exist.
          </p>

          {/* Active Skills Pill Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Your Profile Skills:</span>
            {studentSkills.slice(0, 6).map((s) => (
              <span
                key={s.skill_name}
                className="px-2.5 py-0.5 rounded-lg bg-white/10 text-white text-xs font-medium border border-white/15"
              >
                {s.skill_name}
              </span>
            ))}
            {studentSkills.length > 6 && (
              <span className="text-xs text-teal-300 font-medium">
                +{studentSkills.length - 6} more
              </span>
            )}
            <button
              onClick={() => navigate('/profile')}
              className="ml-2 text-xs text-teal-400 hover:text-teal-300 underline font-semibold cursor-pointer"
            >
              Edit Skills
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by job title, keyword (e.g. Data Scientist, Backend)..."
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
            />
          </div>

          <div className="md:col-span-4 relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Location (e.g. Remote, San Francisco, London, India)..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
            />
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Apply Filters</span>
            </button>
          </div>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-teal-600" />
              Minimum Relevancy Threshold:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="80"
                step="5"
                value={minMatch}
                onChange={(e) => setMinMatch(Number(e.target.value))}
                className="w-32 accent-teal-600"
              />
              <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                {minMatch}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 font-medium">
            <span>
              Total Opportunities: <strong className="text-slate-900">{matches.length}</strong>
            </span>
            <span>
              Strong Matches: <strong className="text-emerald-700">{strongMatchesCount}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Listings */}
      {loading ? (
        <LoadingSpinner message="Scanning real job postings and computing competency overlap..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchMatches} />
      ) : matches.length === 0 ? (
        <EmptyState
          title="No Matching Postings Found"
          description="Try reducing your minimum match threshold or clearing the search and location filters to discover broader opportunities."
          action={
            <button
              onClick={() => {
                setRoleFilter('');
                setLocationFilter('');
                setMinMatch(0);
              }}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 transition-colors font-medium"
            >
              Reset Filters
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {matches.map((job) => (
            <div
              key={job.job_id}
              className="bg-white border border-slate-200 hover:border-teal-300 rounded-2xl p-6 transition-all hover:shadow-md flex flex-col justify-between"
            >
              <div>
                {/* Title & Match Score Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 hover:text-teal-700 transition-colors">
                      {job.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {job.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {job.location}
                      </span>
                      {job.salary_range && (
                        <span className="flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <DollarSign className="w-3 h-3" />
                          {job.salary_range}
                        </span>
                      )}
                      {job.posted_date && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Calendar className="w-3 h-3" />
                          {job.posted_date}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Match Score Badge */}
                  <div className="flex flex-col items-end">
                    <div
                      className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-2xs ${
                        job.match_score >= 70
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : job.match_score >= 45
                          ? 'bg-teal-50 text-teal-800 border border-teal-300'
                          : 'bg-amber-50 text-amber-800 border border-amber-300'
                      }`}
                    >
                      <span>{job.match_score}% Match</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium mt-1">
                      {job.match_tier}
                    </span>
                  </div>
                </div>

                {/* Explanation */}
                <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 p-2.5 rounded-xl mb-4 leading-relaxed">
                  <span className="font-semibold text-slate-800">Match Evidence:</span>{' '}
                  {job.relevance_explanation}
                </p>

                {/* Matched vs Missing Skills Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mb-4">
                  <div>
                    <span className="text-emerald-700 font-bold block mb-1.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Matched Skills ({job.matched_count}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {job.matched_skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-medium border border-emerald-200 text-[11px]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-rose-700 font-bold block mb-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Missing Skills ({job.missing_count}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {job.missing_skills.map((skill) => (
                        <button
                          key={skill}
                          onClick={() => addSkill({ skill_name: skill, proficiency: 'beginner' })}
                          title="Click to add to your profile as a skill to learn"
                          className="px-2 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-800 font-medium border border-rose-200 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>{skill}</span>
                          <PlusCircle className="w-3 h-3 text-rose-500" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs gap-3">
                <span className="text-slate-400 text-[11px]">
                  Source: <strong className="text-slate-600">{job.source_name}</strong>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/roadmap')}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>View Roadmap</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </button>

                  {job.external_url && (
                    <a
                      href={job.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <span>Open Verified Posting</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
