import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  GitFork,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  FileCode,
  Globe,
  Plus,
  ArrowRight,
  Info,
  Check,
} from 'lucide-react';
import { detectTransferableSkills, verifySkillEvidence } from '../services/api';
import { useStudent } from '../context/StudentContext';
import type { TransferableSkill, SkillEvidenceResult } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

export default function TransferableSkills() {
  const { studentSkills, addSkill } = useStudent();

  const [transferableList, setTransferableList] = useState<TransferableSkill[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [acceptedSkills, setAcceptedSkills] = useState<Set<string>>(new Set());

  // Evidence Verification State
  const [selectedSkill, setSelectedSkill] = useState<string>(studentSkills[0]?.skill_name || 'Python');
  const [evidenceType, setEvidenceType] = useState<string>('project_description');
  const [evidenceText, setEvidenceText] = useState<string>('');
  const [evidenceResult, setEvidenceResult] = useState<SkillEvidenceResult | null>(null);
  const [evidenceLogs, setEvidenceLogs] = useState<SkillEvidenceResult[]>([]);
  const [submittingEvidence, setSubmittingEvidence] = useState<boolean>(false);

  useEffect(() => {
    fetchTransferable();
  }, [studentSkills]);

  const fetchTransferable = async () => {
    if (!studentSkills.length) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const names = studentSkills.map((s) => s.skill_name);
      const res = await detectTransferableSkills(names);
      setTransferableList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptTransferable = (item: TransferableSkill) => {
    addSkill({
      skill_name: item.suggested_skill,
      proficiency: 'beginner',
      is_custom: false,
    });
    setAcceptedSkills((prev) => new Set(prev).add(item.suggested_skill));
  };

  const handleVerifyEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceText.trim()) return;

    setSubmittingEvidence(true);
    try {
      const res = await verifySkillEvidence({
        skill_name: selectedSkill,
        evidence_type: evidenceType,
        evidence_text: evidenceText,
      });
      setEvidenceResult(res.data);
      setEvidenceLogs((prev) => [res.data, ...prev]);
      setEvidenceText('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingEvidence(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold mb-4 border border-teal-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Transferable Competencies & Verification</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">
            Transferable Skill Detector & Evidence Verification
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Discover hidden skills you likely understand based on taxonomic relationships and proven workflows.
            Attach verifiable GitHub, project, or portfolio evidence to corroborate claimed competencies.
          </p>
        </div>
      </div>

      {/* Feature 4: Transferable Skill Detector Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <GitFork className="w-5 h-5 text-teal-600" />
            Hidden & Transferable Skill Detection
          </h2>
          <p className="text-xs text-slate-500">
            Based on your declared skills, our knowledge graph identifies adjacent tools and frameworks you can easily adopt.
          </p>
        </div>

        {loading ? (
          <LoadingSpinner message="Scanning taxonomy relationships and adjacent graph clusters..." />
        ) : transferableList.length === 0 ? (
          <p className="text-xs text-slate-400">
            Add more skills to your profile to discover transferable competency bridges.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {transferableList.map((item) => {
              const isAccepted = acceptedSkills.has(item.suggested_skill);
              return (
                <div
                  key={item.suggested_skill}
                  className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 hover:border-teal-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        From: {item.declared_skill}
                      </span>
                      <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                        {Math.round(item.transfer_confidence * 100)}% Confidence
                      </span>
                    </div>

                    <h3 className="text-sm font-extrabold text-slate-900 mb-1">
                      {item.suggested_skill}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-medium block mb-2">
                      Category: {item.category}
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      {item.rationale}
                    </p>
                  </div>

                  {isAccepted ? (
                    <div className="w-full py-2 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-200">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Added to Profile</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAcceptTransferable(item)}
                      className="w-full py-2 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-teal-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Accept & Add to Skills</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feature 5: Evidence-Based Skill Verification Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            Evidence-Based Skill Verification
          </h2>
          <p className="text-xs text-slate-500">
            Corroborate your claimed skills by attaching GitHub repository links, portfolio project summaries, or résumé excerpts.
          </p>
        </div>

        <form onSubmit={handleVerifyEvidence} className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Select Skill to Corroborate:
              </label>
              <select
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {studentSkills.map((s) => (
                  <option key={s.skill_name} value={s.skill_name}>
                    {s.skill_name} ({s.proficiency})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Evidence Type:
              </label>
              <select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="project_description">Project Description / Architecture</option>
                <option value="github_repo">GitHub Repository / Code Link</option>
                <option value="portfolio">Portfolio URL / Case Study</option>
                <option value="resume_excerpt">Résumé Excerpt / Experience</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-8 flex flex-col justify-between space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Evidence Details / Context:
              </label>
              <textarea
                rows={4}
                placeholder="Describe how you applied this skill in production, a project, or paste repository URL and commit details..."
                value={evidenceText}
                onChange={(e) => setEvidenceText(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submittingEvidence || !evidenceText.trim()}
              className="py-2.5 px-6 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-2 self-end cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{submittingEvidence ? 'Evaluating Artifact...' : 'Verify Evidence Record'}</span>
            </button>
          </div>
        </form>

        {/* Verification Result Display */}
        {evidenceResult && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Artifact Evaluated: {evidenceResult.skill_name}
              </span>
              <span className="font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                {evidenceResult.evidence_strength} ({Math.round(evidenceResult.confidence_score * 100)}% Confidence)
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              {evidenceResult.verification_explanation}
            </p>
            <span className="text-[10px] text-slate-400 block pt-1 border-t border-slate-200/60">
              {evidenceResult.disclaimer}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
