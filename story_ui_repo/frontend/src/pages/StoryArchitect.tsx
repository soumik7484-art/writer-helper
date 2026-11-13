import React, { useState } from 'react';
import { useStory } from '../context/StoryContext';
import { api } from '../services/api';
import { NavTab } from '../components/common/Navbar';
import { MetalClipboard } from '../components/common/MetalClipboard';
import { Polaroid } from '../components/common/Polaroid';
import { sound } from '../services/audioService';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Check,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  Clock,
  Compass,
  Layers
} from 'lucide-react';
import { Genre, Mood, OutlineItem, Story } from '../types';

interface StoryArchitectProps {
  onNavigate: (tab: NavTab) => void;
}

export const StoryArchitect: React.FC<StoryArchitectProps> = ({ onNavigate }) => {
  const { refreshStories, setActiveStoryId, addToast } = useStory();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState<Genre>('Mystery');
  const [subgenre, setSubgenre] = useState('Victorian Gothic Noir');
  const [theme, setTheme] = useState('The cost of forbidden truth & generational guilt');
  const [mood, setMood] = useState<Mood>('Suspenseful');
  const [setting, setSetting] = useState('Ravenscar Cliffside & Maritime Manor');
  const [timePeriod, setTimePeriod] = useState('Autumn, 1894');
  const [characterCount, setCharacterCount] = useState<number>(4);
  const [writingStyle, setWritingStyle] = useState('Cinematic, sensory Victorian prose with noir grit');
  const [chapterCount, setChapterCount] = useState<number>(6);
  const [endingType, setEndingType] = useState('Twist Revelation');
  const [description, setDescription] = useState(
    'A private inquiry agent is summoned to an isolated coastal estate following an impossible disappearance. Strange maritime ciphers and subterranean tide vaults indicate a clandestine pact between the town founders.'
  );
  const [coverUrl, setCoverUrl] = useState(
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop'
  );

  // Generated Outline State
  const [outline, setOutline] = useState<OutlineItem[]>([]);

  const genreOptions: Genre[] = [
    'Horror',
    'Romance',
    'Fantasy',
    'Adventure',
    'Mystery',
    'Sci-Fi',
    'Comedy',
    'Drama',
    'Historical Fiction',
    'Custom'
  ];

  const moodOptions: Mood[] = [
    'Suspenseful',
    'Dark',
    'Mysterious',
    'Emotional',
    'Heartwarming',
    'Magical',
    'Inspirational',
    'Funny'
  ];

  // Helper to trigger AI outline preview
  const handleGenerateOutline = async () => {
    if (!title.trim()) {
      addToast("Case Title Required", "Please specify a title for the story case.", "warning");
      return;
    }

    try {
      setGeneratingOutline(true);
      sound.playTypewriterKeystroke();
      const res = await api.previewOutline({
        title,
        description,
        genre,
        mood,
        chapter_count: chapterCount,
      });

      setOutline(res.outline);
      setStep(3);
      sound.playPaperRustle();
      addToast("Outline Generated", "AI Co-Architect drafted chapter progression.", "success");
    } catch (e: any) {
      addToast("Error", "Could not generate outline. Please try again.", "error");
    } finally {
      setGeneratingOutline(false);
    }
  };

  const updateOutlineItem = (index: number, field: 'title' | 'focus', val: string) => {
    setOutline(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const addOutlineItem = () => {
    setOutline(prev => [
      ...prev,
      {
        chapter: prev.length + 1,
        title: `Chapter ${prev.length + 1} - The New Revelation`,
        focus: 'Key narrative climax or turning point advancing the mystery.',
      }
    ]);
  };

  const removeOutlineItem = (index: number) => {
    setOutline(prev => prev.filter((_, i) => i !== index).map((item, idx) => ({ ...item, chapter: idx + 1 })));
  };

  // Final submit handler
  const handleFinalSubmit = async () => {
    try {
      setSubmitting(true);
      const newStoryPayload: Partial<Story> = {
        title,
        description,
        genre,
        subgenre,
        theme,
        mood,
        setting,
        time_period: timePeriod,
        character_count: characterCount,
        writing_style: writingStyle,
        chapter_count: outline.length || chapterCount,
        ending_type: endingType,
        plot_outline: outline,
        cover_url: coverUrl,
      };

      const created = await api.createStory(newStoryPayload);

      // Seed first chapter from outline if available
      if (outline.length > 0) {
        await api.createChapter(created.id, {
          chapter_number: 1,
          title: outline[0].title,
          summary: outline[0].focus,
          content: `The story of ${created.title} commences in ${created.setting} during ${created.time_period}.\n\n`,
          status: 'draft',
        });
      }

      await refreshStories();
      setActiveStoryId(created.id);
      sound.playPaperRustle();
      addToast("Story Dossier Created", `'${created.title}' has been registered in the archive.`, "success");
      onNavigate('studio');
    } catch (e: any) {
      addToast("Creation Failed", e.message || "Failed to commit story dossier.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-8">
      {/* Top Workflow Steps Banner */}
      <div className="flex items-center justify-between max-w-xl mx-auto mb-8 bg-[#181411] p-2.5 rounded-lg border border-[#382E25] shadow-inner text-xs font-typewriter">
        {[
          { num: 1, label: 'Premise' },
          { num: 2, label: 'Tone & Scope' },
          { num: 3, label: 'Outline Review' },
          { num: 4, label: 'Document Seal' },
        ].map(s => (
          <div
            key={s.num}
            onClick={() => s.num <= step && setStep(s.num as any)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded cursor-pointer transition-colors ${
              step === s.num
                ? 'bg-[#C49A61] text-[#14100D] font-bold shadow'
                : step > s.num
                ? 'text-[#C49A61] hover:text-[#E0B77D]'
                : 'text-[#6E5C4B] cursor-not-allowed'
            }`}
          >
            <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-xs sm:text-[13px]">
              {step > s.num ? '✓' : s.num}
            </span>
            <span className="hidden sm:inline uppercase">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Main Phasmophobia Investigation Journal Sheet */}
      <MetalClipboard
        title="CASE SPECIFICATION & STORY ARCHITECTURE"
        subtitle="Department of Narrative Inquiry • Official Story Dossier Planning Document"
        stampText={step === 4 ? "SEALED & VERIFIED" : "DRAFT FORM 104-B"}
        stampType={step === 4 ? "green" : "red"}
      >
        <AnimatePresence mode="wait">
          
          {/* STEP 1: Core Premise & Genre */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6"
            >
              <div className="bg-[#BFAEA0]/30 p-4 rounded border border-[#8C765C]/40 text-xs font-typewriter text-[#4A3B2E]">
                <strong>INVESTIGATOR INSTRUCTIONS:</strong> Establish the foundational coordinates of the fictional reality. Choose genre parameters carefully as AI retrieval models and visual dossiers adapt to these classifications.
              </div>

              {/* Title & Genre */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block font-typewriter text-xs font-bold uppercase text-[#332A22] mb-1">
                    Story Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. The Obsidian Key of Ravenscar"
                    className="w-full px-3.5 py-2.5 rounded bg-[#D9CBAD] border border-[#8A7358] text-[#241A14] font-serif font-bold text-base focus:outline-none focus:ring-2 focus:ring-[#8F7453]"
                  />
                </div>

                <div>
                  <label className="block font-typewriter text-xs font-bold uppercase text-[#332A22] mb-1">
                    Universe Genre *
                  </label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value as Genre)}
                    className="w-full px-3.5 py-2.5 rounded bg-[#D9CBAD] border border-[#8A7358] text-[#241A14] font-typewriter text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#8F7453]"
                  >
                    {genreOptions.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subgenre & Mood */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block font-typewriter text-xs font-bold uppercase text-[#332A22] mb-1">
                    Subgenre / Stylistic Flair
                  </label>
                  <input
                    type="text"
                    value={subgenre}
                    onChange={(e) => setSubgenre(e.target.value)}
                    placeholder="e.g. Victorian Gothic Noir, Cyberpunk Mystery"
                    className="w-full px-3 py-2 rounded bg-[#D9CBAD] border border-[#8A7358] text-[#241A14] font-typewriter text-xs focus:outline-none focus:ring-2 focus:ring-[#8F7453]"
                  />
                </div>

                <div>
                  <label className="block font-typewriter text-xs font-bold uppercase text-[#332A22] mb-1">
                    Atmospheric Mood *
                  </label>
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value as Mood)}
                    className="w-full px-3 py-2 rounded bg-[#D9CBAD] border border-[#8A7358] text-[#241A14] font-typewriter text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#8F7453]"
                  >
                    {moodOptions.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Setting & Time Period */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block font-typewriter text-xs font-bold uppercase text-[#332A22] mb-1">
                    Primary Setting & Location
                  </label>
                  <input
                    type="text"
                    value={setting}
                    onChange={(e) => setSetting(e.target.value)}
                    placeholder="e.g. Coastal Fishing Hamlet & Maritime Manor"
                    className="w-full px-3 py-2 rounded bg-[#D9CBAD] border border-[#8A7358] text-[#241A14] font-typewriter text-xs focus:outline-none focus:ring-2 focus:ring-[#8F7453]"
                  />
                </div>

                <div>
                  <label className="block font-typewriter text-xs font-bold uppercase text-[#332A22] mb-1">
                    Time Period / Era
                  </label>
                  <input
                    type="text"
                    value={timePeriod}
                    onChange={(e) => setTimePeriod(e.target.value)}
                    placeholder="e.g. Autumn, 1894"
                    className="w-full px-3 py-2 rounded bg-[#D9CBAD] border border-[#8A7358] text-[#241A14] font-typewriter text-xs focus:outline-none focus:ring-2 focus:ring-[#8F7453]"
                  />
                </div>
              </div>

              {/* Step Navigation */}
              <div className="pt-6 border-t border-[#6E5A44]/40 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!title.trim()) {
                      addToast("Missing Title", "Please provide a story title to advance.", "warning");
                      return;
                    }
                    sound.playPaperRustle();
                    setStep(2);
                  }}
                  className="flex items-center space-x-2 px-6 py-2.5 rounded bg-[#2A2016] hover:bg-[#3D2F22] text-[#F0E6D8] font-typewriter text-xs font-bold uppercase tracking-wider shadow transition-all"
                >
                  <span>Proceed to Tone & Scope</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Tone, Scope, & Large Multiline Plot */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6"
            >
              {/* Theme & Style */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block font-typewriter text-xs font-bold uppercase text-[#332A22] mb-1">
                    Central Theme
                  </label>
                  <input
                    type="text"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="e.g. Forbidden truth, redemption, generational sins"
                    className="w-full px-3 py-2 rounded bg-[#D9CBAD] border border-[#8A7358] text-[#241A14] font-typewriter text-xs focus:outline-none focus:ring-2 focus:ring-[#8F7453]"
                  />
                </div>

                <div>
                  <label className="block font-typewriter text-xs font-bold uppercase text-[#332A22] mb-1">
                    Preferred Writing Style
                  </label>
                  <input
                    type="text"
                    value={writingStyle}
                    onChange={(e) => setWritingStyle(e.target.value)}
                    placeholder="e.g. Sensory Victorian prose, fast-paced dialogue"
                    className="w-full px-3 py-2 rounded bg-[#D9CBAD] border border-[#8A7358] text-[#241A14] font-typewriter text-xs focus:outline-none focus:ring-2 focus:ring-[#8F7453]"
                  />
                </div>
              </div>

              {/* Counts & Ending */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block font-typewriter text-xs font-bold uppercase text-[#332A22] mb-1">
                    Main Characters Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={characterCount}
                    onChange={(e) => setCharacterCount(parseInt(e.target.value) || 4)}
                    className="w-full px-3 py-2 rounded bg-[#D9CBAD] border border-[#8A7358] text-[#241A14] font-typewriter text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#8F7453]"
                  />
                </div>

                <div>
                  <label className="block font-typewriter text-xs font-bold uppercase text-[#332A22] mb-1">
                    Target Chapter Count
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={24}
                    value={chapterCount}
                    onChange={(e) => setChapterCount(parseInt(e.target.value) || 6)}
                    className="w-full px-3 py-2 rounded bg-[#D9CBAD] border border-[#8A7358] text-[#241A14] font-typewriter text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#8F7453]"
                  />
                </div>

                <div>
                  <label className="block font-typewriter text-xs font-bold uppercase text-[#332A22] mb-1">
                    Desired Ending Type
                  </label>
                  <select
                    value={endingType}
                    onChange={(e) => setEndingType(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[#D9CBAD] border border-[#8A7358] text-[#241A14] font-typewriter text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#8F7453]"
                  >
                    <option value="Twist Revelation">Twist Revelation</option>
                    <option value="Bittersweet Resolution">Bittersweet Resolution</option>
                    <option value="Triumphant Victory">Triumphant Victory</option>
                    <option value="Tragic Downfall">Tragic Downfall</option>
                    <option value="Open Ambiguity">Open Ambiguity</option>
                  </select>
                </div>
              </div>

              {/* Large Multiline Plot Premise Input */}
              <div>
                <label className="block font-typewriter text-xs font-bold uppercase text-[#332A22] mb-1">
                  Narrative Plot Premise & Key Conflicts *
                </label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Outline the initiating incident, primary secrets, antagonist motives, and pivotal turning points..."
                  className="w-full p-3.5 rounded bg-[#D9CBAD] border border-[#8A7358] text-[#241A14] font-serif text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#8F7453]"
                ></textarea>
                <span className="font-typewriter text-xs sm:text-[13px] text-[#6E5945] block mt-1">
                  The AI Co-Architect will extract universe entities, timeline events, and chapter progression from this premise.
                </span>
              </div>

              {/* Step Navigation */}
              <div className="pt-6 border-t border-[#6E5A44]/40 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    sound.playPaperRustle();
                    setStep(1);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 rounded border border-[#6B553E] text-[#2B2117] font-typewriter text-xs font-bold uppercase tracking-wider hover:bg-[#BCA98E] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  disabled={generatingOutline}
                  onClick={handleGenerateOutline}
                  className="flex items-center space-x-2 px-6 py-2.5 rounded bg-[#2A2016] hover:bg-[#3D2F22] text-[#F0E6D8] font-typewriter text-xs font-bold uppercase tracking-wider shadow transition-all disabled:opacity-50"
                >
                  {generatingOutline ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin text-[#C49A61]" />
                      <span>Synthesizing Outline with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-[#C49A61]" />
                      <span>Generate AI Story Outline</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Editable Outline Preview */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between border-b border-[#524131]/30 pb-3">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#2A2016]">
                    AI-Generated Story Arc Preview
                  </h3>
                  <p className="font-typewriter text-xs text-[#63503E]">
                    Review and modify the chapter progression before committing the case file.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addOutlineItem}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#35281D] text-[#E0B77D] hover:bg-[#473729] font-typewriter text-xs sm:text-[13px] font-bold uppercase transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Chapter</span>
                </button>
              </div>

              {/* Chapters List */}
              <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
                {outline.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded bg-[#D6C7AA] border border-[#8C7558] shadow-sm relative group"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center space-x-2 flex-1">
                        <span className="w-6 h-6 rounded bg-[#2B2117] text-[#E0B77D] font-typewriter font-bold text-xs flex items-center justify-center shrink-0">
                          {item.chapter}
                        </span>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateOutlineItem(idx, 'title', e.target.value)}
                          className="w-full px-2 py-1 rounded bg-[#E4D9C3] border border-[#9A846A] font-serif font-bold text-sm text-[#231A13] focus:outline-none focus:ring-1 focus:ring-[#8F7453]"
                        />
                      </div>

                      {outline.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOutlineItem(idx)}
                          className="text-[#87312B] hover:text-[#B4473E] p-1 rounded"
                          title="Remove chapter"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <textarea
                      rows={2}
                      value={item.focus}
                      onChange={(e) => updateOutlineItem(idx, 'focus', e.target.value)}
                      placeholder="Chapter focal point..."
                      className="w-full px-2.5 py-1.5 rounded bg-[#E4D9C3] border border-[#9A846A] font-typewriter text-xs text-[#382D23] focus:outline-none focus:ring-1 focus:ring-[#8F7453]"
                    />
                  </div>
                ))}
              </div>

              {/* Step Navigation */}
              <div className="pt-6 border-t border-[#6E5A44]/40 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    sound.playPaperRustle();
                    setStep(2);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 rounded border border-[#6B553E] text-[#2B2117] font-typewriter text-xs font-bold uppercase tracking-wider hover:bg-[#BCA98E] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playPaperRustle();
                    setStep(4);
                  }}
                  className="flex items-center space-x-2 px-6 py-2.5 rounded bg-[#2A2016] hover:bg-[#3D2F22] text-[#F0E6D8] font-typewriter text-xs font-bold uppercase tracking-wider shadow transition-all"
                >
                  <span>Proceed to Final Dossier Seal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Review, Cover Selection, and Confirmation */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8 bg-[#D8CAB0] p-6 rounded-md border border-[#8C765B] shadow-inner">
                {/* Polaroid Preview */}
                <div className="shrink-0">
                  <Polaroid
                    imageUrl={coverUrl}
                    caption={title}
                    subcaption={`${genre} • ${setting}`}
                    rotation={-2}
                    pinned={true}
                    size="md"
                  />
                  <div className="mt-3">
                    <label className="block font-typewriter text-xs sm:text-[13px] text-[#63503E] uppercase font-bold mb-1">
                      Cover Evidence Image URL:
                    </label>
                    <input
                      type="text"
                      value={coverUrl}
                      onChange={(e) => setCoverUrl(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-[#E4D9C3] border border-[#9A846A] font-typewriter text-xs sm:text-[13px] text-[#231A13]"
                    />
                  </div>
                </div>

                {/* Dossier Summary Sheet */}
                <div className="flex-1 space-y-3 font-typewriter text-xs text-[#2A2117]">
                  <div className="border-b border-[#735F4A]/40 pb-2">
                    <span className="text-xs sm:text-[13px] text-[#7A644E] uppercase tracking-wider block">CASE TITLE:</span>
                    <h3 className="font-serif text-xl font-bold text-[#1C150F]">{title}</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs sm:text-[13px]">
                    <div><strong className="text-[#695441]">Genre:</strong> {genre} ({subgenre})</div>
                    <div><strong className="text-[#695441]">Mood:</strong> {mood}</div>
                    <div><strong className="text-[#695441]">Era:</strong> {timePeriod}</div>
                    <div><strong className="text-[#695441]">Setting:</strong> {setting}</div>
                    <div><strong className="text-[#695441]">Characters:</strong> ~{characterCount} Main</div>
                    <div><strong className="text-[#695441]">Planned Chapters:</strong> {outline.length || chapterCount}</div>
                    <div className="col-span-2"><strong className="text-[#695441]">Ending Arc:</strong> {endingType}</div>
                  </div>

                  <div className="pt-2 border-t border-[#735F4A]/40">
                    <span className="text-xs sm:text-[13px] text-[#7A644E] uppercase tracking-wider block">PREMISE SUMMARY:</span>
                    <p className="font-serif text-xs leading-relaxed italic text-[#33281E] mt-0.5">
                      "{description}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Confirmation Call to Action */}
              <div className="pt-6 border-t border-[#6E5A44]/40 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    sound.playPaperRustle();
                    setStep(3);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 rounded border border-[#6B553E] text-[#2B2117] font-typewriter text-xs font-bold uppercase tracking-wider hover:bg-[#BCA98E] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Modify Outline</span>
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleFinalSubmit}
                  className="flex items-center space-x-2 px-7 py-3 rounded bg-[#7A2E28] hover:bg-[#8F3730] text-white font-typewriter text-xs font-bold uppercase tracking-widest shadow-xl transition-all hover:scale-105 disabled:opacity-50"
                >
                  {submitting ? (
                    <span>Registering Case Dossier...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Commit & Open Writing Studio</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </MetalClipboard>
    </div>
  );
};
