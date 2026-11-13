import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useStory } from '../context/StoryContext';
import { api } from '../services/api';
import { Character } from '../types';
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
  ArrowLeft
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

const CARD_W = 148;
const CARD_H = 188;
const PIN_OFFSET_X = 74;
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

export const CharacterArchive: React.FC = () => {
  const { activeStory, addToast } = useStory();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);

  // Board layout state
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [connections, setConnections] = useState<BoardConnection[]>([]);
  const [viewMode, setViewMode] = useState<'board' | 'roster'>('board');

  // Dedicated Character Dossier Modal Overlay (opened when clicking a portrait)
  const [selectedDossierChar, setSelectedDossierChar] = useState<Character | null>(null);

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

  // Dragging state tracking
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);
  const isDraggingRef = useRef(false);

  const storageKey = activeStory ? `storyweave_char_board_${activeStory.id}` : null;

  // Global Escape Key Listener for Modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedDossierChar) {
          setSelectedDossierChar(null);
        }
        setNewConnModal(null);
        setEditingConnection(null);
        setModalOpen(false);
        setConnectingSourceId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDossierChar]);

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

  // 2. Load / Reconcile Positions and Connections from Storage
  useEffect(() => {
    if (!activeStory || characters.length === 0) return;

    let savedData: { positions?: Record<string, Position>; connections?: BoardConnection[] } = {};
    if (storageKey) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            savedData = parsed;
          }
        }
      } catch (e) {
        console.error("Failed to parse board state from localStorage", e);
      }
    }

    // A. Reconcile Positions
    const currentPositions: Record<string, Position> = (savedData && typeof savedData.positions === 'object' && !Array.isArray(savedData.positions)) ? savedData.positions : {};
    const newPositions: Record<string, Position> = { ...currentPositions };

    const boardWidth = boardRef.current ? boardRef.current.clientWidth : 1000;
    const cols = Math.max(2, Math.floor((boardWidth - 80) / (CARD_W + 45)));

    characters.forEach((char, idx) => {
      if (!char || !char.id) return;
      if (!newPositions[char.id]) {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        newPositions[char.id] = {
          x: 40 + col * (CARD_W + 50) + (row % 2 === 1 ? 25 : 0),
          y: 40 + row * (CARD_H + 45),
        };
      }
    });

    setPositions(newPositions);

    // B. Reconcile Connections with Strict Sanitization
    let activeConnections: BoardConnection[] = [];
    if (savedData && savedData.connections && Array.isArray(savedData.connections)) {
      activeConnections = savedData.connections.filter(conn =>
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

    setConnections(activeConnections);
  }, [characters, activeStory, storageKey]);

  // 3. Persist State to LocalStorage
  const persistBoard = useCallback((newPos: Record<string, Position>, newConns: BoardConnection[]) => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        positions: newPos,
        connections: newConns,
        updatedAt: new Date().toISOString()
      }));
    } catch (e) {
      console.error("Failed to persist board layout to localStorage", e);
    }
  }, [storageKey]);

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
    setPositions(freshPositions);
    persistBoard(freshPositions, connections);
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

    const currentPos = positions[charId] || { x: 50, y: 50 };
    dragRef.current = {
      id: charId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentPos.x,
      initialY: currentPos.y
    };
    isDraggingRef.current = false;
  };

  const handleBoardPointerMove = (e: React.PointerEvent) => {
    if (connectingSourceId && boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }

    if (!dragRef.current || !boardRef.current) return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    if (Math.hypot(dx, dy) > 8) {
      isDraggingRef.current = true;
    }

    if (isDraggingRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      const maxX = Math.max(10, rect.width - CARD_W - 10);
      const maxY = Math.max(10, rect.height - CARD_H - 10);

      const nextX = Math.max(10, Math.min(maxX, dragRef.current.initialX + dx));
      const nextY = Math.max(10, Math.min(maxY, dragRef.current.initialY + dy));

      setPositions(prev => ({
        ...prev,
        [dragRef.current!.id]: { x: nextX, y: nextY }
      }));
    }
  };

  const handleBoardPointerUp = () => {
    if (dragRef.current) {
      if (isDraggingRef.current) {
        persistBoard(positions, connections);
      }
      dragRef.current = null;
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 50);
    }
  };

  const handleCardClick = (char: Character, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDraggingRef.current) return;

    if (connectingSourceId) {
      if (connectingSourceId === char.id) {
        setConnectingSourceId(null);
        setMousePos(null);
      } else {
        handleCompleteConnection(char.id);
      }
      return;
    }

    sound.playPaperRustle();
    setSelectedDossierChar(char);
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
    setConnections(next);
    persistBoard(positions, next);
    sound.playTypewriterKeystroke();
    addToast("Thread Pinned", `Bound with red thread: ${finalLabel}`, "success");
    setNewConnModal(null);
  };

  const handleDeleteConnection = (connId: string) => {
    const nextConns = connections.filter(c => c && c.id !== connId);
    setConnections(nextConns);
    persistBoard(positions, nextConns);
    sound.playPaperRustle();
    addToast("Thread Severed", "Relationship link removed from evidence board.", "info");
    setEditingConnection(null);
  };

  const handleUpdateConnection = () => {
    if (!editingConnection) return;
    const nextConns = connections.map(c => (c && c.id === editingConnection.id ? editingConnection : c));
    setConnections(nextConns);
    persistBoard(positions, nextConns);
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
        if (selectedDossierChar?.id === charData.id) {
          setSelectedDossierChar({ ...selectedDossierChar, ...charData } as Character);
        }
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

      if (selectedDossierChar?.id === charId) {
        setSelectedDossierChar(null);
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
          <div
            ref={boardRef}
            onPointerMove={handleBoardPointerMove}
            onPointerUp={handleBoardPointerUp}
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
            <div className="absolute top-3 right-3 z-30 flex items-center space-x-2 bg-[#1C1612]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#382E24] shadow-md text-xs font-typewriter text-[#C49A61]">
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
                const posA = positions[conn.sourceId];
                const posB = positions[conn.targetId];
                if (!posA || !posB) return null;

                const x1 = posA.x + PIN_OFFSET_X;
                const y1 = posA.y + PIN_OFFSET_Y;
                const x2 = posB.x + PIN_OFFSET_X;
                const y2 = posB.y + PIN_OFFSET_Y;

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
              {connectingSourceId && mousePos && positions[connectingSourceId] && (
                <g>
                  {(() => {
                    const sourcePos = positions[connectingSourceId];
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
                const posA = positions[conn.sourceId];
                const posB = positions[conn.targetId];
                if (!posA || !posB) return null;

                const x1 = posA.x + PIN_OFFSET_X;
                const y1 = posA.y + PIN_OFFSET_Y;
                const x2 = posB.x + PIN_OFFSET_X;
                const y2 = posB.y + PIN_OFFSET_Y;

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
              {characters.map(char => {
                if (!char || !char.id) return null;
                const pos = positions[char.id] || { x: 40, y: 40 };
                const isSource = connectingSourceId === char.id;
                const isValidTarget = connectingSourceId && connectingSourceId !== char.id;

                return (
                  <div
                    key={char.id}
                    style={{
                      position: 'absolute',
                      left: `${pos.x}px`,
                      top: `${pos.y}px`,
                      width: `${CARD_W}px`,
                      touchAction: 'none'
                    }}
                    onPointerDown={(e) => handleCardPointerDown(e, char.id)}
                    onClick={(e) => handleCardClick(char, e)}
                    className={`pointer-events-auto cursor-pointer group transition-shadow ${
                      isSource
                        ? 'ring-4 ring-[#C0392B] ring-offset-2 ring-offset-[#14100D] scale-105 z-30'
                        : isValidTarget
                        ? 'hover:ring-2 hover:ring-[#E0B77D] hover:scale-105 z-25'
                        : 'hover:scale-[1.02] z-20'
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

                    {/* Polaroid Frame: Image + Name underneath ONLY */}
                    <div className="bg-[#EFECE6] p-2.5 pb-3 rounded shadow-2xl border border-[#2D2118] text-center overflow-hidden">
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

                      {/* Card Hover Actions */}
                      <div className="mt-2 pt-1.5 border-t border-[#D5CCBA] flex items-center justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartConnection(char.id, e);
                          }}
                          className="px-2 py-0.5 rounded bg-[#35251C] hover:bg-[#A82E25] text-[#E0B77D] hover:text-white text-[10px] font-typewriter font-bold uppercase transition-colors"
                          title="Tie red thread"
                        >
                          Link
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick(char, e);
                          }}
                          className="px-2 py-0.5 rounded bg-[#D6C6A9] hover:bg-[#C49A61] text-[#231A13] text-[10px] font-typewriter font-bold uppercase transition-colors"
                          title="Open full dossier file"
                        >
                          Dossier
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

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
        ) : (
          /* Detailed Cards Index Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {characters.map(char => (
              <div
                key={char.id}
                onClick={(e) => handleCardClick(char, e)}
                className="bg-[#1C1713] hover:bg-[#231D18] p-4 rounded-xl border border-[#382E24] cursor-pointer shadow-lg space-y-3 transition-colors flex items-start gap-4 hover:-translate-y-1"
              >
                <div className="w-16 h-16 rounded-md overflow-hidden shrink-0 border border-[#C49A61]/40 bg-[#1a1a1a] shadow">
                  <img src={char.portrait_url} alt={char.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif text-base font-bold text-[#F2E8DC] truncate">{char.name}</h4>
                    <span className="text-[10px] font-typewriter px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
                      {char.current_status}
                    </span>
                  </div>
                  <p className="font-typewriter text-xs text-[#C49A61] mt-0.5">{char.role}</p>
                  <p className="font-serif text-xs text-[#A69482] line-clamp-2 mt-1 leading-snug">
                    {char.backstory || "Personal background catalogued in dossier."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── DEDICATED CHARACTER DOSSIER VIEW MODAL (RENDERED VIA PORTAL TO BODY) ── */}
      {selectedDossierChar && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => setSelectedDossierChar(null)}
        >
          <div
            className="relative w-full max-w-4xl my-auto space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Return Navigation Bar */}
            <div className="flex items-center justify-between gap-4 bg-[#1C1612] p-3.5 sm:p-4 rounded-xl border border-[#3A2E24] shadow-2xl">
              <button
                type="button"
                onClick={() => setSelectedDossierChar(null)}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#C49A61] hover:bg-[#D6AB72] text-[#14100D] font-typewriter text-xs font-bold uppercase tracking-wider shadow transition-all hover:scale-105 group"
              >
                <ArrowLeft className="w-4 h-4 text-[#14100D] group-hover:-translate-x-1 transition-transform" />
                <span>Return to Relationship Board</span>
              </button>

              <div className="flex items-center space-x-3 font-typewriter text-xs text-[#A69482]">
                <span className="uppercase tracking-widest text-[#C49A61] hidden sm:inline">Active Dossier:</span>
                <span className="font-serif font-bold text-base text-[#F2E8DC]">{String(selectedDossierChar.name || 'Subject')}</span>
                <span className="px-2 py-0.5 rounded bg-[#291F18] text-[#E0B77D] border border-[#3E3024] uppercase text-[10px]">
                  {String(selectedDossierChar.role || 'Witness')}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDossierChar(null)}
                className="p-1.5 rounded-lg text-[#9A8978] hover:text-white hover:bg-white/10 transition-colors"
                title="Close Dossier (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <DossierErrorBoundary fallbackName={selectedDossierChar.name} onReset={() => setSelectedDossierChar(null)}>

            {/* Physical Investigation Dossier Folder (Solid Antique Parchment Paper Container) */}
            <div className="relative rounded-2xl bg-[#D6C5A9] p-6 sm:p-9 border-2 border-[#8C7456] shadow-clipboard text-[#2B2117] max-h-[80vh] overflow-y-auto">
              {/* Status Stamp */}
              <div className="absolute top-6 right-6">
                <Stamp
                  label={selectedDossierChar.current_status === 'Alive' ? "VERIFIED ALIVE" : "CASE STATUS: MISSING"}
                  type={selectedDossierChar.current_status === 'Alive' ? "green" : "red"}
                  rotation={-2}
                  size="sm"
                />
              </div>

              {/* Dossier Header */}
              <div className="flex flex-col sm:flex-row items-start gap-6 border-b border-[#524131]/40 pb-6 mb-6">
                {/* Large Portrait Photograph */}
                <div className="shrink-0">
                  <div className="w-56 sm:w-64 p-3 pb-8 bg-[#EFECE6] rounded shadow-2xl border border-[#2D2118] text-center relative rotate-[-1.5deg]">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#B03A2E] border border-[#5E1914] shadow flex items-center justify-center z-20">
                      <div className="w-2 h-2 rounded-full bg-white/70"></div>
                    </div>
                    <div className="w-full h-48 sm:h-52 bg-[#1a1a1a] rounded-sm overflow-hidden shadow-inner border border-black/20 relative">
                      <img
                        src={selectedDossierChar.portrait_url || ''}
                        alt={String(selectedDossierChar.name || '')}
                        className="w-full h-full object-cover filter contrast-[1.06] brightness-[0.98] sepia-[0.12]"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-white/10"></div>
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/75 border border-[#C49A61]/50 text-[10px] font-typewriter tracking-widest text-[#E0B77D] uppercase shadow">
                        {String(selectedDossierChar.current_status || 'Unknown')}
                      </div>
                    </div>
                    <div className="mt-3 px-1 text-center">
                      <p className="font-handwriting text-xl sm:text-2xl text-[#241D17] leading-tight font-bold tracking-wide truncate">
                        {String(selectedDossierChar.name || 'Unknown')}
                      </p>
                      <p className="font-sans text-[11px] text-[#6E5C4B] mt-0.5 tracking-wider uppercase truncate">
                        {String(selectedDossierChar.role || 'Subject')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-3 font-typewriter text-xs text-[#2A2016]">
                  <div>
                    <span className="text-xs text-[#7A644E] uppercase tracking-widest block">CASE SUBJECT DOSSIER</span>
                    <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#1C150F]">
                      {String(selectedDossierChar.name || 'Unknown Suspect')}
                    </h2>
                    {selectedDossierChar.alias && (
                      <p className="font-typewriter text-xs text-[#7A362E] font-bold mt-0.5 tracking-wider">
                        KNOWN CODENAME: "{String(selectedDossierChar.alias)}"
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div><strong className="text-[#695441]">Chronological Age:</strong> {String(selectedDossierChar.age || "Undisclosed")}</div>
                    <div><strong className="text-[#695441]">Narrative Role:</strong> {String(selectedDossierChar.role || "Witness")}</div>
                    <div><strong className="text-[#695441]">First Record:</strong> {String(selectedDossierChar.first_appearance || "Chapter 1")}</div>
                    <div><strong className="text-[#695441]">Latest Trace:</strong> {String(selectedDossierChar.last_appearance || "Active Scene")}</div>
                  </div>

                  {/* Personality Traits Tags */}
                  <div className="pt-2">
                    <span className="text-xs text-[#7A644E] uppercase tracking-wider block mb-1">
                      OBSERVED PSYCHOLOGICAL TRAITS:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {getTraitsList(selectedDossierChar).map((trait, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-[#C7B596] text-[#291F16] border border-[#8C7558] font-bold text-xs"
                        >
                          • {String(trait)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="pt-3 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingChar(selectedDossierChar);
                        setModalOpen(true);
                      }}
                      className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded bg-[#35281D] hover:bg-[#473729] text-[#E0B77D] font-typewriter text-xs font-bold uppercase transition-colors shadow"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Dossier</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCharacter(selectedDossierChar.id, selectedDossierChar.name)}
                      className="flex items-center space-x-1 px-2.5 py-1.5 rounded border border-[#8F332B]/50 text-[#8F332B] hover:bg-red-900/10 font-typewriter text-xs font-bold uppercase transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleStartConnection(selectedDossierChar.id);
                        setSelectedDossierChar(null);
                      }}
                      className="flex items-center space-x-1 px-3.5 py-1.5 rounded bg-[#8A2B20] hover:bg-[#A8382C] text-white font-typewriter text-xs font-bold uppercase transition-colors shadow-sm ml-auto"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Tie Red Thread</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Dossier Body Documents */}
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-[#CCAFA0]/40 p-4 rounded-xl border border-[#8F785C] shadow-inner space-y-1.5">
                    <span className="font-typewriter text-xs font-bold text-[#6B533E] uppercase tracking-wider flex items-center space-x-1">
                      <UserCheck className="w-3.5 h-3.5 text-[#8F332B]" />
                      <span>PHYSICAL SPECIFICATION</span>
                    </span>
                    <p className="font-serif text-xs text-[#2A2016] leading-relaxed">
                      {String(selectedDossierChar.physical_description || "No distinct marks or gait notes catalogued.")}
                    </p>
                  </div>

                  <div className="bg-[#CCAFA0]/40 p-4 rounded-xl border border-[#8F785C] shadow-inner space-y-1.5">
                    <span className="font-typewriter text-xs font-bold text-[#6B533E] uppercase tracking-wider flex items-center space-x-1">
                      <Target className="w-3.5 h-3.5 text-[#8F332B]" />
                      <span>OPERATIONAL MOTIVATION</span>
                    </span>
                    <p className="font-serif text-xs text-[#2A2016] leading-relaxed">
                      {String(selectedDossierChar.motivations || "Motives remain obscure.")}
                    </p>
                  </div>
                </div>

                <div className="bg-[#CCAFA0]/40 p-4 rounded-xl border border-[#8F785C] shadow-inner space-y-1.5">
                  <span className="font-typewriter text-xs font-bold text-[#6B533E] uppercase tracking-wider block">
                    ARCHIVAL BIOGRAPHY & ORIGINS
                  </span>
                  <p className="font-serif text-xs sm:text-sm text-[#241A13] leading-relaxed">
                    {String(selectedDossierChar.backstory || "Personal background remains undocumented in county manifests.")}
                  </p>
                </div>

                {/* Confidential Secrets & Fears */}
                <div className="bg-[#CCAFA0]/60 p-4 rounded-xl border-2 border-dashed border-[#A84A42]/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Key className="w-4 h-4 text-[#A84A42]" />
                      <span className="font-typewriter text-xs font-bold text-[#7D2922] uppercase tracking-wider">
                        CONFIDENTIAL INVESTIGATIVE INTEL (SECRETS & FEARS)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleSecret(selectedDossierChar.id)}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#B4473E]/20 hover:bg-[#B4473E]/30 text-[#852C25] font-typewriter text-xs font-bold uppercase transition-colors"
                    >
                      {revealedSecrets[selectedDossierChar.id] ? (
                        <>
                          <EyeOff className="w-3 h-3" />
                          <span>Redact Intel</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" />
                          <span>Reveal Uncensored Intel</span>
                        </>
                      )}
                    </button>
                  </div>

                  {revealedSecrets[selectedDossierChar.id] ? (
                    <div className="space-y-2 pt-2 border-t border-[#A84A42]/30 text-xs font-serif text-[#331B18] transition-all">
                      <p><strong>Primary Vulnerability / Phobia:</strong> {String(selectedDossierChar.fears || "None catalogued.")}</p>
                      <p><strong>Concealed Secret / Ulterior Agenda:</strong> {String(selectedDossierChar.secrets || "No active secret logged.")}</p>
                    </div>
                  ) : (
                    <p className="font-typewriter text-xs text-[#7A5550] italic">
                      [REDACTED PURSUANT TO NARRATIVE SECRECY PROTOCOL. CLICK REVEAL TO ACCESS.]
                    </p>
                  )}
                </div>

                {/* Active Board Ties Connected to this Character */}
                <div className="space-y-2 pt-2 border-t border-[#8F785C]/30">
                  <span className="font-typewriter text-xs font-bold text-[#63503E] uppercase tracking-wider block">
                    RED THREAD BOARD RELATIONSHIPS ({
                      (connections || []).filter(c => c && (c.sourceId === selectedDossierChar.id || c.targetId === selectedDossierChar.id)).length
                    })
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(connections || [])
                      .filter(c => c && (c.sourceId === selectedDossierChar.id || c.targetId === selectedDossierChar.id))
                      .map((conn, idx) => {
                        const partnerId = conn.sourceId === selectedDossierChar.id ? conn.targetId : conn.sourceId;
                        const partner = characters.find(c => c && c.id === partnerId);
                        const labelText = typeof conn?.label === 'string'
                          ? conn.label
                          : (conn?.label && typeof conn.label === 'object' ? ((conn.label as any).label || 'Connected') : 'Connected');

                        return (
                          <div key={conn.id || `conn_${idx}`} className="p-3 rounded-lg bg-[#CBB89C] border border-[#8C7558] text-xs flex items-center justify-between shadow-sm">
                            <div className="flex items-center space-x-2.5">
                              {partner?.portrait_url ? (
                                <img src={partner.portrait_url} alt="" className="w-8 h-8 rounded-full object-cover border border-[#8C7558]" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[#2B2016] text-[#E0B77D] flex items-center justify-center font-bold text-xs border border-[#8C7558]">?</div>
                              )}
                              <div>
                                <span className="font-serif font-bold text-[#2A2016] block">{String(partner?.name || 'Unknown Subject')}</span>
                                <span className="font-typewriter text-[10px] text-[#7A6451] uppercase">{String(partner?.role || 'Witness')}</span>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-[#231A14] text-[#E5A8A3] border border-[#8B2E24] font-typewriter text-[11px] font-bold uppercase">
                              {labelText}
                            </span>
                          </div>
                        );
                      })}

                    {(connections || []).filter(c => c && (c.sourceId === selectedDossierChar.id || c.targetId === selectedDossierChar.id)).length === 0 && (
                      <p className="font-typewriter text-xs text-[#7A6653] italic col-span-2">
                        No red threads connected to this suspect yet. Click "Tie Red Thread" above to link them.
                      </p>
                    )}
                  </div>
                </div>

                {/* Archival Dossier Relationships (if present) */}
                {Array.isArray(selectedDossierChar.relationships) && selectedDossierChar.relationships.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#8F785C]/30">
                    <span className="font-typewriter text-xs font-bold text-[#63503E] uppercase tracking-wider block">
                      NOTED INTERPERSONAL TIES ({selectedDossierChar.relationships.length})
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {selectedDossierChar.relationships.map((rel, idx) => (
                        <div key={idx} className="p-3 rounded bg-[#CBB89C] border border-[#8C7558] text-xs space-y-1">
                          <div className="flex items-center justify-between font-typewriter">
                            <span className="font-bold text-[#2A2016]">{String(rel?.character_name || 'Subject')}</span>
                            <span className="px-1.5 py-0.5 rounded bg-[#C7B596] text-[#78332B] font-bold text-[10px] uppercase">
                              {String(rel?.relation_type || 'Known')}
                            </span>
                          </div>
                          {rel?.notes && (
                            <p className="font-serif text-[11px] text-[#4A3D31] italic">
                              "{String(rel.notes)}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom Return Button */}
                <div className="pt-5 border-t border-[#8C7456]/40 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedDossierChar(null)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2B2016] text-[#E0B77D] hover:bg-[#3D2D20] font-typewriter text-xs font-bold uppercase shadow transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Return to Relationship Board</span>
                  </button>
                </div>
              </div>
            </div>
            </DossierErrorBoundary>
          </div>
        </div>,
        document.body
      )}

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
