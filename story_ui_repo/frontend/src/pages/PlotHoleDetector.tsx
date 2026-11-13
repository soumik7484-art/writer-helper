import React, { useState, useEffect } from 'react';
import { useStory } from '../context/StoryContext';
import { api } from '../services/api';
import { NavTab } from '../components/common/Navbar';
import { PlotHole, PlotHoleSeverity, PlotHoleCategory } from '../types';
import { Stamp } from '../components/common/Stamp';
import { sound } from '../services/audioService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  EyeOff, 
  RotateCcw, 
  ExternalLink, 
  Trash2, 
  Filter, 
  ShieldAlert, 
  BookOpen, 
  Check, 
  X,
  FileCheck
} from 'lucide-react';

interface PlotHoleDetectorProps {
  onNavigate: (tab: NavTab) => void;
}

export const PlotHoleDetector: React.FC<PlotHoleDetectorProps> = ({ onNavigate }) => {
  const { activeStory, setActiveChapterId, addToast } = useStory();

  const [issues, setIssues] = useState<PlotHole[]>([]);
  const [loading, setLoading] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  const fetchIssues = async () => {
    if (!activeStory) return;
    try {
      setLoading(true);
      const data = await api.getStoryPlotHoles(activeStory.id);
      setIssues(data);
    } catch (e: any) {
      addToast("Failed to load consistency reports", e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [activeStory]);

  // Run AI Consistency Audit
  const handleRunAudit = async () => {
    if (!activeStory) return;
    try {
      setAuditing(true);
      sound.playTypewriterKeystroke();
      const res = await api.runConsistencyAudit(activeStory.id);
      addToast("Audit Complete", `Story continuity verified. Detected ${res.total_detected} potential flags.`, "success");
      sound.playPaperRustle();
      await fetchIssues();
    } catch (e: any) {
      addToast("Audit Error", e.message || "Failed to complete story audit.", "error");
    } finally {
      setAuditing(false);
    }
  };

  const handleUpdateStatus = async (issue: PlotHole, newStatus: 'open' | 'resolved' | 'ignored') => {
    try {
      await api.updatePlotHole(issue.id, { status: newStatus });
      addToast(
        newStatus === 'resolved' ? "Contradiction Resolved" : newStatus === 'ignored' ? "Flag Dismissed" : "Case Reopened",
        `Investigation file '${issue.title}' marked as ${newStatus}.`,
        "info"
      );
      await fetchIssues();
    } catch (e: any) {
      addToast("Update Failed", e.message, "error");
    }
  };

  const handleDeleteIssue = async (issueId: string) => {
    try {
      await api.deletePlotHole(issueId);
      addToast("Report Cleared", "Consistency report incinerated.", "info");
      await fetchIssues();
    } catch (e: any) {
      addToast("Error", "Could not delete issue report.", "error");
    }
  };

  const handleJumpToChapter = (chapterLabel?: string) => {
    sound.playPaperRustle();
    onNavigate('studio');
  };

  // Severity metrics
  const criticalCount = issues.filter(i => i.severity === 'Critical' && i.status === 'open').length;
  const warningCount = issues.filter(i => i.severity === 'Warning' && i.status === 'open').length;
  const suggestionCount = issues.filter(i => i.severity === 'Suggestion' && i.status === 'open').length;
  const resolvedCount = issues.filter(i => i.status === 'resolved').length;

  const filteredIssues = issues.filter(i => {
    if (selectedSeverity === 'all') return true;
    if (selectedSeverity === 'resolved') return i.status === 'resolved';
    if (selectedSeverity === 'ignored') return i.status === 'ignored';
    return i.severity === selectedSeverity && i.status === 'open';
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-8 space-y-6">
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2C231B] pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B4473E] animate-pulse"></span>
            <span className="font-typewriter text-xs text-[#C49A61] font-bold tracking-[0.25em] uppercase">
              NARRATIVE CONTINUITY AUDIT & PLOT HOLE RADAR
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-black text-[#F2E8DC] mt-1">
            Plot Hole Detector
          </h1>
          <p className="font-typewriter text-xs sm:text-sm text-[#A69482] mt-1">
            Investigation reports flagging character contradictions, timeline fractures, and relic errors.
          </p>
        </div>

        {/* Audit Button */}
        <button
          onClick={handleRunAudit}
          disabled={auditing}
          className="flex items-center space-x-2 px-5 py-2.5 rounded bg-[#B4473E] hover:bg-[#C85248] text-white font-typewriter text-xs uppercase font-bold tracking-wider shadow-lg transition-all disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{auditing ? "Scanning Chronology..." : "Run AI Continuity Audit"}</span>
        </button>
      </div>

      {/* Summary Scoreboard Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div 
          onClick={() => setSelectedSeverity('Critical')}
          className="bg-[#2B1715] p-4 rounded-lg border border-[#7A2C24] cursor-pointer hover:border-[#B4473E] transition-all group shadow"
        >
          <div className="flex items-center justify-between">
            <span className="font-typewriter text-xs sm:text-[13px] text-[#D8948E] uppercase tracking-wider font-bold">Critical Errors</span>
            <span className="text-sm">🚨</span>
          </div>
          <p className="font-serif text-3xl font-black text-[#F7CAC6] mt-1 group-hover:scale-105 transition-transform">
            {criticalCount}
          </p>
          <span className="font-typewriter text-xs text-[#A66E69] mt-0.5 block">Fatal Continuity Breaks</span>
        </div>

        <div 
          onClick={() => setSelectedSeverity('Warning')}
          className="bg-[#291F14] p-4 rounded-lg border border-[#7A5B22] cursor-pointer hover:border-[#C49A61] transition-all group shadow"
        >
          <div className="flex items-center justify-between">
            <span className="font-typewriter text-xs sm:text-[13px] text-[#E0C082] uppercase tracking-wider font-bold">Warnings</span>
            <span className="text-sm">⚠️</span>
          </div>
          <p className="font-serif text-3xl font-black text-[#F7E7C4] mt-1 group-hover:scale-105 transition-transform">
            {warningCount}
          </p>
          <span className="font-typewriter text-xs text-[#A6894E] mt-0.5 block">Timeline Discrepancies</span>
        </div>

        <div 
          onClick={() => setSelectedSeverity('Suggestion')}
          className="bg-[#182322] p-4 rounded-lg border border-[#2E5E5A] cursor-pointer hover:border-[#4EA8A1] transition-all group shadow"
        >
          <div className="flex items-center justify-between">
            <span className="font-typewriter text-xs sm:text-[13px] text-[#93D1CC] uppercase tracking-wider font-bold">Suggestions</span>
            <span className="text-sm">💡</span>
          </div>
          <p className="font-serif text-3xl font-black text-[#CAF0ED] mt-1 group-hover:scale-105 transition-transform">
            {suggestionCount}
          </p>
          <span className="font-typewriter text-xs text-[#5E9E99] mt-0.5 block">Pacing & Nuance Polishes</span>
        </div>

        <div 
          onClick={() => setSelectedSeverity('resolved')}
          className="bg-[#172418] p-4 rounded-lg border border-[#2F5E32] cursor-pointer hover:border-[#78966A] transition-all group shadow"
        >
          <div className="flex items-center justify-between">
            <span className="font-typewriter text-xs sm:text-[13px] text-[#A0D4A5] uppercase tracking-wider font-bold">Resolved Cases</span>
            <span className="text-sm">✅</span>
          </div>
          <p className="font-serif text-3xl font-black text-[#D4F5D7] mt-1 group-hover:scale-105 transition-transform">
            {resolvedCount}
          </p>
          <span className="font-typewriter text-xs text-[#69A670] mt-0.5 block">Canon Clarified</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none font-typewriter text-xs">
        <Filter className="w-3.5 h-3.5 text-[#8C7A68] shrink-0 mr-1" />
        {['all', 'Critical', 'Warning', 'Suggestion', 'resolved', 'ignored'].map(sev => (
          <button
            key={sev}
            onClick={() => setSelectedSeverity(sev)}
            className={`px-3 py-1 rounded uppercase tracking-wider transition-colors shrink-0 ${
              selectedSeverity === sev
                ? 'bg-[#C49A61] text-[#14100D] font-bold shadow'
                : 'bg-[#1C1713] text-[#8C7A68] hover:text-[#C5B7A5] border border-[#2E241C]'
            }`}
          >
            {sev === 'all' ? 'All Incident Reports' : sev}
          </button>
        ))}
      </div>

      {/* Investigation Reports Stack */}
      <div className="space-y-6">
        {filteredIssues.map((issue) => {
          const isResolved = issue.status === 'resolved';
          const isIgnored = issue.status === 'ignored';

          return (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative rounded-lg parchment-sheet p-6 sm:p-8 border-2 transition-all shadow-xl ${
                isResolved
                  ? 'opacity-70 border-[#78966A] bg-[#CBC0AA]'
                  : isIgnored
                  ? 'opacity-60 border-[#8A7969]'
                  : issue.severity === 'Critical'
                  ? 'border-[#B4473E] shadow-[0_10px_30px_rgba(180,71,62,0.15)]'
                  : issue.severity === 'Warning'
                  ? 'border-[#C49A61]'
                  : 'border-[#8F7658]'
              }`}
            >
              {/* Header: Stamp and Category */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#6E5943]/30 pb-4 mb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-typewriter text-xs sm:text-[13px] font-bold uppercase tracking-widest text-[#78332B]">
                      {issue.category.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[#8C7456]">•</span>
                    <span className="font-typewriter text-xs sm:text-[13px] text-[#695543]">
                      Source: {issue.source_chapters?.join(', ') || 'Universe Canon'}
                    </span>
                  </div>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1C150F] mt-0.5">
                    {issue.title}
                  </h3>
                </div>

                <div className="flex items-center space-x-2">
                  <Stamp
                    label={
                      isResolved
                        ? "RESOLVED CANON"
                        : isIgnored
                        ? "DISMISSED FLAG"
                        : `${issue.severity} ISSUE`
                    }
                    type={isResolved ? "green" : issue.severity === 'Critical' ? "red" : "amber"}
                    rotation={-1}
                    size="sm"
                  />
                </div>
              </div>

              {/* Description */}
              <p className="font-serif text-sm text-[#2A2016] leading-relaxed mb-5">
                {issue.description}
              </p>

              {/* Side-by-Side Conflicting Information Dossier Table */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                
                {/* Previous Conflicting Info */}
                <div className="bg-[#D9CBB0] p-4 rounded border border-[#8F785C] shadow-inner space-y-1">
                  <span className="font-typewriter text-xs sm:text-[13px] font-bold text-[#6B533E] uppercase tracking-wider block">
                    PRIOR ESTABLISHED CANON / EARLIER CHAPTER
                  </span>
                  <p className="font-serif text-xs text-[#2A2016] leading-relaxed italic">
                    "{issue.previous_conflicting_info || 'Earlier scene established condition.'}"
                  </p>
                </div>

                {/* Current Conflicting Info */}
                <div className="bg-[#D6C2BB] p-4 rounded border border-[#9A6258] shadow-inner space-y-1">
                  <span className="font-typewriter text-xs sm:text-[13px] font-bold text-[#7A362E] uppercase tracking-wider block">
                    CONTRADICTING INCIDENT IN LATER CHAPTER
                  </span>
                  <p className="font-serif text-xs text-[#2A2016] leading-relaxed italic">
                    "{issue.current_conflicting_info || 'Subsequent scene violates earlier established rule.'}"
                  </p>
                </div>
              </div>

              {/* AI Suggested Narrative Correction */}
              {issue.suggested_correction && (
                <div className="bg-[#E4D9C3] p-4 rounded border-l-4 border-[#C49A61] mb-5 space-y-1">
                  <span className="font-typewriter text-xs sm:text-[13px] font-bold text-[#8C662E] uppercase tracking-wider flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#C49A61]" />
                    <span>AI SUGGESTED NARRATIVE CORRECTION</span>
                  </span>
                  <p className="font-serif text-xs text-[#2A2016] leading-relaxed">
                    {issue.suggested_correction}
                  </p>
                </div>
              )}

              {/* Actions Footer */}
              <div className="pt-3 border-t border-[#6E5943]/30 flex flex-wrap items-center justify-between gap-3 font-typewriter text-xs">
                <button
                  onClick={() => handleDeleteIssue(issue.id)}
                  className="text-[#8F332B] hover:text-[#B4473E] flex items-center space-x-1 p-1"
                  title="Remove Report"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Report</span>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Jump to Chapter */}
                  <button
                    onClick={() => handleJumpToChapter(issue.source_chapters?.[0])}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded border border-[#6B553E] text-[#2B2117] hover:bg-[#BCA98E] transition-colors"
                  >
                    <span>Jump to Chapter</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  {/* Resolve / Reopen */}
                  {!isResolved ? (
                    <button
                      onClick={() => handleUpdateStatus(issue, 'resolved')}
                      className="flex items-center space-x-1 px-3.5 py-1.5 rounded bg-[#4D7C44] hover:bg-[#5E9453] text-white font-bold uppercase tracking-wider shadow"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept Correction & Resolve</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus(issue, 'open')}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded bg-[#2B2016] text-[#E0B77D] hover:bg-[#3D2D20]"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reopen Flag</span>
                    </button>
                  )}

                  {!isIgnored && !isResolved && (
                    <button
                      onClick={() => handleUpdateStatus(issue, 'ignored')}
                      className="px-2.5 py-1.5 rounded text-[#6E5A44] hover:text-black"
                    >
                      Ignore Flag
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredIssues.length === 0 && !loading && (
        <div className="p-12 text-center bg-[#191512] rounded-lg border border-[#332A22] space-y-3">
          <FileCheck className="w-12 h-12 text-[#78966A] mx-auto opacity-80" />
          <h3 className="font-serif text-xl font-bold text-[#E5DCce]">
            All Continuity Scans Clear
          </h3>
          <p className="font-typewriter text-xs text-[#8C7A68] max-w-md mx-auto">
            No contradictory flags recorded under '{selectedSeverity}'. Your narrative universe adheres cleanly to established canon.
          </p>
          <button
            onClick={handleRunAudit}
            className="px-4 py-2 rounded bg-[#C49A61] hover:bg-[#D6AB72] text-[#14100D] font-typewriter text-xs font-bold uppercase tracking-wider"
          >
            Re-run Continuity Audit
          </button>
        </div>
      )}

    </div>
  );
};
