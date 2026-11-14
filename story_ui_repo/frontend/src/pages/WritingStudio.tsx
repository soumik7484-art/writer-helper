import React, { useState, useEffect, useRef } from 'react';
import { useStory } from '../context/StoryContext';
import { api } from '../services/api';
import { Chapter, Memory, Character, PlotHole, Page } from '../types';
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
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { RichTextToolbar } from '../components/studio/RichTextToolbar';
import { parseContentToPages, combinePagesToContent } from '../utils/pagination';

const stripHtml = (html: string): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
};

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

  // Multi-Page Virtual Document System
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageDirection, setPageDirection] = useState<number>(1);
  const [isPageOverCapacity, setIsPageOverCapacity] = useState<boolean>(false);
  const isTypingRef = useRef<boolean>(false);

  // Dedicated refs for page content cache, race-condition version tracking, and debounce timers
  const pageContentCacheRef = useRef<{ [pageId: string]: string }>({});
  const pageVersionRef = useRef<{ [pageId: string]: number }>({});
  const autosaveTimersRef = useRef<{ [pageId: string]: any }>({});
  const currentPageRef = useRef<number>(1);
  currentPageRef.current = currentPage;
  const pagesRef = useRef<Page[]>(pages);
  pagesRef.current = pages;

  const editorRef = useRef<HTMLDivElement | null>(null);

  const createDefaultPage = (chapterId: string, pageNumber: number, initialContent = '<p><br></p>'): Page => ({
    id: `page_${chapterId}_${pageNumber}`,
    chapter_id: chapterId,
    page_number: pageNumber,
    content: initialContent,
    word_count: stripHtml(initialContent).split(/\s+/).filter(Boolean).length,
    save_status: 'saved',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  const loadChapterPages = async (chap: Chapter) => {
    let chapterPages: Page[] = [];
    try {
      const fetched = await api.getChapterPages(chap.id);
      if (fetched && fetched.length > 0) {
        chapterPages = fetched;
      }
    } catch {
      // Fallback
    }

    if (chapterPages.length === 0) {
      if (chap.pages && chap.pages.length > 0) {
        chapterPages = chap.pages;
      } else {
        const raw = chap.content || '';
        const stringPages = parseContentToPages(raw);
        chapterPages = stringPages.map((str, idx) => ({
          id: `page_${chap.id}_${idx + 1}`,
          chapter_id: chap.id,
          page_number: idx + 1,
          content: str || '<p><br></p>',
          word_count: stripHtml(str).split(/\s+/).filter(Boolean).length,
          save_status: 'saved',
          created_at: chap.created_at || new Date().toISOString(),
          updated_at: chap.updated_at || new Date().toISOString(),
        }));
      }
    }

    if (chapterPages.length === 0) {
      chapterPages = [createDefaultPage(chap.id, 1, chap.content || '<p><br></p>')];
    }

    chapterPages.forEach(p => {
      pageContentCacheRef.current[p.id] = p.content;
    });

    setPages(chapterPages);
    setCurrentPage(1);
    setPageDirection(1);
    setIsPageOverCapacity(false);
  };

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

  const selectChapter = async (chap: Chapter) => {
    flushCurrentPage();
    sound.playPaperRustle();
    setSelectedChapter(chap);
    setActiveChapterId(chap.id);
    setTitle(chap.title);
    setContent(chap.content);
    setSummary(chap.summary || '');
    setStatus(chap.status);
    setLastSaved('Saved');
    queryContextMemories(stripHtml(chap.content));

    await loadChapterPages(chap);
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

  // Save specific page to API/store with version race-condition guard
  const saveSpecificPage = async (pageId: string, contentToSave: string, version: number) => {
    if (!selectedChapter) return;
    setIsSaving(true);
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, save_status: 'saving' } : p));

    try {
      const words = stripHtml(contentToSave).split(/\s+/).filter(Boolean).length;
      const updatedPage = await api.updateChapterPage(selectedChapter.id, pageId, {
        content: contentToSave,
        word_count: words,
        save_status: 'saved',
      });

      // Stale response guard (Test 6): Never overwrite newer user edits with an older response
      if (version < (pageVersionRef.current[pageId] || 0)) {
        return;
      }

      setPages(prev => prev.map(p => p.id === pageId ? { ...p, ...updatedPage, save_status: 'saved' } : p));
      setLastSaved(`Saved at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    } catch (e: any) {
      console.error("Save page error:", e);
      setPages(prev => prev.map(p => p.id === pageId ? { ...p, save_status: 'error' } : p));
      setLastSaved('Save Error');
    } finally {
      setIsSaving(false);
    }
  };

  // Synchronous flush of current page content before navigation or save
  const flushCurrentPage = () => {
    const activePage = pagesRef.current[currentPageRef.current - 1];
    if (!activePage) return;

    let currentHtml = editorRef.current && editorRef.current.isConnected
      ? editorRef.current.innerHTML
      : pageContentCacheRef.current[activePage.id];

    if (!currentHtml && activePage.content) {
      currentHtml = activePage.content;
    }

    if (!currentHtml) {
      currentHtml = '<p><br></p>';
    }

    // Protection: Never overwrite existing manuscript content with an empty string during transition/unmount
    if ((currentHtml === '' || currentHtml === '<p><br></p>') && (activePage.content && activePage.content.trim() !== '' && activePage.content !== '<p><br></p>')) {
      currentHtml = activePage.content;
    }

    if (autosaveTimersRef.current[activePage.id]) {
      clearTimeout(autosaveTimersRef.current[activePage.id]);
      delete autosaveTimersRef.current[activePage.id];
    }

    pageContentCacheRef.current[activePage.id] = currentHtml;
    pageVersionRef.current[activePage.id] = (pageVersionRef.current[activePage.id] || 0) + 1;
    const version = pageVersionRef.current[activePage.id];
    const words = stripHtml(currentHtml).split(/\s+/).filter(Boolean).length;

    setPages(prev => {
      const next = [...prev];
      const idx = currentPageRef.current - 1;
      if (next[idx]) {
        next[idx] = {
          ...next[idx],
          content: currentHtml,
          word_count: words,
          updated_at: new Date().toISOString()
        };
      }
      return next;
    });

    saveSpecificPage(activePage.id, currentHtml, version);
  };

  // Page input handler for ContentEditable
  const handlePageInput = () => {
    if (!editorRef.current || !editorRef.current.isConnected) return;
    const activePage = pagesRef.current[currentPageRef.current - 1];
    if (!activePage) return;

    isTypingRef.current = true;
    const currentHtml = editorRef.current.innerHTML;

    // Check capacity (450px threshold)
    const isOver = editorRef.current.scrollHeight > 450;
    setIsPageOverCapacity(isOver);

    // Update memory cache and version
    pageContentCacheRef.current[activePage.id] = currentHtml;
    pageVersionRef.current[activePage.id] = (pageVersionRef.current[activePage.id] || 0) + 1;
    const version = pageVersionRef.current[activePage.id];

    const words = stripHtml(currentHtml).split(/\s+/).filter(Boolean).length;

    setPages(prev => {
      const next = [...prev];
      const idx = currentPageRef.current - 1;
      if (next[idx]) {
        next[idx] = {
          ...next[idx],
          content: currentHtml,
          word_count: words,
          save_status: 'unsaved',
          updated_at: new Date().toISOString()
        };
      }
      return next;
    });

    setLastSaved('Unsaved Changes...');

    // Debounced autosave
    if (autosaveTimersRef.current[activePage.id]) {
      clearTimeout(autosaveTimersRef.current[activePage.id]);
    }

    const pageIdToSave = activePage.id;
    autosaveTimersRef.current[activePage.id] = setTimeout(() => {
      saveSpecificPage(pageIdToSave, currentHtml, version);
      queryContextMemories(stripHtml(currentHtml));
    }, 1500);

    setTimeout(() => {
      isTypingRef.current = false;
    }, 100);
  };

  const handlePageBlur = () => {
    if (!editorRef.current || !editorRef.current.isConnected) return;
    const currentHtml = editorRef.current.innerHTML;
    const activePage = pagesRef.current[currentPageRef.current - 1];
    if (!activePage) return;

    if ((!currentHtml || currentHtml.trim() === '' || currentHtml === '<p><br></p>') && (activePage.content && activePage.content.trim() !== '' && activePage.content !== '<p><br></p>')) {
      return;
    }

    pageContentCacheRef.current[activePage.id] = currentHtml;
    flushCurrentPage();
  };

  // Page Navigation Handlers
  const handleNextPage = () => {
    flushCurrentPage();
    if (currentPage < pages.length) {
      sound.playPaperRustle();
      setPageDirection(1);
      setCurrentPage(prev => prev + 1);
    } else if (currentPage === pages.length && isPageOverCapacity) {
      handleAddNewPage();
    }
  };

  const handlePrevPage = () => {
    flushCurrentPage();
    if (currentPage > 1) {
      sound.playPaperRustle();
      setPageDirection(-1);
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleJumpToPage = (pageNum: number) => {
    if (pageNum === currentPage || pageNum < 1 || pageNum > pages.length) return;
    flushCurrentPage();
    sound.playPaperRustle();
    setPageDirection(pageNum > currentPage ? 1 : -1);
    setCurrentPage(pageNum);
  };

  const handleAddNewPage = async () => {
    flushCurrentPage();
    sound.playPaperRustle();

    if (!selectedChapter) return;
    const nextNum = pages.length + 1;
    try {
      const created = await api.createChapterPage(selectedChapter.id, {
        page_number: nextNum,
        content: '<p><br></p>',
      });
      pageContentCacheRef.current[created.id] = created.content;
      setPages(prev => [...prev, created]);
      setPageDirection(1);
      setCurrentPage(nextNum);
      addToast("New Folio Bound", `Folio ${nextNum} added to the manuscript.`, "info");
    } catch {
      const fallback = createDefaultPage(selectedChapter.id, nextNum, '<p><br></p>');
      pageContentCacheRef.current[fallback.id] = fallback.content;
      setPages(prev => [...prev, fallback]);
      setPageDirection(1);
      setCurrentPage(nextNum);
      addToast("New Folio Bound", `Folio ${nextNum} added to the manuscript.`, "info");
    }
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'Enter') {
        // Ctrl+Enter: Insert Page Break
        e.preventDefault();
        handleAddNewPage();
        return;
      }
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        document.execCommand('bold', false);
        handlePageInput();
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        document.execCommand('italic', false);
        handlePageInput();
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        document.execCommand('underline', false);
        handlePageInput();
      } else if (e.key === 'z' || e.key === 'Z') {
        if (e.shiftKey) {
          e.preventDefault();
          document.execCommand('redo', false);
        } else {
          e.preventDefault();
          document.execCommand('undo', false);
        }
        handlePageInput();
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        document.execCommand('redo', false);
        handlePageInput();
      }
    } else if (e.key === 'PageDown') {
      if (currentPage < pages.length) {
        e.preventDefault();
        handleNextPage();
      }
    } else if (e.key === 'PageUp') {
      if (currentPage > 1) {
        e.preventDefault();
        handlePrevPage();
      }
    }
  };

  const handleSave = async (
    textToSave?: string,
    titleToSave: string = title,
    summaryToSave: string = summary,
    statusToSave: any = status,
    showToast: boolean = true
  ) => {
    if (!selectedChapter) return;
    flushCurrentPage();

    try {
      setIsSaving(true);
      const combined = pagesRef.current
        .map(p => pageContentCacheRef.current[p.id] ?? p.content)
        .filter(c => c && c.trim() !== '<p><br></p>')
        .join('<!-- story-page-break -->');

      const fullContent = textToSave !== undefined ? textToSave : (combined || pagesRef.current[0]?.content || '');

      const updated = await api.updateChapter(selectedChapter.id, {
        title: titleToSave,
        content: fullContent,
        summary: summaryToSave,
        status: statusToSave,
        pages: pagesRef.current
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
      const plainContent = stripHtml(content) || content;
      const res = await api.askCoWriter({
        story_id: activeStory.id,
        action: aiAction as any,
        content: plainContent,
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
    if (!aiOutput || !selectedChapter) return;
    const formattedAi = aiOutput.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    const activePage = pages[currentPage - 1];
    if (!activePage) return;

    const existingPageContent = pageContentCacheRef.current[activePage.id] ?? activePage.content ?? '';
    const updatedPageContent = existingPageContent && existingPageContent.trim() !== '<p><br></p>'
      ? `${existingPageContent}<p><br></p>${formattedAi}`
      : formattedAi;

    pageContentCacheRef.current[activePage.id] = updatedPageContent;
    if (editorRef.current) {
      editorRef.current.innerHTML = updatedPageContent;
    }

    const words = stripHtml(updatedPageContent).split(/\s+/).filter(Boolean).length;
    setPages(prev => prev.map(p => p.id === activePage.id ? { ...p, content: updatedPageContent, word_count: words, save_status: 'unsaved' } : p));
    pageVersionRef.current[activePage.id] = (pageVersionRef.current[activePage.id] || 0) + 1;
    saveSpecificPage(activePage.id, updatedPageContent, pageVersionRef.current[activePage.id]);
    setAiOutput('');
    addToast("AI Prose Integrated", `Appended to Folio ${currentPage}.`, "success");
  };

  const currentPageData = pages[currentPage - 1];
  const activeFolioContent = (currentPageData ? pageContentCacheRef.current[currentPageData.id] : undefined) ?? currentPageData?.content ?? '<p><br></p>';
  const totalWordCount = pages.reduce((sum, p) => {
    const raw = pageContentCacheRef.current[p.id] ?? p.content;
    return sum + stripHtml(raw).split(/\s+/).filter(Boolean).length;
  }, 0);
  const wordCount = totalWordCount;
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

        {/* CENTER COLUMN: Distraction-Free Multi-Page Parchment Editor */}
        <div className={`${zenMode ? 'lg:col-span-8 lg:col-start-3' : 'lg:col-span-6'} space-y-3`}>
          
          {/* Professional Rich Text Editing Toolbar (Fixed above turning page) */}
          <div className="bg-[#181411] p-1.5 rounded-xl border border-[#3A2E24] shadow-md">
            <RichTextToolbar 
              editorRef={editorRef} 
              onContentChange={handlePageInput} 
            />
          </div>

          {/* 3D Perspective Book Stage */}
          <div className="relative book-stage-3d w-full">
            {/* Under-Page Book Stack Effect (physical parchment sheets underneath) */}
            <div className="absolute inset-0 rounded-xl book-stacked-edges pointer-events-none transform translate-x-1.5 translate-y-1.5 bg-[#B8A385]" />

            {/* Realistic 3D Flipping Parchment Leaf */}
            <AnimatePresence mode="wait" custom={pageDirection}>
              <motion.div
                key={currentPageData?.id || `folio-${currentPage}`}
                custom={pageDirection}
                variants={{
                  enter: (dir: number) => ({
                    rotateY: dir > 0 ? 75 : -75,
                    opacity: 0.15,
                    transformOrigin: dir > 0 ? 'left center' : 'right center',
                    scale: 0.985,
                    boxShadow: dir > 0
                      ? '-25px 12px 40px rgba(0,0,0,0.6), inset 20px 0 35px rgba(0,0,0,0.35)'
                      : '25px 12px 40px rgba(0,0,0,0.6), inset -20px 0 35px rgba(0,0,0,0.35)'
                  }),
                  center: {
                    rotateY: 0,
                    opacity: 1,
                    transformOrigin: 'left center',
                    scale: 1,
                    boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.75), inset 0 0 35px rgba(90, 65, 35, 0.22)',
                    transition: {
                      duration: 0.65,
                      ease: [0.25, 1, 0.5, 1]
                    }
                  },
                  exit: (dir: number) => ({
                    rotateY: dir > 0 ? -80 : 80,
                    opacity: 0.1,
                    transformOrigin: dir > 0 ? 'left center' : 'right center',
                    scale: 0.98,
                    boxShadow: dir > 0
                      ? '-35px 15px 50px rgba(0,0,0,0.7), inset 30px 0 45px rgba(0,0,0,0.45)'
                      : '35px 15px 50px rgba(0,0,0,0.7), inset -30px 0 45px rgba(0,0,0,0.45)',
                    transition: {
                      duration: 0.55,
                      ease: [0.4, 0, 0.2, 1]
                    }
                  })
                }}
                initial="enter"
                animate="center"
                exit="exit"
                className="relative rounded-xl parchment-sheet p-6 sm:p-9 border-2 border-[#8C7456] min-h-[660px] h-[660px] flex flex-col justify-between overflow-hidden shadow-2xl"
              >
                {/* Book Spine Crease & Shadow */}
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-12 book-spine-crease rounded-l-xl z-10" />

                {/* Top Header: Scene Record & Folio Badge & Stamp */}
                <div className="flex items-center justify-between border-b border-[#524131]/30 pb-3 mb-3 shrink-0 relative z-20">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-xs sm:text-sm font-bold uppercase tracking-widest text-[#68523D]">
                      SCENE RECORD • CHAPTER {selectedChapter?.chapter_number || 1}
                    </span>
                    <span className="bg-[#524131]/20 text-[#4E3D2C] px-2 py-0.5 rounded font-mono text-[11px] font-bold tracking-wider">
                      FOLIO {currentPage} OF {pages.length}
                    </span>
                  </div>

                  <Stamp
                    label={status === 'completed' ? "FINAL REVISION" : status === 'in_review' ? "IN REVIEW" : "ACTIVE DRAFT"}
                    type={status === 'completed' ? "green" : "amber"}
                    rotation={-1}
                    size="sm"
                  />
                </div>

                {/* Editable Chapter Title Input */}
                {currentPage === 1 ? (
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setLastSaved('Unsaved Changes...');
                    }}
                    placeholder="Chapter Title..."
                    className="w-full bg-transparent font-serif text-2xl sm:text-3xl font-extrabold text-[#201710] border-b border-[#735F4A]/30 pb-2 focus:outline-none focus:border-[#735F4A] mb-3 shrink-0 relative z-20"
                  />
                ) : (
                  <div className="flex items-center justify-between border-b border-[#735F4A]/20 pb-1.5 mb-3 shrink-0 relative z-20">
                    <h3 className="font-serif text-base sm:text-lg font-bold text-[#3D2D1E] truncate italic">
                      {title || "Untitled Chapter"} <span className="text-xs font-normal opacity-75 font-sans">(Continued)</span>
                    </h3>
                    <span className="font-mono text-[11px] text-[#735F4A]">
                      Folio {currentPage}
                    </span>
                  </div>
                )}

                {/* Virtual Page ContentEditable Prose Area (Fixed Height) */}
                <div className="relative flex-1 overflow-hidden">
                  <div
                    ref={(el) => {
                      editorRef.current = el;
                      if (el && currentPageData) {
                        const targetHtml = pageContentCacheRef.current[currentPageData.id] ?? currentPageData.content ?? '<p><br></p>';
                        if (el.innerHTML !== targetHtml) {
                          el.innerHTML = targetHtml;
                        }
                        setIsPageOverCapacity(el.scrollHeight > 450);
                      }
                    }}
                    contentEditable
                    suppressContentEditableWarning
                    dangerouslySetInnerHTML={{ __html: activeFolioContent }}
                    data-placeholder="Begin penning the narrative on this folio... Describe the environment, characters, tensions, and unfolding secrets..."
                    onInput={handlePageInput}
                    onBlur={handlePageBlur}
                    onKeyDown={handleEditorKeyDown}
                    className="w-full h-[450px] max-h-[450px] overflow-y-auto bg-transparent font-serif text-base sm:text-lg md:text-[19px] text-[#221811] leading-relaxed focus:outline-none prose max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-[#8C765C] empty:before:italic empty:before:pointer-events-none pl-3 sm:pl-4 pr-1"
                    style={{
                      outline: 'none'
                    }}
                  />

                  {/* Page Capacity Reached Alert Pill */}
                  {isPageOverCapacity && (
                    <div className="absolute bottom-2 right-2 bg-[#2B2015]/95 text-[#E6C687] border border-[#8C7456] shadow-lg rounded-full px-3 py-1 flex items-center space-x-1.5 font-mono text-[11px] font-semibold animate-pulse z-30">
                      <span className="w-2 h-2 rounded-full bg-[#E5A84B] animate-ping" />
                      <span>Page Full • Click Next Page (or Ctrl+Enter)</span>
                    </div>
                  )}
                </div>

                {/* Page Footer */}
                <div className="pt-3 border-t border-[#524131]/30 flex items-center justify-between font-mono text-xs sm:text-sm text-[#544131] shrink-0 relative z-20">
                  <span>Words: <strong className="font-bold">{currentPageData?.word_count || 0}</strong> (Total: {totalWordCount})</span>
                  <span className="font-serif italic text-sm tracking-wider opacity-80">
                    — Folio {currentPage} of {pages.length} —
                  </span>
                  <span>{currentPageData?.save_status === 'saving' ? 'Saving...' : currentPageData?.save_status === 'unsaved' ? 'Unsaved Changes...' : currentPageData?.save_status === 'error' ? 'Save Error' : lastSaved}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Small Navigation Section DIRECTLY BELOW the Writing Editor */}
          <div className="flex items-center justify-between bg-[#191512] px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-xl border border-[#30261E] shadow-xl">
            {/* Previous Page Button */}
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 rounded-lg border font-mono text-xs sm:text-sm font-semibold transition-all ${
                currentPage <= 1
                  ? 'opacity-40 border-[#30261E] text-[#6A5A4A] cursor-not-allowed'
                  : 'bg-[#261E17] border-[#544332] text-[#D8C7B0] hover:text-[#FFF4E4] hover:bg-[#382C22] hover:border-[#8C7456] shadow'
              }`}
              title={currentPage <= 1 ? "First page" : "Turn to Previous Page"}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden xs:inline">Previous</span>
              <span>Page</span>
            </button>

            {/* Center Page Indicator & Interactive Page Pills */}
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs sm:text-sm font-bold tracking-wider text-[#C49A61]">
                Page {currentPage} of {pages.length}
              </span>

              {/* Clickable Page Pills */}
              <div className="hidden md:flex items-center space-x-1 ml-2">
                {pages.map((p, idx) => {
                  const pageNum = idx + 1;
                  const isActive = pageNum === currentPage;
                  return (
                    <button
                      key={p.id || pageNum}
                      onClick={() => handleJumpToPage(pageNum)}
                      className={`w-6 h-6 rounded text-xs font-mono font-bold transition-all ${
                        isActive
                          ? 'bg-[#C49A61] text-[#14100D] shadow font-extrabold scale-105'
                          : 'bg-[#292017] text-[#8C7A68] hover:text-[#E0D7C7] hover:bg-[#382D20]'
                      }`}
                      title={`Jump to Page ${pageNum}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Add Page Shortcut Button */}
              <button
                onClick={handleAddNewPage}
                className="ml-1 sm:ml-2 p-1.5 rounded-md bg-[#241C15] border border-[#4A3B2D] text-[#A69584] hover:text-[#E8D6BD] hover:border-[#8C7456] hover:bg-[#33261C] transition-colors"
                title="Insert New Blank Page"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Next Page Button */}
            <button
              onClick={handleNextPage}
              disabled={currentPage >= pages.length && !isPageOverCapacity}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 rounded-lg border font-mono text-xs sm:text-sm font-semibold transition-all ${
                currentPage >= pages.length && !isPageOverCapacity
                  ? 'opacity-40 border-[#30261E] text-[#6A5A4A] cursor-not-allowed'
                  : 'bg-[#261E17] border-[#544332] text-[#D8C7B0] hover:text-[#FFF4E4] hover:bg-[#382C22] hover:border-[#8C7456] shadow'
              }`}
              title={currentPage >= pages.length && !isPageOverCapacity ? "Last page" : "Turn to Next Page"}
            >
              <span className="hidden xs:inline">Next</span>
              <span>Page</span>
              <ChevronRight className="w-4 h-4" />
            </button>
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
