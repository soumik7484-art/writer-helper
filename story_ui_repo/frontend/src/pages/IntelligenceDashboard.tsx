import React, { useState, useEffect } from 'react';
import { useStory } from '../context/StoryContext';
import { api } from '../services/api';
import { NavTab } from '../components/common/Navbar';
import { Stamp } from '../components/common/Stamp';
import { sound } from '../services/audioService';
import { motion } from 'framer-motion';
import { 
  Activity, 
  MapPin, 
  Users, 
  Brain, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Share2, 
  Download, 
  Compass,
  ArrowRight
} from 'lucide-react';
import { Chapter, Character, TimelineEvent, Memory, PlotHole } from '../types';

interface IntelligenceDashboardProps {
  onNavigate: (tab: NavTab) => void;
}

export const IntelligenceDashboard: React.FC<IntelligenceDashboardProps> = ({ onNavigate }) => {
  const { activeStory, addToast } = useStory();

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [plotholes, setPlotholes] = useState<PlotHole[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeStory) return;
    const fetchAll = async () => {
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
      } catch (e: any) {
        console.error("Dashboard fetch error", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [activeStory]);

  const totalWords = chapters.reduce((acc, c) => acc + (c.word_count || 0), 0);
  const completedChapters = chapters.filter(c => c.status === 'completed').length;
  const progressPercent = chapters.length > 0 ? Math.round((completedChapters / chapters.length) * 100) : 0;
  const openPlotHoles = plotholes.filter(p => p.status === 'open');

  // Extract unique locations from events and memories
  const locations = Array.from(
    new Set([
      ...events.map(e => e.location).filter(Boolean),
      ...memories.map(m => m.related_location).filter(Boolean)
    ])
  ) as string[];

  // Export full story case dossier as Markdown text
  const handleExportDossier = () => {
    if (!activeStory) return;
    sound.playTypewriterKeystroke();

    let md = `# STORY CASE DOSSIER: ${activeStory.title}\n`;
    md += `Genre: ${activeStory.genre} (${activeStory.subgenre || 'General'})\n`;
    md += `Mood: ${activeStory.mood} | Setting: ${activeStory.setting} | Era: ${activeStory.time_period}\n`;
    md += `Premise: ${activeStory.description}\n\n`;

    md += `## CHAPTER PROGRESSION (${chapters.length} Chapters)\n`;
    chapters.forEach(c => {
      md += `### Chapter ${c.chapter_number}: ${c.title} [${c.status.toUpperCase()}]\n`;
      md += `${c.content}\n\n`;
    });

    md += `## SUSPECTS & CHARACTER PROFILES (${characters.length})\n`;
    characters.forEach(char => {
      md += `### ${char.name} (${char.role}) - Status: ${char.current_status}\n`;
      md += `Traits: ${char.personality_traits?.join(', ')}\n`;
      md += `Motivations: ${char.motivations}\n`;
      md += `Secrets: ${char.secrets}\n\n`;
    });

    md += `## CHRONOLOGICAL TIMELINE EVENTS (${events.length})\n`;
    events.forEach(e => {
      md += `- [Event #${e.event_number}] ${e.title} (Chapter ${e.chapter_number}) - ${e.location}\n`;
      md += `  ${e.description}\n`;
    });

    // Download blob
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeStory.title.replace(/[^a-zA-Z0-9]/g, '_')}_Case_Dossier.md`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("Dossier Exported", "Complete story case file downloaded as Markdown.", "success");
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-8 space-y-6">
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2C231B] pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C49A61]"></span>
            <span className="font-typewriter text-xs text-[#C49A61] font-bold tracking-[0.25em] uppercase">
              DEEP STORY INTELLIGENCE & UNIVERSE ANALYSIS
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-black text-[#F2E8DC] mt-1">
            Story Intelligence Dashboard
          </h1>
          <p className="font-typewriter text-xs sm:text-sm text-[#A69482] mt-1">
            Synthesized analytical overview of narrative density, character presence, and open leads.
          </p>
        </div>

        <button
          onClick={handleExportDossier}
          className="flex items-center space-x-2 px-5 py-2.5 rounded bg-[#C49A61] hover:bg-[#D6AB72] text-[#14100D] font-typewriter text-xs uppercase font-bold tracking-wider shadow transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export Complete Dossier (.MD)</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-[#1C1713] p-4 rounded-lg border border-[#382E25] shadow">
          <span className="font-typewriter text-xs sm:text-[13px] text-[#8C7A68] uppercase block">Total Words</span>
          <p className="font-serif text-2xl font-bold text-[#E5DCce] mt-1">{totalWords}</p>
          <span className="font-typewriter text-xs text-[#7A6958]">{chapters.length} Chapters</span>
        </div>

        <div className="bg-[#1C1713] p-4 rounded-lg border border-[#382E25] shadow">
          <span className="font-typewriter text-xs sm:text-[13px] text-[#8C7A68] uppercase block">Story Progress</span>
          <p className="font-serif text-2xl font-bold text-[#E5DCce] mt-1">{progressPercent}%</p>
          <span className="font-typewriter text-xs text-[#7A6958]">{completedChapters} Completed</span>
        </div>

        <div className="bg-[#1C1713] p-4 rounded-lg border border-[#382E25] shadow">
          <span className="font-typewriter text-xs sm:text-[13px] text-[#8C7A68] uppercase block">Characters</span>
          <p className="font-serif text-2xl font-bold text-[#E5DCce] mt-1">{characters.length}</p>
          <span className="font-typewriter text-xs text-[#7A6958]">Active Roster</span>
        </div>

        <div className="bg-[#1C1713] p-4 rounded-lg border border-[#382E25] shadow">
          <span className="font-typewriter text-xs sm:text-[13px] text-[#8C7A68] uppercase block">Vector Memories</span>
          <p className="font-serif text-2xl font-bold text-[#E5DCce] mt-1">{memories.length}</p>
          <span className="font-typewriter text-xs text-[#7A6958]">ChromaDB Indexed</span>
        </div>

        <div className="bg-[#1C1713] p-4 rounded-lg border border-[#382E25] shadow col-span-2 sm:col-span-1">
          <span className="font-typewriter text-xs sm:text-[13px] text-[#8C7A68] uppercase block">Continuity Flags</span>
          <p className={`font-serif text-2xl font-bold mt-1 ${openPlotHoles.length > 0 ? 'text-[#B4473E]' : 'text-[#78966A]'}`}>
            {openPlotHoles.length}
          </p>
          <span className="font-typewriter text-xs text-[#7A6958]">{openPlotHoles.length > 0 ? 'Needs Attention' : 'All Clear'}</span>
        </div>
      </div>

      {/* Grid: Character Appearance Matrix & Key Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Character Appearance Matrix */}
        <div className="lg:col-span-8 rounded-lg bg-[#1C1713] p-6 border border-[#382E25] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#2C241D] pb-3">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#C49A61]" />
              <h3 className="font-cinzel text-base font-bold text-[#E5DCce]">
                CHARACTER CHAPTER PRESENCE MATRIX
              </h3>
            </div>
            <span className="font-typewriter text-xs sm:text-[13px] text-[#8C7A68]">
              {chapters.length} CHAPTERS MAPPED
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-typewriter text-xs">
              <thead>
                <tr className="border-b border-[#2D241C] text-[#8C7A68] uppercase text-xs sm:text-[13px]">
                  <th className="py-2.5 pr-4">Character</th>
                  <th className="py-2.5 px-3">Role</th>
                  {chapters.map(c => (
                    <th key={c.id} className="py-2.5 px-2 text-center">
                      Ch.{c.chapter_number}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#261E18]">
                {characters.map(char => (
                  <tr key={char.id} className="hover:bg-[#241D17] transition-colors">
                    <td className="py-3 pr-4 font-serif font-bold text-[#E5DCce]">
                      {char.name}
                    </td>
                    <td className="py-3 px-3 text-[#A69482] text-xs sm:text-[13px]">
                      {char.role}
                    </td>
                    {chapters.map(c => {
                      // Check if character appears in this chapter content or events
                      const appearsInContent = c.content.toLowerCase().includes(char.name.toLowerCase());
                      const appearsInEvents = events.some(e => 
                        e.chapter_number === c.chapter_number && 
                        e.characters_involved?.includes(char.name)
                      );
                      const present = appearsInContent || appearsInEvents;

                      return (
                        <td key={c.id} className="py-3 px-2 text-center">
                          {present ? (
                            <span className="inline-block w-4 h-4 rounded-full bg-[#C49A61]/30 border border-[#C49A61] text-[#E0B77D] text-xs sm:text-[13px] leading-none font-bold">
                              ✓
                            </span>
                          ) : (
                            <span className="text-[#4E3F33] text-xs">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Key Locations Hotspots */}
        <div className="lg:col-span-4 rounded-lg bg-[#1C1713] p-6 border border-[#382E25] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#2C241D] pb-3">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-[#C49A61]" />
              <h3 className="font-cinzel text-base font-bold text-[#E5DCce]">
                LOCATION HOTSPOTS
              </h3>
            </div>
            <span className="font-typewriter text-xs sm:text-[13px] text-[#8C7A68]">
              {locations.length} SITES
            </span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 font-typewriter text-xs">
            {locations.map((loc, idx) => {
              const eventCount = events.filter(e => e.location === loc).length;

              return (
                <div key={idx} className="p-3 rounded bg-[#241E18] border border-[#382E24] flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-[#C49A61]">•</span>
                    <span className="font-serif font-bold text-[#EDE3D4] text-xs">{loc}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#16120E] text-[#C49A61] text-xs sm:text-[13px] border border-[#3E3125]">
                    {eventCount} Incidents
                  </span>
                </div>
              );
            })}

            {locations.length === 0 && (
              <p className="text-[#7A6958] text-center py-4">
                No distinct locations identified in timeline events.
              </p>
            )}
          </div>
        </div>

      </div>

      {/* Unresolved Mysteries & Plot Threads */}
      <div className="rounded-lg bg-[#1C1713] p-6 border border-[#382E25] shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#2C241D] pb-3">
          <div className="flex items-center space-x-2">
            <Compass className="w-4 h-4 text-[#C49A61]" />
            <h3 className="font-cinzel text-base font-bold text-[#E5DCce]">
              UNRESOLVED PLOT THREADS & ACTIVE INQUIRIES
            </h3>
          </div>
          <Stamp label="PENDING RESOLUTION" type="amber" rotation={1} size="sm" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.filter(e => e.status === 'Locked' || e.status === 'Upcoming').map((e) => (
            <div key={e.id} className="p-4 rounded bg-[#241E18] border border-[#3E3226] space-y-2 font-typewriter text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#C49A61] font-bold">EVT #{e.event_number}</span>
                <span className="px-1.5 py-0.2 rounded bg-[#352618] text-[#E0B77D] text-xs sm:text-[13px] uppercase">
                  {e.status}
                </span>
              </div>
              <h5 className="font-serif font-bold text-sm text-[#E5DCce]">{e.title}</h5>
              <p className="text-[#A69482] text-xs sm:text-[13px] font-sans leading-relaxed line-clamp-3">
                {e.description}
              </p>
              <div className="pt-2 border-t border-[#33271E] flex items-center justify-between text-xs sm:text-[13px] text-[#7A6958]">
                <span>Ch. {e.chapter_number} Target</span>
                <span>{e.location}</span>
              </div>
            </div>
          ))}

          {events.filter(e => e.status === 'Locked' || e.status === 'Upcoming').length === 0 && (
            <p className="font-typewriter text-xs text-[#7A6958] py-4 col-span-3 text-center">
              All currently recorded events have reached verified status.
            </p>
          )}
        </div>
      </div>

    </div>
  );
};
