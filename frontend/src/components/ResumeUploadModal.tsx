import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileCode,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { parseResumeText, uploadResumeFile } from '../services/api';
import type { ResumeParseResponse } from '../types';
import { useStudent } from '../context/StudentContext';

interface ResumeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSkillsApplied?: (count: number) => void;
}

export default function ResumeUploadModal({
  isOpen,
  onClose,
  onSkillsApplied,
}: ResumeUploadModalProps) {
  const { addSkill } = useStudent();
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ResumeParseResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validExtensions = ['.pdf', '.docx', '.doc', '.txt'];
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!validExtensions.includes(fileExt)) {
        setError('Please upload a PDF (.pdf), Word document (.docx, .doc), or text file (.txt).');
        setSelectedFile(null);
        return;
      }
      setError(null);
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validExtensions = ['.pdf', '.docx', '.doc', '.txt'];
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!validExtensions.includes(fileExt)) {
        setError('Please upload a PDF (.pdf), Word document (.docx, .doc), or text file (.txt).');
        setSelectedFile(null);
        return;
      }
      setError(null);
      setSelectedFile(file);
    }
  };

  const handleProcessResume = async () => {
    setError(null);
    setIsProcessing(true);
    try {
      if (activeTab === 'upload') {
        if (!selectedFile) {
          setError('Please select a PDF or Word document to upload.');
          setIsProcessing(false);
          return;
        }
        const res = await uploadResumeFile(selectedFile);
        setParsedData(res.data);
      } else {
        if (!resumeText.trim() || resumeText.trim().length < 20) {
          setError('Please paste at least a paragraph of résumé text.');
          setIsProcessing(false);
          return;
        }
        const res = await parseResumeText({ resume_text: resumeText });
        setParsedData(res.data);
      }
    } catch (err: any) {
      console.error('Failed to parse resume:', err);
      setError(err?.response?.data?.detail || err.message || 'Failed to extract skills from document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplySkills = () => {
    if (!parsedData || parsedData.extracted_skills.length === 0) return;
    parsedData.extracted_skills.forEach((s) => {
      addSkill({
        skill_id: s.skill_id,
        skill_name: s.skill_name,
        proficiency: s.proficiency as 'beginner' | 'intermediate' | 'advanced',
        is_custom: false,
      });
    });
    if (onSkillsApplied) {
      onSkillsApplied(parsedData.extracted_skills.length);
    }
    handleClose();
  };

  const handleClose = () => {
    setSelectedFile(null);
    setResumeText('');
    setParsedData(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {parsedData ? 'Skills Detected from Résumé' : 'Add Skills via Résumé / CV'}
              </h2>
              <p className="text-xs text-slate-500">
                {parsedData
                  ? `Found ${parsedData.total_skills_found} recognized competencies in your document`
                  : 'Upload your PDF or Word résumé, or paste the text directly.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {!parsedData ? (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('upload');
                  setError(null);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'upload'
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload File (PDF / Word)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('paste');
                  setError(null);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'paste'
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileCode className="w-4 h-4" />
                Paste Résumé Text
              </button>
            </div>

            {/* Tab 1: File Upload */}
            {activeTab === 'upload' && (
              <div className="space-y-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.doc,.txt"
                  className="hidden"
                />

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                    selectedFile
                      ? 'border-teal-500 bg-teal-50/30'
                      : 'border-slate-200 hover:border-teal-400 bg-slate-50/50 hover:bg-teal-50/20'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-teal-600">
                    <Upload className="w-6 h-6" />
                  </div>
                  {selectedFile ? (
                    <div>
                      <span className="font-bold text-sm text-slate-900 block">{selectedFile.name}</span>
                      <span className="text-xs text-slate-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB &bull; Click or drag to change
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="font-bold text-sm text-slate-800 block">
                        Click to select or drag & drop your résumé
                      </span>
                      <span className="text-xs text-slate-400 block mt-1">
                        Supports PDF (.pdf), Word (.docx, .doc), or Text (.txt)
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>
                    <strong>100% Privacy:</strong> Documents are processed strictly in-memory to extract skills and are never stored or uploaded elsewhere.
                  </span>
                </div>
              </div>
            )}

            {/* Tab 2: Paste Text */}
            {activeTab === 'paste' && (
              <div className="space-y-3">
                <textarea
                  rows={6}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your résumé text, work history, or LinkedIn 'About' & experience section here..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white resize-none"
                />
                <div className="flex justify-between items-center text-[11px] text-slate-400 px-1">
                  <span>{resumeText.split(/\s+/).filter(Boolean).length} words</span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> In-memory only
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessResume}
                disabled={isProcessing || (activeTab === 'upload' ? !selectedFile : !resumeText.trim())}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isProcessing ? 'Analyzing Document...' : 'Extract Skills'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Parsed Results View */
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-teal-50/60 border border-teal-100 rounded-2xl">
              <div>
                <span className="text-xs font-bold text-teal-900 block">
                  Found {parsedData.total_skills_found} Recognized Skills
                </span>
                <span className="text-[11px] text-teal-700">
                  Processed in {parsedData.processing_time_ms}ms &bull; {parsedData.word_count} words analyzed
                </span>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-white text-teal-800 border border-teal-200 rounded-full capitalize">
                {parsedData.inferred_experience_level.replace('_', ' ')}
              </span>
            </div>

            {parsedData.extracted_skills.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                No recognized skills detected. Please try uploading a different document or pasting more detail.
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-100 rounded-2xl p-3 bg-slate-50">
                {parsedData.extracted_skills.map((sk) => (
                  <div
                    key={sk.skill_id}
                    className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{sk.skill_name}</span>
                      <span className="text-[10px] text-slate-400 line-clamp-1">{sk.context_snippet}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200 capitalize">
                      {sk.proficiency}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setParsedData(null)}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                &larr; Try Another Document
              </button>

              <button
                type="button"
                disabled={parsedData.extracted_skills.length === 0}
                onClick={handleApplySkills}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Apply {parsedData.total_skills_found} Skills to My Profile</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
