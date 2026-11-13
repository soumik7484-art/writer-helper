import React, { useState, useEffect } from 'react';
import { useStory } from '../context/StoryContext';
import { api } from '../services/api';
import { NavTab } from '../components/common/Navbar';
import { MetalClipboard } from '../components/common/MetalClipboard';
import { Polaroid } from '../components/common/Polaroid';
import { Stamp } from '../components/common/Stamp';
import { sound } from '../services/audioService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitBranch, 
  Plus, 
  Sparkles, 
  MapPin, 
  Users, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Lock, 
  ArrowRight, 
  ArrowLeft, 
  Filter, 
  Edit3, 
  Trash2, 
  AlertCircle,
  X,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { TimelineEvent, EventStatus, EventCategory, Chapter } from '../types';

interface StoryTimelineProps {
  onNavigate: (tab: NavTab) => void;
}

export const StoryTimeline: React.FC<StoryTimelineProps> = ({ onNavigate }) => {
  const { activeStory, setActiveChapterId, addToast } = useStory();

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCharacter, setSelectedCharacter] = useState<string>('all');
  const [sortAscending, setSortAscending] = useState<boolean>(true);

  // Selected Event for Deep Inspection
  const [inspectEvent, setInspectEvent] = useState<TimelineEvent | null>(null);

  // Edit / Create Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<TimelineEvent> | null>(null);

  const fetchTimelineData = async () => {
    if (!activeStory) return;
    try {
      setLoading(true);
      const [evts, chaps] = await Promise.all([
        api.getStoryTimeline(activeStory.id),
        api.getStoryChapters(activeStory.id)
      ]);
      setEvents(evts);
      setChapters(chaps);
      if (evts.length > 0 && !inspectEvent) {
        setInspectEvent(evts[0]);
      }
    } catch (e: any) {
      addToast("Failed to load timeline", e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimelineData();
  }, [activeStory]);

  // AI Extraction from Chapter
  const handleExtractEvents = async () => {
    if (!activeStory || chapters.length === 0) {
      addToast("Extraction Notice", "Please create at least one chapter with text to extract events.", "warning");
      return;
    }

    try {
      setExtracting(true);
      sound.playTypewriterKeystroke();
      const latestChapter = chapters[chapters.length - 1];
      const res = await api.extractEventsFromChapter(activeStory.id, latestChapter.id);
      addToast("Chronology Extracted", `AI identified ${res.extracted_count} key plot events from Chapter ${latestChapter.chapter_number}.`, "success");
      sound.playPaperRustle();
      await fetchTimelineData();
    } catch (e: any) {
      addToast("Extraction Failed", e.message || "Failed to extract timeline events.", "error");
    } finally {
      setExtracting(false);
    }
  };

  const handleSaveEvent = async (eventData: Partial<TimelineEvent>) => {
    if (!activeStory || !eventData.title?.trim()) return;
    try {
      if (eventData.id) {
        await api.updateTimelineEvent(eventData.id, eventData);
        addToast("Evidence Updated", `Event #${eventData.event_number} modified.`, "success");
      } else {
        const nextNum = events.length + 1;
        await api.createTimelineEvent(activeStory.id, {
          ...eventData,
          event_number: nextNum,
          chronological_position: (eventData.chapter_number || 1) + (nextNum * 0.1),
        });
        addToast("Evidence Pinned", "New timeline event added.", "success");
      }
      setEditModalOpen(false);
      setEditingEvent(null);
      await fetchTimelineData();
    } catch (e: any) {
      addToast("Save Failed", e.message, "error");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm("Remove this evidence marker from the timeline?")) return;
    try {
      await api.deleteTimelineEvent(eventId);
      addToast("Evidence Removed", "Timeline marker unpinned.", "info");
      if (inspectEvent?.id === eventId) setInspectEvent(null);
      await fetchTimelineData();
    } catch (e: any) {
      addToast("Error", "Could not delete event.", "error");
    }
  };

  // Jump to writing studio on that chapter
  const handleOpenChapter = (chapterId?: string) => {
    if (chapterId) {
      setActiveChapterId(chapterId);
    }
    sound.playPaperRustle();
    onNavigate('studio');
  };

  // Unique characters in timeline for filter
  const allCharacters = Array.from(
    new Set(events.flatMap(e => e.characters_involved || []))
  );

  // Filtered and Sorted Events
  const filteredEvents = events.filter(e => {
    if (selectedCategory !== 'all' && e.category !== selectedCategory) return false;
    if (selectedCharacter !== 'all' && !e.characters_involved?.includes(selectedCharacter)) return false;
    return true;
  }).sort((a, b) => {
    const posA = a.chronological_position || a.event_number;
    const posB = b.chronological_position || b.event_number;
    return sortAscending ? posA - posB : posB - posA;
  });

  const getStatusBadge = (status: EventStatus) => {
    switch (status) {
      case 'Completed':
        return <Stamp label="VERIFIED EVENT" type="green" rotation={1} size="sm" />;
      case 'Current':
        return <Stamp label="ACTIVE SCENE" type="amber" rotation={-2} size="sm" />;
      case 'Upcoming':
        return <Stamp label="FORECASTED" type="blue" rotation={1} size="sm" />;
      case 'Locked':
        return <Stamp label="UNRESOLVED LOCK" type="red" rotation={-1} size="sm" />;
      case 'Revised':
        return <Stamp label="REVISED EVIDENCE" type="amber" rotation={2} size="sm" />;
      default:
        return <Stamp label="RECORDED" type="amber" size="sm" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-8 space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2C231B] pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B4473E] animate-ping"></span>
            <span className="font-typewriter text-xs text-[#C49A61] font-bold tracking-[0.25em] uppercase">
              PHASMOPHOBIA JOURNAL SIGNATURE FEATURE
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-black text-[#F2E8DC] mt-1">
            Story Timeline & Evidence Board
          </h1>
          <p className="font-typewriter text-xs sm:text-sm text-[#A69482] mt-1">
            Connected chronological incident log extracted from your narrative universe.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* AI Event Extraction Button */}
          <button
            onClick={handleExtractEvents}
            disabled={extracting}
            className="flex items-center space-x-2 px-4 py-2 rounded bg-[#2A2016] hover:bg-[#3D2E20] text-[#E0B77D] border border-[#C49A61]/50 font-typewriter text-xs uppercase font-bold tracking-wider shadow transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-[#C49A61]" />
            <span>{extracting ? "Extracting Evidence..." : "Extract Events via AI"}</span>
          </button>

          {/* Add Manual Event */}
          <button
            onClick={() => {
              setEditingEvent({
                title: '',
                description: '',
                location: '',
                characters_involved: [],
                consequences: [],
                status: 'Current',
                category: 'plot_turn',
                chapter_number: 1,
              });
              setEditModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 rounded bg-[#C49A61] hover:bg-[#D6AB72] text-[#14100D] font-typewriter text-xs uppercase font-bold tracking-wider shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Pin New Event</span>
          </button>
        </div>
      </div>

      {/* Filtering and Sort Toolbar */}
      <div className="bg-[#191512] p-3 rounded-lg border border-[#30261E] flex flex-wrap items-center justify-between gap-4 font-typewriter text-xs">
        
        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <Filter className="w-3.5 h-3.5 text-[#8C7A68] shrink-0 mr-1" />
          {[
            { id: 'all', label: 'All Incidents' },
            { id: 'plot_turn', label: 'Plot Turns' },
            { id: 'conflict', label: 'Conflicts' },
            { id: 'revelation', label: 'Revelations' },
            { id: 'discovery', label: 'Discoveries' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded tracking-wider uppercase transition-colors shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-[#C49A61] text-[#14100D] font-bold shadow'
                  : 'bg-[#221B16] text-[#8C7A68] hover:text-[#CBBCA9]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Character Filter & Sort */}
        <div className="flex items-center space-x-3">
          {allCharacters.length > 0 && (
            <div className="flex items-center space-x-1.5">
              <span className="text-[#8C7A68] uppercase text-xs sm:text-[13px]">Filter Character:</span>
              <select
                value={selectedCharacter}
                onChange={(e) => setSelectedCharacter(e.target.value)}
                className="bg-[#241D17] border border-[#3E3226] text-[#E0B77D] rounded px-2 py-1 text-xs focus:outline-none"
              >
                <option value="all">All Characters</option>
                {allCharacters.map(char => (
                  <option key={char} value={char}>{char}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setSortAscending(!sortAscending)}
            className="px-2.5 py-1 rounded bg-[#241D17] border border-[#3E3226] text-[#A69482] hover:text-white uppercase text-xs sm:text-[13px] tracking-wider"
          >
            Chronology: {sortAscending ? '1 → 10' : '10 → 1'}
          </button>
        </div>
      </div>

      {/* Main Investigation Clipboard Container */}
      <MetalClipboard
        title="CHRONOLOGICAL INCIDENT LEDGER & EVIDENCE BOARD"
        subtitle={`Story Universe: ${activeStory?.title || 'Unknown'} • Filtered: ${filteredEvents.length} Event Cards Pinned`}
        stampText="OFFICIAL TIMELINE"
        stampType="amber"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left / Center Column: Connected Vertical Chronological Timeline */}
          <div className="lg:col-span-7 space-y-6 relative">
            
            {/* The Evidence Yarn / Red Thread connecting events */}
            <div className="absolute top-6 bottom-6 left-6 sm:left-8 w-0.5 border-l-2 border-dashed border-[#B4473E] opacity-75 z-0"></div>

            {filteredEvents.map((evt, idx) => {
              const isSelected = inspectEvent?.id === evt.id;

              return (
                <motion.div
                  key={evt.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`relative z-10 pl-14 sm:pl-16 group cursor-pointer`}
                  onClick={() => {
                    sound.playPaperRustle();
                    setInspectEvent(evt);
                  }}
                >
                  {/* Pin Node on the Yarn Line */}
                  <div className={`absolute left-4 sm:left-6 -translate-x-1/2 top-4 w-5 h-5 rounded-full flex items-center justify-center shadow-lg transition-transform ${
                    isSelected
                      ? 'bg-[#B4473E] ring-4 ring-[#8F332B]/30 scale-125'
                      : 'bg-[#8F332B] group-hover:scale-110'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  </div>

                  {/* Pinned Event Card */}
                  <div className={`p-4 sm:p-5 rounded-md border-2 transition-all relative ${
                    isSelected
                      ? 'bg-[#DFD1B8] border-[#8F332B] shadow-xl'
                      : 'bg-[#D6C7AA] hover:bg-[#DDD0B7] border-[#8A7358] shadow-md'
                  }`}>
                    {/* Event Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#6E5943]/30 pb-2 mb-2.5">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-[#2B2016] text-[#E0B77D] font-typewriter font-bold text-xs">
                          EVT #{evt.event_number}
                        </span>
                        <span className="font-typewriter text-xs sm:text-[13px] text-[#695441] font-bold uppercase">
                          Chapter {evt.chapter_number || 1}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {getStatusBadge(evt.status)}
                      </div>
                    </div>

                    {/* Event Title & Summary */}
                    <h3 className="font-serif text-lg font-bold text-[#1F1710] group-hover:text-[#802D26] transition-colors">
                      {evt.title}
                    </h3>
                    <p className="font-serif text-xs text-[#382E24] mt-1 leading-relaxed line-clamp-2">
                      {evt.description}
                    </p>

                    {/* Metadata Footer: Location & Characters */}
                    <div className="mt-3 pt-2.5 border-t border-[#6E5943]/25 flex flex-wrap items-center justify-between gap-2 font-typewriter text-xs sm:text-[13px]">
                      {evt.location && (
                        <span className="flex items-center space-x-1 text-[#695340]">
                          <MapPin className="w-3 h-3 text-[#8F332B]" />
                          <span>{evt.location}</span>
                        </span>
                      )}

                      {evt.characters_involved && evt.characters_involved.length > 0 && (
                        <div className="flex items-center space-x-1 text-[#483B2E]">
                          <Users className="w-3 h-3 text-[#C49A61]" />
                          <span>{evt.characters_involved.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {filteredEvents.length === 0 && !loading && (
              <div className="p-10 text-center bg-[#D6C7AA] rounded border border-[#8A7358]">
                <p className="font-typewriter text-xs text-[#6E5945]">
                  No events match the selected criteria. Pin an event or use AI extraction.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Deep Evidence Inspection Dossier Panel */}
          <div className="lg:col-span-5 sticky top-28 space-y-4">
            {inspectEvent ? (
              <motion.div
                key={inspectEvent.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-[#D9CBB0] p-5 sm:p-6 rounded-md border-2 border-[#8C765C] shadow-lg space-y-4"
              >
                <div className="flex items-center justify-between border-b border-[#6E5943]/40 pb-3">
                  <div>
                    <span className="font-typewriter text-xs sm:text-[13px] text-[#7A644E] uppercase tracking-wider block">
                      INSPECTED EVIDENCE CASE #{inspectEvent.event_number}
                    </span>
                    <h3 className="font-serif text-xl font-bold text-[#1C150F]">
                      {inspectEvent.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => {
                      setEditingEvent(inspectEvent);
                      setEditModalOpen(true);
                    }}
                    className="p-1.5 rounded bg-[#35281D] hover:bg-[#473729] text-[#E0B77D] transition-colors"
                    title="Edit Event"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Evidence Photograph */}
                <div className="flex justify-center my-2">
                  <Polaroid
                    imageUrl={inspectEvent.illustration_url || "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=600&auto=format&fit=crop"}
                    caption={inspectEvent.location || "Scene Evidence"}
                    subcaption={`Sequence: ${inspectEvent.chronological_position}`}
                    rotation={1}
                    size="sm"
                  />
                </div>

                {/* Full Description */}
                <div className="space-y-1 font-serif text-xs text-[#2A2016]">
                  <strong className="font-typewriter text-xs sm:text-[13px] text-[#78634D] uppercase block">
                    COMPLETE NARRATIVE RECORD:
                  </strong>
                  <p className="leading-relaxed bg-[#E4D9C3] p-3 rounded border border-[#9A846A]">
                    {inspectEvent.description}
                  </p>
                </div>

                {/* Narrative Consequences */}
                {inspectEvent.consequences && inspectEvent.consequences.length > 0 && (
                  <div className="space-y-1 font-typewriter text-xs">
                    <strong className="text-xs sm:text-[13px] text-[#78634D] uppercase block">
                      RIPPLE CONSEQUENCES & LORE IMPACT:
                    </strong>
                    <ul className="space-y-1 bg-[#E4D9C3] p-2.5 rounded border border-[#9A846A]">
                      {inspectEvent.consequences.map((c, i) => (
                        <li key={i} className="text-[#382D22] flex items-start space-x-1.5">
                          <span className="text-[#8F332B] font-bold">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Buttons: Jump to Chapter & Delete */}
                <div className="pt-3 border-t border-[#6E5943]/30 flex items-center justify-between font-typewriter text-xs">
                  <button
                    onClick={() => handleDeleteEvent(inspectEvent.id)}
                    className="text-[#8F332B] hover:text-[#B4473E] flex items-center space-x-1 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Unpin Event</span>
                  </button>

                  <button
                    onClick={() => handleOpenChapter(inspectEvent.chapter_id)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#2B2016] text-[#E0B77D] hover:bg-[#3D2D20] font-bold uppercase transition-colors"
                  >
                    <span>Open Chapter {inspectEvent.chapter_number || 1}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="bg-[#D6C7AA] p-8 text-center rounded border border-[#8C765C]">
                <p className="font-typewriter text-xs text-[#6E5945]">
                  Click any event card in the timeline to inspect full evidence, consequences, and linked scene chapters.
                </p>
              </div>
            )}
          </div>

        </div>
      </MetalClipboard>

      {/* EVENT CREATE / EDIT MODAL */}
      <AnimatePresence>
        {editModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto parchment-sheet p-6 sm:p-8 rounded-lg border-2 border-[#8F7454] shadow-2xl text-[#2B2117]"
            >
              <button
                onClick={() => setEditModalOpen(false)}
                className="absolute top-4 right-4 text-[#5E4D3E] hover:text-black p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="border-b border-[#6E5A44]/40 pb-3 mb-5">
                <span className="font-typewriter text-xs font-bold text-[#8A332B] uppercase tracking-wider">
                  TIMELINE EVIDENCE LOG
                </span>
                <h3 className="font-serif text-2xl font-bold text-[#1E1711]">
                  {editingEvent?.id ? `Edit Event #${editingEvent.event_number}` : "Pin New Timeline Incident"}
                </h3>
              </div>

              <div className="space-y-4 font-typewriter text-xs">
                <div>
                  <label className="block font-bold uppercase mb-1">Event Incident Title *</label>
                  <input
                    type="text"
                    value={editingEvent?.title || ''}
                    onChange={(e) => setEditingEvent(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Infiltration of the Grotto"
                    className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] font-serif font-bold text-sm text-[#231A13]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold uppercase mb-1">Category</label>
                    <select
                      value={editingEvent?.category || 'plot_turn'}
                      onChange={(e) => setEditingEvent(prev => ({ ...prev, category: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] text-[#231A13]"
                    >
                      <option value="plot_turn">Plot Turn</option>
                      <option value="conflict">Conflict</option>
                      <option value="revelation">Revelation</option>
                      <option value="discovery">Discovery</option>
                      <option value="flashback">Flashback</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold uppercase mb-1">Event Status</label>
                    <select
                      value={editingEvent?.status || 'Completed'}
                      onChange={(e) => setEditingEvent(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] text-[#231A13]"
                    >
                      <option value="Completed">Completed</option>
                      <option value="Current">Current</option>
                      <option value="Upcoming">Upcoming</option>
                      <option value="Locked">Locked</option>
                      <option value="Revised">Revised</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold uppercase mb-1">Location</label>
                    <input
                      type="text"
                      value={editingEvent?.location || ''}
                      onChange={(e) => setEditingEvent(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g. North Reef Caverns"
                      className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] text-[#231A13]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold uppercase mb-1">Associated Chapter #</label>
                    <input
                      type="number"
                      value={editingEvent?.chapter_number || 1}
                      onChange={(e) => setEditingEvent(prev => ({ ...prev, chapter_number: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] text-[#231A13]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold uppercase mb-1">Detailed Description *</label>
                  <textarea
                    rows={3}
                    value={editingEvent?.description || ''}
                    onChange={(e) => setEditingEvent(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what took place during this event..."
                    className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] font-serif text-xs text-[#231A13]"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase mb-1">Characters Involved (Comma Separated)</label>
                  <input
                    type="text"
                    value={editingEvent?.characters_involved?.join(', ') || ''}
                    onChange={(e) => setEditingEvent(prev => ({
                      ...prev,
                      characters_involved: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }))}
                    placeholder="Silas Vance, Clara Moreau"
                    className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] text-[#231A13]"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase mb-1">Illustration / Photo URL</label>
                  <input
                    type="text"
                    value={editingEvent?.illustration_url || ''}
                    onChange={(e) => setEditingEvent(prev => ({ ...prev, illustration_url: e.target.value }))}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] text-[#231A13]"
                  />
                </div>

                <div className="pt-4 border-t border-[#7A644E]/40 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="px-4 py-2 rounded border border-[#6B553E] text-[#2B2117] font-bold uppercase"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => editingEvent && handleSaveEvent(editingEvent)}
                    className="px-6 py-2 rounded bg-[#2B2016] text-[#E0B77D] hover:bg-[#3D2D20] font-bold uppercase shadow"
                  >
                    Pin to Timeline
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
