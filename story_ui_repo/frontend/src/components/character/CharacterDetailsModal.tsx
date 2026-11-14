import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Character, TimelineEvent, Chapter, InvestigationStatus } from '../../types';
import { api } from '../../services/api';
import { Stamp } from '../common/Stamp';
import { sound } from '../../services/audioService';
import {
  ArrowLeft,
  X,
  User,
  UserCheck,
  Target,
  Key,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  Link2,
  Clock,
  MapPin,
  Calendar,
  AlertTriangle,
  RefreshCw,
  GitBranch,
  Shield,
  Compass,
  CheckCircle2
} from 'lucide-react';

interface CharacterDetailsModalProps {
  characterId: string | null;
  storyId?: string;
  allCharacters?: Character[];
  isCulprit?: boolean;
  onToggleCulprit?: () => void;
  onSetCulprit?: (isCulprit: boolean) => void;
  investigationStatus?: InvestigationStatus;
  onChangeInvestigationStatus?: (status: InvestigationStatus) => void;
  onClose: () => void;
  onSelectCharacter?: (charId: string) => void;
  onEdit?: (character: Character) => void;
  onDelete?: (charId: string, charName?: string) => void;
  onStartConnection?: (charId: string) => void;
}

export const CharacterDetailsModal: React.FC<CharacterDetailsModalProps> = ({
  characterId,
  storyId,
  allCharacters = [],
  isCulprit = false,
  onToggleCulprit,
  onSetCulprit,
  investigationStatus,
  onChangeInvestigationStatus,
  onClose,
  onSelectCharacter,
  onEdit,
  onDelete,
  onStartConnection,
}) => {
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [secretRevealed, setSecretRevealed] = useState<boolean>(false);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  // 1. Fetch character details dynamically from the existing backend API
  const fetchCharacterData = useCallback(async (id: string) => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCharacter(id);
      if (!data || !data.id) {
        throw new Error(`Character dossier records missing for subject identifier [${id}].`);
      }
      setCharacter(data);

      // Fetch story timeline events and chapters to cross-reference appearances
      const activeStoryId = data.story_id || storyId;
      if (activeStoryId) {
        try {
          const [evts, chaps] = await Promise.all([
            api.getStoryTimeline(activeStoryId),
            api.getStoryChapters(activeStoryId)
          ]);
          setEvents(evts || []);
          setChapters(chaps || []);
        } catch (subErr) {
          console.warn("Supplementary timeline data load skipped:", subErr);
        }
      }
    } catch (err: any) {
      console.error("Failed to load character details:", err);
      setError(err?.message || "Failed to load character dossier records from the archive.");
      setCharacter(null);
    } finally {
      setLoading(false);
    }
  }, [storyId]);

  useEffect(() => {
    if (characterId) {
      setSecretRevealed(false);
      fetchCharacterData(characterId);
    } else {
      setCharacter(null);
      setError(null);
    }
  }, [characterId, fetchCharacterData]);

  // Global Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && characterId) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [characterId, onClose]);

  if (!characterId) return null;

  const currentStatus: InvestigationStatus =
    character?.investigation_status ||
    (isCulprit ? 'person_of_interest' : (investigationStatus || 'unclassified'));

  const handleUpdateStatus = async (newStatus: InvestigationStatus) => {
    sound.playPaperRustle();
    if (!character) return;

    // Toggle: if clicking active status, toggle back to unclassified
    const targetStatus: InvestigationStatus = currentStatus === newStatus ? 'unclassified' : newStatus;

    // Immediately update local modal state
    const updatedChar: Character = { ...character, investigation_status: targetStatus };
    setCharacter(updatedChar);

    // Persist to backend & MongoDB
    try {
      await api.updateCharacterInvestigationStatus(character.id, targetStatus);
    } catch (e) {
      console.error("Failed to update character investigation status:", e);
    }

    if (onChangeInvestigationStatus) {
      onChangeInvestigationStatus(targetStatus);
    }
    if (onSetCulprit) {
      onSetCulprit(targetStatus === 'person_of_interest');
    }
    if (onToggleCulprit && targetStatus === 'person_of_interest' && !isCulprit) {
      onToggleCulprit();
    }
  };

  // Safe helpers for traits & appearances
  const traits = Array.isArray(character?.personality_traits)
    ? character.personality_traits.map(t => typeof t === 'string' ? t : (t as any)?.trait || String(t)).filter(Boolean)
    : (typeof character?.personality_traits === 'string'
      ? (character.personality_traits as string).split(',').map(s => s.trim()).filter(Boolean)
      : []);

  // Filter events where character was involved
  const characterEvents = events.filter(evt => {
    if (!evt) return false;
    const nameMatch = character?.name && (evt.characters_involved || []).some(
      n => typeof n === 'string' && n.toLowerCase().trim() === character.name.toLowerCase().trim()
    );
    const idMatch = (evt.characters_involved || []).some(
      n => typeof n === 'string' && n === character?.id
    );
    return nameMatch || idMatch;
  });

  // Calculate chapter appearances
  const appearanceChapters = chapters.filter(chap => {
    if (!chap || !character) return false;
    const appearsInEvent = characterEvents.some(evt => evt.chapter_id === chap.id || evt.chapter_number === chap.chapter_number);
    const mentionsName = chap.content && character.name && chap.content.toLowerCase().includes(character.name.toLowerCase());
    return appearsInEvent || mentionsName;
  });

  const roleBadgeStyle = (role?: string) => {
    const r = (role || '').toLowerCase();
    if (r.includes('protagonist')) return 'bg-amber-950/40 text-amber-300 border-amber-800/50';
    if (r.includes('antagonist')) return 'bg-red-950/40 text-red-300 border-red-800/50';
    if (r.includes('companion') || r.includes('mentor')) return 'bg-blue-950/40 text-blue-300 border-blue-800/50';
    if (r.includes('foil')) return 'bg-purple-950/40 text-purple-300 border-purple-800/50';
    return 'bg-[#291F18] text-[#E0B77D] border-[#3E3024]';
  };

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/75 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="character-details-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative w-full max-w-4xl my-auto space-y-3 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── TOP RETURN NAVIGATION BAR ── */}
        <div className="flex items-center justify-between gap-3 bg-[#1B1511] p-3 sm:p-4 rounded-xl border border-[#3E3126] shadow-2xl">
          <button
            type="button"
            onClick={() => {
              sound.playPaperRustle();
              onClose();
            }}
            className="inline-flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-lg bg-[#C49A61] hover:bg-[#D6AB72] text-[#14100D] font-typewriter text-xs font-bold uppercase tracking-wider shadow transition-all hover:scale-105 active:scale-95 group"
          >
            <ArrowLeft className="w-4 h-4 text-[#14100D] group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline">Return to Relationship Board</span>
            <span className="sm:hidden">Back</span>
          </button>

          <div className="flex items-center space-x-2 sm:space-x-3 font-typewriter text-xs text-[#A69482] min-w-0">
            <span className="uppercase tracking-widest text-[#C49A61] hidden md:inline">Case Subject:</span>
            <span className="font-serif font-bold text-sm sm:text-base text-[#F2E8DC] truncate">
              {character?.name || (loading ? 'Consulting Archive...' : 'Dossier Record')}
            </span>
            {character?.role && (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border tracking-wider hidden sm:inline ${roleBadgeStyle(character.role)}`}>
                {character.role}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              sound.playPaperRustle();
              onClose();
            }}
            className="p-1.5 sm:p-2 rounded-lg text-[#9A8978] hover:text-white hover:bg-white/10 transition-colors"
            title="Close Dossier (Esc)"
            aria-label="Close Dossier"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── LOADING STATE ── */}
        {loading && (
          <div className="rounded-2xl bg-[#D6C5A9] p-10 border-2 border-[#8C7456] shadow-clipboard text-[#2B2117] flex flex-col items-center justify-center min-h-[420px] space-y-4">
            <div className="w-12 h-12 rounded-full border-3 border-[#8C7456] border-t-[#2B2016] animate-spin"></div>
            <div className="text-center space-y-1">
              <span className="font-typewriter text-xs uppercase tracking-[0.25em] text-[#7A362E] font-bold block">
                AUTHENTICATING CLASSIFIED CASE RECORD
              </span>
              <p className="font-serif text-lg font-bold text-[#1C150F]">
                Declassifying Dossier from Archival Vault...
              </p>
            </div>
            <p className="font-typewriter text-xs text-[#6E5945] max-w-sm text-center">
              Reconstructing psychological telemetry, relationship cords, and scene testimony for subject [{characterId}].
            </p>
          </div>
        )}

        {/* ── ERROR STATE (NO BLACK SCREEN) ── */}
        {!loading && error && (
          <div className="rounded-2xl bg-[#D6C5A9] p-8 border-2 border-[#8C2E24] shadow-clipboard text-[#2B2117] space-y-5 text-center">
            <div className="w-14 h-14 rounded-full bg-[#8A2B20]/20 border border-[#8A2B20] text-[#8A2B20] flex items-center justify-center mx-auto text-2xl shadow">
              <AlertTriangle className="w-7 h-7 text-[#8A2B20]" />
            </div>
            <div className="space-y-1">
              <span className="font-typewriter text-xs font-bold text-[#8A2B20] uppercase tracking-widest block">
                ARCHIVAL DOSSIER RETRIEVAL ANOMALY
              </span>
              <h3 className="font-serif text-2xl font-bold text-[#1C150F]">
                Subject Dossier Not Found
              </h3>
            </div>
            <p className="font-typewriter text-xs text-[#5A4533] leading-relaxed max-w-md mx-auto">
              {error}
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fetchCharacterData(characterId)}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#2B2016] hover:bg-[#3D2D20] text-[#E0B77D] font-typewriter text-xs font-bold uppercase transition-colors shadow"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Retrieval</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-[#8C7456] text-[#2B2016] hover:bg-black/5 font-typewriter text-xs font-bold uppercase transition-colors"
              >
                Return to Evidence Board
              </button>
            </div>
          </div>
        )}

        {/* ── MAIN PHYSICAL INVESTIGATION DOSSIER ── */}
        {!loading && !error && character && (
          <div className={`relative rounded-2xl bg-[#D6C5A9] p-5 sm:p-9 border-2 shadow-clipboard text-[#2B2117] max-h-[82vh] overflow-y-auto space-y-6 transition-all ${
            currentStatus === 'person_of_interest' ? 'border-[#B03A2E]/70 shadow-[0_12px_40px_rgba(176,58,46,0.18)]' : 'border-[#8C7456]'
          }`}>
            
            {/* Corner Status Stamp */}
            <div className="absolute top-5 right-5 sm:top-6 sm:right-6 pointer-events-none z-10">
              <Stamp
                label={
                  character.current_status === 'Alive'
                    ? "VERIFIED ALIVE"
                    : character.current_status === 'Missing'
                    ? "STATUS: MISSING"
                    : character.current_status === 'Deceased'
                    ? "DECEASED"
                    : "CASE RECORD"
                }
                type={
                  character.current_status === 'Alive'
                    ? "green"
                    : character.current_status === 'Missing'
                    ? "amber"
                    : "red"
                }
                rotation={-2}
                size="sm"
              />
            </div>

            {/* Distinctive Red Archival Stamp / POI Badge on Dossier */}
            {currentStatus === 'person_of_interest' && (
              <div className="absolute top-5 left-5 sm:top-6 sm:left-8 z-10 pointer-events-none">
                <Stamp
                  label="PERSON OF INTEREST"
                  type="red"
                  rotation={-3}
                  size="md"
                  className="bg-red-950/10 border-[2.5px] border-[#9A1C16] text-[#9A1C16] font-black shadow-md tracking-widest"
                />
              </div>
            )}
            {currentStatus === 'innocent' && (
              <div className="absolute top-5 left-5 sm:top-6 sm:left-8 z-10 pointer-events-none">
                <Stamp
                  label="CLASSIFIED INNOCENT"
                  type="green"
                  rotation={-2}
                  size="sm"
                  className="bg-emerald-950/10 border-[1.5px] border-[#4A6B42] text-[#4A6B42] font-bold tracking-wider"
                />
              </div>
            )}

            {/* 1. Header Section: Large Portrait + Vital Specifications */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 border-b border-[#524131]/30 pb-6">
              
              {/* Large Portrait Polaroid */}
              <div className="shrink-0">
                <div className={`w-52 sm:w-60 p-3 pb-6 rounded shadow-2xl text-center relative rotate-[-1.5deg] transition-all ${
                  currentStatus === 'person_of_interest'
                    ? 'bg-[#F2ECE6] border-2 border-[#B03A2E] ring-2 ring-[#B03A2E]/30 shadow-[0_4px_24px_rgba(176,58,46,0.3)]'
                    : 'bg-[#EFECE6] border border-[#2D2118]'
                }`}>
                  {/* Brass pushpin at top */}
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#B03A2E] border border-[#5E1914] shadow flex items-center justify-center z-20">
                    <div className="w-2 h-2 rounded-full bg-white/70"></div>
                  </div>

                  {/* Red Archival POI Badge / Case Annotation on Photo Frame */}
                  {currentStatus === 'person_of_interest' && (
                    <div 
                      className="absolute -top-2.5 -right-2.5 z-30 pointer-events-none flex items-center justify-center"
                      title="Person of Interest (POI)"
                    >
                      <div className="px-2 py-0.5 rounded-full bg-[#9A1C16] border-2 border-[#FFCDD2] text-white shadow-[0_2px_10px_rgba(154,28,22,0.7)] flex items-center space-x-1 transform rotate-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span className="font-typewriter text-[9px] font-black tracking-widest uppercase">POI</span>
                      </div>
                    </div>
                  )}

                  {currentStatus === 'innocent' && (
                    <div 
                      className="absolute -top-2.5 -right-2.5 z-30 pointer-events-none flex items-center justify-center"
                      title="Classified as Innocent"
                    >
                      <div className="px-1.5 py-0.5 rounded-full bg-[#2E4729] border border-[#A5DE9E]/60 text-[#D7F5D2] shadow-sm flex items-center space-x-1 transform -rotate-2">
                        <UserCheck className="w-2.5 h-2.5 text-[#A5DE9E]" />
                        <span className="font-typewriter text-[8px] font-bold tracking-wider uppercase">Innocent</span>
                      </div>
                    </div>
                  )}

                  {/* Photo area */}
                  <div className="w-full h-48 sm:h-56 bg-[#1a1a1a] rounded-sm overflow-hidden shadow-inner border border-black/20 relative">
                    {character.portrait_url ? (
                      <img
                        src={character.portrait_url}
                        alt={character.name}
                        className="w-full h-full object-cover filter contrast-[1.06] brightness-[0.98] sepia-[0.12]"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-[#25201C] p-4 text-center">
                        <User className="w-12 h-12 text-[#C49A61]/60 mb-2" />
                        <span className="font-typewriter text-[11px] text-[#A8987E]">NO PHOTOGRAPH ON FILE</span>
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-white/10"></div>
                    
                    {/* Status Pill on Photo */}
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/80 border border-[#C49A61]/50 text-[10px] font-typewriter tracking-widest text-[#E0B77D] uppercase shadow">
                      {character.current_status || 'Unknown'}
                    </div>
                  </div>

                  {/* Caption underneath */}
                  <div className="mt-3 px-1 text-center">
                    <p className="font-handwriting text-xl sm:text-2xl text-[#241D17] leading-tight font-bold tracking-wide truncate">
                      {character.name}
                    </p>
                    <p className="font-typewriter text-[10px] text-[#7A6451] uppercase tracking-wider mt-0.5 truncate">
                      {character.role}
                    </p>
                  </div>
                </div>
              </div>

              {/* Identity & Vital Telemetry Grid */}
              <div className="flex-1 space-y-3 font-typewriter text-xs text-[#2A2016] w-full">
                <div>
                  <span className="text-[11px] text-[#7A644E] uppercase tracking-widest block font-bold">
                    OFFICIAL CASE SUBJECT DOSSIER • SEC-894
                  </span>
                  <h1 id="character-details-title" className="font-serif text-3xl sm:text-4xl font-extrabold text-[#1C150F] leading-tight">
                    {character.name}
                  </h1>
                  {character.alias && (
                    <p className="font-typewriter text-xs sm:text-sm text-[#7A362E] font-bold mt-1 tracking-wider">
                      KNOWN CODENAME: "{character.alias}"
                    </p>
                  )}
                </div>

                {/* Quick Specs Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                  <div className="bg-[#CCAFA0]/40 p-2.5 rounded-lg border border-[#8F785C]/60">
                    <span className="text-[10px] text-[#695441] uppercase tracking-wider block font-bold">Chronological Age</span>
                    <span className="font-serif text-sm font-bold text-[#1C150F]">
                      {character.age ? `${character.age} Years` : 'Undisclosed'}
                    </span>
                  </div>

                  <div className="bg-[#CCAFA0]/40 p-2.5 rounded-lg border border-[#8F785C]/60">
                    <span className="text-[10px] text-[#695441] uppercase tracking-wider block font-bold">Gender</span>
                    <span className="font-serif text-sm font-bold text-[#1C150F]">
                      {character.gender || 'Not Specified'}
                    </span>
                  </div>

                  <div className="bg-[#CCAFA0]/40 p-2.5 rounded-lg border border-[#8F785C]/60">
                    <span className="text-[10px] text-[#695441] uppercase tracking-wider block font-bold">First Appearance</span>
                    <span className="font-serif text-sm font-bold text-[#1C150F]">
                      {character.first_appearance || 'Chapter 1'}
                    </span>
                  </div>

                  <div className="bg-[#CCAFA0]/40 p-2.5 rounded-lg border border-[#8F785C]/60">
                    <span className="text-[10px] text-[#695441] uppercase tracking-wider block font-bold">Latest Trace</span>
                    <span className="font-serif text-sm font-bold text-[#1C150F]">
                      {character.last_appearance || 'Active Scene'}
                    </span>
                  </div>
                </div>

                {/* Behavioral & Psychological Traits */}
                <div className="pt-2">
                  <span className="text-[11px] text-[#7A644E] uppercase tracking-wider block mb-1.5 font-bold">
                    OBSERVED BEHAVIORAL & PSYCHOLOGICAL TRAITS:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {traits.map((trait, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded bg-[#C7B596] text-[#291F16] border border-[#8C7558] font-bold text-xs shadow-sm"
                      >
                        • {trait}
                      </span>
                    ))}
                    {traits.length === 0 && (
                      <span className="italic text-[#7A6451]">No distinct traits catalogued.</span>
                    )}
                  </div>
                </div>

                {/* ── TWO-OPTION ACTION AREA: INVESTIGATION VERDICT ── */}
                <div className="pt-2">
                  <div className={`p-2.5 sm:p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2.5 shadow-inner transition-all ${
                    currentStatus === 'person_of_interest'
                      ? 'bg-[#B03A2E]/15 border-[#B03A2E]/50'
                      : currentStatus === 'innocent'
                      ? 'bg-[#4A6B42]/15 border-[#5B8251]/40'
                      : 'bg-[#CCAFA0]/40 border-[#8F785C]/80'
                  }`}>
                    <div>
                      <span className="font-typewriter text-[10px] text-[#695441] uppercase tracking-wider block font-bold">
                        INVESTIGATION VERDICT
                      </span>
                      <span className="font-serif text-xs text-[#2A2016] font-semibold flex items-center gap-1.5 mt-0.5">
                        {currentStatus === 'person_of_interest' ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-[#B03A2E] animate-pulse" />
                            <span className="text-[#8B1E19] font-bold">Designated as Person of Interest (POI)</span>
                          </>
                        ) : currentStatus === 'innocent' ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-[#3D6938]" />
                            <span className="text-[#2D4E29] font-bold">Classified as Innocent</span>
                          </>
                        ) : (
                          <span className="text-[#6D5845] italic">Unclassified / Under Investigation</span>
                        )}
                      </span>
                    </div>

                    <div className="inline-flex rounded-lg p-1 bg-[#231A14] border border-[#3E3024] shadow-md">
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus('innocent')}
                        className={`px-3 py-1.5 rounded-md font-typewriter text-xs font-bold uppercase transition-all flex items-center space-x-1.5 ${
                          currentStatus === 'innocent'
                            ? 'bg-[#2E4729] text-[#C9ECC5] border border-[#5E9454] shadow font-black'
                            : 'text-[#9A8978] hover:text-[#E0D7C7]'
                        }`}
                        title={currentStatus === 'innocent' ? "Classified as Innocent (Click to unclassify)" : "Classify subject as Innocent"}
                      >
                        <UserCheck className={`w-3.5 h-3.5 ${currentStatus === 'innocent' ? 'text-[#A5DE9E]' : 'text-[#C49A61]'}`} />
                        <span>Innocent</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateStatus('person_of_interest')}
                        className={`px-3 py-1.5 rounded-md font-typewriter text-xs font-bold uppercase transition-all flex items-center space-x-1.5 ${
                          currentStatus === 'person_of_interest'
                            ? 'bg-[#B03A2E] text-white border border-[#E74C3C] shadow-lg font-black'
                            : 'text-[#9A8978] hover:text-[#E5A8A3]'
                        }`}
                        title={currentStatus === 'person_of_interest' ? "Click to clear Person of Interest designation" : "Designate as Person of Interest (POI)"}
                      >
                        <span className={`w-2 h-2 rounded-full ${currentStatus === 'person_of_interest' ? 'bg-white ring-2 ring-red-400' : 'bg-[#B03A2E]'}`} />
                        <span>PERSON OF INTEREST</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Investigator Command Bar */}
                <div className="pt-3 flex flex-wrap items-center gap-2">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playPaperRustle();
                        onEdit(character);
                      }}
                      className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded bg-[#35281D] hover:bg-[#473729] text-[#E0B77D] font-typewriter text-xs font-bold uppercase transition-colors shadow"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Dossier</span>
                    </button>
                  )}

                  {onStartConnection && (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playTypewriterKeystroke();
                        onStartConnection(character.id);
                        onClose();
                      }}
                      className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded bg-[#8A2B20] hover:bg-[#A8382C] text-white font-typewriter text-xs font-bold uppercase transition-colors shadow"
                      title="Tie red evidence thread from this suspect"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Tie Red Thread</span>
                    </button>
                  )}

                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playPaperRustle();
                        onDelete(character.id, character.name);
                      }}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded border border-[#8F332B]/60 text-[#8F332B] hover:bg-red-900/10 font-typewriter text-xs font-bold uppercase transition-colors ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Expunge</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Physical Description & Operational Motivations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#CCAFA0]/35 p-4 rounded-xl border border-[#8F785C] shadow-inner space-y-2">
                <span className="font-typewriter text-xs font-bold text-[#6B533E] uppercase tracking-wider flex items-center space-x-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#8F332B]" />
                  <span>PHYSICAL SPECIFICATIONS & GAIT</span>
                </span>
                <p className="font-serif text-xs sm:text-sm text-[#241A13] leading-relaxed">
                  {character.physical_description || "No distinct marks, scars, or gait peculiarities catalogued in current records."}
                </p>
              </div>

              <div className="bg-[#CCAFA0]/35 p-4 rounded-xl border border-[#8F785C] shadow-inner space-y-2">
                <span className="font-typewriter text-xs font-bold text-[#6B533E] uppercase tracking-wider flex items-center space-x-1.5">
                  <Target className="w-3.5 h-3.5 text-[#8F332B]" />
                  <span>OPERATIONAL MOTIVATIONS & OBJECTIVES</span>
                </span>
                <p className="font-serif text-xs sm:text-sm text-[#241A13] leading-relaxed">
                  {character.motivations || "Primary motivations remain submerged beneath investigation protocol."}
                </p>
                {character.goals && (
                  <p className="font-serif text-xs text-[#4A3728] border-t border-[#8F785C]/30 pt-1.5 mt-1.5">
                    <strong>Primary Stated Goal:</strong> {character.goals}
                  </p>
                )}
              </div>
            </div>

            {/* 3. Archival Biography & Backstory */}
            <div className="bg-[#CCAFA0]/35 p-4 sm:p-5 rounded-xl border border-[#8F785C] shadow-inner space-y-2">
              <span className="font-typewriter text-xs font-bold text-[#6B533E] uppercase tracking-wider block">
                ARCHIVAL ORIGINS & INVESTIGATION BIOGRAPHY
              </span>
              <p className="font-serif text-xs sm:text-sm text-[#241A13] leading-relaxed">
                {character.backstory || "Personal background remains undocumented in county manifests."}
              </p>
            </div>

            {/* 4. Confidential Secrets & Ulterior Fears (Redacted / Reveal toggle) */}
            <div className="bg-[#CCAFA0]/60 p-4 sm:p-5 rounded-xl border-2 border-dashed border-[#A84A42]/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Key className="w-4 h-4 text-[#A84A42]" />
                  <span className="font-typewriter text-xs font-bold text-[#7D2922] uppercase tracking-wider">
                    CONFIDENTIAL INVESTIGATIVE INTEL (SECRETS & PHOBIAS)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    sound.playPaperRustle();
                    setSecretRevealed(!secretRevealed);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#B4473E]/20 hover:bg-[#B4473E]/30 text-[#852C25] font-typewriter text-xs font-bold uppercase transition-colors shrink-0 shadow-sm"
                >
                  {secretRevealed ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Redact Intel</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Reveal Uncensored Intel</span>
                    </>
                  )}
                </button>
              </div>

              {secretRevealed ? (
                <div className="space-y-2 pt-2 border-t border-[#A84A42]/30 text-xs sm:text-sm font-serif text-[#331B18] transition-all">
                  <p>
                    <strong className="text-[#6E221C] font-sans text-xs uppercase tracking-wider">Primary Psychological Vulnerability / Fear:</strong>{' '}
                    {character.fears || "No specific phobia documented in clinical records."}
                  </p>
                  <p>
                    <strong className="text-[#6E221C] font-sans text-xs uppercase tracking-wider">Concealed Secret / Ulterior Agenda:</strong>{' '}
                    {character.secrets || "No active conspiratorial secret discovered to date."}
                  </p>
                </div>
              ) : (
                <p className="font-typewriter text-xs text-[#7A5550] italic pt-1">
                  [REDACTED PURSUANT TO NARRATIVE SECRECY PROTOCOL. CLICK 'REVEAL UNCENSORED INTEL' TO ACCESS CLASSIFIED TRANSCRIPTS.]
                </p>
              )}
            </div>

            {/* 5. Character Development & Story Evolution Arc */}
            <div className="bg-[#CCAFA0]/35 p-4 sm:p-5 rounded-xl border border-[#8F785C] shadow-inner space-y-3">
              <div className="flex items-center space-x-2">
                <GitBranch className="w-4 h-4 text-[#8F332B]" />
                <span className="font-typewriter text-xs font-bold text-[#6B533E] uppercase tracking-wider">
                  NARRATIVE ARC & CHARACTER DEVELOPMENT TRAJECTORY
                </span>
              </div>

              <p className="font-serif text-xs sm:text-sm text-[#241A13] leading-relaxed">
                {character.character_arc ||
                  `Initiates narrative inquiry as ${character.role}, navigating shifting allegiances and escalating stakes as the plot unfolds across chapters.`}
              </p>

              {/* Development Milestones */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#8F785C]/30 text-xs font-typewriter">
                <div className="p-2.5 rounded bg-[#CBB89C] border border-[#8C7558]/70 space-y-1">
                  <span className="text-[10px] text-[#7A6451] uppercase font-bold block">Phase 1: Status Quo</span>
                  <p className="font-serif text-xs text-[#2A2016]">
                    {character.first_appearance ? `Catalogued in ${character.first_appearance}` : 'Initial Chapter Record'}
                  </p>
                </div>

                <div className="p-2.5 rounded bg-[#CBB89C] border border-[#8C7558]/70 space-y-1">
                  <span className="text-[10px] text-[#7A6451] uppercase font-bold block">Phase 2: Complication</span>
                  <p className="font-serif text-xs text-[#2A2016]">
                    {character.fears ? `Tested against ${character.fears.slice(0, 45)}...` : 'Encountering conflicts and shifting alliances'}
                  </p>
                </div>

                <div className="p-2.5 rounded bg-[#CBB89C] border border-[#8C7558]/70 space-y-1">
                  <span className="text-[10px] text-[#7A6451] uppercase font-bold block">Phase 3: Trajectory</span>
                  <p className="font-serif text-xs text-[#2A2016]">
                    {character.last_appearance ? `Active through ${character.last_appearance}` : 'Climactic confrontation resolution'}
                  </p>
                </div>
              </div>
            </div>

            {/* 6. Relationship Web Visualization */}
            <div className="space-y-3">
              <span className="font-typewriter text-xs font-bold text-[#63503E] uppercase tracking-wider block">
                INTERPERSONAL ALLIANCES & RED THREAD TIES ({character.relationships?.length || 0})
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.isArray(character.relationships) && character.relationships.map((rel, idx) => {
                  const partner = allCharacters.find(
                    c => c && (
                      (c.name && rel.character_name && c.name.toLowerCase().trim() === rel.character_name.toLowerCase().trim()) ||
                      (c.alias && rel.character_name && c.alias.toLowerCase().trim() === rel.character_name.toLowerCase().trim())
                    )
                  );

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (partner && onSelectCharacter) {
                          sound.playPaperRustle();
                          onSelectCharacter(partner.id);
                        }
                      }}
                      className={`p-3 rounded-lg bg-[#CBB89C] border border-[#8C7558] text-xs flex items-center justify-between shadow-sm transition-all ${
                        partner && onSelectCharacter ? 'hover:bg-[#BFAC8E] cursor-pointer hover:scale-[1.02]' : ''
                      }`}
                      title={partner ? `Click to inspect dossier for ${partner.name}` : undefined}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        {partner?.portrait_url ? (
                          <img
                            src={partner.portrait_url}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover border border-[#8C7558] shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#2B2016] text-[#E0B77D] flex items-center justify-center font-bold text-xs border border-[#8C7558] shrink-0">
                            👤
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-serif font-bold text-[#2A2016] block truncate">
                            {rel.character_name || 'Subject'}
                          </span>
                          {rel.notes && (
                            <p className="font-serif text-[11px] text-[#5A4B3D] italic truncate">
                              "{rel.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded bg-[#231A14] text-[#E5A8A3] border border-[#8B2E24] font-typewriter text-[10px] font-bold uppercase shrink-0 ml-2">
                        {rel.relation_type || 'Known'}
                      </span>
                    </div>
                  );
                })}

                {(!character.relationships || character.relationships.length === 0) && (
                  <p className="font-typewriter text-xs text-[#7A6653] italic col-span-2">
                    No documented interpersonal bonds recorded yet in archive manifest.
                  </p>
                )}
              </div>
            </div>

            {/* 7. Important Events & Chapter Appearances */}
            <div className="space-y-3 pt-2 border-t border-[#8F785C]/30">
              <div className="flex items-center justify-between">
                <span className="font-typewriter text-xs font-bold text-[#63503E] uppercase tracking-wider block">
                  IMPORTANT EVENTS & CHAPTER CHRONOLOGY ({characterEvents.length + appearanceChapters.length})
                </span>
                <span className="text-[11px] font-typewriter text-[#7A6451]">
                  Verified Archive Matches
                </span>
              </div>

              <div className="space-y-2.5">
                {/* Timeline Events Involved */}
                {characterEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3.5 rounded-lg bg-[#CBB89C] border border-[#8C7558] text-xs space-y-1.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between font-typewriter">
                      <div className="flex items-center space-x-2">
                        <span className="px-1.5 py-0.5 rounded bg-[#2E2016] text-[#E0B77D] font-bold text-[10px] uppercase">
                          CH. {evt.chapter_number || 1} • EVENT #{evt.event_number}
                        </span>
                        <h4 className="font-serif font-bold text-sm text-[#1E1711]">
                          {evt.title}
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-950/40 text-emerald-800 border border-emerald-700/40">
                        {evt.status || 'Verified'}
                      </span>
                    </div>

                    <p className="font-serif text-xs text-[#2A2016] leading-relaxed">
                      {evt.description}
                    </p>

                    {evt.location && (
                      <div className="flex items-center space-x-1 text-[11px] text-[#695441] pt-1">
                        <MapPin className="w-3 h-3 text-[#8F332B]" />
                        <span>Scene Location: {evt.location}</span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Additional Chapter mentions */}
                {appearanceChapters.length > 0 && characterEvents.length === 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {appearanceChapters.map((chap) => (
                      <div
                        key={chap.id}
                        className="p-3 rounded-lg bg-[#CBB89C] border border-[#8C7558] text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-typewriter">
                          <span className="font-bold text-[#8A2B20]">CHAPTER {chap.chapter_number}</span>
                          <span className="text-[10px] uppercase text-[#6E5A47]">{chap.status}</span>
                        </div>
                        <p className="font-serif font-bold text-[#201811] text-xs truncate">
                          {chap.title}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {characterEvents.length === 0 && appearanceChapters.length === 0 && (
                  <p className="font-typewriter text-xs text-[#7A6653] italic">
                    Subject appearances currently catalogued under preliminary testimony. Expand writing chapters to extract additional event timeline markers.
                  </p>
                )}
              </div>
            </div>

            {/* ── BOTTOM RETURN NAVIGATION BAR ── */}
            <div className="pt-5 border-t border-[#8C7456]/40 flex flex-wrap items-center justify-between gap-3">
              <span className="font-typewriter text-[11px] text-[#7A6451]">
                INVESTIGATION FILE ID: {character.id}
              </span>

              <button
                type="button"
                onClick={() => {
                  sound.playPaperRustle();
                  onClose();
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2B2016] text-[#E0B77D] hover:bg-[#3D2D20] font-typewriter text-xs font-bold uppercase shadow transition-all hover:scale-105 active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Relationship Board</span>
              </button>
            </div>

          </div>
        )}

      </motion.div>
    </div>
  );
};
