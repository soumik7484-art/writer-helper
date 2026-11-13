import React, { useState, useEffect, useRef } from 'react';
import { StoryProvider, useStory } from './context/StoryContext';
import { Navbar, NavTab } from './components/common/Navbar';
import { BookHero } from './components/common/BookHero';
import { HomeDesk } from './pages/HomeDesk';
import { MyStories } from './pages/MyStories';
import { StoryArchitect } from './pages/StoryArchitect';
import { CharacterArchive } from './pages/CharacterArchive';
import { StoryTimeline } from './pages/StoryTimeline';
import { WritingStudio } from './pages/WritingStudio';
import { UniverseMemory } from './pages/UniverseMemory';
import { PlotHoleDetector } from './pages/PlotHoleDetector';
import { IntelligenceDashboard } from './pages/IntelligenceDashboard';
import { ToastContainer } from './components/common/ToastContainer';
import { SettingsModal } from './components/common/SettingsModal';
import { motion, AnimatePresence } from 'framer-motion';

// Global error boundary protecting the application from black screens
class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("StoryWeave studio error caught by root boundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#11100F] text-[#E0D7C7] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#1C1612] border-2 border-[#8C6F48] rounded-2xl p-8 shadow-2xl space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-[#8A2B20]/20 border border-[#8A2B20] text-[#E5A8A3] flex items-center justify-center mx-auto text-2xl shadow">
              ⚠️
            </div>
            <div className="space-y-1">
              <span className="font-typewriter text-xs text-[#C49A61] uppercase tracking-widest block font-bold">
                INCIDENT LOGGED • EVIDENCE VAULT
              </span>
              <h2 className="font-serif text-2xl font-bold text-[#F4EDE2]">Case Archive Interruption</h2>
            </div>
            <p className="font-typewriter text-xs text-[#A69482] leading-relaxed">
              An unexpected condition occurred while reconstructing the investigative stage. Archival records remain safe in storage.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  window.location.search = '?view=studio&tab=characters';
                }}
                className="px-5 py-2.5 rounded-lg bg-[#C49A61] hover:bg-[#D6AB72] text-[#14100D] font-typewriter text-xs font-bold uppercase shadow transition-transform hover:scale-105"
              >
                Return to Characters Board
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2.5 rounded-lg bg-[#2B2016] text-[#E0B77D] hover:bg-[#3D2D20] font-typewriter text-xs font-bold uppercase transition-colors"
              >
                Reload Archives
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const MainContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    if (typeof window === 'undefined') return 'home';
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as NavTab | null;
    const validTabs: NavTab[] = ['home', 'stories', 'architect', 'characters', 'timeline', 'studio', 'memory', 'plotholes', 'intelligence'];
    if (tabParam && validTabs.includes(tabParam)) {
      return tabParam;
    }
    if (params.get('characterId') || window.location.hash.includes('character')) {
      return 'characters';
    }
    return 'home';
  });

  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('characterId') || null;
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  useStory();

  // Check whether user requested the Studio view or the Landing Hero view
  // Defensively defaults to true to prevent black screens on reload or in development
  const [isStudioView, setIsStudioView] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    const hash = window.location.hash.toLowerCase();

    // Check if specifically requesting folio hero
    if (path.includes('folio') || search.includes('folio') || hash.includes('folio')) {
      return false;
    }

    try {
      const saved = localStorage.getItem('storyweave_active_view');
      if (saved === 'studio') return true;
      if (saved === 'folio') return false;
    } catch {}

    // On Vite dev server or if query has studio/tab/character, show studio
    if (
      window.location.port === '5173' ||
      path.includes('studio') ||
      search.includes('studio') ||
      hash.includes('studio') ||
      search.includes('tab') ||
      search.includes('character')
    ) {
      return true;
    }

    // If static file server at root and not studio
    if (path.endsWith('folio.html') || path === '/' || path === '') {
      return false;
    }

    return true;
  });

  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase();

      if (path.includes('folio') || search.includes('folio') || hash.includes('folio')) {
        setIsStudioView(false);
        return;
      }

      try {
        const saved = localStorage.getItem('storyweave_active_view');
        if (saved === 'studio') {
          setIsStudioView(true);
        }
      } catch {}

      if (
        window.location.port === '5173' ||
        path.includes('studio') ||
        search.includes('studio') ||
        hash.includes('studio') ||
        search.includes('tab') ||
        search.includes('character')
      ) {
        setIsStudioView(true);
      }

      // Sync tab & character selection from URL
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as NavTab | null;
      if (tabParam) setCurrentTab(tabParam);
      const charParam = params.get('characterId');
      if (charParam !== undefined) setActiveCharacterId(charParam);
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  useEffect(() => {
    if (isStudioView && videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  }, [isStudioView]);

  const handleNavigate = (tab: NavTab, characterId?: string) => {
    setCurrentTab(tab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      if (characterId) {
        setActiveCharacterId(characterId);
        url.searchParams.set('characterId', characterId);
      } else {
        setActiveCharacterId(null);
        url.searchParams.delete('characterId');
      }
      window.history.pushState({}, '', url.toString());
    } catch (e) {
      console.warn("URL state sync error:", e);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEnterStudio = () => {
    try {
      localStorage.setItem('storyweave_active_view', 'studio');
    } catch {}

    const isStatic = window.location.pathname.includes('.html') || window.location.port === '3000';
    if (isStatic && !window.location.pathname.includes('studio.html')) {
      window.location.href = './studio.html';
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'studio');
      window.history.pushState({}, '', url.toString());
      setIsStudioView(true);
      window.scrollTo(0, 0);
    }
  };

  // 1. LANDING PAGE VIEW: Dedicated 3D Bookshop Landing Page (when explicitly on folio)
  if (!isStudioView) {
    return (
      <div className="w-full h-screen overflow-hidden bg-black select-none">
        <BookHero onContinue={handleEnterStudio} />
      </div>
    );
  }

  // 2. STUDIO VIEW: Dedicated StoryWeave Investigation Studio
  return (
    <div className="min-h-screen bg-[#11100F] text-[#E0D7C7] flex flex-col font-sans selection:bg-[#C49A61]/30 selection:text-white w-full max-w-full overflow-x-hidden">
      {/* Full-Page Looping Background Video behind StoryWeave AI Dashboard */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
          src="./storyvideo.mp4"
        >
          <source src="./storyvideo.mp4" type="video/mp4" />
          <source src="/storyvideo.mp4" type="video/mp4" />
        </video>
        {/* Subtle dark overlay for contrast */}
        <div className="absolute inset-0 bg-[#0C0A08]/75 pointer-events-none" />
      </div>

      {/* Top Investigator Journal Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => handleNavigate(tab)}
        onOpenSettings={() => setSettingsOpen(false)}
      />

      {/* Main Investigation Stage */}
      <main className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {currentTab === 'home' && (
              <HomeDesk onNavigate={(tab, charId) => handleNavigate(tab, charId)} />
            )}
            {currentTab === 'stories' && <MyStories onNavigate={handleNavigate} />}
            {currentTab === 'architect' && <StoryArchitect onNavigate={handleNavigate} />}
            {currentTab === 'characters' && (
              <CharacterArchive
                initialCharacterId={activeCharacterId}
                onSelectCharacterId={(id) => handleNavigate('characters', id || undefined)}
              />
            )}
            {currentTab === 'timeline' && <StoryTimeline onNavigate={handleNavigate} />}
            {currentTab === 'studio' && <WritingStudio />}
            {currentTab === 'memory' && <UniverseMemory />}
            {currentTab === 'plotholes' && <PlotHoleDetector onNavigate={handleNavigate} />}
            {currentTab === 'intelligence' && <IntelligenceDashboard onNavigate={handleNavigate} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* System Toast Alerts */}
      <ToastContainer />

      {/* Settings / Telemetry Diagnostics Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppErrorBoundary>
      <StoryProvider>
        <MainContent />
      </StoryProvider>
    </AppErrorBoundary>
  );
}
