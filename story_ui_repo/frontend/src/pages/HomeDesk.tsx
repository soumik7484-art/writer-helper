import React, { useState, useEffect, useRef } from 'react';
import { useStory } from '../context/StoryContext';
import { api } from '../services/api';
import { NavTab } from '../components/common/Navbar';
import { Polaroid } from '../components/common/Polaroid';
import { Stamp } from '../components/common/Stamp';
import { sound } from '../services/audioService';
import { motion } from 'framer-motion';
import { 
  Compass, 
  Feather, 
  GitBranch, 
  Users, 
  AlertTriangle, 
  PenTool, 
  Brain, 
  ArrowRight,
  FileText,
  Upload
} from 'lucide-react';
import { Chapter, Character, TimelineEvent, Memory, PlotHole } from '../types';

interface HomeDeskProps {
  onNavigate: (tab: NavTab, characterId?: string) => void;
}

export const HomeDesk: React.FC<HomeDeskProps> = ({ onNavigate }) => {
  const { activeStory, stories, updateStoryInContext, addToast } = useStory();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [plotholes, setPlotholes] = useState<PlotHole[]>([]);
  const [, setLoading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeStory) return;

    const validExts = ['jpg', 'jpeg', 'png', 'webp'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!validExts.includes(ext)) {
      addToast("Invalid Format", "Please select a JPG, JPEG, PNG, or WEBP image file.", "error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      addToast("File Too Large", "Cover image must be 10MB or less.", "error");
      return;
    }

    try {
      setUploadingCover(true);
      sound.playPaperRustle();
      addToast("Uploading Photograph", "Committing custom image to case file...", "info");

      const res = await api.uploadStoryCover(activeStory.id, file);
      updateStoryInContext(res.story);
      sound.playTypewriterKeystroke();
      addToast("Dossier Photograph Updated", "New cover image pinned to Primary Dossier.", "success");
    } catch (err: any) {
      addToast("Upload Failed", err.message || "Failed to upload cover image.", "error");
    } finally {
      setUploadingCover(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveCover = async () => {
    if (!activeStory) return;
    if (!window.confirm("Remove custom photograph from this story dossier?")) return;

    try {
      setUploadingCover(true);
      const res = await api.removeStoryCover(activeStory.id);
      updateStoryInContext(res.story);
      sound.playPaperRustle();
      addToast("Photograph Removed", "Default evidence archive placeholder restored.", "info");
    } catch (err: any) {
      addToast("Remove Failed", err.message || "Could not remove cover photograph.", "error");
    } finally {
      setUploadingCover(false);
    }
  };

  useEffect(() => {
    if (!activeStory) return;
    const fetchUniverseData = async () => {
      try {
        setLoading(true);
        const [chaps, chars, evts, mems, holes] = await Promise.all([
          api.getStoryChapters(activeStory.id).catch(() => []),
          api.getStoryCharacters(activeStory.id).catch(() => []),
          api.getStoryTimeline(activeStory.id).catch(() => []),
          api.getStoryMemories(activeStory.id).catch(() => []),
          api.getStoryPlotHoles(activeStory.id).catch(() => []),
        ]);
        setChapters(chaps);
        setCharacters(chars);
        setEvents(evts);
        setMemories(mems);
        setPlotholes(holes);
      } catch (e) {
        console.error("Failed to load desk data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchUniverseData();
  }, [activeStory]);

  const completedChapters = chapters.filter(c => c.status === 'completed').length;
  const progressPercent = chapters.length > 0 
    ? Math.round((completedChapters / chapters.length) * 100) 
    : 0;

  const openPlotHoles = plotholes.filter(p => p.status === 'open');

  return (
    <div className="relative min-h-[calc(100vh-80px)] pb-16 pt-6 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Background Desk Aesthetic: Subtle Warm Wood Grain & Ambient Vignette */}
      <div className="pointer-events-none fixed inset-0 bg-desk-radial opacity-25 z-0"></div>

      <div className="relative z-10 space-y-8">
        
        {/* A. Welcome Banner: Investigator's Briefing */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl bg-gradient-to-r from-[#1A1410] via-[#241D17] to-[#1A1410] p-6 sm:p-8 border border-[#3A2E23] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        >
          <div className="space-y-2">
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C49A61] animate-pulse"></span>
              <span className="font-sans text-xs sm:text-[13px] font-semibold text-[#C49A61] tracking-wider uppercase">
                The Writer's Desk • Case Dispatch
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-[40px] font-bold text-[#F4EDE2] tracking-tight leading-tight">
              Welcome back, Storyteller.
            </h1>
            <p className="font-sans text-[15px] sm:text-base text-[#B8A896] max-w-2xl leading-relaxed">
              Your narrative universe is open. Fresh ink, connected evidence leads, and chapter drafts await your direction.
            </p>
          </div>

          {/* Quick Desk Seal */}
          <div className="flex items-center space-x-3.5 bg-[#14100D] px-5 py-3.5 rounded-xl border border-[#382D22] shadow-inner shrink-0">
            <Compass className="w-7 h-7 text-[#C49A61]" />
            <div>
              <p className="font-serif text-xs font-bold text-[#E5BA78] uppercase tracking-wider">Chronicle Status</p>
              <p className="font-sans text-xs sm:text-sm text-[#A08F7E] mt-0.5">
                {activeStory ? `${activeStory.genre} • ${activeStory.mood}` : 'Ready for New Case'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Top Grid: Primary Dossier & Universe Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* B. Continue Writing: The Open Case Dossier */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-7 relative rounded-2xl bg-gradient-to-br from-[#D6C5AA] via-[#C9B79A] to-[#BC9F80] text-[#1E1610] p-6 sm:p-8 border border-[#9A8164] shadow-2xl"
          >
            {/* Top Tape Strip */}
            <div className="absolute -top-3 left-10 w-28 h-6 tape-strip rotate-1"></div>
            
            <div className="flex items-start justify-between gap-4 border-b border-[#6B533A]/30 pb-4 mb-5">
              <div>
                <span className="font-sans text-xs sm:text-[13px] font-bold uppercase tracking-widest text-[#6B5238]">
                  Primary Dossier in Progress
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl lg:text-[32px] font-extrabold text-[#1A130D] mt-1 tracking-tight leading-snug">
                  {activeStory?.title || "No Active Story Case"}
                </h2>
                <div className="flex flex-wrap items-center gap-2.5 mt-2.5">
                  <span className="px-3 py-1 rounded-md text-xs sm:text-[13px] font-sans font-semibold bg-[#261C14] text-[#E0B77D] tracking-wide uppercase">
                    {activeStory?.genre || "Genre"}
                  </span>
                  {activeStory?.subgenre && (
                    <span className="font-sans text-sm text-[#4E3926] font-medium">
                      • {activeStory.subgenre}
                    </span>
                  )}
                  <span className="font-sans text-sm text-[#614D37]">
                    • Updated: {new Date(activeStory?.updated_at || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <Stamp label="CASE ACTIVE" type="red" rotation={-2} size="sm" />
            </div>

            {/* Story Visual & Premise Summary */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 my-4">
              <div className="shrink-0 flex flex-col items-center">
                <div className="relative">
                  <Polaroid
                    imageUrl={activeStory?.cover_url || undefined}
                    caption={activeStory?.setting || "Scene Evidence"}
                    subcaption={activeStory?.time_period || "Case Location"}
                    rotation={-2}
                    pinned={true}
                    size="sm"
                  />
                  {uploadingCover && (
                    <div className="absolute inset-0 bg-black/60 rounded-sm flex flex-col items-center justify-center z-30 text-[#E0B77D] font-sans text-xs">
                      <span className="w-5 h-5 border-2 border-[#C49A61] border-t-transparent rounded-full animate-spin mb-1.5" />
                      <span>Pinning Photo...</span>
                    </div>
                  )}
                </div>

                {/* Elegant Image Upload Controls */}
                <div className="mt-2.5 flex flex-col items-center gap-1 w-full">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleCoverUpload}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingCover || !activeStory}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#241C15] hover:bg-[#34261B] text-[#DDAE72] hover:text-[#FFF4E4] border border-[#524131] font-sans text-xs font-semibold shadow-sm transition-all"
                    title={activeStory?.cover_url ? "Replace existing cover photograph" : "Upload custom cover photograph"}
                  >
                    <Upload className="w-3.5 h-3.5 text-[#C49A61]" />
                    <span>{activeStory?.cover_url ? "Change Photograph" : "Upload Cover Image"}</span>
                  </button>

                  {activeStory?.cover_url && (
                    <button
                      onClick={handleRemoveCover}
                      disabled={uploadingCover}
                      className="text-[11px] text-[#8F332B] hover:text-[#B4473E] font-sans font-medium underline transition-colors"
                      title="Remove custom photograph and restore placeholder"
                    >
                      Remove Photograph
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <p className="font-serif text-base sm:text-lg text-[#2A1F16] leading-relaxed italic border-l-2 border-[#826646] pl-4">
                  "{activeStory?.description || "Select a story dossier to begin examining the narrative threads."}"
                </p>

                {/* Chapter Progress Bar */}
                <div className="bg-[#B5A184] p-4 rounded-xl border border-[#8A7354] shadow-inner space-y-2">
                  <div className="flex items-center justify-between font-sans text-xs sm:text-sm text-[#221810] font-bold">
                    <span>CHAPTER PROGRESSION</span>
                    <span>{completedChapters} of {chapters.length || activeStory?.chapter_count || 6} Chapters ({progressPercent}%)</span>
                  </div>
                  <div className="w-full bg-[#7D6749] h-3 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#1E160F] h-full transition-all duration-700 rounded-full"
                      style={{ width: `${Math.max(10, progressPercent)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-3.5">
                  <button
                    onClick={() => {
                      sound.playPaperRustle();
                      onNavigate('studio');
                    }}
                    className="flex items-center justify-center space-x-2.5 h-11 px-6 rounded-lg bg-[#201711] hover:bg-[#34261B] text-[#F5EFE6] font-sans text-sm sm:text-[15px] font-semibold shadow-lg transition-transform hover:-translate-y-0.5"
                  >
                    <PenTool className="w-4 h-4 text-[#C49A61]" />
                    <span>Continue Writing Studio</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>

                  <button
                    onClick={() => {
                      sound.playPaperRustle();
                      onNavigate('timeline');
                    }}
                    className="flex items-center justify-center space-x-2.5 h-11 px-5 rounded-lg border border-[#6B533A] hover:bg-[#C0AC8C] text-[#221810] font-sans text-sm sm:text-[15px] font-semibold transition-colors"
                  >
                    <GitBranch className="w-4 h-4" />
                    <span>Open Story Timeline</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* C. Universe Metrics Panel */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-5 flex flex-col justify-between rounded-2xl bg-[#181310] p-6 sm:p-7 border border-[#352A20] shadow-2xl space-y-5"
          >
            <div>
              <div className="flex items-center justify-between border-b border-[#2C231B] pb-3 mb-4">
                <div className="flex items-center space-x-2.5">
                  <Brain className="w-5 h-5 text-[#C49A61]" />
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#EADBCA]">
                    Universe Metrics
                  </h3>
                </div>
                <span className="font-sans text-xs sm:text-[13px] text-[#A89785] tracking-wide uppercase">
                  Persistent Codex
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3.5">
                <div 
                  onClick={() => onNavigate('stories')}
                  className="bg-[#201914] hover:bg-[#28201A] p-4 sm:p-5 rounded-xl border border-[#3A2E23] hover:border-[#C49A61]/60 cursor-pointer transition-all group shadow-sm"
                >
                  <p className="font-sans text-xs sm:text-[13px] text-[#A69684] font-medium">Total Stories</p>
                  <p className="font-serif text-3xl sm:text-4xl font-extrabold text-[#F4EDE2] my-1 group-hover:text-[#E0B77D] transition-colors">
                    {stories.length}
                  </p>
                  <span className="font-sans text-xs sm:text-[13px] text-[#7A6A59] block">Active Case Files</span>
                </div>

                <div 
                  onClick={() => onNavigate('studio')}
                  className="bg-[#201914] hover:bg-[#28201A] p-4 sm:p-5 rounded-xl border border-[#3A2E23] hover:border-[#C49A61]/60 cursor-pointer transition-all group shadow-sm"
                >
                  <p className="font-sans text-xs sm:text-[13px] text-[#A69684] font-medium">Chapters Written</p>
                  <p className="font-serif text-3xl sm:text-4xl font-extrabold text-[#F4EDE2] my-1 group-hover:text-[#E0B77D] transition-colors">
                    {chapters.length}
                  </p>
                  <span className="font-sans text-xs sm:text-[13px] text-[#7A6A59] block">
                    {chapters.reduce((acc, c) => acc + (c.word_count || 0), 0)} Total Words
                  </span>
                </div>

                <div 
                  onClick={() => onNavigate('characters')}
                  className="bg-[#201914] hover:bg-[#28201A] p-4 sm:p-5 rounded-xl border border-[#3A2E23] hover:border-[#C49A61]/60 cursor-pointer transition-all group shadow-sm"
                >
                  <p className="font-sans text-xs sm:text-[13px] text-[#A69684] font-medium">Characters</p>
                  <p className="font-serif text-3xl sm:text-4xl font-extrabold text-[#F4EDE2] my-1 group-hover:text-[#E0B77D] transition-colors">
                    {characters.length}
                  </p>
                  <span className="font-sans text-xs sm:text-[13px] text-[#7A6A59] block">Realistic Dossiers</span>
                </div>

                <div 
                  onClick={() => onNavigate('timeline')}
                  className="bg-[#201914] hover:bg-[#28201A] p-4 sm:p-5 rounded-xl border border-[#3A2E23] hover:border-[#C49A61]/60 cursor-pointer transition-all group shadow-sm"
                >
                  <p className="font-sans text-xs sm:text-[13px] text-[#A69684] font-medium">Events Recorded</p>
                  <p className="font-serif text-3xl sm:text-4xl font-extrabold text-[#F4EDE2] my-1 group-hover:text-[#E0B77D] transition-colors">
                    {events.length}
                  </p>
                  <span className="font-sans text-xs sm:text-[13px] text-[#7A6A59] block">Evidence Connected</span>
                </div>
              </div>

              {/* Memory & Vector Storage Card */}
              <div 
                onClick={() => onNavigate('memory')}
                className="mt-4 p-4 sm:p-5 rounded-xl bg-gradient-to-r from-[#221A15] to-[#1A1410] border border-[#443527] hover:border-[#C49A61]/60 cursor-pointer transition-all group shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-sans text-xs font-semibold text-[#C49A61] tracking-wider uppercase">
                      Semantic Vector Storage
                    </span>
                    <h4 className="font-serif text-base sm:text-lg font-bold text-[#EFE7DC] group-hover:text-[#E0B77D] transition-colors mt-0.5">
                      {memories.length} Universe Memories Injected
                    </h4>
                  </div>
                  <span className="text-2xl">🧬</span>
                </div>
                <p className="font-sans text-xs sm:text-[13px] text-[#A69584] leading-relaxed mt-1.5">
                  ChromaDB & MiniLM semantic context engine ensures zero AI hallucinations across chapters.
                </p>
              </div>
            </div>

            {/* Plot Hole Alert Box */}
            <div className="bg-[#261715] p-4 rounded-xl border border-[#5E2520] flex items-center justify-between gap-3.5 shadow-sm">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-[#C44337] shrink-0" />
                <div>
                  <p className="font-sans text-sm sm:text-[15px] font-bold text-[#F0B3AE]">
                    {openPlotHoles.length > 0 
                      ? `${openPlotHoles.length} Consistency Issues Detected` 
                      : "No Continuity Contradictions"}
                  </p>
                  <p className="font-sans text-xs sm:text-[13px] text-[#BA8782] mt-0.5">
                    {openPlotHoles.length > 0 
                      ? "Conflicting evidence flagged by plot hole detector" 
                      : "Universe timeline is historically verified"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('plotholes')}
                className="h-9 px-4 rounded-lg bg-[#8F332B] hover:bg-[#A83D33] text-white font-sans text-xs sm:text-sm font-semibold tracking-wide transition-colors shrink-0 shadow-sm"
              >
                Audit Case
              </button>
            </div>
          </motion.div>
        </div>

        {/* D. Quick Actions: Investigation Desk Tools */}
        <div className="space-y-3.5">
          <div className="flex items-center space-x-2">
            <span className="font-sans text-xs sm:text-[13px] font-bold uppercase tracking-widest text-[#C49A61]">
              Desk Shortcuts & Case Commands
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
            <button
              onClick={() => {
                sound.playPaperRustle();
                onNavigate('architect');
              }}
              className="p-4 sm:p-5 rounded-xl bg-[#1A1410] hover:bg-[#231C16] border border-[#382C21] hover:border-[#C49A61]/60 text-left transition-all group shadow-md"
            >
              <div className="w-10 h-10 rounded-lg bg-[#281F17] border border-[#423324] flex items-center justify-center text-[#C49A61] mb-3 group-hover:scale-105 transition-transform">
                <Feather className="w-5 h-5" />
              </div>
              <h4 className="font-serif text-base sm:text-lg font-bold text-[#EDE4D6] group-hover:text-[#E0B77D] transition-colors">
                Create Story
              </h4>
              <p className="font-sans text-xs sm:text-[13px] text-[#9E8E7D] mt-1 leading-snug">
                Architect new genre universe & outline
              </p>
            </button>

            <button
              onClick={() => {
                sound.playPaperRustle();
                onNavigate('studio');
              }}
              className="p-4 sm:p-5 rounded-xl bg-[#1A1410] hover:bg-[#231C16] border border-[#382C21] hover:border-[#C49A61]/60 text-left transition-all group shadow-md"
            >
              <div className="w-10 h-10 rounded-lg bg-[#281F17] border border-[#423324] flex items-center justify-center text-[#C49A61] mb-3 group-hover:scale-105 transition-transform">
                <PenTool className="w-5 h-5" />
              </div>
              <h4 className="font-serif text-base sm:text-lg font-bold text-[#EDE4D6] group-hover:text-[#E0B77D] transition-colors">
                Continue Writing
              </h4>
              <p className="font-sans text-xs sm:text-[13px] text-[#9E8E7D] mt-1 leading-snug">
                Distraction-free AI writing studio
              </p>
            </button>

            <button
              onClick={() => {
                sound.playPaperRustle();
                onNavigate('timeline');
              }}
              className="p-4 sm:p-5 rounded-xl bg-[#1A1410] hover:bg-[#231C16] border border-[#382C21] hover:border-[#C49A61]/60 text-left transition-all group shadow-md"
            >
              <div className="w-10 h-10 rounded-lg bg-[#281F17] border border-[#423324] flex items-center justify-center text-[#C49A61] mb-3 group-hover:scale-105 transition-transform">
                <GitBranch className="w-5 h-5" />
              </div>
              <h4 className="font-serif text-base sm:text-lg font-bold text-[#EDE4D6] group-hover:text-[#E0B77D] transition-colors">
                Story Timeline
              </h4>
              <p className="font-sans text-xs sm:text-[13px] text-[#9E8E7D] mt-1 leading-snug">
                Inspect connected evidence clipboard
              </p>
            </button>

            <button
              onClick={() => {
                sound.playPaperRustle();
                onNavigate('characters');
              }}
              className="p-4 sm:p-5 rounded-xl bg-[#1A1410] hover:bg-[#231C16] border border-[#382C21] hover:border-[#C49A61]/60 text-left transition-all group shadow-md"
            >
              <div className="w-10 h-10 rounded-lg bg-[#281F17] border border-[#423324] flex items-center justify-center text-[#C49A61] mb-3 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="font-serif text-base sm:text-lg font-bold text-[#EDE4D6] group-hover:text-[#E0B77D] transition-colors">
                Dossiers
              </h4>
              <p className="font-sans text-xs sm:text-[13px] text-[#9E8E7D] mt-1 leading-snug">
                Realistic profiles & relationship graph
              </p>
            </button>

            <button
              onClick={() => {
                sound.playPaperRustle();
                onNavigate('plotholes');
              }}
              className="p-4 sm:p-5 rounded-xl bg-[#1A1410] hover:bg-[#231C16] border border-[#382C21] hover:border-[#C49A61]/60 text-left transition-all group shadow-md col-span-2 sm:col-span-1"
            >
              <div className="w-10 h-10 rounded-lg bg-[#281F17] border border-[#423324] flex items-center justify-center text-[#C44337] mb-3 group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="font-serif text-base sm:text-lg font-bold text-[#EDE4D6] group-hover:text-[#E0B77D] transition-colors">
                Audit Plot Holes
              </h4>
              <p className="font-sans text-xs sm:text-[13px] text-[#9E8E7D] mt-1 leading-snug">
                Consistency engine & timeline verification
              </p>
            </button>
          </div>
        </div>

        {/* E. Recent Activity & Case Log */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          
          {/* Recent Chapters in Active Story */}
          <div className="rounded-2xl bg-[#181310] p-6 border border-[#352B21] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2C231B] pb-3">
              <div className="flex items-center space-x-2.5">
                <FileText className="w-5 h-5 text-[#C49A61]" />
                <h3 className="font-serif text-lg sm:text-xl font-bold text-[#EADBCA]">
                  Recent Chapter Drafts
                </h3>
              </div>
              <span className="font-sans text-xs sm:text-[13px] text-[#9E8E7E]">
                {chapters.length} Records
              </span>
            </div>

            <div className="space-y-3">
              {chapters.slice(0, 3).map((chap) => (
                <div
                  key={chap.id}
                  onClick={() => {
                    sound.playPaperRustle();
                    onNavigate('studio');
                  }}
                  className="p-4 rounded-xl bg-[#201914] hover:bg-[#28201A] border border-[#352A20] hover:border-[#4B3C2E] cursor-pointer transition-all flex items-start justify-between gap-3.5 group shadow-sm"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-sans text-xs font-bold text-[#C49A61]">
                        CH. {chap.chapter_number}
                      </span>
                      <h5 className="font-serif text-sm sm:text-base font-bold text-[#EAE0D3] group-hover:text-[#E0B77D] transition-colors">
                        {chap.title}
                      </h5>
                    </div>
                    <p className="font-sans text-xs sm:text-[13px] text-[#9E8D7B] mt-1.5 line-clamp-1">
                      {chap.summary || chap.content.substring(0, 90) + '...'}
                    </p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-md text-xs font-sans font-semibold uppercase tracking-wider shrink-0 ${
                    chap.status === 'completed'
                      ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/40'
                      : 'bg-amber-950/50 text-amber-300 border border-amber-800/40'
                  }`}>
                    {chap.status}
                  </span>
                </div>
              ))}

              {chapters.length === 0 && (
                <p className="font-sans text-sm text-[#8C7A69] text-center py-6">
                  No chapters penned yet in this case file. Open the writing studio to begin.
                </p>
              )}
            </div>
          </div>

          {/* Character Dossiers Quick Peek */}
          <div className="rounded-2xl bg-[#181310] p-6 border border-[#352B21] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2C231B] pb-3">
              <div className="flex items-center space-x-2.5">
                <Users className="w-5 h-5 text-[#C49A61]" />
                <h3 className="font-serif text-lg sm:text-xl font-bold text-[#EADBCA]">
                  Key Suspects & Allies
                </h3>
              </div>
              <button
                onClick={() => onNavigate('characters')}
                className="font-sans text-xs sm:text-sm text-[#C49A61] hover:text-[#E0B77D] font-medium transition-colors"
              >
                View All Dossiers →
              </button>
            </div>

            <div className="space-y-3">
              {characters.slice(0, 3).map((char) => (
                <div
                  key={char.id}
                  onClick={() => onNavigate('characters', char.id)}
                  className="p-3.5 rounded-xl bg-[#201914] hover:bg-[#28201A] border border-[#352A20] hover:border-[#4B3C2E] cursor-pointer transition-all flex items-center space-x-3.5 group shadow-sm"
                >
                  <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-[#16120F] border border-black/40 shadow-inner">
                    {char.portrait_url ? (
                      <img src={char.portrait_url} alt={char.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm">👤</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h5 className="font-serif text-sm sm:text-base font-bold text-[#EAE0D3] group-hover:text-[#E0B77D] truncate">
                        {char.name}
                      </h5>
                      <span className="font-sans text-xs text-[#A89886] font-medium">
                        {char.role}
                      </span>
                    </div>
                    <p className="font-sans text-xs sm:text-[13px] text-[#9A8A78] truncate mt-0.5">
                      {char.alias ? `"${char.alias}" • ` : ''}{char.personality_traits?.slice(0, 2).join(', ')}
                    </p>
                  </div>
                </div>
              ))}

              {characters.length === 0 && (
                <p className="font-sans text-sm text-[#8C7A69] text-center py-6">
                  No character dossiers created yet. Visit the Character Archive to generate.
                </p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
