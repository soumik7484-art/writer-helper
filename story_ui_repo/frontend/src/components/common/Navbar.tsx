import React, { useState, useEffect, useRef } from 'react';
import { useStory } from '../../context/StoryContext';
import { sound } from '../../services/audioService';
import { 
  Compass, 
  BookOpen, 
  Feather, 
  Users, 
  GitBranch, 
  Brain, 
  AlertTriangle, 
  PenTool, 
  Volume2, 
  VolumeX, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  Activity,
  Plus
} from 'lucide-react';

export type NavTab = 
  | 'home'
  | 'stories'
  | 'architect'
  | 'characters'
  | 'timeline'
  | 'memory'
  | 'plotholes'
  | 'studio'
  | 'intelligence';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenSettings,
}) => {
  const { stories, activeStory, setActiveStoryId } = useStory();
  const [isAudioMuted, setIsAudioMuted] = useState(sound.getMuted());
  const [storyDropdownOpen, setStoryDropdownOpen] = useState(false);
  
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    return sound.subscribe((muted) => {
      setIsAudioMuted(muted);
    });
  }, []);

  const toggleSound = () => {
    const muted = sound.toggleMute();
    setIsAudioMuted(muted);
    sound.playPaperRustle();
  };

  // Check scroll position to dynamically show scroll chevrons and gradient masks
  const checkScroll = () => {
    if (!tabScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = tabScrollRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [stories]);

  // Automatically scroll active tab into view when changed
  useEffect(() => {
    if (!tabScrollRef.current) return;
    const activeBtn = tabScrollRef.current.querySelector<HTMLElement>('[data-active="true"]');
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
    setTimeout(checkScroll, 200);
  }, [currentTab]);

  // Click scroll buttons
  const handleScroll = (direction: 'left' | 'right') => {
    if (!tabScrollRef.current) return;
    const offset = 260;
    tabScrollRef.current.scrollBy({
      left: direction === 'left' ? -offset : offset,
      behavior: 'smooth'
    });
    setTimeout(checkScroll, 300);
  };

  // Close story dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStoryDropdownOpen(false);
      }
    };
    if (storyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [storyDropdownOpen]);

  const navItems = [
    { id: 'home', label: "Writer's Desk", icon: Compass, badge: null },
    { id: 'stories', label: 'Case Archives', icon: BookOpen, badge: stories.length },
    { id: 'architect', label: 'Story Architect', icon: Feather, badge: null },
    { id: 'characters', label: 'Dossiers', icon: Users, badge: null },
    { id: 'timeline', label: 'Story Timeline', icon: GitBranch, badge: 'KEY' },
    { id: 'memory', label: 'Universe Memory', icon: Brain, badge: null },
    { id: 'plotholes', label: 'Investigation Board', icon: AlertTriangle, badge: 'AI' },
    { id: 'studio', label: 'Writing Studio', icon: PenTool, badge: null },
    { id: 'intelligence', label: 'Intelligence', icon: Activity, badge: null },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#16120E]/95 backdrop-blur-md border-b border-[#2C241D] shadow-2xl">
      {/* Top Investigator Status Bar */}
      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8 py-3 sm:py-3.5 flex items-center justify-between gap-3 sm:gap-4 md:gap-6 border-b border-[#241D17] min-w-0">
        
        {/* Left: Brand & Active Story Dossier Selector */}
        <div className="flex items-center gap-3 sm:gap-4 md:gap-5 min-w-0 flex-1 sm:flex-initial">
          {/* Brand Logo & Title */}
          <div 
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group shrink-0"
            role="button"
            tabIndex={0}
            title="Return to Writer's Desk"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-gradient-to-br from-[#C49A61] to-[#7A5A2B] p-0.5 shadow-md flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#18130F] rounded-[6px] flex items-center justify-center">
                <span className="font-serif text-lg sm:text-xl font-bold text-[#F3D4A0] group-hover:scale-105 transition-transform">
                  SW
                </span>
              </div>
            </div>
            <div className="flex flex-col shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold tracking-wide text-lg sm:text-xl text-[#F5EDE3] whitespace-nowrap">
                  StoryWeave
                </span>
                <span className="px-2 py-0.5 text-xs font-sans font-bold tracking-wider bg-[#C49A61]/25 text-[#E5BA78] rounded border border-[#C49A61]/40 uppercase">
                  Studio
                </span>
              </div>
              <p className="hidden md:block font-sans text-xs sm:text-[13px] text-[#A89886] whitespace-nowrap -mt-0.5">
                Investigative Journal & Co-Writer
              </p>
            </div>
          </div>

          {/* Subtle vertical separator */}
          <div className="hidden sm:block h-7 w-px bg-[#2D241C] shrink-0" />

          {/* Active Story Dropdown Selector */}
          <div ref={dropdownRef} className="relative min-w-0 flex-shrink">
            <button
              onClick={() => setStoryDropdownOpen(!storyDropdownOpen)}
              className="flex items-center gap-2.5 h-10 sm:h-11 px-3 sm:px-3.5 rounded-lg bg-[#1D1713] hover:bg-[#251E18] border border-[#3A2F25] hover:border-[#C49A61]/60 transition-all text-left shadow-sm min-w-0 max-w-[160px] xs:max-w-[210px] sm:max-w-[260px] md:max-w-[320px]"
              title={activeStory?.title || "Select Case Dossier"}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-[#C49A61] shrink-0 animate-pulse"></div>
              <div className="min-w-0 flex-1 truncate">
                <span className="block font-serif text-sm sm:text-base font-bold text-[#F5EDE3] truncate leading-tight">
                  {activeStory?.title || "No Case Selected"}
                </span>
                <span className="block font-sans text-xs sm:text-[13px] text-[#B09F8F] truncate mt-0.5">
                  {activeStory?.genre || "Archive"} • {activeStory?.chapter_count || 0} Ch
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-[#A89886] shrink-0 ml-0.5" />
            </button>

            {/* Dropdown Menu */}
            {storyDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] rounded-xl bg-[#1C1612] border border-[#3E3228] shadow-2xl z-50 p-2.5 text-sm animate-in fade-in zoom-in-95 duration-100">
                <div className="font-sans text-xs sm:text-[13px] font-semibold text-[#A89886] uppercase px-3 py-1.5 tracking-wider border-b border-[#2C231B] flex justify-between items-center">
                  <span>Active Case Dossiers</span>
                  <span className="text-[#C49A61] font-bold">{stories.length} Open</span>
                </div>
                <div className="max-h-60 overflow-y-auto py-1.5 space-y-1">
                  {stories.map(s => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setActiveStoryId(s.id);
                        setStoryDropdownOpen(false);
                      }}
                      className={`px-3 py-2.5 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                        activeStory?.id === s.id
                          ? 'bg-[#C49A61]/20 text-[#E0B77D] border border-[#C49A61]/45'
                          : 'hover:bg-[#261E18] text-[#CDBFA8]'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <p className="font-serif font-bold text-sm sm:text-base truncate text-[#F4ECE2]">{s.title}</p>
                        <p className="font-sans text-xs sm:text-[13px] text-[#A08F7E] mt-0.5">{s.genre} • {s.mood}</p>
                      </div>
                      <span className="font-sans text-xs sm:text-sm text-[#C49A61] font-semibold shrink-0">
                        {s.chapter_count || 6} ch
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[#2C231B] pt-2 mt-1">
                  <button
                    onClick={() => {
                      setStoryDropdownOpen(false);
                      onSelectTab('architect');
                    }}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg bg-[#C49A61]/25 hover:bg-[#C49A61]/35 text-[#E0B77D] border border-[#C49A61]/45 font-sans font-semibold text-xs sm:text-sm transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Open New Story Dossier</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Ambient Sound, Settings, Storyteller Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Ambient Sound Switch */}
          <button
            onClick={toggleSound}
            title={isAudioMuted ? "Turn on rain & desk ambient sound" : "Mute ambient sound"}
            className={`flex items-center gap-2 h-10 sm:h-11 px-3 sm:px-4 rounded-lg border transition-all text-xs sm:text-sm font-sans font-medium shadow-sm shrink-0 ${
              !isAudioMuted
                ? 'bg-[#C49A61]/25 border-[#C49A61] text-[#E0B77D]'
                : 'bg-[#1D1713] border-[#382E25] text-[#9E8C7B] hover:text-[#D4C5B2] hover:border-[#4D3F33]'
            }`}
          >
            {!isAudioMuted ? (
              <>
                <Volume2 className="w-4 h-4 text-[#C49A61] animate-pulse shrink-0" />
                <span className="hidden lg:inline whitespace-nowrap text-sm font-medium">Ambient Rain</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-[#7A6A5A] shrink-0" />
                <span className="hidden lg:inline whitespace-nowrap text-sm font-medium">Muted</span>
              </>
            )}
          </button>

          {/* Settings / Diagnostics Modal Trigger */}
          <button
            onClick={onOpenSettings}
            className="h-10 sm:h-11 px-3 sm:px-4 rounded-lg bg-[#1D1713] border border-[#382E25] hover:border-[#C49A61]/50 text-[#B8A796] hover:text-[#E0B77D] transition-all font-sans text-xs sm:text-sm font-medium shadow-sm flex items-center gap-1.5 shrink-0"
            title="System Diagnostics & Engine Status"
          >
            <span className="text-base">⚙️</span>
            <span className="hidden sm:inline whitespace-nowrap text-sm font-medium">Settings</span>
          </button>

          {/* User Badge */}
          <div className="flex items-center gap-2.5 pl-2.5 sm:pl-3.5 border-l border-[#2C231B] shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#261E18] border border-[#C49A61]/50 flex items-center justify-center shadow-inner shrink-0 ring-1 ring-[#C49A61]/20">
              <span className="font-serif text-xs sm:text-sm font-bold text-[#E0B77D]">ST</span>
            </div>
            <div className="hidden xl:block shrink-0">
              <p className="font-serif text-sm font-bold text-[#F4ECE2] leading-tight whitespace-nowrap">Storyteller</p>
              <p className="font-sans text-xs text-[#A89886] leading-tight whitespace-nowrap">Senior Investigator</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Journal Navigation Tabs (Folder Divider Tabs) */}
      <div className="w-full bg-[#140F0C] border-t border-[#231C16] relative">
        <div className="w-full max-w-[1600px] mx-auto relative px-2 sm:px-4 lg:px-6">
          {/* Left scroll chevron */}
          {canScrollLeft && (
            <button
              onClick={() => handleScroll('left')}
              className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#1D1712]/95 border border-[#3E3126] text-[#C49A61] hover:text-[#F3D4A0] hover:bg-[#282019] flex items-center justify-center shadow-lg transition-all"
              title="Scroll tabs left"
              aria-label="Scroll tabs left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Left Fade Gradient Mask */}
          {canScrollLeft && (
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-r from-[#140F0C] to-transparent z-10" />
          )}

          {/* Tabs flex track */}
          <div 
            ref={tabScrollRef}
            onScroll={checkScroll}
            className="w-full overflow-x-auto scroll-smooth scrollbar-none flex items-center gap-2 pt-2 px-1 pb-0"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  data-tab={item.id}
                  data-active={isActive ? 'true' : 'false'}
                  onClick={() => {
                    sound.playPaperRustle();
                    onSelectTab(item.id as NavTab);
                  }}
                  className={`group relative h-12 sm:h-[50px] px-4 sm:px-5 md:px-5 rounded-t-lg transition-all font-sans text-sm sm:text-[15px] md:text-base whitespace-nowrap flex items-center gap-2.5 shrink-0 ${
                    isActive
                      ? 'bg-[#282019] text-[#F3D4A0] font-bold shadow-lg border-t-2 border-[#C49A61] border-x border-[#46382B]'
                      : 'bg-[#18130F] text-[#A69684] hover:bg-[#201A14] hover:text-[#EDE3D6] border-t border-x border-[#2C231B] font-medium'
                  }`}
                >
                  <Icon className={`w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0 transition-colors ${
                    isActive ? 'text-[#C49A61]' : 'text-[#857361] group-hover:text-[#C49A61]'
                  }`} />
                  <span className="shrink-0 tracking-wide">{item.label}</span>

                  {item.badge !== null && item.badge !== undefined && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      isActive
                        ? 'bg-[#8F332B] text-white shadow-sm'
                        : 'bg-[#2B2118] text-[#C49A61] border border-[#C49A61]/35'
                    }`}>
                      {item.badge}
                    </span>
                  )}

                  {/* Active Tab Glow & Indicator */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#C49A61] shadow-[0_0_8px_rgba(196,154,97,0.7)]"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Fade Gradient Mask */}
          {canScrollRight && (
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-l from-[#140F0C] to-transparent z-10" />
          )}

          {/* Right scroll chevron */}
          {canScrollRight && (
            <button
              onClick={() => handleScroll('right')}
              className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#1D1712]/95 border border-[#3E3126] text-[#C49A61] hover:text-[#F3D4A0] hover:bg-[#282019] flex items-center justify-center shadow-lg transition-all"
              title="Scroll tabs right"
              aria-label="Scroll tabs right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
