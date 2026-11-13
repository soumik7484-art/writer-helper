import React, { useState, useEffect, useRef } from 'react';
import { useStory } from '../context/StoryContext';
import { api } from '../services/api';
import { Chapter, Memory, Character, PlotHole } from '../types';
import { Stamp } from '../components/common/Stamp';
import { sound } from '../services/audioService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PenTool, 
  Sparkles, 
  Save, 
  Check, 
  Plus, 
  Search, 
  Trash2, 
  Brain, 
  Users, 
  AlertTriangle, 
  RefreshCw, 
  MessageSquare, 
  Wand2, 
  Maximize2, 
  Minimize2,
  FileText,
  Clock,
  ArrowRight
} from 'lucide-react';

export const WritingStudio: React.FC = () => {
  const { activeStory, activeChapterId, setActiveChapterId, addToast } = useStory();

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);

  // Editor State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<'draft' | 'in_review' | 'completed'>('draft');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>('Saved');
  const [searchQuery, setSearchQuery] = useState('');
  const [zenMode, setZenMode] = useState(false);

  // Right Sidebar Tab
  const [assistantTab, setAssistantTab] = useState<'cowriter' | 'memories' | 'characters' | 'alerts'>('cowriter');

  // AI Co-writer State
  const [aiAction, setAiAction] = useState<string>('continue');
  const [customInstruction, setCustomInstruction] = useState('');
  const [selectedCharacterNote, setSelectedCharacterNote] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiOutput, setAiOutput] = useState<string>('');
  const [injectedMemories, setInjectedMemories] = useState<Memory[]>([]);

  // Relevant Memories
  const [relevantMemories, setRelevantMemories] = useState<Memory[]>([]);
  const [searchingMemories, setSearchingMemories] = useState(false);

  // Consistency alerts for this chapter
  const [chapterAlerts, setChapterAlerts] = useState<PlotHole[]>([]);

  const autosaveTimerRef = useRef<any>(null);

  // Fetch chapters and characters
  const fetchStudioData = async () => {
    if (!activeStory) return;
    try {
      setLoading(true);
      const [chaps, chars, plotholes] = await Promise.all([
        api.getStoryChapters(activeStory.id),
        api.getStoryCharacters(activeStory.id),
        api.getStoryPlotHoles(activeStory.id)
      ]);
      setChapters(chaps);
      setCharacters(chars);

      let target = chaps[0];
      if (activeChapterId) {
        const found = chaps.find(c => c.id === activeChapterId);
        if (found) target = found;
      }

      if (target) {
        selectChapter(target);
        // Filter plot holes for this chapter
        const alerts = plotholes.filter(p => 
          p.source_chapters?.some(sc => sc.toLowerCase().includes(`chapter ${target.chapter_number}`))
        );
        setChapterAlerts(alerts);
      }
    } catch (e: any) {
      addToast("Failed to load studio", e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudioData();
  }, [activeStory]);

  const selectChapter = (chap: Chapter) => {
    sound.playPaperRustle();
    setSelectedChapter(chap);
    setActiveChapterId(chap.id);
    setTitle(chap.title);
    setContent(chap.content);
    setSummary(chap.summary || '');
    setStatus(chap.status);
    setLastSaved('Saved');
    queryContextMemories(chap.content);
  };

  // Semantic Memory Retrieval query from current content
  const queryContextMemories = async (text: string) => {
    if (!activeStory || !text) return;
    try {
      setSearchingMemories(true);
      const query = text.slice(-400); // Last paragraphs
      const res = await api.searchMemories(activeStory.id, query, 4);
      setRelevantMemories(res.results);
    } catch {
      // Quiet fail for background semantic fetch
    } finally {
      setSearchingMemories(false);
    }
  };

  // Debounced Autosave
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setLastSaved('Unsaved Changes...');

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      handleSave(newContent, title, summary, status, false);
      queryContextMemories(newContent);
    }, 2500);
  };

  const handleSave = async (
    textToSave: string = content,
    titleToSave: string = title,
    summaryToSave: string = summary,
    statusToSave: any = status,
    showToast: boolean = true
  ) => {
    if (!selectedChapter) return;
    try {
      setIsSaving(true);
      const updated = await api.updateChapter(selectedChapter.id, {
        title: titleToSave,
        content: textToSave,
        summary: summaryToSave,
        status: statusToSave,
      });

      setSelectedChapter(updated);
      setChapters(prev => prev.map(c => c.id === updated.id ? updated : c));
      setLastSaved(`Saved at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      if (showToast) {
        sound.playTypewriterKeystroke();
        addToast("Chapter Saved", `"${titleToSave}" committed to universe archive.`, "success");
      }
    } catch (e: any) {
      setLastSaved('Save Error');
      if (showToast) addToast("Save Failed", e.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateChapter = async () => {
    if (!activeStory) return;
    try {
      const nextNum = chapters.length + 1;
      const created = await api.createChapter(activeStory.id, {
        chapter_number: nextNum,
        title: `Chapter ${nextNum} - The Unfolding Incident`,
        content: '',
        status: 'draft',
      });
      setChapters(prev => [...prev, created]);
      selectChapter(created);
      addToast("Chapter Drafted", `Chapter ${nextNum} added to table of contents.`, "success");
    } catch (e: any) {
      addToast("Error", "Could not create new chapter.", "error");
    }
  };

  const handleDeleteChapter = async (chapId: string, chapNum: number) => {
    if (!window.confirm(`Delete Chapter ${chapNum}? This text cannot be restored.`)) return;
    try {
      await api.deleteChapter(chapId);
      addToast("Chapter Removed", `Chapter ${chapNum} deleted.`, "info");
      await fetchStudioData();
    } catch (e: any) {
      addToast("Error", "Could not delete chapter.", "error");
    }
  };

  // AI Co-writer Trigger
  const handleRunCoWriter = async () => {
    if (!activeStory || !selectedChapter) return;
    try {
      setIsGenerating(true);
      sound.playTypewriterKeystroke();
      const res = await api.askCoWriter({
        story_id: activeStory.id,
        action: aiAction as any,
        content: content,
        chapter_title: title,
        character_notes: selectedCharacterNote,
        instruction: customInstruction,
      });

      setAiOutput(res.generated_text);
      setInjectedMemories(res.injected_memories || []);
      sound.playPaperRustle();
      addToast("AI Co-Writer Delivered", `Prose generated with ${res.injected_memories_count || 0} injected memories.`, "success");
    } catch (e: any) {
      addToast("Co-writer Error", e.message || "Failed to generate prose.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAppendAiText = () => {
    if (!aiOutput) return;
    const newContent = content ? `${content}\n\n${aiOutput}` : aiOutput;
    handleContentChange(newContent);
    handleSave(newContent, title, summary, status, true);
    setAiOutput('');
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const filteredChapters = chapters.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `chapter ${c.chapter_number}`.includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-[1600px] mx-auto px-2 sm:px-4 py-4 space-y-4">
      
      {/* Studio Header Bar */}
      <div className="flex items-center justify-between bg-[#191512] px-4 sm:px-5 py-3.5 rounded-xl border border-[#30261E] shadow-xl">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-[#292017] border border-[#C49A61]/50 flex items-center justify-center text-[#C49A61] shrink-0 shadow-inner">
            <PenTool className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg sm:text-xl md:text-2xl font-bold text-[#F5EDE3] flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <span>{activeStory?.title || "Case Archive"}</span>
              <span className="font-serif text-sm sm:text-base text-[#DDAE72] font-semibold">
                • Chapter {selectedChapter?.chapter_number || 1}
              </span>
            </h2>
            <p className="font-sans text-xs sm:text-sm text-[#A69584] mt-0.5">
              {wordCount} words • {lastSaved}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2.5 sm:space-x-3.5">
          <select
            value={status}
            onChange={(e) => {
              const newStatus = e.target.value as any;
              setStatus(newStatus);
              handleSave(content, title, summary, newStatus, true);
            }}
            className="bg-[#241D17] border border-[#3E3226] text-[#E0B77D] font-sans text-xs sm:text-sm font-semibold rounded-lg px-3 py-2 h-10 focus:outline-none focus:border-[#C49A61]/60 shadow-sm"
          >
            <option value="draft">Status: Draft</option>
            <option value="in_review">Status: In Review</option>
            <option value="completed">Status: Completed</option>
          </select>

          <button
            onClick={() => handleSave(content, title, summary, status, true)}
            disabled={isSaving}
            className="flex items-center space-x-2 px-4 py-2 h-10 rounded-lg bg-[#C49A61] hover:bg-[#D6AB72] text-[#14100D] font-sans text-xs sm:text-sm font-bold uppercase tracking-wider shadow-md transition-all shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Saving..." : "Save Draft"}</span>
          </button>

          <button
            onClick={() => setZenMode(!zenMode)}
            title={zenMode ? "Exit Focus Mode" : "Enter Distraction-Free Zen Mode"}
            className="w-10 h-10 rounded-lg bg-[#241D17] border border-[#3E3226] text-[#9A8978] hover:text-white flex items-center justify-center shrink-0 transition-colors"
          >
            {zenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3-Column Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* LEFT COLUMN: Chapter Navigation (Hidden in Zen Mode) */}
        {!zenMode && (
          <div className="lg:col-span-3 space-y-3.5 bg-[#191512] p-4 rounded-xl border border-[#30261E] shadow-xl">
            <div className="flex items-center justify-between border-b border-[#2C241D] pb-3">
              <span className="font-mono text-xs sm:text-sm font-bold text-[#DDAE72] uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#DDAE72]" />
                <span>TABLE OF CHAPTERS</span>
              </span>
              <button
                onClick={handleCreateChapter}
                className="w-8 h-8 rounded-lg bg-[#2D2319] hover:bg-[#3D2F22] text-[#E0B77D] text-sm font-bold flex items-center justify-center border border-[#3E3125] transition-colors shadow-sm"
                title="Add Chapter"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#7A6958] absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chapters..."
                className="w-full bg-[#130F0D] border border-[#2E241C] text-[#EDE3D6] text-sm rounded-lg pl-9 pr-3 py-2 font-sans focus:outline-none focus:border-[#C49A61]/60 placeholder:text-[#6E5D4E]"
              />
            </div>

            {/* Chapter Items List */}
            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {filteredChapters.map((chap) => {
                const isSelected = selectedChapter?.id === chap.id;

                return (
                  <div
                    key={chap.id}
                    onClick={() => selectChapter(chap)}
                    className={`p-3 sm:p-3.5 rounded-lg cursor-pointer transition-all flex items-center justify-between group ${
                      isSelected
                        ? 'bg-[#291F17] border-2 border-[#C49A61] shadow-lg'
                        : 'bg-[#1F1915] hover:bg-[#251E18] border border-[#2D241C]'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs sm:text-sm font-bold text-[#DDAE72] shrink-0">
                          CH. {chap.chapter_number}
                        </span>
                        <h4 className="font-serif text-sm sm:text-[15.5px] font-bold text-[#F5EDE3] truncate">
                          {chap.title}
                        </h4>
                      </div>
                      <p className="font-sans text-xs sm:text-[13px] text-[#A69584] mt-1 flex items-center gap-2">
                        <span>{chap.word_count || 0} words</span>
                        <span>•</span>
                        <span className="capitalize">{chap.status?.replace('_', ' ')}</span>
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChapter(chap.id, chap.chapter_number);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-[#8F332B] hover:text-[#B4473E] p-1.5 rounded transition-opacity"
                      title="Delete Chapter"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}

              {filteredChapters.length === 0 && (
                <p className="font-sans text-xs sm:text-sm text-[#7A6958] text-center py-4">
                  No chapters found.
                </p>
              )}
            </div>
          </div>
        )}

        {/* CENTER COLUMN: Distraction-Free Parchment Editor */}
        <div className={`${zenMode ? 'lg:col-span-8 lg:col-start-3' : 'lg:col-span-6'} space-y-4`}>
          <div className="relative rounded-xl parchment-sheet p-6 sm:p-10 border-2 border-[#8C7456] shadow-clipboard min-h-[750px] flex flex-col justify-between">
            
            {/* Top Tape & Chapter Badge */}
            <div className="flex items-center justify-between border-b border-[#524131]/30 pb-4 mb-4">
              <span className="font-mono text-xs sm:text-sm font-bold uppercase tracking-widest text-[#68523D]">
                SCENE RECORD • CHAPTER {selectedChapter?.chapter_number || 1}
              </span>

              <Stamp
                label={status === 'completed' ? "FINAL REVISION" : status === 'in_review' ? "IN REVIEW" : "ACTIVE DRAFT"}
                type={status === 'completed' ? "green" : "amber"}
                rotation={-1}
                size="sm"
              />
            </div>

            {/* Editable Chapter Title Input */}
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setLastSaved('Unsaved Changes...');
              }}
              placeholder="Chapter Title..."
              className="w-full bg-transparent font-serif text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#201710] border-b border-[#735F4A]/30 pb-2 focus:outline-none focus:border-[#735F4A] mb-4"
            />

            {/* Main Narrative Prose Textarea */}
            <textarea
              rows={22}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Begin penning the narrative... Describe the environment, characters, tensions, and unfolding secrets..."
              className="w-full flex-1 bg-transparent font-serif text-base sm:text-lg md:text-[19px] text-[#221811] leading-relaxed resize-none focus:outline-none placeholder:text-[#8C765C] placeholder:italic"
            ></textarea>

            {/* Bottom Editor Bar */}
            <div className="pt-4 border-t border-[#524131]/30 flex items-center justify-between font-mono text-xs sm:text-sm text-[#544131]">
              <span>Word Count: <strong className="font-bold">{wordCount}</strong></span>
              <span>{lastSaved}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AI Co-Writer & Contextual Codex (Hidden in Zen Mode) */}
        {!zenMode && (
          <div className="lg:col-span-3 space-y-4">
            
            {/* Assistant Header Tabs */}
            <div className="bg-[#191512] p-1.5 rounded-lg border border-[#30261E] flex items-center justify-between text-xs sm:text-sm font-sans font-semibold">
              <button
                onClick={() => setAssistantTab('cowriter')}
                className={`flex-1 py-2 text-center rounded-md transition-colors ${
                  assistantTab === 'cowriter'
                    ? 'bg-[#C49A61] text-[#14100D] font-bold shadow'
                    : 'text-[#8C7A68] hover:text-[#C5B7A5]'
                }`}
              >
                Co-Writer
              </button>
              <button
                onClick={() => setAssistantTab('memories')}
                className={`flex-1 py-2 text-center rounded-md transition-colors ${
                  assistantTab === 'memories'
                    ? 'bg-[#C49A61] text-[#14100D] font-bold shadow'
                    : 'text-[#8C7A68] hover:text-[#C5B7A5]'
                }`}
              >
                Memories
              </button>
              <button
                onClick={() => setAssistantTab('characters')}
                className={`flex-1 py-2 text-center rounded-md transition-colors ${
                  assistantTab === 'characters'
                    ? 'bg-[#C49A61] text-[#14100D] font-bold shadow'
                    : 'text-[#8C7A68] hover:text-[#C5B7A5]'
                }`}
              >
                Characters
              </button>
              <button
                onClick={() => setAssistantTab('alerts')}
                className={`flex-1 py-2 text-center rounded-md transition-colors ${
                  assistantTab === 'alerts'
                    ? 'bg-[#B4473E] text-white font-bold shadow'
                    : 'text-[#8C7A68] hover:text-[#C5B7A5]'
                }`}
              >
                Radar ({chapterAlerts.length})
              </button>
            </div>

            {/* TAB 1: AI CO-WRITER CONTROLS */}
            {assistantTab === 'cowriter' && (
              <div className="bg-[#191512] p-4 sm:p-5 rounded-xl border border-[#30261E] shadow-xl space-y-4 font-sans text-xs sm:text-sm">
                <div className="flex items-center space-x-2 border-b border-[#2C241D] pb-3">
                  <Sparkles className="w-4 h-4 text-[#C49A61]" />
                  <span className="font-mono text-xs sm:text-sm font-bold text-[#E5DCce] uppercase tracking-wider">
                    AI CO-WRITER TOOLS
                  </span>
                </div>

                {/* Co-Writer Actions */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-[13px] text-[#A69584] uppercase font-bold block">Assistance Goal</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'continue', label: 'Continue Writing' },
                      { id: 'dialogue', label: 'Improve Dialogue' },
                      { id: 'expand', label: 'Expand Scene' },
                      { id: 'describe', label: 'Atmosphere' },
                      { id: 'summarize', label: 'Summarize' },
                      { id: 'continuity', label: 'Check Continuity' },
                    ].map(act => (
                      <button
                        key={act.id}
                        onClick={() => setAiAction(act.id)}
                        className={`px-2.5 py-2 rounded-lg text-xs sm:text-sm text-left truncate transition-colors font-medium ${
                          aiAction === act.id
                            ? 'bg-[#C49A61]/25 text-[#E0B77D] border border-[#C49A61] font-bold'
                            : 'bg-[#221B16] text-[#A69482] border border-[#2F251E] hover:text-white'
                        }`}
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Character Quick Context */}
                {characters.length > 0 && (
                  <div>
                    <label className="text-xs sm:text-[13px] text-[#A69584] uppercase font-bold block mb-1.5">Character in Scene</label>
                    <select
                      value={selectedCharacterNote}
                      onChange={(e) => setSelectedCharacterNote(e.target.value)}
                      className="w-full bg-[#130F0D] border border-[#2E241C] text-[#EDE3D6] text-xs sm:text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#C49A61]/60"
                    >
                      <option value="">Any / General Scene</option>
                      {characters.map(char => (
                        <option key={char.id} value={`${char.name} (${char.role}): ${char.motivations}`}>
                          {char.name} ({char.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Custom Instruction */}
                <div>
                  <label className="text-xs sm:text-[13px] text-[#A69584] uppercase font-bold block mb-1.5">Special Instruction</label>
                  <input
                    type="text"
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    placeholder="e.g. Focus on the sea mist and tension..."
                    className="w-full bg-[#130F0D] border border-[#2E241C] text-[#EDE3D6] text-xs sm:text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#C49A61]/60 placeholder:text-[#6E5D4E]"
                  />
                </div>

                {/* Trigger AI Button */}
                <button
                  onClick={handleRunCoWriter}
                  disabled={isGenerating}
                  className="w-full py-3 rounded-lg bg-[#C49A61] hover:bg-[#D6AB72] text-[#14100D] font-sans text-xs sm:text-sm font-bold uppercase tracking-wider shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>{isGenerating ? "Synthesizing Prose..." : "Consult AI Co-Writer"}</span>
                </button>

                {/* AI Output Box */}
                {aiOutput && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 bg-[#110E0C] rounded-lg border border-[#3E3125] space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-[#C49A61]">
                      <span>AI RESPONSE DRAFT</span>
                      <span className="italic font-normal">{injectedMemories.length} Vector Contexts</span>
                    </div>

                    <p className="font-serif text-sm sm:text-[15px] text-[#E5DCce] leading-relaxed max-h-56 overflow-y-auto">
                      {aiOutput}
                    </p>

                    <button
                      onClick={handleAppendAiText}
                      className="w-full py-2 rounded-lg bg-[#2D2218] hover:bg-[#3D2E21] text-[#E0B77D] border border-[#C49A61]/40 font-bold uppercase text-xs tracking-wider transition-colors flex items-center justify-center space-x-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Append to Current Chapter</span>
                    </button>
                  </motion.div>
                )}
              </div>
            )}

            {/* TAB 2: INJECTED SEMANTIC MEMORIES (ChromaDB / MiniLM) */}
            {assistantTab === 'memories' && (
              <div className="bg-[#191512] p-4 sm:p-5 rounded-xl border border-[#30261E] shadow-xl space-y-3.5 font-sans text-xs sm:text-sm">
                <div className="flex items-center justify-between border-b border-[#2C241D] pb-3">
                  <div className="flex items-center space-x-2">
                    <Brain className="w-4 h-4 text-[#C49A61]" />
                    <span className="font-mono text-xs sm:text-sm font-bold text-[#E5DCce] uppercase tracking-wider">
                      VECTOR RETRIEVAL
                    </span>
                  </div>
                  <button
                    onClick={() => queryContextMemories(content)}
                    className="text-[#C49A61] hover:text-[#E0B77D] p-1.5 rounded"
                    title="Refresh semantic search"
                  >
                    <RefreshCw className={`w-4 h-4 ${searchingMemories ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <p className="text-xs sm:text-[13px] text-[#A69584]">
                  Semantically retrieved facts from ChromaDB based on your active paragraphs.
                </p>

                <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                  {relevantMemories.map((mem) => (
                    <div key={mem.id} className="p-3 rounded-lg bg-[#241D17] border border-[#3A2E23] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-[#E0B77D] text-sm sm:text-base">{mem.title}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-[#16120F] text-[#A69584] uppercase font-mono">
                          {mem.category}
                        </span>
                      </div>
                      <p className="font-serif text-xs sm:text-sm text-[#B8A794] leading-relaxed">
                        {mem.description}
                      </p>
                    </div>
                  ))}

                  {relevantMemories.length === 0 && (
                    <p className="text-[#8C7A68] text-center py-6 text-xs sm:text-sm">
                      Type more paragraphs in the editor to activate semantic memory retrieval.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: CHARACTER QUICK NOTES */}
            {assistantTab === 'characters' && (
              <div className="bg-[#191512] p-4 sm:p-5 rounded-xl border border-[#30261E] shadow-xl space-y-3.5 font-sans text-xs sm:text-sm">
                <div className="flex items-center space-x-2 border-b border-[#2C241D] pb-3">
                  <Users className="w-4 h-4 text-[#C49A61]" />
                  <span className="font-mono text-xs sm:text-sm font-bold text-[#E5DCce] uppercase tracking-wider">
                    CHARACTER DOSSIERS
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                  {characters.map((char) => (
                    <div key={char.id} className="p-3 rounded-lg bg-[#241D17] border border-[#3A2E23] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-[#EDE3D4] text-sm sm:text-base">{char.name}</span>
                        <span className="text-xs font-mono text-[#DDAE72]">{char.role}</span>
                      </div>
                      <p className="font-serif text-xs sm:text-sm text-[#B8A794] leading-relaxed">
                        {char.motivations || "No motivations logged."}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: RADAR CONSISTENCY ALERTS */}
            {assistantTab === 'alerts' && (
              <div className="bg-[#191512] p-4 sm:p-5 rounded-xl border border-[#30261E] shadow-xl space-y-3.5 font-sans text-xs sm:text-sm">
                <div className="flex items-center space-x-2 border-b border-[#2C241D] pb-3 text-[#E5A8A3]">
                  <AlertTriangle className="w-4 h-4 text-[#B4473E]" />
                  <span className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider">
                    CHAPTER CONTINUITY FLAGS
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                  {chapterAlerts.map((alert) => (
                    <div key={alert.id} className="p-3 rounded-lg bg-[#2B1B19] border border-[#6E2B25] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-[#E5A8A3] text-sm sm:text-base">{alert.title}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-[#8A2B23] text-white uppercase font-bold font-mono">
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-[#D4B3AF] font-serif leading-relaxed">
                        {alert.description}
                      </p>
                      <p className="text-xs sm:text-[13px] text-[#A87974] italic">
                        Correction: {alert.suggested_correction}
                      </p>
                    </div>
                  ))}

                  {chapterAlerts.length === 0 && (
                    <p className="text-[#8C7A68] text-center py-6 text-xs sm:text-sm">
                      No active plot hole flags recorded for Chapter {selectedChapter?.chapter_number}.
                    </p>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
