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

const MainContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  useStory();

  // Check whether user requested the Studio view or the Landing Hero view
  const [isStudioView, setIsStudioView] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return path.includes('studio') || search.includes('studio') || hash.includes('studio');
  });

  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      setIsStudioView(path.includes('studio') || search.includes('studio') || hash.includes('studio'));
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

  const handleNavigate = (tab: NavTab) => {
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEnterStudio = () => {
    const isStatic = window.location.pathname.includes('.html') || window.location.port === '3000';
    if (isStatic) {
      window.location.href = './studio.html';
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'studio');
      window.history.pushState({}, '', url.toString());
      setIsStudioView(true);
      window.scrollTo(0, 0);
    }
  };

  // 1. LANDING PAGE VIEW: Dedicated 3D Bookshop Landing Page (No underneath section)
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
        onSelectTab={handleNavigate}
        onOpenSettings={() => setSettingsOpen(true)}
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
            {currentTab === 'home' && <HomeDesk onNavigate={handleNavigate} />}
            {currentTab === 'stories' && <MyStories onNavigate={handleNavigate} />}
            {currentTab === 'architect' && <StoryArchitect onNavigate={handleNavigate} />}
            {currentTab === 'characters' && <CharacterArchive />}
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
    <StoryProvider>
      <MainContent />
    </StoryProvider>
  );
}
