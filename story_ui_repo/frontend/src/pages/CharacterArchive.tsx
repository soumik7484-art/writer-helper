import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CharacterDetailsModal } from '../components/character/CharacterDetailsModal';
import { useStory } from '../context/StoryContext';
import { api } from '../services/api';
import { Character, InvestigationStatus } from '../types';
import { Stamp } from '../components/common/Stamp';
import { sound } from '../services/audioService';
import { boardTextureBase64 } from '../data/boardTextureBase64';
import { 
  Users, 
  Plus, 
  Sparkles, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff, 
  Target, 
  Key, 
  UserCheck,
  X,
  Link2,
  Scissors,
  RotateCcw,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Check,
  ArrowLeft,
  Filter
} from 'lucide-react';

export interface BoardConnection {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  type: string;
  notes?: string;
}

interface Position {
  x: number;
  y: number;
}

const RELATIONSHIP_PRESETS = [
  { label: 'Friends', type: 'friend', icon: '🤝' },
  { label: 'Family', type: 'family', icon: '🩸' },
  { label: 'Romantic Relationship', type: 'romance', icon: '❤️' },
  { label: 'Enemies', type: 'enemy', icon: '⚔️' },
  { label: 'Rivals', type: 'rival', icon: '⚡' },
  { label: 'Mentor and Student', type: 'mentor', icon: '📜' },
  { label: 'Allies', type: 'ally', icon: '🛡️' },
  { label: 'Unknown Connection', type: 'unknown', icon: '❓' },
];

const CARD_W = 164;
const CARD_H = 196;
const PIN_OFFSET_X = 82;
const PIN_OFFSET_Y = 16;

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackName?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class DossierErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Dossier render caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="relative rounded-2xl bg-[#D6C5A9] p-6 sm:p-9 border-2 border-[#8C7456] shadow-2xl text-[#2B2117] space-y-4">
          <div className="flex items-center justify-between border-b border-[#524131]/40 pb-4">
            <div>
              <span className="font-typewriter text-xs text-[#7A362E] font-bold uppercase tracking-wider block">
                CASE SUBJECT RECORD
              </span>
              <h3 className="font-serif text-2xl font-bold text-[#1C150F]">
                {this.props.fallbackName || "Case Subject Dossier"}
              </h3>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-900/30 text-emerald-800 border border-emerald-700/40 text-xs font-typewriter font-bold uppercase">
              STATUS: ALIVE
            </span>
          </div>
          <p className="font-typewriter text-xs text-[#5A4533] leading-relaxed">
            Dossier records recovered from archive. Review suspect specs or return to evidence wall.
          </p>
          {this.props.onReset && (
            <button
              type="button"
              onClick={this.props.onReset}
              className="px-4 py-2 rounded-lg bg-[#2B2016] text-[#E0B77D] hover:bg-[#3D2D20] font-typewriter text-xs font-bold uppercase transition-colors shadow"
            >
              Return to Relationship Board
            </button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

interface BoardCanvasErrorBoundaryProps {
  children: React.ReactNode;
  onResetLayout?: () => void;
}

interface BoardCanvasErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class BoardCanvasErrorBoundary extends React.Component<BoardCanvasErrorBoundaryProps, BoardCanvasErrorBoundaryState> {
  constructor(props: BoardCanvasErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): BoardCanvasErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Board canvas caught unexpected layout condition:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="relative w-full min-h-[560px] h-[72vh] rounded-2xl border-2 border-[#8C6F48] bg-[#1C1713] p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-[#C49A61]/20 border border-[#C49A61]/40 flex items-center justify-center text-[#C49A61] mb-2">
            <Users className="w-7 h-7" />
          </div>
          <span className="font-typewriter text-xs text-[#C49A61] font-bold tracking-[0.2em] uppercase">
            EVIDENCE STAGE STABILIZED
          </span>
          <h3 className="font-serif text-2xl font-bold text-[#F2E8DC]">
            Investigative Canvas Recovered
          </h3>
          <p className="font-typewriter text-xs text-[#A69482] max-w-md leading-relaxed">
            A coordinate misalignment occurred during character movement. Your case dossiers and archival records remain safe in storage.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                if (this.props.onResetLayout) {
                  this.props.onResetLayout();
                }
              }}
              className="px-4 py-2 rounded-lg bg-[#C49A61] hover:bg-[#D6AB72] text-[#14100D] font-typewriter text-xs uppercase font-bold tracking-wider transition-all shadow"
            >
              Realign Suspect Grid
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
              }}
              className="px-4 py-2 rounded-lg bg-[#2B2016] text-[#E0B77D] hover:bg-[#3D2E20] border border-[#8C6F48]/50 font-typewriter text-xs uppercase font-bold transition-all shadow"
            >
              Resume Stage
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export interface CharacterArchiveProps {
  initialCharacterId?: string | null;
  onSelectCharacterId?: (id: string | null) => void;
}

