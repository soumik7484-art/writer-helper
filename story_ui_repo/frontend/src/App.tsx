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

import { PacingAlertModal } from './components/common/PacingAlertModal';
import { CursorProvider } from './context/CursorContext';
import { CustomCursor } from './components/common/CustomCursor';

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
  const [isStudioView, setIsStudioView] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    const hash = window.location.hash.toLowerCase();

    // Check if specifically requesting studio
    if (
      path.includes('studio') ||
      search.includes('studio') ||
      hash.includes('studio') ||
      search.includes('tab') ||
      search.includes('character')
    ) {
      return true;
    }

    // Root paths or folio page always show the 3D Bookshop hero
    if (path.endsWith('folio.html') || path === '/' || path === '' || path.includes('folio')) {
      return false;
    }

    return true;
  });

  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase();

      if (
        path.includes('studio') ||
        search.includes('studio') ||
        hash.includes('studio') ||
        search.includes('tab') ||
        search.includes('character')
      ) {
        setIsStudioView(true);
      } else if (path.endsWith('folio.html') || path === '/' || path === '' || path.includes('folio')) {
        setIsStudioView(false);
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

  // Antique Fountain Pen Cursor System: Click State & Golden Ripple Effect
  useEffect(() => {
    let clickTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleMouseDown = (e: MouseEvent) => {
      // Preserve native typing/selection inside inputs, textareas, and manuscript editor
      const target = e.target as HTMLElement | null;
      const isEditable = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]') ||
        target.closest('.parchment-sheet') ||
        target.closest('.manuscript-editor')
      );

      if (isEditable) return;

      // Activate click-state fountain pen cursor briefly
      document.body.classList.add('cursor-clicking');
      if (clickTimeout) clearTimeout(clickTimeout);
      clickTimeout = setTimeout(() => {
        document.body.classList.remove('cursor-clicking');
      }, 350);

      // Spawn subtle antique golden ripple animation
      try {
        const ripple = document.createElement('div');
        ripple.className = 'antique-gold-ripple';
        ripple.style.left = `${e.clientX}px`;
        ripple.style.top = `${e.clientY}px`;
        document.body.appendChild(ripple);

        const removeRipple = () => {
          if (ripple.parentNode) {
            ripple.parentNode.removeChild(ripple);
          }
        };

        ripple.addEventListener('animationend', removeRipple, { once: true });
        setTimeout(removeRipple, 500);
      } catch (err) {
        // Graceful fallback
      }
    };

    const handleMouseUp = () => {
      if (clickTimeout) clearTimeout(clickTimeout);
      document.body.classList.remove('cursor-clicking');
    };

    window.addEventListener('mousedown', handleMouseDown, true);
    window.addEventListener('mouseup', handleMouseUp, true);

    return () => {
      if (clickTimeout) clearTimeout(clickTimeout);
      window.removeEventListener('mousedown', handleMouseDown, true);
      window.removeEventListener('mouseup', handleMouseUp, true);
      document.body.classList.remove('cursor-clicking');
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
          src="./homevideo.mp4"
        >
          <source src="./homevideo.mp4" type="video/mp4" />
          <source src="./oooooooooooo.mp4" type="video/mp4" />
          <source src="./home_studio.mp4" type="video/mp4" />
          <source src="/homevideo.mp4" type="video/mp4" />
          <source src="/oooooooooooo.mp4" type="video/mp4" />
          <source src="./assets/homevideo.mp4" type="video/mp4" />
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
        <PacingAlertModal />
      </StoryProvider>
    </AppErrorBoundary>
  );
}