export const CharacterArchive: React.FC<CharacterArchiveProps> = ({
  initialCharacterId,
  onSelectCharacterId
}) => {
  const { activeStory, addToast } = useStory();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);

  // Board layout state
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [connections, setConnections] = useState<BoardConnection[]>([]);
  const [viewMode, setViewMode] = useState<'board' | 'roster'>('board');

  // Dedicated Character Dossier Selection (identified by unique, consistent ID)
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(initialCharacterId || null);

  // Investigation status & filtering
  type CharacterFilter = 'all' | 'poi' | 'innocent' | 'unclassified';
  const [characterFilter, setCharacterFilter] = useState<CharacterFilter>('all');

  // Independent investigation status update per character
  const handleUpdateCharacterInvestigationStatus = useCallback(async (charId: string, newStatus: InvestigationStatus) => {
    const char = characters.find(c => c && c.id === charId);
    const charName = char?.name || 'Character';

    // Optimistically update character state
    setCharacters(prev => prev.map(c => c.id === charId ? { ...c, investigation_status: newStatus } : c));

    // Persist to backend API & MongoDB
    try {
      await api.updateCharacterInvestigationStatus(charId, newStatus);
    } catch (err) {
      console.error("Failed to persist investigation status:", err);
    }

    sound.playPaperRustle();
    if (newStatus === 'person_of_interest') {
      sound.playTypewriterKeystroke();
      addToast("Person of Interest Designated", `${charName} designated as Person of Interest (POI).`, "error");
    } else if (newStatus === 'innocent') {
      addToast("Classified as Innocent", `${charName} classified as Innocent.`, "info");
    } else {
      addToast("Classification Cleared", `${charName} classification reset to Unclassified.`, "info");
    }
  }, [characters, addToast]);

  const handleTogglePOI = useCallback((charId: string) => {
    const char = characters.find(c => c && c.id === charId);
    const nextStatus: InvestigationStatus = char?.investigation_status === 'person_of_interest' ? 'unclassified' : 'person_of_interest';
    handleUpdateCharacterInvestigationStatus(charId, nextStatus);
  }, [characters, handleUpdateCharacterInvestigationStatus]);

  // Backward compatibility shims
  const handleMarkAsCulprit = useCallback((charId: string) => {
    handleUpdateCharacterInvestigationStatus(charId, 'person_of_interest');
  }, [handleUpdateCharacterInvestigationStatus]);

  const handleRemoveCulprit = useCallback((charId: string) => {
    handleUpdateCharacterInvestigationStatus(charId, 'unclassified');
  }, [handleUpdateCharacterInvestigationStatus]);

  const handleToggleCulprit = useCallback((charId: string) => {
    handleTogglePOI(charId);
  }, [handleTogglePOI]);

  const handleSetCulprit = useCallback((charId: string, isPOI: boolean) => {
    handleUpdateCharacterInvestigationStatus(charId, isPOI ? 'person_of_interest' : 'innocent');
  }, [handleUpdateCharacterInvestigationStatus]);

  // Filter calculations
  const poiCount = useMemo(() => characters.filter(c => c.investigation_status === 'person_of_interest').length, [characters]);
  const innocentCount = useMemo(() => characters.filter(c => c.investigation_status === 'innocent').length, [characters]);
  const unclassifiedCount = useMemo(() => characters.filter(c => !c.investigation_status || c.investigation_status === 'unclassified').length, [characters]);
  const allCount = characters.length;

  const filteredCharacters = useMemo(() => {
    if (characterFilter === 'poi') {
      return characters.filter(c => c.investigation_status === 'person_of_interest');
    }
    if (characterFilter === 'innocent') {
      return characters.filter(c => c.investigation_status === 'innocent');
    }
    if (characterFilter === 'unclassified') {
      return characters.filter(c => !c.investigation_status || c.investigation_status === 'unclassified');
    }
    return characters;
  }, [characters, characterFilter]);

  useEffect(() => {
    if (initialCharacterId !== undefined) {
      setSelectedCharacterId(initialCharacterId);
    }
  }, [initialCharacterId]);

  useEffect(() => {
    if (!selectedCharacterId) {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlCharId = params.get('characterId');
        if (urlCharId) {
          setSelectedCharacterId(urlCharId);
        }
      } catch {}
    }
  }, []);

  // Red Thread Connection Flow
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [newConnModal, setNewConnModal] = useState<{ sourceId: string; targetId: string } | null>(null);
  const [selectedPresetLabel, setSelectedPresetLabel] = useState<string>('Friends');
  const [customLabel, setCustomLabel] = useState<string>('');
  const [connectionNotes, setConnectionNotes] = useState<string>('');

  // Editing existing connection
  const [editingConnection, setEditingConnection] = useState<BoardConnection | null>(null);

  // Character Create / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingChar, setEditingChar] = useState<Partial<Character> | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);

  // Confidential intel reveal toggles
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});

  // Fullscreen / Expanded board toggle
  const [isBoardExpanded, setIsBoardExpanded] = useState(false);

  // Dragging & synchronization state tracking
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);
  const hasDraggedDistanceRef = useRef(false);
  const isDraggingRef = useRef(false);
  const [draggingCharId, setDraggingCharId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'offline'>('idle');

  // Stable references for state to eliminate stale closures
  const latestPositionsRef = useRef<Record<string, Position>>({});
  const connectionsRef = useRef<BoardConnection[]>([]);

  useEffect(() => {
    latestPositionsRef.current = positions;
  }, [positions]);

  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

  const storageKey = activeStory ? `storyweave_char_board_${activeStory.id}` : null;

  // Safe helper to sanitize positions
  const sanitizePositionMap = useCallback((raw: any): Record<string, Position> => {
    const result: Record<string, Position> = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result;
    for (const [id, pos] of Object.entries(raw)) {
      if (
        id &&
        pos &&
        typeof pos === 'object' &&
        typeof (pos as any).x === 'number' &&
        Number.isFinite((pos as any).x) &&
        typeof (pos as any).y === 'number' &&
        Number.isFinite((pos as any).y)
      ) {
        result[id] = {
          x: Math.round((pos as any).x),
          y: Math.round((pos as any).y)
        };
      }
    }
    return result;
  }, []);

  // Global Escape Key Listener for Modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedCharacterId) {
          handleCloseDossier();
        }
        setNewConnModal(null);
        setEditingConnection(null);
        setModalOpen(false);
        setConnectingSourceId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCharacterId]);

  // 1. Fetch Characters from API
  const fetchCharacters = useCallback(async () => {
    if (!activeStory) return;
    try {
      setLoading(true);
      const data = await api.getStoryCharacters(activeStory.id);
      const validChars = (data || []).filter(c => c && c.id);
      setCharacters(validChars);
    } catch (e: any) {
      addToast("Failed to load dossiers", e?.message || "Error", "error");
    } finally {
      setLoading(false);
    }
  }, [activeStory, addToast]);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  // 2. Load / Reconcile Positions and Connections from Storage & Backend API
  useEffect(() => {
    if (!activeStory || characters.length === 0) return;

    let isMounted = true;

    // Phase A: Immediate load from localStorage for instant, zero-flicker render
    let localSaved: { positions?: Record<string, Position>; connections?: BoardConnection[] } = {};
    if (storageKey) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            localSaved = parsed;
          }
        }
      } catch (e) {
        console.error("Failed to parse board state from localStorage", e);
      }
    }

    const initialPositions = sanitizePositionMap(localSaved.positions);
    const boardWidth = boardRef.current ? boardRef.current.clientWidth : 1000;
    const cols = Math.max(2, Math.floor((boardWidth - 80) / (CARD_W + 45)));

    characters.forEach((char, idx) => {
      if (!char || !char.id) return;
      if (!initialPositions[char.id]) {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        initialPositions[char.id] = {
          x: 40 + col * (CARD_W + 50) + (row % 2 === 1 ? 25 : 0),
          y: 40 + row * (CARD_H + 45),
        };
      }
    });

    latestPositionsRef.current = initialPositions;
    setPositions(initialPositions);

    // Reconcile Connections with Strict Sanitization
    let activeConnections: BoardConnection[] = [];
    if (localSaved && localSaved.connections && Array.isArray(localSaved.connections)) {
      activeConnections = localSaved.connections.filter(conn =>
        conn &&
        typeof conn === 'object' &&
        typeof conn.sourceId === 'string' &&
        typeof conn.targetId === 'string' &&
        characters.some(c => c && c.id === conn.sourceId) &&
        characters.some(c => c && c.id === conn.targetId)
      ).map((conn, idx) => ({
        id: String(conn.id || `conn_${conn.sourceId}_${conn.targetId}_${idx}`),
        sourceId: String(conn.sourceId),
        targetId: String(conn.targetId),
        label: typeof conn.label === 'string'
          ? conn.label
          : (conn.label && typeof conn.label === 'object' ? ((conn.label as any).label || 'Connected') : 'Connected'),
        type: typeof conn.type === 'string' ? conn.type : 'custom',
        notes: typeof conn.notes === 'string' ? conn.notes : ''
      }));
    } else {
      // Auto-seed initial connections from character.relationships if available
      const seeded: BoardConnection[] = [];
      const seen = new Set<string>();

      characters.forEach(char => {
        if (char && char.relationships && Array.isArray(char.relationships)) {
          char.relationships.forEach(rel => {
            if (!rel || typeof rel.character_name !== 'string') return;
            const targetChar = characters.find(c => 
              c && (
                (typeof c.name === 'string' && c.name.toLowerCase() === rel.character_name.toLowerCase()) ||
                (typeof c.alias === 'string' && c.alias.toLowerCase() === rel.character_name.toLowerCase())
              )
            );
            if (targetChar && targetChar.id !== char.id) {
              const pairKey = [char.id, targetChar.id].sort().join('__');
              if (!seen.has(pairKey)) {
                seen.add(pairKey);
                seeded.push({
                  id: `conn_${char.id}_${targetChar.id}`,
                  sourceId: char.id,
                  targetId: targetChar.id,
                  label: typeof rel.relation_type === 'string' ? rel.relation_type : 'Unknown Connection',
                  type: 'seeded',
                  notes: typeof rel.notes === 'string' ? rel.notes : ''
                });
              }
            }
          });
        }
      });
      activeConnections = seeded;
    }

    connectionsRef.current = activeConnections;
    setConnections(activeConnections);

    // Phase B: Asynchronous sync from Backend API
    api.getStoryBoard(activeStory.id).then(backendData => {
      if (!isMounted || !backendData) return;
      const backendPositions = sanitizePositionMap(backendData.positions);
      if (Object.keys(backendPositions).length > 0) {
        const mergedPositions = { ...initialPositions, ...backendPositions };
        characters.forEach((char, idx) => {
          if (!char || !char.id) return;
          if (!mergedPositions[char.id]) {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            mergedPositions[char.id] = {
              x: 40 + col * (CARD_W + 50) + (row % 2 === 1 ? 25 : 0),
              y: 40 + row * (CARD_H + 45),
            };
          }
        });
        latestPositionsRef.current = mergedPositions;
        setPositions(mergedPositions);
      }

      if (Array.isArray(backendData.connections) && backendData.connections.length > 0) {
        const validBackendConns = backendData.connections.filter(conn =>
          conn &&
          typeof conn === 'object' &&
          typeof conn.sourceId === 'string' &&
          typeof conn.targetId === 'string' &&
          characters.some(c => c && c.id === conn.sourceId) &&
          characters.some(c => c && c.id === conn.targetId)
        ).map((conn, idx) => ({
          id: String(conn.id || `conn_${conn.sourceId}_${conn.targetId}_${idx}`),
          sourceId: String(conn.sourceId),
          targetId: String(conn.targetId),
          label: typeof conn.label === 'string'
            ? conn.label
            : (conn.label && typeof conn.label === 'object' ? ((conn.label as any).label || 'Connected') : 'Connected'),
          type: typeof conn.type === 'string' ? conn.type : 'custom',
          notes: typeof conn.notes === 'string' ? conn.notes : ''
        }));

        if (validBackendConns.length > 0) {
          connectionsRef.current = validBackendConns;
          setConnections(validBackendConns);
        }
      }
    }).catch(err => {
      console.warn("Backend board load note: using local cache", err);
    });

    return () => {
      isMounted = false;
    };
  }, [characters, activeStory, storageKey, sanitizePositionMap]);

  // 3. Persist State to LocalStorage and Backend API (Optimistic & Resilient)
  const persistBoard = useCallback(async (newPos: Record<string, Position>, newConns: BoardConnection[]) => {
    if (!activeStory) return;

    // A. LocalStorage update (synchronous, 0ms lag)
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          positions: newPos,
          connections: newConns,
          updatedAt: new Date().toISOString()
        }));
      } catch (e) {
        console.error("Failed to persist board layout to localStorage", e);
      }
    }

    // B. Backend API update
    try {
      setSyncStatus('saving');
      await api.saveStoryBoard(activeStory.id, {
        positions: newPos,
        connections: newConns
      });
      setSyncStatus('saved');
      setTimeout(() => {
        setSyncStatus(prev => prev === 'saved' ? 'idle' : prev);
      }, 2000);
    } catch (e) {
      console.warn("Backend board sync note: saved in local cache", e);
      setSyncStatus('offline');
      setTimeout(() => {
        setSyncStatus(prev => prev === 'offline' ? 'idle' : prev);
      }, 3500);
    }
  }, [activeStory, storageKey]);

  // 4. Auto-Arrange / Reset Board Layout
  const handleAutoArrange = () => {
    if (!boardRef.current) return;
    const width = boardRef.current.clientWidth;
    const cols = Math.max(2, Math.floor((width - 60) / (CARD_W + 55)));
    const freshPositions: Record<string, Position> = {};
    characters.forEach((char, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      freshPositions[char.id] = {
        x: 40 + col * (CARD_W + 50) + (row % 2 === 1 ? 25 : 0),
        y: 40 + row * (CARD_H + 45),
      };
    });
    latestPositionsRef.current = freshPositions;
    setPositions(freshPositions);
    persistBoard(freshPositions, connectionsRef.current);
    sound.playPaperRustle();
    addToast("Board Rearranged", "Portraits organized into investigative matrix.", "info");
  };

  // 5. Drag and Drop Pointer Event Handlers
  const handleCardPointerDown = (e: React.PointerEvent, charId: string) => {
    if (connectingSourceId) {
      if (connectingSourceId === charId) {
        setConnectingSourceId(null);
        setMousePos(null);
      } else {
        handleCompleteConnection(charId);
      }
      return;
    }

    if (e.button !== 0) return; // Only primary mouse button
    e.preventDefault();

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    const currentPos = latestPositionsRef.current[charId] || positions[charId] || { x: 40, y: 40 };
    dragRef.current = {
      id: charId,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: Number.isFinite(currentPos.x) ? currentPos.x : 40,
      initialY: Number.isFinite(currentPos.y) ? currentPos.y : 40
    };
    hasDraggedDistanceRef.current = false;
    isDraggingRef.current = false;
  };

  const handleCardPointerMove = (e: React.PointerEvent, charId: string) => {
    if (connectingSourceId && boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      return;
    }

    const currentDrag = dragRef.current;
    if (!currentDrag || currentDrag.id !== charId) return;

    const dx = e.clientX - currentDrag.startX;
    const dy = e.clientY - currentDrag.startY;

    if (!hasDraggedDistanceRef.current) {
      if (Math.hypot(dx, dy) > 4) {
        hasDraggedDistanceRef.current = true;
        isDraggingRef.current = true;
        setDraggingCharId(charId);
      } else {
        return;
      }
    }

    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const maxX = Math.max(10, rect.width - CARD_W - 10);
    const maxY = Math.max(10, rect.height - CARD_H - 10);

    const nextX = Math.max(10, Math.min(maxX, Math.round(currentDrag.initialX + dx)));
    const nextY = Math.max(10, Math.min(maxY, Math.round(currentDrag.initialY + dy)));

    latestPositionsRef.current[charId] = { x: nextX, y: nextY };
    setPositions(prev => ({
      ...prev,
      [charId]: { x: nextX, y: nextY }
    }));
  };

  const handleCardPointerUp = (e: React.PointerEvent, charId: string) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const wasDragging = hasDraggedDistanceRef.current;
    const activeDrag = dragRef.current;

    dragRef.current = null;
    setDraggingCharId(null);

    if (wasDragging && activeDrag && activeDrag.id === charId) {
      sound.playPaperRustle();
      const updatedPositions = { ...latestPositionsRef.current };
      persistBoard(updatedPositions, connectionsRef.current);
    }

    setTimeout(() => {
      hasDraggedDistanceRef.current = false;
      isDraggingRef.current = false;
    }, 60);
  };

  const handleCardPointerCancel = (e: React.PointerEvent, charId: string) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    dragRef.current = null;
    setDraggingCharId(null);
    setTimeout(() => {
      hasDraggedDistanceRef.current = false;
      isDraggingRef.current = false;
    }, 60);
  };

  const handleBoardPointerMove = (e: React.PointerEvent) => {
    if (connectingSourceId && boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }

    const currentDrag = dragRef.current;
    if (!currentDrag || !boardRef.current) return;

    const charId = currentDrag.id;
    const dx = e.clientX - currentDrag.startX;
    const dy = e.clientY - currentDrag.startY;

    if (!hasDraggedDistanceRef.current) {
      if (Math.hypot(dx, dy) > 4) {
        hasDraggedDistanceRef.current = true;
        isDraggingRef.current = true;
        setDraggingCharId(charId);
      } else {
        return;
      }
    }

    const rect = boardRef.current.getBoundingClientRect();
    const maxX = Math.max(10, rect.width - CARD_W - 10);
    const maxY = Math.max(10, rect.height - CARD_H - 10);

    const nextX = Math.max(10, Math.min(maxX, Math.round(currentDrag.initialX + dx)));
    const nextY = Math.max(10, Math.min(maxY, Math.round(currentDrag.initialY + dy)));

    latestPositionsRef.current[charId] = { x: nextX, y: nextY };
    setPositions(prev => ({
      ...prev,
      [charId]: { x: nextX, y: nextY }
    }));
  };

  const handleBoardPointerUp = () => {
    const wasDragging = hasDraggedDistanceRef.current;
    const activeDrag = dragRef.current;

    dragRef.current = null;
    setDraggingCharId(null);

    if (wasDragging && activeDrag) {
      sound.playPaperRustle();
      const updatedPositions = { ...latestPositionsRef.current };
      persistBoard(updatedPositions, connectionsRef.current);
    }

    setTimeout(() => {
      hasDraggedDistanceRef.current = false;
      isDraggingRef.current = false;
    }, 60);
  };

  const handleCardClick = (charId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (hasDraggedDistanceRef.current || isDraggingRef.current) return;
    if (selectedCharacterId === charId) return;

    if (connectingSourceId) {
      if (connectingSourceId === charId) {
        setConnectingSourceId(null);
        setMousePos(null);
      } else {
        handleCompleteConnection(charId);
      }
      return;
    }

    sound.playPaperRustle();
    setSelectedCharacterId(charId);
    if (onSelectCharacterId) {
      onSelectCharacterId(charId);
    } else {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', 'characters');
        url.searchParams.set('characterId', charId);
        window.history.pushState({}, '', url.toString());
      } catch {}
    }
  };

  const handleCloseDossier = () => {
    sound.playPaperRustle();
    setSelectedCharacterId(null);
    if (onSelectCharacterId) {
      onSelectCharacterId(null);
    } else {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('characterId');
        window.history.pushState({}, '', url.toString());
      } catch {}
    }
  };

  // 6. Red Thread Connection Lifecycle
  const handleStartConnection = (sourceCharId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    sound.playTypewriterKeystroke();
    setConnectingSourceId(sourceCharId);
    if (boardRef.current) {
      const sourcePos = positions[sourceCharId] || { x: 50, y: 50 };
      setMousePos({
        x: sourcePos.x + PIN_OFFSET_X,
        y: sourcePos.y + PIN_OFFSET_Y
      });
    }
    const sourceChar = characters.find(c => c && c.id === sourceCharId);
    addToast("Tying Red Thread", `Select suspect to connect with ${sourceChar?.name || 'Selected'}`, "info");
  };

  const handleCompleteConnection = (targetCharId: string) => {
    if (!connectingSourceId || connectingSourceId === targetCharId) {
      setConnectingSourceId(null);
      setMousePos(null);
      return;
    }

    const sourceId = connectingSourceId;
    setConnectingSourceId(null);
    setMousePos(null);

    const exists = connections.some(
      c => c && ((c.sourceId === sourceId && c.targetId === targetCharId) ||
           (c.sourceId === targetCharId && c.targetId === sourceId))
    );

    if (exists) {
      addToast("Thread Exists", "These characters are already linked. Click the label to edit.", "info");
      return;
    }

    setSelectedPresetLabel('Friends');
    setCustomLabel('');
    setConnectionNotes('');
    setNewConnModal({
      sourceId,
      targetId: targetCharId
    });
  };

  const handleSaveConnection = () => {
    if (!newConnModal) return;
    const finalLabel = (customLabel.trim().length > 0) ? customLabel.trim() : selectedPresetLabel;
    const newConnection: BoardConnection = {
      id: `conn_${newConnModal.sourceId}_${newConnModal.targetId}_${Date.now()}`,
      sourceId: newConnModal.sourceId,
      targetId: newConnModal.targetId,
      label: finalLabel,
      type: (customLabel.trim().length > 0) ? 'custom' : (RELATIONSHIP_PRESETS.find(p => p.label === selectedPresetLabel)?.type || 'custom'),
      notes: connectionNotes.trim()
    };

    const next = [...connections, newConnection];
    connectionsRef.current = next;
    setConnections(next);
    persistBoard(latestPositionsRef.current, next);
    sound.playTypewriterKeystroke();
    addToast("Thread Pinned", `Bound with red thread: ${finalLabel}`, "success");
    setNewConnModal(null);
  };

  const handleDeleteConnection = (connId: string) => {
    const nextConns = connections.filter(c => c && c.id !== connId);
    connectionsRef.current = nextConns;
    setConnections(nextConns);
    persistBoard(latestPositionsRef.current, nextConns);
    sound.playPaperRustle();
    addToast("Thread Severed", "Relationship link removed from evidence board.", "info");
    setEditingConnection(null);
  };

  const handleUpdateConnection = () => {
    if (!editingConnection) return;
    const nextConns = connections.map(c => (c && c.id === editingConnection.id ? editingConnection : c));
    connectionsRef.current = nextConns;
    setConnections(nextConns);
    persistBoard(latestPositionsRef.current, nextConns);
    sound.playTypewriterKeystroke();
    addToast("Relationship Revised", "Evidence thread updated.", "success");
    setEditingConnection(null);
  };

  // 7. AI Character Generator & Creation Workflows
  const handleGenerateAiCharacter = async (role: string = "Protagonist") => {
    if (!activeStory) return;
    try {
      setGeneratingAi(true);
      sound.playTypewriterKeystroke();
      const res = await api.generateAiCharacter({
        genre: activeStory.genre,
        role: role,
        theme: activeStory.theme,
      });

      const gen = res.character;
      const genrePortraits: Record<string, string[]> = {
        Mystery: [
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop",
        ],
        Fantasy: [
          "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=600&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop",
        ],
        Horror: [
          "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?q=80&w=600&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600&auto=format&fit=crop",
        ],
        Romance: [
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop",
        ],
        SciFi: [
          "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop",
        ]
      };

      const pool = genrePortraits[activeStory.genre] || genrePortraits.Mystery;
      const randomPortrait = pool[Math.floor(Math.random() * pool.length)];

      const newChar: Partial<Character> = {
        name: gen.name || "Unknown Suspect",
        alias: gen.alias || "The Shadow",
        role: (gen.role || role) as any,
        age: gen.age ? String(gen.age) : "35",
        personality_traits: Array.isArray(gen.personality_traits) ? gen.personality_traits : ["Observant", "Guarded"],
        backstory: gen.backstory || "Personal records submerged in mystery.",
        physical_description: gen.physical_description || "Wears heavy trench coat, distinct scar.",
        motivations: gen.motivations || "Search for hidden truth.",
        secrets: gen.secrets || "Knows identity of the informant.",
        fears: gen.fears || "Betrayal by inner circle.",
        current_status: "Alive",
        first_appearance: "Chapter 1",
        last_appearance: "Active Scene",
        portrait_url: randomPortrait,
        relationships: []
      };

      setEditingChar(newChar);
      setModalOpen(true);
      addToast("Profile Synthesized", "Review dossier specifications before committing.", "success");
    } catch (e: any) {
      addToast("Generation failed", e.message, "error");
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSaveCharacter = async (charData: Partial<Character>) => {
    if (!activeStory) return;
    try {
      sound.playTypewriterKeystroke();
      if (charData.id) {
        await api.updateCharacter(charData.id, charData);
        addToast("Dossier Updated", `Case file for ${charData.name} updated.`, "success");
        // State refreshed via fetchCharacters
      } else {
        const created = await api.createCharacter(activeStory.id, charData);
        const curCount = characters.length;
        const rect = boardRef.current?.getBoundingClientRect();
        const width = rect?.width || 900;
        const cols = Math.max(2, Math.floor(width / (CARD_W + 50)));
        const col = curCount % cols;
        const row = Math.floor(curCount / cols);
        const newPos = {
          x: 40 + col * (CARD_W + 50),
          y: 40 + row * (CARD_H + 40)
        };
        const nextPos = { ...positions, [created.id]: newPos };
        setPositions(nextPos);
        persistBoard(nextPos, connections);
        addToast("Dossier Catalogued", `Case file for ${created.name} added to archive.`, "success");
      }
      setModalOpen(false);
      setEditingChar(null);
      await fetchCharacters();
    } catch (e: any) {
      addToast("Failed to save", e.message, "error");
    }
  };

  const handleDeleteCharacter = async (charId: string, charName?: string) => {
    if (!window.confirm(`Expunge dossier for "${charName || 'this suspect'}"? This will also cut all connected red threads.`)) {
      return;
    }
    try {
      sound.playPaperRustle();
      await api.deleteCharacter(charId);

      const nextPos = { ...positions };
      delete nextPos[charId];
      setPositions(nextPos);

      const nextConns = connections.filter(c => c && c.sourceId !== charId && c.targetId !== charId);
      setConnections(nextConns);
      persistBoard(nextPos, nextConns);

      if (selectedCharacterId === charId) {
        handleCloseDossier();
      }

      addToast("Record Expunged", `Dossier for ${charName || 'suspect'} purged from archives.`, "info");
      await fetchCharacters();
    } catch {
      addToast("Error", "Could not delete character record.", "error");
    }
  };

  const toggleSecret = (charId: string) => {
    sound.playPaperRustle();
    setRevealedSecrets(prev => ({ ...prev, [charId]: !prev[charId] }));
  };

  const connectingSourceChar = characters.find(c => c && c.id === connectingSourceId);
  const newConnSourceChar = newConnModal ? characters.find(c => c && c.id === newConnModal.sourceId) : null;
  const newConnTargetChar = newConnModal ? characters.find(c => c && c.id === newConnModal.targetId) : null;

  // Safe helper to extract traits with universal object/string resilience
  const getTraitsList = (char: Character | null | undefined): string[] => {
    if (!char) return ['Perceptive', 'Observant'];
    if (Array.isArray(char.personality_traits)) {
      return char.personality_traits.map(t => {
        if (typeof t === 'string') return t;
        if (typeof t === 'object' && t !== null) {
          return (t as any).trait || (t as any).name || JSON.stringify(t);
        }
        return String(t);
      }).filter(Boolean);
    }
    if (typeof char.personality_traits === 'string') {
      return (char.personality_traits as string).split(',').map(s => s.trim()).filter(Boolean);
    }
    return ['Perceptive', 'Observant'];
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      
      {/* ── MAIN CHARACTER RELATIONSHIP BOARD ── */}
      <div className="space-y-6">
        {/* Header & Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2C231B] pb-5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C49A61] animate-pulse"></span>
              <span className="font-typewriter text-xs text-[#C49A61] font-bold tracking-[0.25em] uppercase">
                INVESTIGATIVE CRIME BOARD • EVIDENCE WALL
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-black text-[#F2E8DC] mt-1">
              Character Relationship Board
            </h1>
            <p className="font-typewriter text-xs sm:text-sm text-[#A69482] mt-1">
              Drag portraits to arrange. Connect with red threads to map allegiances and secrets. Click any photograph to inspect full dossier.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Connection Mode Toggle Button */}
            <button
              onClick={() => {
                if (connectingSourceId) {
                  setConnectingSourceId(null);
                  setMousePos(null);
                } else if (characters.length >= 2) {
                  handleStartConnection(characters[0].id);
                } else {
                  addToast("Need More Characters", "Add at least two suspects to link red threads.", "info");
                }
              }}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg font-typewriter text-xs font-bold uppercase tracking-wider transition-all shadow ${
                connectingSourceId
                  ? 'bg-[#C0392B] text-white ring-2 ring-red-400 animate-pulse'
                  : 'bg-[#2B1714] text-[#E5A8A3] border border-[#8C2E24] hover:bg-[#3D1E1A]'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>{connectingSourceId ? 'Connecting...' : 'Tie Red Thread'}</span>
            </button>

            {/* Auto Arrange Layout Button */}
            <button
              onClick={handleAutoArrange}
              className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-[#1C1713] hover:bg-[#2A221B] text-[#C49A61] border border-[#3E3024] font-typewriter text-xs font-bold uppercase transition-colors"
              title="Reset layout grid"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Auto Arrange</span>
            </button>

            {/* View Mode Toggle: Board vs Roster */}
            <div className="bg-[#181310] p-1 rounded-lg border border-[#382E25] flex items-center space-x-1">
              <button
                onClick={() => setViewMode('board')}
                className={`px-3 py-1.5 rounded font-typewriter text-xs uppercase transition-colors flex items-center space-x-1 ${
                  viewMode === 'board'
                    ? 'bg-[#C49A61] text-[#14100D] font-bold shadow'
                    : 'text-[#8C7A68] hover:text-[#D4C5B3]'
                }`}
                title="Visual Red Thread Investigation Wall"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Board</span>
              </button>
              <button
                onClick={() => setViewMode('roster')}
                className={`px-3 py-1.5 rounded font-typewriter text-xs uppercase transition-colors flex items-center space-x-1 ${
                  viewMode === 'roster'
                    ? 'bg-[#C49A61] text-[#14100D] font-bold shadow'
                    : 'text-[#8C7A68] hover:text-[#D4C5B3]'
                }`}
                title="Index of Dossiers"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Roster</span>
              </button>
            </div>

            {/* AI Generator Button */}
            <button
              onClick={() => handleGenerateAiCharacter("Protagonist")}
              disabled={generatingAi}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#2A2016] hover:bg-[#3D2E20] text-[#E0B77D] border border-[#C49A61]/50 font-typewriter text-xs uppercase font-bold tracking-wider transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C49A61]" />
              <span className="hidden sm:inline">{generatingAi ? "Synthesizing..." : "AI Suspect"}</span>
            </button>

            {/* New Character Button */}
            <button
              onClick={() => {
                setEditingChar({
                  name: '',
                  role: 'Protagonist',
                  personality_traits: ['Methodical', 'Observant'],
                  current_status: 'Alive',
                  relationships: [],
                  portrait_url: '',
                });
                setModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#C49A61] hover:bg-[#D6AB72] text-[#14100D] font-typewriter text-xs uppercase font-bold tracking-wider shadow transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Character</span>
            </button>
          </div>
        </div>

        {/* ── INVESTIGATION DOSSIER FILTER BAR ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1C1713]/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-[#382E24] shadow-md">
          <div className="flex items-center space-x-2">
            <span className="font-typewriter text-[11px] font-bold text-[#A69482] uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#C49A61]" />
              <span>Filter Dossiers:</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* All Characters */}
            <button
              type="button"
              onClick={() => {
                sound.playPaperRustle();
                setCharacterFilter('all');
              }}
              className={`px-3 py-1.5 rounded-lg font-typewriter text-xs font-bold uppercase transition-all flex items-center space-x-1.5 ${
                characterFilter === 'all'
                  ? 'bg-[#C49A61] text-[#14100D] shadow'
                  : 'bg-[#2A2016] text-[#A69482] hover:text-[#E0D7C7] border border-[#3E3024]'
              }`}
            >
              <span>All Characters</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                characterFilter === 'all' ? 'bg-[#14100D] text-[#C49A61] font-bold' : 'bg-[#14100D]/60 text-[#8C7A68]'
              }`}>
                {allCount}
              </span>
            </button>

            {/* Persons of Interest */}
            <button
              type="button"
              onClick={() => {
                sound.playPaperRustle();
                setCharacterFilter('poi');
              }}
              className={`px-3 py-1.5 rounded-lg font-typewriter text-xs font-bold uppercase transition-all flex items-center space-x-1.5 ${
                characterFilter === 'poi'
                  ? 'bg-[#B03A2E] text-white shadow-lg ring-1 ring-red-400 font-black'
                  : 'bg-[#2A2016] text-[#E5A8A3] hover:bg-[#3D1E1A] border border-[#8C2E24]/60'
              }`}
              title="Display only characters explicitly marked as Person of Interest"
            >
              <span className="w-2 h-2 rounded-full bg-[#E74C3C] animate-pulse" />
              <span>Persons of Interest</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                characterFilter === 'poi' ? 'bg-white text-[#B03A2E] font-black' : 'bg-[#14100D]/60 text-[#E5A8A3]'
              }`}>
                {poiCount}
              </span>
            </button>

            {/* Innocent */}
            <button
              type="button"
              onClick={() => {
                sound.playPaperRustle();
                setCharacterFilter('innocent');
              }}
              className={`px-3 py-1.5 rounded-lg font-typewriter text-xs font-bold uppercase transition-all flex items-center space-x-1.5 ${
                characterFilter === 'innocent'
                  ? 'bg-[#2E4729] text-[#C9ECC5] border border-[#5E9454] shadow font-black'
                  : 'bg-[#2A2016] text-[#A8C7A0] hover:text-[#C9ECC5] border border-[#3E3024]'
              }`}
              title="Display only characters classified as Innocent"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#86BA7D]" />
              <span>Innocent</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                characterFilter === 'innocent' ? 'bg-[#14100D] text-[#A5DE9E] font-bold' : 'bg-[#14100D]/60 text-[#8C7A68]'
              }`}>
                {innocentCount}
              </span>
            </button>

            {/* Unclassified */}
            <button
              type="button"
              onClick={() => {
                sound.playPaperRustle();
                setCharacterFilter('unclassified');
              }}
              className={`px-3 py-1.5 rounded-lg font-typewriter text-xs font-bold uppercase transition-all flex items-center space-x-1.5 ${
                characterFilter === 'unclassified'
                  ? 'bg-[#5A493B] text-[#F0E6D8] border border-[#8C7456] shadow font-bold'
                  : 'bg-[#2A2016] text-[#8C7A68] hover:text-[#D4C5B3] border border-[#3E3024]'
              }`}
              title="Display characters with unclassified investigation status"
            >
              <span>Unclassified</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                characterFilter === 'unclassified' ? 'bg-[#14100D] text-[#E0D7C7] font-bold' : 'bg-[#14100D]/60 text-[#8C7A68]'
              }`}>
                {unclassifiedCount}
              </span>
            </button>
          </div>
        </div>

        {/* Linking Instructions Banner (Active when tying thread) */}
        {connectingSourceId && (
          <div className="bg-[#2D120F] border-2 border-[#C0392B] p-3 rounded-xl flex items-center justify-between text-xs font-typewriter text-[#F2D7D4] shadow-xl animate-pulse">
            <div className="flex items-center space-x-3">
              <span className="w-3 h-3 rounded-full bg-[#E74C3C] animate-ping"></span>
              <span>
                <strong>THREAD IN HAND:</strong> Select another character portrait to tie a red evidence connection with <strong>{connectingSourceChar?.name || 'Selected Suspect'}</strong>.
              </span>
            </div>
            <button
              onClick={() => {
                setConnectingSourceId(null);
                setMousePos(null);
              }}
              className="px-3 py-1 bg-[#1A0A08] hover:bg-black rounded border border-[#C0392B]/60 text-white uppercase text-[11px] font-bold"
            >
              Cancel Link
            </button>
          </div>
        )}

        {/* Interactive Relationship Board Canvas */}
        {viewMode === 'board' ? (
          <BoardCanvasErrorBoundary onResetLayout={handleAutoArrange}>
            <div
              ref={boardRef}
              onPointerMove={handleBoardPointerMove}
              onPointerUp={handleBoardPointerUp}
              onPointerCancel={handleBoardPointerUp}
              className={`relative w-full rounded-2xl border-2 border-[#8C6F48] overflow-hidden select-none transition-all shadow-2xl ${
                isBoardExpanded ? 'min-h-[820px] h-[86vh]' : 'min-h-[640px] h-[72vh]'
              }`}
              style={{
                backgroundColor: '#A88D65',
                backgroundImage: `url(${boardTextureBase64})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_80px_rgba(40,25,12,0.6)] z-0"></div>
              
              {/* Board Stats & Expand Toggle */}
              <div className="absolute top-3 right-3 z-30 flex items-center space-x-2.5 bg-[#1C1612]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#382E24] shadow-md text-xs font-typewriter text-[#C49A61]">
                {/* Sync status indicator */}
                <div className="flex items-center space-x-1.5 pr-2 border-r border-[#382E24]">
                  {syncStatus === 'saving' && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-amber-300 text-[11px]">Syncing stage...</span>
                    </>
                  )}
                  {syncStatus === 'saved' && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-emerald-300 text-[11px]">Layout saved</span>
                    </>
                  )}
                  {syncStatus === 'offline' && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span className="text-[#A69482] text-[11px]">Saved locally</span>
                    </>
                  )}
                  {syncStatus === 'idle' && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500/70" />
                      <span className="text-[#A69482] text-[11px]">Stage active</span>
                    </>
                  )}
                </div>
                <span>{characters.length} Suspects Pinned</span>
                <span>•</span>
                <span className="text-[#E5A8A3]">{connections.length} Red Threads</span>
                <button
                  onClick={() => setIsBoardExpanded(!isBoardExpanded)}
                  className="ml-1 text-[#A69482] hover:text-white p-0.5 transition-colors"
                  title={isBoardExpanded ? "Collapse board" : "Expand board view"}
                >
                  {isBoardExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* SVG Red Connecting Threads */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
              <defs>
                <filter id="threadShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.8" />
                </filter>
              </defs>

              {connections.map(conn => {
                if (!conn || !conn.sourceId || !conn.targetId) return null;
                // Only render connection if both characters match the active filter
                if (characterFilter !== 'all') {
                  const visibleIds = new Set(filteredCharacters.map(c => c.id));
                  if (!visibleIds.has(conn.sourceId) || !visibleIds.has(conn.targetId)) {
                    return null;
                  }
                }
                const posA = positions[conn.sourceId] || latestPositionsRef.current[conn.sourceId];
                const posB = positions[conn.targetId] || latestPositionsRef.current[conn.targetId];
                if (!posA || !posB) return null;

                const rawX1 = posA.x;
                const rawY1 = posA.y;
                const rawX2 = posB.x;
                const rawY2 = posB.y;

                if (!Number.isFinite(rawX1) || !Number.isFinite(rawY1) || !Number.isFinite(rawX2) || !Number.isFinite(rawY2)) {
                  return null;
                }

                const x1 = rawX1 + PIN_OFFSET_X;
                const y1 = rawY1 + PIN_OFFSET_Y;
                const x2 = rawX2 + PIN_OFFSET_X;
                const y2 = rawY2 + PIN_OFFSET_Y;

                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;
                const dist = Math.hypot(x2 - x1, y2 - y1);
                const sag = Math.min(48, Math.max(16, dist * 0.08));
                const cx = mx;
                const cy = my + sag;

                const pathData = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;

                return (
                  <g key={conn.id} className="transition-opacity">
                    <path
                      d={pathData}
                      fill="none"
                      stroke="#0B0503"
                      strokeWidth={4.5}
                      strokeOpacity={0.65}
                      strokeLinecap="round"
                    />
                    <path
                      d={pathData}
                      fill="none"
                      stroke="#C0392B"
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      filter="url(#threadShadow)"
                    />
                    <path
                      d={pathData}
                      fill="none"
                      stroke="#E74C3C"
                      strokeWidth={1}
                      strokeOpacity={0.8}
                      strokeDasharray="4 6"
                    />
                    <circle cx={x1} cy={y1} r={3.5} fill="#7A1D15" stroke="#F1C40F" strokeWidth={1} />
                    <circle cx={x2} cy={y2} r={3.5} fill="#7A1D15" stroke="#F1C40F" strokeWidth={1} />
                  </g>
                );
              })}

              {/* Rubberband thread during link mode */}
              {connectingSourceId && mousePos && (
                <g>
                  {(() => {
                    const sourcePos = positions[connectingSourceId] || latestPositionsRef.current[connectingSourceId];
                    if (!sourcePos || !Number.isFinite(sourcePos.x) || !Number.isFinite(sourcePos.y)) return null;
                    if (!mousePos || !Number.isFinite(mousePos.x) || !Number.isFinite(mousePos.y)) return null;

                    const x1 = sourcePos.x + PIN_OFFSET_X;
                    const y1 = sourcePos.y + PIN_OFFSET_Y;
                    const x2 = mousePos.x;
                    const y2 = mousePos.y;
                    const mx = (x1 + x2) / 2;
                    const my = (y1 + y2) / 2;
                    const dist = Math.hypot(x2 - x1, y2 - y1);
                    const sag = Math.min(40, Math.max(10, dist * 0.06));
                    const cx = mx;
                    const cy = my + sag;
                    const pathData = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;

                    return (
                      <>
                        <path
                          d={pathData}
                          fill="none"
                          stroke="#C0392B"
                          strokeWidth={2.5}
                          strokeDasharray="5 5"
                          filter="url(#threadShadow)"
                        />
                        <circle cx={x2} cy={y2} r={5} fill="#E74C3C" stroke="#FFFFFF" strokeWidth={1.5} />
                      </>
                    );
                  })()}
                </g>
              )}
            </svg>

            {/* Relationship Labels Pinned Along the Threads */}
            <div className="absolute inset-0 pointer-events-none z-20">
              {connections.map(conn => {
                if (!conn || !conn.sourceId || !conn.targetId) return null;
                // Only render connection if both characters match the active filter
                if (characterFilter !== 'all') {
                  const visibleIds = new Set(filteredCharacters.map(c => c.id));
                  if (!visibleIds.has(conn.sourceId) || !visibleIds.has(conn.targetId)) {
                    return null;
                  }
                }
                const posA = positions[conn.sourceId] || latestPositionsRef.current[conn.sourceId];
                const posB = positions[conn.targetId] || latestPositionsRef.current[conn.targetId];
                if (!posA || !posB) return null;

                const rawX1 = posA.x;
                const rawY1 = posA.y;
                const rawX2 = posB.x;
                const rawY2 = posB.y;

                if (!Number.isFinite(rawX1) || !Number.isFinite(rawY1) || !Number.isFinite(rawX2) || !Number.isFinite(rawY2)) {
                  return null;
                }

                const x1 = rawX1 + PIN_OFFSET_X;
                const y1 = rawY1 + PIN_OFFSET_Y;
                const x2 = rawX2 + PIN_OFFSET_X;
                const y2 = rawY2 + PIN_OFFSET_Y;

                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;
                const dist = Math.hypot(x2 - x1, y2 - y1);
                const sag = Math.min(48, Math.max(16, dist * 0.08));
                const tagX = mx;
                const tagY = my + sag * 0.55;

                return (
                  <div
                    key={conn.id}
                    style={{
                      position: 'absolute',
                      left: `${tagX}px`,
                      top: `${tagY}px`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className="pointer-events-auto"
                  >
                    <button
                      onClick={() => setEditingConnection(conn)}
                      className="group flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#231A14]/95 hover:bg-[#34241B] border border-[#8C2E24] hover:border-[#C49A61] shadow-xl text-xs font-typewriter font-bold text-[#E5A8A3] hover:text-[#FFF] transition-all hover:scale-105"
                      title={`Click to edit or cut relationship: "${typeof conn?.label === 'string' ? conn.label : 'Link'}"`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E74C3C]"></span>
                      <span className="tracking-wide uppercase text-[11px] sm:text-xs">
                        {typeof conn?.label === 'string' ? conn.label : (conn?.label && typeof conn.label === 'object' ? ((conn.label as any).label || 'Link') : 'Link')}
                      </span>
                      <Scissors className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-[#C49A61] transition-opacity ml-0.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Pinned Character Portrait Cards */}
            <div className="absolute inset-0 z-20 pointer-events-none">
              {(characterFilter === 'all' ? characters : filteredCharacters).map(char => {
                if (!char || !char.id) return null;
                const pos = positions[char.id] || latestPositionsRef.current[char.id] || { x: 40, y: 40 };
                const posX = Number.isFinite(pos?.x) ? pos.x : 40;
                const posY = Number.isFinite(pos?.y) ? pos.y : 40;
                const isSource = connectingSourceId === char.id;
                const isValidTarget = connectingSourceId && connectingSourceId !== char.id;
                const isPOI = char.investigation_status === 'person_of_interest';
                const isInnocent = char.investigation_status === 'innocent';
                const isDraggingThis = draggingCharId === char.id;

                return (
                  <div
                    key={char.id}
                    style={{
                      position: 'absolute',
                      left: `${posX}px`,
                      top: `${posY}px`,
                      width: `${CARD_W}px`,
                      touchAction: 'none',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      willChange: isDraggingThis ? 'transform, left, top' : 'auto',
                      transition: isDraggingThis ? 'none' : 'box-shadow 0.15s ease, transform 0.15s ease',
                    }}
                    onPointerDown={(e) => handleCardPointerDown(e, char.id)}
                    onPointerMove={(e) => handleCardPointerMove(e, char.id)}
                    onPointerUp={(e) => handleCardPointerUp(e, char.id)}
                    onPointerCancel={(e) => handleCardPointerCancel(e, char.id)}
                    onClick={(e) => handleCardClick(char.id, e)}
                    className={`pointer-events-auto group select-none transition-shadow ${
                      isDraggingThis
                        ? 'z-50 scale-105 shadow-[0_25px_50px_rgba(0,0,0,0.85)] ring-2 ring-[#C49A61] cursor-grabbing'
                        : isSource
                        ? 'ring-4 ring-[#C0392B] ring-offset-2 ring-offset-[#14100D] scale-105 z-30 cursor-pointer'
                        : isValidTarget
                        ? 'hover:ring-2 hover:ring-[#E0B77D] hover:scale-105 z-25 cursor-pointer'
                        : 'hover:scale-[1.02] z-20 cursor-grab'
                    }`}
                  >
                    {/* Pushpin at Top */}
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center">
                      <div 
                        onClick={(e) => handleStartConnection(char.id, e)}
                        className={`w-6 h-6 rounded-full cursor-pointer shadow-lg flex items-center justify-center border transition-transform hover:scale-125 ${
                          isSource
                            ? 'bg-[#C0392B] border-white shadow-red-950 animate-pulse'
                            : 'bg-[#B03A2E] hover:bg-[#E74C3C] border-[#5E1914]'
                        }`}
                        title="Click pushpin to tie a red thread from this character"
                      >
                        <div className="w-2 h-2 rounded-full bg-white/70"></div>
                      </div>
                    </div>

                    {/* Top-Right POI Pin / Indicator on Border Area */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePOI(char.id);
                      }}
                      className={`absolute -top-2.5 -right-2.5 z-35 flex items-center justify-center transition-all ${
                        isPOI
                          ? 'opacity-100 scale-100 hover:scale-110'
                          : isInnocent
                          ? 'opacity-100 scale-100 hover:scale-110'
                          : 'opacity-0 group-hover:opacity-85 hover:!opacity-100 scale-90 hover:scale-105'
                      }`}
                      title={isPOI ? "Designated as Person of Interest — Click to clear" : isInnocent ? "Classified as Innocent — Click to clear" : "Click to designate as Person of Interest (POI)"}
                    >
                      {isPOI ? (
                        <div className="relative w-6 h-6 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.65),0_0_10px_rgba(192,57,43,0.5)] flex items-center justify-center">
                          <div 
                            className="absolute inset-0 rounded-full border-2 border-[#4A0E0B]"
                            style={{
                              background: 'radial-gradient(circle at 35% 35%, #FF5A4E 0%, #D32F2F 45%, #9A1C16 80%, #5E0D08 100%)',
                            }}
                          />
                          <div className="relative w-3 h-3 rounded-full border border-white/70 flex items-center justify-center shadow-inner">
                            <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_3px_rgba(255,255,255,0.9)]" />
                          </div>
                          <div 
                            className="absolute top-0.5 left-1 w-1.5 h-1 rounded-full bg-white/60 -rotate-30 pointer-events-none"
                            style={{ filter: 'blur(0.2px)' }}
                          />
                        </div>
                      ) : isInnocent ? (
                        <div className="relative w-5 h-5 rounded-full shadow border border-[#5E9454] bg-[#2E4729] flex items-center justify-center">
                          <UserCheck className="w-3 h-3 text-[#A5DE9E]" />
                        </div>
                      ) : (
                        <div className="relative w-5 h-5 rounded-full shadow border border-[#4A3B2C] bg-[#2A2016] flex items-center justify-center text-[#A69482] hover:text-[#E0D7C7]">
                          <span className="text-[9px] font-bold">+</span>
                        </div>
                      )}
                    </button>

                    {/* Hand-Drawn Red Marker Highlight for Person of Interest */}
                    {isPOI && (
                      <div 
                        key={`poi-marker-${char.id}`}
                        className="absolute -inset-5 pointer-events-none z-30 overflow-visible"
                        style={{ filter: 'drop-shadow(0 2px 5px rgba(180, 20, 20, 0.45))' }}
                      >
                        <svg 
                          className="w-full h-full overflow-visible" 
                          viewBox="0 0 188 228" 
                          fill="none" 
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <defs>
                            <style>{`
                              @keyframes drawMarkerCircle {
                                0% {
                                  stroke-dashoffset: 820;
                                  opacity: 0.1;
                                }
                                12% {
                                  opacity: 1;
                                }
                                100% {
                                  stroke-dashoffset: 0;
                                  opacity: 1;
                                }
                              }
                              .marker-stroke-main {
                                stroke-dasharray: 820;
                                stroke-dashoffset: 0;
                                animation: drawMarkerCircle 0.85s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
                              }
                              .marker-stroke-subtle {
                                stroke-dasharray: 820;
                                stroke-dashoffset: 0;
                                animation: drawMarkerCircle 0.92s cubic-bezier(0.25, 0.8, 0.25, 1) 0.04s forwards;
                              }
                            `}</style>
                          </defs>

                          {/* Base bleeding ink under-stroke */}
                          <path
                            d="M 104 16 C 138 14 172 38 178 86 C 183 132 174 186 138 214 C 108 228 66 226 38 206 C 14 188 8 144 10 98 C 12 50 42 18 90 14 C 114 12 142 16 160 28"
                            stroke="#B71C1C"
                            strokeWidth="4.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeOpacity="0.45"
                            fill="none"
                            className="marker-stroke-subtle"
                          />

                          {/* Main vibrant hand-drawn marker stroke */}
                          <path
                            d="M 102 18 C 136 15 170 40 176 88 C 182 134 172 184 136 212 C 106 226 68 224 40 204 C 16 186 10 142 12 96 C 14 48 44 19 92 16 C 118 14 146 20 162 30"
                            stroke="#DC2626"
                            strokeWidth="3.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeOpacity="0.95"
                            fill="none"
                            className="marker-stroke-main"
                          />

                          {/* Overlapping top flourish */}
                          <path
                            d="M 88 15 C 108 14 134 17 154 26 C 164 31 170 38 171 44"
                            stroke="#EF4444"
                            strokeWidth="2.6"
                            strokeLinecap="round"
                            strokeOpacity="0.8"
                            fill="none"
                            className="marker-stroke-subtle"
                          />
                        </svg>

                        {/* Authentic PERSON OF INTEREST Tag near marked character */}
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 pointer-events-none z-40 flex items-center justify-center">
                          <div className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-[#9A1C16] text-white border-2 border-[#FFCDD2] shadow-[0_2px_10px_rgba(154,28,22,0.7)] transform -rotate-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            <span className="font-typewriter text-[9px] font-black tracking-widest uppercase">
                              PERSON OF INTEREST
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Polaroid Frame: Image + Name underneath */}
                    <div className={`p-2.5 pb-3 rounded shadow-2xl text-center overflow-hidden transition-all ${
                      isPOI
                        ? 'bg-[#F2ECE6] border-2 border-[#B03A2E] ring-1 ring-[#B03A2E]/50 shadow-[0_6px_20px_rgba(176,58,46,0.3)]'
                        : isInnocent
                        ? 'bg-[#EFECE6] border border-[#5E8C58]/60 shadow-lg'
                        : 'bg-[#EFECE6] border border-[#2D2118]'
                    }`}>
                      <div className="w-full h-[122px] bg-[#1a1a1a] rounded-sm overflow-hidden border border-black/20 shadow-inner relative">
                        <img
                          src={char.portrait_url}
                          alt={char.name}
                          className="w-full h-full object-cover filter contrast-[1.05] brightness-95 group-hover:brightness-100 transition-all pointer-events-none"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <span 
                          className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full border border-black/40 ${
                            char.current_status === 'Alive' ? 'bg-emerald-500' : 'bg-red-500'
                          }`} 
                          title={`Status: ${char.current_status}`}
                        />
                        {isPOI && (
                          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-[#9A1C16]/90 border border-white/40 text-white font-typewriter text-[8px] font-black tracking-wider uppercase shadow">
                            POI
                          </div>
                        )}
                        {isInnocent && (
                          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-[#2D4A27]/90 border border-white/40 text-[#D4ECD0] font-typewriter text-[8px] font-bold tracking-wider uppercase shadow flex items-center gap-0.5">
                            <UserCheck className="w-2 h-2" />
                            <span>INNOCENT</span>
                          </div>
                        )}
                      </div>

                      {/* ONLY Character Name underneath image */}
                      <div className="mt-2 px-1">
                        <h4 className="font-serif font-bold text-xs sm:text-[13px] text-[#241C15] leading-tight truncate">
                          {char.name}
                        </h4>
                        <p className="font-typewriter text-[10px] text-[#7A6451] uppercase tracking-wider truncate mt-0.5">
                          {char.role}
                        </p>
                      </div>

                      {/* Card Hover Actions - Balanced 3-column grid inside Polaroid border */}
                      <div className="mt-2 pt-1.5 border-t border-[#D5CCBA] grid grid-cols-3 gap-1 px-0.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartConnection(char.id, e);
                          }}
                          className="px-1 py-1 rounded bg-[#35251C] hover:bg-[#A82E25] text-[#E0B77D] hover:text-white text-[9px] font-typewriter font-bold uppercase transition-colors flex items-center justify-center shadow-sm"
                          title="Tie red thread"
                        >
                          Link
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick(char.id, e);
                          }}
                          className="px-1 py-1 rounded bg-[#D6C6A9] hover:bg-[#C49A61] text-[#231A13] text-[9px] font-typewriter font-bold uppercase transition-colors flex items-center justify-center shadow-sm"
                          title="Open full dossier file"
                        >
                          Dossier
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePOI(char.id);
                          }}
                          className={`px-1 py-1 rounded text-[9px] font-typewriter font-bold uppercase transition-all flex items-center justify-center gap-0.5 shadow-sm ${
                            isPOI
                              ? 'bg-[#B03A2E] text-white hover:bg-[#8F1D14] ring-1 ring-red-300 font-black'
                              : 'bg-[#2B1714] text-[#E5A8A3] hover:bg-[#B03A2E] hover:text-white border border-[#8C2E24]'
                          }`}
                          title={isPOI ? "Remove Person of Interest designation" : "Designate as Person of Interest (POI)"}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPOI ? 'bg-white' : 'bg-[#E74C3C]'}`} />
                          <span className="truncate">{isPOI ? 'POI' : 'Mark POI'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Filtered Empty State Prompt on Board */}
            {characterFilter !== 'all' && filteredCharacters.length === 0 && characters.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center z-25 p-6 text-center">
                <div className="max-w-md bg-[#1C1713]/90 backdrop-blur-md p-6 rounded-xl border border-[#382E24] shadow-2xl space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-full bg-[#C49A61]/20 flex items-center justify-center text-[#C49A61]">
                    <Filter className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#EFE7DC]">No Dossiers Match Filter</h3>
                    <p className="font-typewriter text-xs text-[#A69482] mt-1 leading-relaxed">
                      No suspects currently match the "{characterFilter === 'poi' ? 'Persons of Interest' : characterFilter === 'innocent' ? 'Innocent' : 'Unclassified'}" classification.
                    </p>
                  </div>
                  <button
                    onClick={() => setCharacterFilter('all')}
                    className="px-4 py-1.5 rounded bg-[#C49A61] text-[#14100D] font-typewriter text-xs uppercase font-bold tracking-wider shadow"
                  >
                    View All Characters ({allCount})
                  </button>
                </div>
              </div>
            )}

            {/* Empty State Prompt */}
            {characters.length === 0 && !loading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 p-6 text-center">
                <div className="max-w-md bg-[#1C1713]/90 backdrop-blur-md p-8 rounded-xl border border-[#382E24] shadow-2xl space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#C49A61]/20 flex items-center justify-center text-[#C49A61]">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-[#EFE7DC]">Investigation Board Empty</h3>
                    <p className="font-typewriter text-xs text-[#A69482] mt-1.5 leading-relaxed">
                      No character photographs pinned to the evidence wall yet. Create a suspect profile or synthesize one using AI.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        setEditingChar({
                          name: '',
                          role: 'Protagonist',
                          personality_traits: ['Methodical', 'Observant'],
                          current_status: 'Alive',
                          relationships: [],
                          portrait_url: '',
                        });
                        setModalOpen(true);
                      }}
                      className="px-4 py-2 rounded bg-[#C49A61] text-[#14100D] font-typewriter text-xs uppercase font-bold tracking-wider shadow"
                    >
                      + New Dossier
                    </button>
                    <button
                      onClick={() => handleGenerateAiCharacter("Protagonist")}
                      className="px-3.5 py-2 rounded bg-[#2A2016] text-[#E0B77D] border border-[#C49A61]/50 font-typewriter text-xs uppercase font-bold"
                    >
                      Generate AI Suspect
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          </BoardCanvasErrorBoundary>
        ) : (
          /* Detailed Cards Index Grid */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCharacters.map(char => {
                const isPOI = char.investigation_status === 'person_of_interest';
                const isInnocent = char.investigation_status === 'innocent';
                return (
                  <div
                    key={char.id}
                    onClick={(e) => handleCardClick(char.id, e)}
                    className={`p-4 rounded-xl border cursor-pointer shadow-lg space-y-3 transition-all flex items-start gap-4 hover:-translate-y-1 relative ${
                      isPOI
                        ? 'bg-[#221612] hover:bg-[#2A1B16] border-[#B03A2E]/70 shadow-[0_4px_16px_rgba(176,58,46,0.2)] ring-1 ring-[#B03A2E]/30'
                        : isInnocent
                        ? 'bg-[#181C16] hover:bg-[#1E231C] border-[#4A6B42]/50'
                        : 'bg-[#1C1713] hover:bg-[#231D18] border-[#382E24]'
                    }`}
                  >
                    <div className="w-16 h-16 rounded-md overflow-hidden shrink-0 border border-[#C49A61]/40 bg-[#1a1a1a] shadow relative">
                      <img src={char.portrait_url} alt={char.name} className="w-full h-full object-cover" />
                      {isPOI && (
                        <div className="absolute top-0.5 right-0.5 z-10 pointer-events-none" title="Person of Interest">
                          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#FF5A4E] to-[#9A1C16] border border-[#4A0E0B] shadow flex items-center justify-center">
                            <div className="w-1 h-1 rounded-full bg-white"></div>
                          </div>
                        </div>
                      )}
                      {isInnocent && (
                        <div className="absolute top-0.5 right-0.5 z-10 pointer-events-none" title="Classified as Innocent">
                          <div className="w-4 h-4 rounded-full bg-[#2E4729] border border-[#78966A] shadow flex items-center justify-center">
                            <div className="w-1 h-1 rounded-full bg-[#A5DE9E]"></div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-serif text-base font-bold text-[#F2E8DC] truncate">{char.name}</h4>
                          {isPOI && (
                            <span className="px-2 py-0.5 rounded-full bg-[#9A1C16] text-white border border-[#FFCDD2] text-[9px] font-typewriter font-black tracking-wider uppercase shadow flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              <span>PERSON OF INTEREST</span>
                            </span>
                          )}
                          {isInnocent && (
                            <span className="px-2 py-0.5 rounded-full bg-[#243821] text-[#C9ECC5] border border-[#5E9454]/60 text-[9px] font-typewriter font-bold tracking-wider uppercase shadow flex items-center gap-1">
                              <UserCheck className="w-2.5 h-2.5 text-[#A5DE9E]" />
                              <span>INNOCENT</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-typewriter px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
                          {char.current_status}
                        </span>
                      </div>
                      <p className="font-typewriter text-xs text-[#C49A61] mt-0.5">{char.role}</p>
                      <p className="font-serif text-xs text-[#A69482] line-clamp-2 mt-1 leading-snug">
                        {char.backstory || "Personal background catalogued in dossier."}
                      </p>
                      <div className="pt-2 mt-2 border-t border-[#2E241C] flex items-center justify-between">
                        <span className="text-[10px] font-typewriter text-[#8C7A68]">
                          {isPOI ? "Status: Person of Interest (POI)" : isInnocent ? "Status: Classified as Innocent" : "Click to view dossier"}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePOI(char.id);
                          }}
                          className={`px-2.5 py-1 rounded text-[11px] font-typewriter font-bold uppercase transition-all flex items-center space-x-1.5 ${
                            isPOI
                              ? 'bg-[#B03A2E] text-white hover:bg-[#8F1D14] ring-1 ring-red-300 font-black'
                              : 'bg-[#2B1714] text-[#E5A8A3] hover:bg-[#B03A2E] hover:text-white border border-[#8C2E24]'
                          }`}
                          title={isPOI ? "Remove Person of Interest designation" : "Designate as Person of Interest (POI)"}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isPOI ? 'bg-white' : 'bg-[#E74C3C]'}`} />
                          <span>{isPOI ? 'Remove POI' : 'Mark as POI'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty filtered roster state */}
            {characterFilter !== 'all' && filteredCharacters.length === 0 && characters.length > 0 && (
              <div className="p-12 text-center bg-[#1C1713]/80 rounded-xl border border-[#382E24] shadow space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#C49A61]/20 flex items-center justify-center text-[#C49A61]">
                  <Filter className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-lg font-bold text-[#EFE7DC]">No Character Dossiers Found</h3>
                <p className="font-typewriter text-xs text-[#A69482] max-w-sm mx-auto">
                  No characters are currently catalogued under the "{characterFilter === 'poi' ? 'Persons of Interest' : characterFilter === 'innocent' ? 'Innocent' : 'Unclassified'}" classification filter.
                </p>
                <button
                  onClick={() => setCharacterFilter('all')}
                  className="px-4 py-1.5 rounded bg-[#C49A61] text-[#14100D] font-typewriter text-xs uppercase font-bold tracking-wider shadow"
                >
                  Show All Characters ({allCount})
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── DEDICATED CHARACTER DETAILS MODAL ── */}
      <AnimatePresence>
        {selectedCharacterId && (
          <CharacterDetailsModal
            characterId={selectedCharacterId}
            storyId={activeStory?.id}
            allCharacters={characters}
            investigationStatus={characters.find(c => c.id === selectedCharacterId)?.investigation_status}
            onChangeInvestigationStatus={(newStatus) => {
              if (selectedCharacterId) {
                setCharacters(prev => prev.map(c => c.id === selectedCharacterId ? { ...c, investigation_status: newStatus } : c));
              }
            }}
            onClose={handleCloseDossier}
            onSelectCharacter={(charId) => handleCardClick(charId)}
            onEdit={(char) => {
              setEditingChar(char);
              setModalOpen(true);
            }}
            onDelete={(charId, name) => handleDeleteCharacter(charId, name)}
            onStartConnection={(charId) => handleStartConnection(charId)}
          />
        )}
      </AnimatePresence>

      {/* ── MODAL 1: DEFINE RELATIONSHIP (NEW THREAD CONNECTION) ── */}
      {newConnModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
          onClick={() => setNewConnModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-[#D6C5A9] p-6 sm:p-7 rounded-xl border-2 border-[#8F7454] shadow-2xl text-[#2B2117] space-y-5 my-auto"
          >
            <div className="border-b border-[#6E5A44]/40 pb-3">
              <span className="font-typewriter text-xs font-bold text-[#8A332B] uppercase tracking-wider flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-[#C0392B]" />
                <span>RED THREAD EVIDENCE LINK</span>
              </span>
              <h3 className="font-serif text-2xl font-bold text-[#1E1711] mt-0.5">
                Define Character Relationship
              </h3>
              <p className="font-typewriter text-xs text-[#6E5A47] mt-1">
                Tying <strong>{newConnSourceChar?.name || 'Suspect'}</strong> to <strong>{newConnTargetChar?.name || 'Suspect'}</strong> with a red evidence cord.
              </p>
            </div>

            <div className="space-y-4 text-xs font-typewriter">
              <div>
                <label className="block font-bold uppercase text-[#543F2D] mb-1.5">
                  Select Bond / Connection Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {RELATIONSHIP_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setSelectedPresetLabel(preset.label);
                        setCustomLabel('');
                      }}
                      className={`p-2 rounded border text-left transition-all flex items-center space-x-1.5 ${
                        selectedPresetLabel === preset.label && !customLabel
                          ? 'bg-[#2E2016] text-[#E0B77D] border-[#C49A61] font-bold shadow'
                          : 'bg-[#C7B596]/60 hover:bg-[#C7B596] border-[#8C7558] text-[#2E2016]'
                      }`}
                    >
                      <span>{preset.icon}</span>
                      <span className="truncate">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-[#543F2D] mb-1">
                  Or Custom Relationship Label
                </label>
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="e.g. Secret Accomplice, Estranged Sibling..."
                  className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] text-[#231A13] placeholder-[#8A7966] font-typewriter text-xs focus:outline-none focus:ring-1 focus:ring-[#8C2E24]"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-[#543F2D] mb-1">
                  Investigative Notes / Intel (Optional)
                </label>
                <textarea
                  rows={2}
                  value={connectionNotes}
                  onChange={(e) => setConnectionNotes(e.target.value)}
                  placeholder="Notes on how this connection was uncovered..."
                  className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] text-[#231A13] placeholder-[#8A7966] font-serif text-xs focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[#8F7556]/40 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setNewConnModal(null)}
                  className="px-4 py-2 rounded border border-[#6B553E] text-[#2B2117] font-bold uppercase hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveConnection}
                  className="px-5 py-2 rounded bg-[#8A2B20] hover:bg-[#A8382C] text-white font-bold uppercase shadow flex items-center space-x-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Pin Red Thread</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: EDIT OR SEVER RELATIONSHIP THREAD ── */}
      {editingConnection && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setEditingConnection(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-[#D6C5A9] p-6 rounded-xl border-2 border-[#8F7454] shadow-2xl text-[#2B2117] space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#6E5A44]/40 pb-2.5">
              <div className="flex items-center space-x-1.5">
                <Scissors className="w-4 h-4 text-[#8A332B]" />
                <h3 className="font-serif text-xl font-bold text-[#1E1711]">Edit Evidence Thread</h3>
              </div>
              <button
                onClick={() => setEditingConnection(null)}
                className="text-[#6E5A47] hover:text-black p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-typewriter text-xs">
              <div>
                <label className="block font-bold uppercase text-[#543F2D] mb-1">
                  Relationship Label
                </label>
                <input
                  type="text"
                  value={editingConnection.label}
                  onChange={(e) => setEditingConnection({ ...editingConnection, label: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] text-[#231A13]"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-[#543F2D] mb-1">
                  Investigative Notes
                </label>
                <textarea
                  rows={2}
                  value={editingConnection.notes || ''}
                  onChange={(e) => setEditingConnection({ ...editingConnection, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] font-serif text-xs text-[#231A13]"
                />
              </div>

              <div className="pt-3 border-t border-[#8F7556]/40 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDeleteConnection(editingConnection.id)}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded border border-[#8F332B] text-[#8F332B] hover:bg-red-950/10 font-bold uppercase text-xs"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Cut Thread</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingConnection(null)}
                    className="px-3 py-1.5 rounded border border-[#6B553E] text-[#2B2117] font-bold uppercase text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateConnection}
                    className="px-4 py-1.5 rounded bg-[#2B2016] text-[#E0B77D] hover:bg-[#3D2D20] font-bold uppercase text-xs shadow"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: CREATE / EDIT CHARACTER DOSSIER ── */}
      {modalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
          onClick={() => setModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl bg-[#D6C5A9] p-6 sm:p-8 rounded-xl border-2 border-[#8F7454] shadow-2xl text-[#2B2117] space-y-4 my-auto max-h-[90vh] overflow-y-auto"
          >
            <div className="border-b border-[#6E5A44]/40 pb-3">
              <span className="font-typewriter text-xs font-bold text-[#8A332B] uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-[#C0392B]" />
                <span>OFFICIAL SUSPECT DOSSIER SPECIFICATION</span>
              </span>
              <h3 className="font-serif text-2xl font-bold text-[#1E1711] mt-0.5">
                {editingChar?.id ? `Revise Dossier: ${editingChar.name}` : 'Catalog New Suspect'}
              </h3>
            </div>

            <div className="space-y-3.5 font-typewriter text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase mb-1">Full Legal / Known Name *</label>
                  <input
                    type="text"
                    value={editingChar?.name || ''}
                    onChange={(e) => setEditingChar(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Silas Vance"
                    className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] text-[#231A13]"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase mb-1">Codename / Known Alias</label>
                  <input
                    type="text"
                    value={editingChar?.alias || ''}
                    onChange={(e) => setEditingChar(prev => ({ ...prev, alias: e.target.value }))}
                    placeholder="e.g. The Harbor Hound"
                    className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] text-[#231A13]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold uppercase mb-1">Narrative Role</label>
                  <select
                    value={editingChar?.role || 'Protagonist'}
                    onChange={(e) => setEditingChar(prev => ({ ...prev, role: e.target.value as any }))}
                    className="w-full px-2 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] text-[#231A13]"
                  >
                    <option value="Protagonist">Protagonist</option>
                    <option value="Antagonist">Antagonist</option>
                    <option value="Deuteragonist">Deuteragonist</option>
                    <option value="Companion">Companion</option>
                    <option value="Foil">Foil</option>
                    <option value="Mentor">Mentor</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase mb-1">Age</label>
                  <input
                    type="text"
                    value={editingChar?.age || ''}
                    onChange={(e) => setEditingChar(prev => ({ ...prev, age: e.target.value }))}
                    placeholder="e.g. 38"
                    className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] text-[#231A13]"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase mb-1">Status</label>
                  <select
                    value={editingChar?.current_status || 'Alive'}
                    onChange={(e) => setEditingChar(prev => ({ ...prev, current_status: e.target.value as any }))}
                    className="w-full px-2 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] text-[#231A13]"
                  >
                    <option value="Alive">Verified Alive</option>
                    <option value="Missing">Missing</option>
                    <option value="Deceased">Deceased</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase mb-1">Portrait Image URL</label>
                <input
                  type="text"
                  value={editingChar?.portrait_url || ''}
                  onChange={(e) => setEditingChar(prev => ({ ...prev, portrait_url: e.target.value }))}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] text-[#231A13]"
                />
              </div>

              <div>
                <label className="block font-bold uppercase mb-1">Personality Traits (Comma Separated)</label>
                <input
                  type="text"
                  value={Array.isArray(editingChar?.personality_traits) ? editingChar.personality_traits.join(', ') : (typeof editingChar?.personality_traits === 'string' ? editingChar.personality_traits : '')}
                  onChange={(e) => setEditingChar(prev => ({
                    ...prev,
                    personality_traits: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  }))}
                  placeholder="Methodical, Cynical, Observant, Guarded"
                  className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] text-[#231A13]"
                />
              </div>

              <div>
                <label className="block font-bold uppercase mb-1">Backstory</label>
                <textarea
                  rows={3}
                  value={editingChar?.backstory || ''}
                  onChange={(e) => setEditingChar(prev => ({ ...prev, backstory: e.target.value }))}
                  className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] font-serif text-xs text-[#231A13]"
                />
              </div>

              <div>
                <label className="block font-bold uppercase mb-1">Physical Description</label>
                <textarea
                  rows={2}
                  value={editingChar?.physical_description || ''}
                  onChange={(e) => setEditingChar(prev => ({ ...prev, physical_description: e.target.value }))}
                  className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] font-serif text-xs text-[#231A13]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase mb-1">Motivations & Driving Need</label>
                  <input
                    type="text"
                    value={editingChar?.motivations || ''}
                    onChange={(e) => setEditingChar(prev => ({ ...prev, motivations: e.target.value }))}
                    className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] text-[#231A13]"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase mb-1">Primary Fear</label>
                  <input
                    type="text"
                    value={editingChar?.fears || ''}
                    onChange={(e) => setEditingChar(prev => ({ ...prev, fears: e.target.value }))}
                    className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] text-[#231A13]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase mb-1">Concealed Secret</label>
                <input
                  type="text"
                  value={editingChar?.secrets || ''}
                  onChange={(e) => setEditingChar(prev => ({ ...prev, secrets: e.target.value }))}
                  className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] text-[#231A13]"
                />
              </div>

              <div className="pt-4 border-t border-[#7A644E]/40 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded border border-[#6B553E] text-[#2B2117] font-bold uppercase hover:bg-black/5"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => editingChar && handleSaveCharacter(editingChar)}
                  className="px-6 py-2 rounded bg-[#2B2016] text-[#E0B77D] hover:bg-[#3D2D20] font-bold uppercase shadow"
                >
                  Commit Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
