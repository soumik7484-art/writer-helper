import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStory } from '../../context/StoryContext';
import { api } from '../../services/api';
import { sound } from '../../services/audioService';
import { boardTextureBase64 } from '../../data/boardTextureBase64';
import {
  InvestigationCard,
  InvestigationConnection,
  InvestigationBoardState,
  PlotHole,
  BoardElementType,
  CardColorTheme,
  CardStatusBadge,
  PlotHoleSeverity
} from '../../types';
import {
  Sparkles,
  AlertTriangle,
  Plus,
  RotateCcw,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Edit3,
  Pin,
  PinOff,
  UserCheck,
  CheckCircle2,
  X,
  Link2,
  Scissors,
  Save,
  Download,
  Search,
  Filter,
  Eye,
  Crosshair,
  ShieldAlert,
  Flame,
  FileText,
  Clock,
  MapPin,
  HelpCircle,
  FolderOpen,
  ArrowRight,
  BookOpen,
  Move,
  Lock,
  Unlock,
  Check,
  RefreshCw,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InvestigationBoardProps {
  onNavigateToStudio?: (chapterId?: string) => void;
  onSelectIssue?: (issue: PlotHole) => void;
}

const CARD_WIDTH = 200;
const CARD_HEIGHT = 240;
const PIN_OFFSET_X = 100;
const PIN_OFFSET_Y = 16;

const RELATIONSHIP_LABELS = [
  'Last seen together',
  'Possesses the missing object',
  'Conflicting statements',
  'Appeared at the same location',
  'Possible motive',
  'Timeline contradiction',
  'Secret alliance',
  'Fictitious alibi',
  'Direct descendant / family',
  'Under surveillance',
  'Decoded cipher connection',
  'Physical evidence recovered'
];

export const InvestigationBoard: React.FC<InvestigationBoardProps> = ({
  onNavigateToStudio,
  onSelectIssue
}) => {
  const { stories, activeStory, setActiveStoryId, addToast } = useStory();

  // Core board state
  const [boardState, setBoardState] = useState<InvestigationBoardState>({
    story_id: '',
    elements: [],
    connections: [],
    culprit_id: null,
    zoom: 1.0,
    pan_offset: { x: 0, y: 0 }
  });

  const [issues, setIssues] = useState<PlotHole[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [auditing, setAuditing] = useState<boolean>(false);
  const [incrementalAnalyzing, setIncrementalAnalyzing] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');

  // Interactive selection state
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  // Active filters and views
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [highlightCulpritOnly, setHighlightCulpritOnly] = useState<boolean>(false);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  // Connection creation mode
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [connectionLabelModal, setConnectionLabelModal] = useState<{
    sourceId: string;
    targetId: string;
    label: string;
    type: string;
  } | null>(null);

  // Add Element Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newCardData, setNewCardData] = useState<{
    type: BoardElementType;
    title: string;
    subtitle: string;
    description: string;
    image_url: string;
    color: CardColorTheme;
    status: CardStatusBadge;
  }>({
    type: 'character',
    title: '',
    subtitle: '',
    description: '',
    image_url: '',
    color: 'polaroid',
    status: 'unverified'
  });

  // Pan & Zoom
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const boardContainerRef = useRef<HTMLDivElement>(null);

  // Dragging cards
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Undo / Redo history
  const historyRef = useRef<InvestigationBoardState[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isHistoryUpdateRef = useRef<boolean>(false);

  // Hover state for highlighting connected cluster
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  // Debounce save timer
  const saveTimerRef = useRef<any>(null);

  // 1. Initial Load of Board & Issues
  const loadBoardData = useCallback(async (storyId: string) => {
    try {
      setLoading(true);
      const [boardRes, issuesRes] = await Promise.all([
        api.getInvestigationBoard(storyId),
        api.getStoryPlotHoles(storyId)
      ]);

      setBoardState(boardRes);
      setZoom(boardRes.zoom || 1.0);
      setPan(boardRes.pan_offset || { x: 0, y: 0 });
      setIssues(issuesRes);

      // Initialize history
      historyRef.current = [JSON.parse(JSON.stringify(boardRes))];
      historyIndexRef.current = 0;
      setSaveStatus('saved');
    } catch (err: any) {
      addToast('Board Load Failed', err.message || 'Could not load investigation board', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (activeStory?.id) {
      loadBoardData(activeStory.id);
    }
  }, [activeStory?.id, loadBoardData]);

  // Push to Undo/Redo History
  const pushHistory = (newState: InvestigationBoardState) => {
    if (isHistoryUpdateRef.current) return;
    const history = historyRef.current.slice(0, historyIndexRef.current + 1);
    history.push(JSON.parse(JSON.stringify(newState)));
    if (history.length > 30) history.shift();
    historyRef.current = history;
    historyIndexRef.current = history.length - 1;
  };

  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const targetState = historyRef.current[historyIndexRef.current];
      isHistoryUpdateRef.current = true;
      setBoardState(JSON.parse(JSON.stringify(targetState)));
      scheduleSave(targetState);
      sound.playPaperRustle();
      setTimeout(() => { isHistoryUpdateRef.current = false; }, 50);
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const targetState = historyRef.current[historyIndexRef.current];
      isHistoryUpdateRef.current = true;
      setBoardState(JSON.parse(JSON.stringify(targetState)));
      scheduleSave(targetState);
      sound.playPaperRustle();
      setTimeout(() => { isHistoryUpdateRef.current = false; }, 50);
    }
  };

  // Debounced Autosave
  const scheduleSave = (stateToSave: InvestigationBoardState) => {
    setSaveStatus('dirty');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!activeStory?.id) return;
      try {
        setSaveStatus('saving');
        await api.saveInvestigationBoard(activeStory.id, stateToSave);
        setSaveStatus('saved');
      } catch (err) {
        setSaveStatus('dirty');
      }
    }, 1200);
  };

  // Save Immediately
  const handleManualSave = async () => {
    if (!activeStory?.id) return;
    try {
      setSaveStatus('saving');
      sound.playTypewriterKeystroke();
      await api.saveInvestigationBoard(activeStory.id, boardState);
      setSaveStatus('saved');
      addToast('Investigation Board Preserved', 'All evidence, cards, and red threads saved to archive.', 'success');
    } catch (e: any) {
      setSaveStatus('dirty');
      addToast('Save Failed', e.message, 'error');
    }
  };

  // Generate Investigation Board with AI
  const handleGenerateBoard = async () => {
    if (!activeStory?.id) return;
    try {
      setGenerating(true);
      sound.playTypewriterKeystroke();
      const generated = await api.generateInvestigationBoard(activeStory.id);
      setBoardState(generated);
      pushHistory(generated);
      setSaveStatus('saved');
      sound.playPaperRustle();
      addToast(
        'Investigation Board Reconstructed',
        `Generated ${generated.elements.length} evidence cards and ${generated.connections.length} investigative threads.`,
        'success'
      );
    } catch (err: any) {
      addToast('Generation Error', err.message || 'Failed to synthesize board', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Run AI Consistency Audit
  const handleRunAudit = async () => {
    if (!activeStory?.id) return;
    try {
      setAuditing(true);
      sound.playTypewriterKeystroke();
      const res = await api.runConsistencyAudit(activeStory.id);
      setIssues(res.audit_results);

      // Reload board to capture newly highlighted cards and contradiction strings
      const refreshedBoard = await api.getInvestigationBoard(activeStory.id);
      setBoardState(refreshedBoard);
      pushHistory(refreshedBoard);

      sound.playPaperRustle();
      addToast(
        'Continuity Audit Complete',
        `Discovered ${res.total_detected} potential plot contradictions across story canon.`,
        'success'
      );
    } catch (err: any) {
      addToast('Audit Error', err.message || 'Failed to complete consistency audit', 'error');
    } finally {
      setAuditing(false);
    }
  };

  // Incremental Chapter Scan
  const handleIncrementalAnalysis = async () => {
    if (!activeStory?.id) return;
    try {
      setIncrementalAnalyzing(true);
      sound.playTypewriterKeystroke();
      const res = await api.runIncrementalAnalysis(activeStory.id);
      setBoardState(res.board);
      pushHistory(res.board);
      sound.playPaperRustle();
      addToast('Incremental Analysis Complete', res.message, 'success');
    } catch (err: any) {
      addToast('Incremental Scan Failed', err.message, 'error');
    } finally {
      setIncrementalAnalyzing(false);
    }
  };

  // Designate Character as Culprit
  const handleDesignateCulprit = async (cardId: string | null) => {
    if (!activeStory?.id) return;
    try {
      sound.playTypewriterKeystroke();
      const updatedElements = boardState.elements.map(el => ({
        ...el,
        is_culprit: el.id === cardId
      }));
      const newState: InvestigationBoardState = {
        ...boardState,
        elements: updatedElements,
        culprit_id: cardId
      };
      setBoardState(newState);
      pushHistory(newState);
      scheduleSave(newState);

      // Synchronize with backend culprit API
      await api.setStoryCulprit(activeStory.id, cardId);

      const culpritCard = boardState.elements.find(e => e.id === cardId);
      addToast(
        cardId ? 'Prime Culprit Designated' : 'Culprit Cleared',
        cardId ? `${culpritCard?.title} marked as the primary suspect with red circular ring.` : 'Prime suspect marker removed.',
        'info'
      );
    } catch (err: any) {
      addToast('Culprit Update Failed', err.message, 'error');
    }
  };

  // Toggle Pinned status
  const handleTogglePin = (cardId: string) => {
    sound.playTypewriterKeystroke();
    const updated = boardState.elements.map(e =>
      e.id === cardId ? { ...e, is_pinned: !e.is_pinned } : e
    );
    const newState = { ...boardState, elements: updated };
    setBoardState(newState);
    pushHistory(newState);
    scheduleSave(newState);
  };

  // Toggle Verified stamp
  const handleToggleVerified = (cardId: string) => {
    sound.playTypewriterKeystroke();
    const updated = boardState.elements.map(e => {
      if (e.id === cardId) {
        const nextStatus = e.status === 'verified' ? 'unverified' : 'verified';
        return { ...e, status: nextStatus };
      }
      return e;
    });
    const newState = { ...boardState, elements: updated };
    setBoardState(newState);
    pushHistory(newState);
    scheduleSave(newState);
  };

  // Delete Card
  const handleDeleteCard = (cardId: string) => {
    sound.playPaperRustle();
    const updatedElements = boardState.elements.filter(e => e.id !== cardId);
    const updatedConnections = boardState.connections.filter(
      c => c.source_id !== cardId && c.target_id !== cardId
    );
    const newState: InvestigationBoardState = {
      ...boardState,
      elements: updatedElements,
      connections: updatedConnections,
      culprit_id: boardState.culprit_id === cardId ? null : boardState.culprit_id
    };
    setBoardState(newState);
    if (selectedCardId === cardId) setSelectedCardId(null);
    pushHistory(newState);
    scheduleSave(newState);
    addToast('Element Removed', 'Card incinerated from investigation corkboard.', 'info');
  };

  // Delete Connection
  const handleDeleteConnection = (connId: string) => {
    sound.playPaperRustle();
    const updated = boardState.connections.filter(c => c.id !== connId);
    const newState = { ...boardState, connections: updated };
    setBoardState(newState);
    if (selectedConnectionId === connId) setSelectedConnectionId(null);
    pushHistory(newState);
    scheduleSave(newState);
    addToast('Red Thread Severed', 'Investigative relationship cut.', 'info');
  };

  // Update Plot Hole Status
  const handleUpdateIssueStatus = async (issueId: string, status: 'open' | 'under_review' | 'resolved' | 'dismissed') => {
    try {
      await api.updatePlotHole(issueId, { status: status as any });
      setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status } : i));
      addToast('Status Updated', `Consistency issue marked as ${status.replace('_', ' ')}.`, 'info');
    } catch (e: any) {
      addToast('Update Failed', e.message, 'error');
    }
  };

  // Dragging Cards
  const handleCardMouseDown = (e: React.MouseEvent, card: InvestigationCard) => {
    if (card.is_pinned) return;
    if (connectingSourceId) {
      // Complete connection
      if (connectingSourceId !== card.id) {
        setConnectionLabelModal({
          sourceId: connectingSourceId,
          targetId: card.id,
          label: 'Investigative Link',
          type: 'relation'
        });
      }
      setConnectingSourceId(null);
      return;
    }

    e.stopPropagation();
    setSelectedCardId(card.id);
    setSelectedConnectionId(null);
    setSelectedIssueId(null);

    setDraggingCardId(card.id);
    dragOffsetRef.current = {
      x: e.clientX / zoom - card.position.x,
      y: e.clientY / zoom - card.position.y
    };
  };

  // Corkboard Pan Mouse Events
  const handleBoardMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking board background
    if ((e.target as HTMLElement).closest('.investigation-card')) return;
    if ((e.target as HTMLElement).closest('.interactive-control')) return;

    setSelectedCardId(null);
    setSelectedConnectionId(null);
    setSelectedIssueId(null);
    setConnectingSourceId(null);

    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingCardId) {
      const card = boardState.elements.find(el => el.id === draggingCardId);
      if (!card || card.is_pinned) return;

      const newX = Math.round(e.clientX / zoom - dragOffsetRef.current.x);
      const newY = Math.round(e.clientY / zoom - dragOffsetRef.current.y);

      setBoardState(prev => ({
        ...prev,
        elements: prev.elements.map(el =>
          el.id === draggingCardId ? { ...el, position: { x: newX, y: newY } } : el
        )
      }));
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
    }
  };

  const handleMouseUp = () => {
    if (draggingCardId) {
      setDraggingCardId(null);
      pushHistory(boardState);
      scheduleSave(boardState);
    }
    if (isPanning) {
      setIsPanning(false);
    }
  };

  // Zoom handlers
  const handleZoom = (delta: number) => {
    setZoom(prev => {
      const next = Math.min(Math.max(prev + delta, 0.4), 2.0);
      return Math.round(next * 10) / 10;
    });
  };

  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    sound.playPaperRustle();
  };

  // Focus Camera onto Elements (used when issue or card clicked)
  const focusOnElements = (elementIds: string[]) => {
    if (elementIds.length === 0) return;
    const targetCards = boardState.elements.filter(e => elementIds.includes(e.id));
    if (targetCards.length === 0) return;

    const avgX = targetCards.reduce((acc, c) => acc + c.position.x + CARD_WIDTH / 2, 0) / targetCards.length;
    const avgY = targetCards.reduce((acc, c) => acc + c.position.y + CARD_HEIGHT / 2, 0) / targetCards.length;

    const containerW = boardContainerRef.current?.clientWidth || 1000;
    const containerH = boardContainerRef.current?.clientHeight || 700;

    setPan({
      x: containerW / 2 - avgX * zoom,
      y: containerH / 2 - avgY * zoom
    });
    sound.playPaperRustle();
  };

  // Click an Issue in Sidebar
  const handleSelectIssue = (issue: PlotHole) => {
    setSelectedIssueId(issue.id);
    setSelectedCardId(null);
    setSelectedConnectionId(null);

    // Find related cards by title / id
    const relatedNames = (issue.related_elements || []).map(r => r.toLowerCase());
    const matchedCardIds = boardState.elements
      .filter(card => relatedNames.some(name => card.title.toLowerCase().includes(name)))
      .map(card => card.id);

    if (matchedCardIds.length > 0) {
      focusOnElements(matchedCardIds);
    }
    sound.playTypewriterKeystroke();
    if (onSelectIssue) onSelectIssue(issue);
  };

  // Add Element Submit
  const handleCreateCard = () => {
    if (!newCardData.title.trim()) {
      addToast('Title Required', 'Please provide a title for the investigation card.', 'warning');
      return;
    }

    sound.playPaperRustle();
    const newCard: InvestigationCard = {
      id: `card_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      story_id: activeStory?.id || '',
      type: newCardData.type,
      title: newCardData.title,
      subtitle: newCardData.subtitle,
      description: newCardData.description,
      image_url: newCardData.image_url || undefined,
      color: newCardData.color,
      status: newCardData.status,
      position: {
        x: Math.round(-pan.x / zoom + 350),
        y: Math.round(-pan.y / zoom + 200)
      }
    };

    const newState = {
      ...boardState,
      elements: [...boardState.elements, newCard]
    };

    setBoardState(newState);
    pushHistory(newState);
    scheduleSave(newState);
    setSelectedCardId(newCard.id);
    setShowAddModal(false);

    // Reset form
    setNewCardData({
      type: 'character',
      title: '',
      subtitle: '',
      description: '',
      image_url: '',
      color: 'polaroid',
      status: 'unverified'
    });

    addToast('Evidence Pinned', `'${newCard.title}' pinned to corkboard.`, 'success');
  };

  // Confirm connection creation
  const handleConfirmConnection = () => {
    if (!connectionLabelModal) return;
    const { sourceId, targetId, label, type } = connectionLabelModal;

    sound.playPaperRustle();
    const newConn: InvestigationConnection = {
      id: `conn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      source_id: sourceId,
      target_id: targetId,
      label: label.trim() || 'Connected',
      type: type || 'relation',
      is_contradiction: type === 'contradiction'
    };

    const newState = {
      ...boardState,
      connections: [...boardState.connections, newConn]
    };
    setBoardState(newState);
    pushHistory(newState);
    scheduleSave(newState);
    setConnectionLabelModal(null);
    addToast('Red String Tied', `Tied connection: "${newConn.label}"`, 'success');
  };

  // Export board as Markdown
  const handleExportMarkdown = () => {
    if (!activeStory) return;
    sound.playTypewriterKeystroke();

    let md = `# INVESTIGATION DOSSIER: ${activeStory.title.toUpperCase()}\n\n`;
    md += `**Date of Report:** ${new Date().toLocaleDateString()}\n`;
    md += `**Setting:** ${activeStory.setting || 'Unspecified'}\n`;
    md += `**Prime Culprit / Suspect:** ${boardState.elements.find(e => e.id === boardState.culprit_id)?.title || 'Unassigned'}\n\n`;

    md += `## 1. EVIDENCE & SUBJECTS ON BOARD\n`;
    boardState.elements.forEach((el, idx) => {
      md += `### ${idx + 1}. [${el.type.toUpperCase()}] ${el.title}\n`;
      if (el.subtitle) md += `*${el.subtitle}*\n`;
      if (el.description) md += `> ${el.description}\n`;
      md += `- Status: ${el.status || 'Unverified'}\n`;
      if (el.is_culprit) md += `- **DESIGNATED PRIME CULPRIT**\n`;
      md += `\n`;
    });

    md += `## 2. INVESTIGATIVE RED THREAD CONNECTIONS\n`;
    boardState.connections.forEach(conn => {
      const src = boardState.elements.find(e => e.id === conn.source_id)?.title || conn.source_id;
      const tgt = boardState.elements.find(e => e.id === conn.target_id)?.title || conn.target_id;
      md += `- **${src}** ──[ ${conn.label || 'Connected'} ]──> **${tgt}**\n`;
    });

    md += `\n## 3. CONTINUITY AUDIT & DETECTED PLOT HOLES\n`;
    issues.forEach((iss, idx) => {
      md += `### Flag #${idx + 1}: ${iss.title} (${iss.severity})\n`;
      md += `**Category:** ${iss.category}\n`;
      md += `**Status:** ${iss.status}\n`;
      md += `**Affected Chapters:** ${iss.source_chapters.join(', ')}\n\n`;
      md += `**Prior Established Canon:**\n> ${iss.previous_conflicting_info}\n\n`;
      md += `**Conflicting Scene:**\n> ${iss.current_conflicting_info}\n\n`;
      if (iss.continuity_impact) md += `**Continuity Impact:** ${iss.continuity_impact}\n\n`;
      md += `**Suggested Correction:**\n> ${iss.suggested_correction}\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Investigation_Dossier_${activeStory.title.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Dossier Exported', 'Downloaded complete investigation markdown report.', 'success');
  };

  // Connected card helpers
  const getConnectedElementIds = (cardId: string): string[] => {
    const ids = new Set<string>();
    boardState.connections.forEach(c => {
      if (c.source_id === cardId) ids.add(c.target_id);
      if (c.target_id === cardId) ids.add(c.source_id);
    });
    return Array.from(ids);
  };

  // Filtering cards
  const filteredElements = boardState.elements.filter(el => {
    if (activeTypeFilter !== 'all' && el.type !== activeTypeFilter) return false;
    if (highlightCulpritOnly && !el.is_culprit && el.id !== boardState.culprit_id) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = el.title.toLowerCase().includes(q);
      const matchSub = (el.subtitle || '').toLowerCase().includes(q);
      const matchDesc = (el.description || '').toLowerCase().includes(q);
      return matchTitle || matchSub || matchDesc;
    }
    return true;
  });

  const selectedElement = boardState.elements.find(e => e.id === selectedCardId);
  const selectedConnection = boardState.connections.find(c => c.id === selectedConnectionId);
  const selectedIssue = issues.find(i => i.id === selectedIssueId);

  // Connected ids for currently focused card (selected or hovered)
  const activeFocusCardId = selectedCardId || hoveredCardId;
  const activeConnectedIds = activeFocusCardId ? getConnectedElementIds(activeFocusCardId) : [];

  // Statistics
  const criticalCount = issues.filter(i => i.severity === 'Critical' && i.status === 'open').length;
  const warningCount = issues.filter(i => (i.severity === 'High' || i.severity === 'Warning') && i.status === 'open').length;
  const suggestionCount = issues.filter(i => (i.severity === 'Medium' || i.severity === 'Low' || i.severity === 'Suggestion') && i.status === 'open').length;
  const resolvedCount = issues.filter(i => i.status === 'resolved').length;

  return (
    <div className="relative w-full h-[calc(100vh-4.5rem)] flex flex-col bg-[#0F0D0B] text-[#E0D7C7] select-none overflow-hidden">
      
      {/* =========================================================================
          TOP TOOLBAR
          ========================================================================= */}
      <header className="interactive-control z-30 h-14 bg-[#181410] border-b border-[#2E241A] px-4 flex items-center justify-between gap-3 shadow-xl shrink-0">
        
        {/* Left Toolbar: Story selector & AI Board Generator */}
        <div className="flex items-center gap-3">
          {/* Story Selector */}
          <div className="flex items-center gap-2 bg-[#231C16] border border-[#3E3123] rounded-lg px-2.5 py-1.5">
            <FolderOpen className="w-4 h-4 text-[#C49A61]" />
            <select
              value={activeStory?.id || ''}
              onChange={(e) => setActiveStoryId(e.target.value)}
              className="bg-transparent text-xs font-serif font-bold text-[#F4EDE2] focus:outline-none cursor-pointer max-w-[180px] truncate"
            >
              {stories.map(s => (
                <option key={s.id} value={s.id} className="bg-[#1C1612] text-[#E0D7C7]">
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* GENERATE INVESTIGATION BOARD Button */}
          <button
            type="button"
            onClick={handleGenerateBoard}
            disabled={generating}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-typewriter font-bold uppercase transition-all shadow-md ${
              generating
                ? 'bg-[#3A2D1F] text-[#8C7A65] cursor-not-allowed'
                : 'bg-gradient-to-r from-[#A82E25] via-[#C49A61] to-[#A82E25] bg-[length:200%_auto] hover:bg-right text-white shadow-[#C49A61]/20 hover:shadow-lg active:scale-95'
            }`}
            title="Generate detective investigation board using full story continuity"
          >
            <Sparkles className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Reconstructing Board...' : 'Generate Investigation Board'}
          </button>

          {/* ANALYZE PLOT HOLES Button */}
          <button
            type="button"
            onClick={handleRunAudit}
            disabled={auditing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#241A14] hover:bg-[#34241B] border border-[#8A2B20]/60 text-[#E5A8A3] text-xs font-typewriter font-bold uppercase transition-colors shadow"
            title="Run deep AI consistency check across all 12 categories"
          >
            <ShieldAlert className={`w-3.5 h-3.5 text-[#E5A8A3] ${auditing ? 'animate-pulse' : ''}`} />
            {auditing ? 'Auditing Canon...' : 'Analyze Plot Holes'}
          </button>

          {/* Incremental Scan */}
          <button
            type="button"
            onClick={handleIncrementalAnalysis}
            disabled={incrementalAnalyzing}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#201A14] hover:bg-[#2C231B] border border-[#4A3B2C] text-[#C49A61] text-xs font-typewriter font-bold uppercase transition-colors"
            title="Scan latest chapter for new clues and contradictions without altering layout"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${incrementalAnalyzing ? 'animate-spin' : ''}`} />
            Incremental Scan
          </button>
        </div>

        {/* Center Toolbar: Card Management & Editing */}
        <div className="flex items-center gap-2">
          {/* Add Element */}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C49A61] hover:bg-[#D6AB72] text-[#14100D] text-xs font-typewriter font-bold uppercase transition-transform hover:scale-105 shadow"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Add Element
          </button>

          {/* Culprit Filter Toggle */}
          <button
            type="button"
            onClick={() => setHighlightCulpritOnly(prev => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-typewriter font-bold uppercase transition-colors border ${
              highlightCulpritOnly
                ? 'bg-[#8A2B20] text-white border-[#E5A8A3]'
                : 'bg-[#221A14] text-[#C49A61] border-[#3E3123] hover:bg-[#2C2119]'
            }`}
            title="Toggle Culprit Filter"
          >
            <Crosshair className="w-3.5 h-3.5" />
            Culprit Focus
          </button>

          {/* Undo / Redo */}
          <div className="flex items-center bg-[#201A14] border border-[#3E3123] rounded-lg p-0.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndexRef.current <= 0}
              className="p-1.5 text-[#A69482] hover:text-[#F4EDE2] disabled:opacity-30 disabled:hover:text-[#A69482] transition-colors"
              title="Undo card movement or modification"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3.5 bg-[#3E3123]" />
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndexRef.current >= historyRef.current.length - 1}
              className="p-1.5 text-[#A69482] hover:text-[#F4EDE2] disabled:opacity-30 disabled:hover:text-[#A69482] transition-colors"
              title="Redo action"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Toolbar: Zoom, View switcher, Save status & Export */}
        <div className="flex items-center gap-2.5">
          {/* Zoom controls */}
          <div className="flex items-center bg-[#201A14] border border-[#3E3123] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => handleZoom(-0.15)}
              className="p-1.5 text-[#A69482] hover:text-[#F4EDE2] transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-typewriter text-[11px] text-[#C49A61] font-bold min-w-[42px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => handleZoom(0.15)}
              className="p-1.5 text-[#A69482] hover:text-[#F4EDE2] transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="p-1.5 text-[#A69482] hover:text-[#F4EDE2] transition-colors border-l border-[#3E3123] ml-0.5"
              title="Center & reset view"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#201A14] border border-[#3E3123] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`px-2.5 py-1 rounded text-xs font-typewriter font-bold uppercase transition-colors ${
                viewMode === 'board' ? 'bg-[#C49A61] text-[#14100D]' : 'text-[#A69482] hover:text-[#F4EDE2]'
              }`}
            >
              Board
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 rounded text-xs font-typewriter font-bold uppercase transition-colors ${
                viewMode === 'list' ? 'bg-[#C49A61] text-[#14100D]' : 'text-[#A69482] hover:text-[#F4EDE2]'
              }`}
            >
              Case Files
            </button>
          </div>

          {/* Save Status & Button */}
          <button
            type="button"
            onClick={handleManualSave}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#201A14] hover:bg-[#2E2319] border border-[#3E3123] text-xs font-typewriter transition-colors text-[#A69482]"
            title="Save board state"
          >
            <Save className={`w-3.5 h-3.5 ${saveStatus === 'saving' ? 'animate-spin text-[#C49A61]' : saveStatus === 'dirty' ? 'text-amber-500' : 'text-emerald-500'}`} />
            <span className="hidden sm:inline">
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'dirty' ? 'Unsaved' : 'Saved'}
            </span>
          </button>

          {/* Export Dossier */}
          <button
            type="button"
            onClick={handleExportMarkdown}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#201A14] hover:bg-[#2E2319] border border-[#3E3123] text-xs font-typewriter text-[#C49A61] transition-colors"
            title="Export full investigation dossier markdown report"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Export</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          MAIN WORKSPACE: LEFT SIDEBAR + CENTER CORKBOARD + RIGHT INSPECTOR
          ========================================================================= */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* -----------------------------------------------------------------------
            LEFT SIDEBAR: DETECTIVE DIRECTORY & PLOT HOLES
            ----------------------------------------------------------------------- */}
        <aside
          className={`interactive-control z-20 bg-[#14110E] border-r border-[#2A2118] flex flex-col transition-all duration-300 shrink-0 ${
            leftSidebarCollapsed ? 'w-12' : 'w-72 lg:w-80'
          }`}
        >
          {/* Header */}
          <div className="h-11 px-3 border-b border-[#2A2118] flex items-center justify-between">
            {!leftSidebarCollapsed && (
              <span className="font-typewriter text-xs text-[#C49A61] font-bold uppercase tracking-wider">
                Investigative Index
              </span>
            )}
            <button
              type="button"
              onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
              className="p-1 rounded text-[#8C7A65] hover:text-[#E0D7C7] transition-colors ml-auto"
              title={leftSidebarCollapsed ? 'Expand index' : 'Collapse index'}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {!leftSidebarCollapsed && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Search & Filter Pills */}
              <div className="p-3 border-b border-[#241C15] space-y-2.5 bg-[#181410]/60">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#8C7A65]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search evidence or leads..."
                    className="w-full bg-[#1C1612] border border-[#382B1E] rounded-md pl-8 pr-3 py-1.5 text-xs text-[#E0D7C7] placeholder-[#665443] focus:outline-none focus:border-[#C49A61]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-2 text-[#8C7A65] hover:text-[#E0D7C7]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Filter pills */}
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'character', label: 'Suspects' },
                    { id: 'location', label: 'Scenes' },
                    { id: 'event', label: 'Timeline' },
                    { id: 'evidence', label: 'Evidence' },
                    { id: 'clue', label: 'Notes' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTypeFilter(tab.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-typewriter uppercase transition-colors ${
                        activeTypeFilter === tab.id
                          ? 'bg-[#C49A61] text-[#14100D] font-bold'
                          : 'bg-[#201A14] text-[#A69482] hover:bg-[#2A2219]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable list: Cards + Issues */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#221A14] p-2 space-y-4">
                
                {/* 1. CONTINUITY ISSUES SECTION */}
                <div>
                  <div className="flex items-center justify-between px-2 py-1 mb-1">
                    <span className="font-typewriter text-[11px] text-[#E5A8A3] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#E5A8A3]" />
                      Plot Contradictions ({issues.length})
                    </span>
                    <span className="text-[10px] font-typewriter text-[#8C7A65]">
                      {issues.filter(i => i.status === 'open').length} Open
                    </span>
                  </div>

                  {issues.length === 0 ? (
                    <div className="p-3 text-center bg-[#1C1612] rounded-lg border border-[#302318] text-xs font-typewriter text-[#8C7A65]">
                      No plot holes flagged yet.
                      <button
                        type="button"
                        onClick={handleRunAudit}
                        className="mt-2 text-[#C49A61] hover:underline block mx-auto text-[11px]"
                      >
                        Run Consistency Audit
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {issues.map(iss => {
                        const isSelected = selectedIssueId === iss.id;
                        const isCritical = iss.severity === 'Critical';
                        const isHigh = iss.severity === 'High' || iss.severity === 'Warning';
                        return (
                          <div
                            key={iss.id}
                            onClick={() => handleSelectIssue(iss)}
                            className={`p-2.5 rounded-lg border cursor-pointer transition-all text-left ${
                              isSelected
                                ? 'bg-[#331C18] border-[#A82E25] shadow-md shadow-[#A82E25]/20'
                                : iss.status === 'resolved'
                                ? 'bg-[#181E16] border-[#2A3824] opacity-75'
                                : 'bg-[#1C1612] border-[#2E2319] hover:border-[#4E3B2B]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <span className="font-serif text-xs font-bold text-[#F4EDE2] line-clamp-1">
                                {iss.title}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-typewriter font-bold uppercase shrink-0 ${
                                  isCritical
                                    ? 'bg-red-950/80 text-red-300 border border-red-700'
                                    : isHigh
                                    ? 'bg-amber-950/80 text-amber-300 border border-amber-700'
                                    : 'bg-stone-800 text-stone-300'
                                }`}
                              >
                                {iss.severity}
                              </span>
                            </div>
                            <p className="font-typewriter text-[10px] text-[#A69482] line-clamp-2 mt-1">
                              {iss.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 text-[9px] font-typewriter text-[#8C7A65]">
                              <span>{iss.source_chapters.join(' • ')}</span>
                              {iss.status === 'resolved' && (
                                <span className="text-emerald-400 font-bold ml-auto flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" /> Resolved
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. BOARD ELEMENTS LIST */}
                <div className="pt-2">
                  <div className="flex items-center justify-between px-2 py-1 mb-1">
                    <span className="font-typewriter text-[11px] text-[#C49A61] font-bold uppercase tracking-wider">
                      Board Elements ({filteredElements.length})
                    </span>
                  </div>

                  <div className="space-y-1">
                    {filteredElements.map(el => {
                      const isSelected = selectedCardId === el.id;
                      const isCulprit = el.is_culprit || el.id === boardState.culprit_id;
                      return (
                        <div
                          key={el.id}
                          onClick={() => {
                            setSelectedCardId(el.id);
                            setSelectedIssueId(null);
                            setSelectedConnectionId(null);
                            focusOnElements([el.id]);
                            sound.playTypewriterKeystroke();
                          }}
                          className={`px-2.5 py-2 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-2 text-left ${
                            isSelected
                              ? 'bg-[#2A2118] border-[#C49A61] text-white shadow'
                              : 'bg-[#181410] border-[#261D15] hover:bg-[#201A14] text-[#C9B99B]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {el.type === 'character' && <span className="text-xs">👤</span>}
                            {el.type === 'location' && <span className="text-xs">📍</span>}
                            {el.type === 'event' && <span className="text-xs">⏳</span>}
                            {el.type === 'evidence' && <span className="text-xs">🔍</span>}
                            {el.type === 'clue' && <span className="text-xs">📝</span>}

                            <div className="min-w-0">
                              <span className="font-serif text-xs font-bold truncate block">
                                {el.title}
                              </span>
                              <span className="font-typewriter text-[9px] text-[#8C7A65] truncate block">
                                {el.subtitle || el.type}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isCulprit && (
                              <span className="px-1.5 py-0.5 rounded bg-red-950 border border-red-600 text-red-300 text-[8px] font-typewriter font-bold uppercase">
                                CULPRIT
                              </span>
                            )}
                            {el.has_issue && (
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" title="Contradiction flagged" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          )}
        </aside>

        {/* -----------------------------------------------------------------------
            CENTER: LARGE INTERACTIVE CORKBOARD
            ----------------------------------------------------------------------- */}
        <div
          ref={boardContainerRef}
          onMouseDown={handleBoardMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
          style={{
            backgroundColor: '#1E1712',
            backgroundImage: `url(${boardTextureBase64 || '/board-texture.jpg'})`,
            backgroundRepeat: 'repeat',
            backgroundSize: '400px auto',
          }}
        >
          {/* Dark Atmospheric Ambient Vignette & Warm Desk Lamp Spotlight Overlay */}
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              background: `
                radial-gradient(circle at 82% 28%, rgba(255, 200, 110, 0.18) 0%, rgba(200, 140, 60, 0.08) 25%, transparent 60%),
                radial-gradient(circle at 50% 50%, transparent 40%, rgba(10, 8, 6, 0.75) 90%, rgba(5, 4, 3, 0.95) 100%)
              `
            }}
          />

          {/* Canvas Wrapper scaling with Pan and Zoom */}
          <div
            className="absolute origin-top-left transition-transform duration-75"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              width: '4000px',
              height: '3000px'
            }}
          >

            {/* -------------------------------------------------------------------
                SVG LAYER: RED STRING RELATIONSHIP SYSTEM & CIRCULAR MARKERS
                ------------------------------------------------------------------- */}
            <svg
              className="absolute inset-0 pointer-events-none z-0"
              style={{ width: '4000px', height: '3000px' }}
            >
              <defs>
                {/* Glow filter for contradiction strings */}
                <filter id="crimsonGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {/* Subtle string shadow */}
                <filter id="stringShadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="1" dy="3" stdDeviation="2" floodColor="#000" floodOpacity="0.85" />
                </filter>
              </defs>

              {/* Draw All Red String Connections */}
              {boardState.connections.map(conn => {
                const sourceCard = boardState.elements.find(e => e.id === conn.source_id);
                const targetCard = boardState.elements.find(e => e.id === conn.target_id);
                if (!sourceCard || !targetCard) return null;

                const x1 = sourceCard.position.x + PIN_OFFSET_X;
                const y1 = sourceCard.position.y + PIN_OFFSET_Y;
                const x2 = targetCard.position.x + PIN_OFFSET_X;
                const y2 = targetCard.position.y + PIN_OFFSET_Y;

                // Natural organic sag / curve calculation
                const dx = x2 - x1;
                const dy = y2 - y1;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const sag = Math.min(dist * 0.12, 45); // curve droop
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2 + sag;

                const isSelected = selectedConnectionId === conn.id;
                const isContradiction = conn.is_contradiction || conn.type === 'contradiction';
                const isHighlighted =
                  isSelected ||
                  activeFocusCardId === conn.source_id ||
                  activeFocusCardId === conn.target_id ||
                  selectedIssue?.related_elements?.some(r =>
                    sourceCard.title.toLowerCase().includes(r.toLowerCase()) &&
                    targetCard.title.toLowerCase().includes(r.toLowerCase())
                  );

                const stringPath = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;

                return (
                  <g key={conn.id} className="cursor-pointer pointer-events-auto">
                    {/* Invisible wide hit area for easy clicking */}
                    <path
                      d={stringPath}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="24"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedConnectionId(conn.id);
                        setSelectedCardId(null);
                        setSelectedIssueId(null);
                        sound.playPaperRustle();
                      }}
                    />

                    {/* Drop shadow thread */}
                    <path
                      d={stringPath}
                      fill="none"
                      stroke="rgba(0,0,0,0.6)"
                      strokeWidth={isHighlighted ? 4 : 2.5}
                      transform="translate(1, 4)"
                    />

                    {/* Main Red Investigative Thread */}
                    <path
                      d={stringPath}
                      fill="none"
                      stroke={isContradiction ? '#E53E3E' : '#B81D13'}
                      strokeWidth={isHighlighted ? 3.5 : isContradiction ? 2.8 : 2.2}
                      strokeDasharray={isContradiction ? '6,4' : undefined}
                      filter={isHighlighted ? 'url(#crimsonGlow)' : undefined}
                      className="transition-all duration-150"
                    />

                    {/* Optional String Relationship Label */}
                    {conn.label && (
                      <g
                        transform={`translate(${midX}, ${midY})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedConnectionId(conn.id);
                          sound.playPaperRustle();
                        }}
                      >
                        <rect
                          x={-conn.label.length * 3.4 - 8}
                          y="-11"
                          width={conn.label.length * 6.8 + 16}
                          height="20"
                          rx="4"
                          fill="#18130E"
                          stroke={isContradiction ? '#E53E3E' : isHighlighted ? '#C49A61' : '#3E3123'}
                          strokeWidth="1"
                          className="shadow-md"
                        />
                        <text
                          y="3"
                          textAnchor="middle"
                          fill={isContradiction ? '#FEB2B2' : isHighlighted ? '#F4EDE2' : '#C9B99B'}
                          fontSize="10"
                          fontFamily="'Courier Prime', monospace"
                          fontWeight="bold"
                        >
                          {conn.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Temporary line while user is dragging/creating a new connection */}
              {connectingSourceId && (
                <line
                  x1={(boardState.elements.find(e => e.id === connectingSourceId)?.position.x || 0) + PIN_OFFSET_X}
                  y1={(boardState.elements.find(e => e.id === connectingSourceId)?.position.y || 0) + PIN_OFFSET_Y}
                  x2={dragOffsetRef.current.x}
                  y2={dragOffsetRef.current.y}
                  stroke="#FF4A4A"
                  strokeWidth="2.5"
                  strokeDasharray="4,4"
                />
              )}

              {/* -----------------------------------------------------------------
                  RED CIRCULAR HAND-DRAWN MARKERS (Inspired by reference image!)
                  - Marker for designated CULPRIT
                  - Marker for cards flagged by selected Plot Hole Issue
                  ----------------------------------------------------------------- */}
              {boardState.elements.map(card => {
                const isCulprit = card.is_culprit || card.id === boardState.culprit_id;
                const isIssueTarget = selectedIssue?.related_elements?.some(r =>
                  card.title.toLowerCase().includes(r.toLowerCase())
                );

                if (!isCulprit && !isIssueTarget) return null;

                const cx = card.position.x + CARD_WIDTH / 2;
                const cy = card.position.y + CARD_HEIGHT / 2;
                const rx = CARD_WIDTH / 2 + 18;
                const ry = CARD_HEIGHT / 2 + 18;

                return (
                  <g key={`marker_${card.id}`} className="pointer-events-none">
                    {/* Glowing outer aura */}
                    <ellipse
                      cx={cx}
                      cy={cy}
                      rx={rx + 4}
                      ry={ry + 4}
                      fill="none"
                      stroke={isCulprit ? '#C53030' : '#DD6B20'}
                      strokeWidth="2"
                      opacity="0.3"
                      filter="url(#crimsonGlow)"
                    />
                    {/* Hand-drawn organic sketched red loop */}
                    <path
                      d={`
                        M ${cx - rx} ${cy}
                        C ${cx - rx} ${cy - ry * 0.95}, ${cx + rx * 0.95} ${cy - ry}, ${cx + rx} ${cy}
                        C ${cx + rx * 1.05} ${cy + ry * 0.95}, ${cx - rx * 0.9} ${cy + ry * 1.05}, ${cx - rx - 2} ${cy + 6}
                      `}
                      fill="none"
                      stroke={isCulprit ? '#E53E3E' : '#ED8936'}
                      strokeWidth={isCulprit ? '4' : '3'}
                      strokeLinecap="round"
                      filter="url(#crimsonGlow)"
                      className="animate-pulse"
                    />

                    {/* CULPRIT Rubber Stamp Label */}
                    {isCulprit && (
                      <g transform={`translate(${cx}, ${cy - ry - 14})`}>
                        <rect
                          x="-50"
                          y="-12"
                          width="100"
                          height="24"
                          rx="3"
                          fill="#741B1B"
                          stroke="#E53E3E"
                          strokeWidth="2"
                          transform="rotate(-4)"
                        />
                        <text
                          y="4"
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize="12"
                          fontFamily="'Cinzel', serif"
                          fontWeight="900"
                          letterSpacing="2"
                          transform="rotate(-4)"
                        >
                          CULPRIT
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* -------------------------------------------------------------------
                CARD NODES LAYER (Draggable, Selectable, Editable Cards)
                ------------------------------------------------------------------- */}
            {boardState.elements.map(card => {
              const isSelected = selectedCardId === card.id;
              const isDragging = draggingCardId === card.id;
              const isCulprit = card.is_culprit || card.id === boardState.culprit_id;
              const isConnected = activeConnectedIds.includes(card.id);
              const isFocused = isSelected || isConnected;
              const isDimmed = activeFocusCardId !== null && !isFocused && activeFocusCardId !== card.id;

              // Card background styling based on type and color theme
              let cardBg = 'bg-[#EADBC8] text-[#221A12] border-[#8C7456]'; // Polaroid / Aged default
              if (card.color === 'yellow') cardBg = 'bg-[#FFF9C4] text-[#2A2312] border-[#D4C379]'; // Yellow sticky note
              if (card.color === 'pink') cardBg = 'bg-[#FCE4EC] text-[#331822] border-[#D69EA9]'; // Pink sticky note
              if (card.color === 'green') cardBg = 'bg-[#E8F5E9] text-[#142C16] border-[#97B899]'; // Green sticky note
              if (card.color === 'manila') cardBg = 'bg-[#DFD2BE] text-[#241A12] border-[#8C7456]'; // Manila folder
              if (card.color === 'aged') cardBg = 'bg-[#D6C4A6] text-[#291F16] border-[#7F674A]';

              return (
                <div
                  key={card.id}
                  id={`card_${card.id}`}
                  onMouseDown={(e) => handleCardMouseDown(e, card)}
                  onMouseEnter={() => setHoveredCardId(card.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                  className={`investigation-card absolute rounded shadow-2xl transition-shadow select-none group cursor-grab active:cursor-grabbing ${cardBg} ${
                    isDimmed ? 'opacity-35 grayscale-[50%]' : 'opacity-100'
                  } ${
                    isSelected ? 'ring-4 ring-[#C49A61] shadow-2xl scale-[1.02]' : 'hover:shadow-2xl'
                  }`}
                  style={{
                    left: `${card.position.x}px`,
                    top: `${card.position.y}px`,
                    width: `${CARD_WIDTH}px`,
                    minHeight: `${CARD_HEIGHT}px`,
                    zIndex: isDragging ? 50 : isSelected ? 40 : 20,
                  }}
                >
                  {/* Metallic Pushpin on Top */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (connectingSourceId === card.id) {
                        setConnectingSourceId(null);
                      } else {
                        setConnectingSourceId(card.id);
                        addToast('String Anchor Selected', `Click another card's pushpin to tie a red string.`, 'info');
                      }
                    }}
                    className={`absolute -top-3.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full cursor-pointer flex items-center justify-center transition-transform hover:scale-125 z-30 shadow-lg ${
                      connectingSourceId === card.id
                        ? 'bg-red-600 ring-4 ring-red-400 animate-bounce'
                        : isCulprit
                        ? 'bg-gradient-to-br from-red-500 to-red-800 ring-2 ring-red-300'
                        : 'bg-gradient-to-br from-[#E2B774] via-[#C49A61] to-[#805B23] ring-1 ring-amber-200'
                    }`}
                    title="Click to tie or connect red string"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-white/60" />
                  </div>

                  {/* Corner Masking Tape Graphic */}
                  <div className="absolute -top-2 -left-2 w-7 h-3.5 bg-[#E6D7B8]/80 border border-[#C2B18E] -rotate-45 shadow-sm pointer-events-none" />

                  {/* Card Actions Overlay on Hover */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(card.id);
                      }}
                      className="p-1 rounded bg-[#18130E]/80 text-[#C49A61] hover:text-white transition-colors"
                      title={card.is_pinned ? 'Unpin card' : 'Pin card to corkboard'}
                    >
                      {card.is_pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleVerified(card.id);
                      }}
                      className="p-1 rounded bg-[#18130E]/80 text-[#C49A61] hover:text-white transition-colors"
                      title="Toggle Verified Stamp"
                    >
                      <UserCheck className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCard(card.id);
                      }}
                      className="p-1 rounded bg-[#18130E]/80 text-red-400 hover:text-red-200 transition-colors"
                      title="Incinerate card"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Card Body Content */}
                  <div className="p-3 pt-4 flex flex-col justify-between h-full">
                    
                    {/* Header tags: Type + Status */}
                    <div className="flex items-center justify-between border-b border-[#3D3023]/20 pb-1.5 mb-2">
                      <span className="font-typewriter text-[9px] font-bold uppercase tracking-wider text-[#7A362E]">
                        {card.type}
                      </span>
                      {card.status && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[8px] font-typewriter font-bold uppercase border ${
                            card.status === 'verified'
                              ? 'bg-emerald-900/30 text-emerald-800 border-emerald-700/50'
                              : card.status === 'suspect'
                              ? 'bg-red-950/40 text-red-800 border-red-700/50'
                              : 'bg-amber-900/20 text-amber-800 border-amber-700/40'
                          }`}
                        >
                          {card.status}
                        </span>
                      )}
                    </div>

                    {/* Photograph (Polaroid style) */}
                    {card.image_url && (
                      <div className="relative w-full h-28 mb-2.5 overflow-hidden rounded bg-[#1C1612] border border-[#2B2016]/40 shadow-inner group/photo">
                        <img
                          src={card.image_url}
                          alt={card.title}
                          className="w-full h-full object-cover grayscale contrast-125 transition-transform group-hover/photo:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-sepia/20 pointer-events-none" />
                      </div>
                    )}

                    {/* Titles */}
                    <div className="flex-1">
                      <h4 className="font-serif text-sm font-bold text-[#1C150F] leading-tight mb-0.5">
                        {card.title}
                      </h4>
                      {card.subtitle && (
                        <p className="font-typewriter text-[10px] text-[#5A4533] italic mb-1.5">
                          {card.subtitle}
                        </p>
                      )}
                      {card.description && (
                        <p className="font-handwriting text-xs text-[#2A2016] leading-snug line-clamp-3">
                          {card.description}
                        </p>
                      )}
                    </div>

                    {/* Footer Stamps & Indicators */}
                    <div className="mt-2.5 pt-2 border-t border-[#3D3023]/20 flex items-center justify-between">
                      {isCulprit ? (
                        <span className="px-2 py-0.5 rounded bg-red-800 text-white text-[9px] font-cinzel font-bold tracking-wider">
                          CULPRIT
                        </span>
                      ) : (
                        <span className="font-typewriter text-[9px] text-[#6B5541]">
                          ID: #{card.id.slice(-4).toUpperCase()}
                        </span>
                      )}

                      {card.has_issue && (
                        <span className="flex items-center gap-1 text-[9px] font-typewriter font-bold text-[#A82E25]">
                          <AlertTriangle className="w-3 h-3 text-[#A82E25]" />
                          Continuity Flag
                        </span>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}

          </div>

          {/* Quick Corkboard Overlay Controls (Zoom, Fit, Legend) */}
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-[#16120E]/90 backdrop-blur border border-[#3E3123] rounded-lg p-2 shadow-xl text-xs font-typewriter text-[#C49A61]">
            <span>Tip: Drag to pan • Drag pushpin to connect red string • Click issue to inspect</span>
          </div>

        </div>

        {/* -----------------------------------------------------------------------
            RIGHT SIDEBAR: CARD INSPECTOR OR PLOT HOLE REPORT
            ----------------------------------------------------------------------- */}
        <aside
          className={`interactive-control z-20 bg-[#16120E] border-l border-[#2E241A] w-80 lg:w-96 flex flex-col shrink-0 shadow-2xl transition-all duration-300 ${
            !selectedElement && !selectedIssue && !selectedConnection ? 'hidden lg:flex opacity-70' : 'flex'
          }`}
        >
          {/* Header */}
          <div className="h-12 px-4 border-b border-[#2E241A] flex items-center justify-between">
            <span className="font-typewriter text-xs text-[#C49A61] font-bold uppercase tracking-wider flex items-center gap-1.5">
              {selectedIssue ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-[#E5A8A3]" />
                  Plot Hole Continuity Report
                </>
              ) : selectedConnection ? (
                <>
                  <Link2 className="w-3.5 h-3.5 text-[#C49A61]" />
                  Investigative Thread
                </>
              ) : selectedElement ? (
                <>
                  <FileText className="w-3.5 h-3.5 text-[#C49A61]" />
                  Evidence Dossier
                </>
              ) : (
                'Investigative Inspector'
              )}
            </span>
            {(selectedElement || selectedIssue || selectedConnection) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCardId(null);
                  setSelectedIssueId(null);
                  setSelectedConnectionId(null);
                }}
                className="p-1 text-[#8C7A65] hover:text-[#F4EDE2]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Inspector Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* 1. PLOT HOLE ISSUE REPORT SELECTED */}
            {selectedIssue ? (
              <div className="space-y-4">
                {/* Title & Severity */}
                <div className="p-3 rounded-lg bg-[#241714] border border-[#8A2B20]/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-typewriter font-bold uppercase bg-red-950 text-red-300 border border-red-700">
                      {selectedIssue.severity} Severity
                    </span>
                    <span className="text-[10px] font-typewriter text-[#A69482] uppercase">
                      Category: {selectedIssue.category.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h3 className="font-serif text-base font-bold text-[#F4EDE2]">
                    {selectedIssue.title}
                  </h3>
                  <p className="font-typewriter text-xs text-[#C9B99B] leading-relaxed">
                    {selectedIssue.description}
                  </p>
                </div>

                {/* Conflicting Chapters */}
                <div className="space-y-1">
                  <span className="font-typewriter text-[10px] text-[#C49A61] uppercase tracking-wider block font-bold">
                    Conflicting Chapters
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {selectedIssue.source_chapters.map((chap, idx) => (
                      <span key={idx} className="px-2 py-1 rounded bg-[#201A14] border border-[#3E3123] text-xs font-serif text-[#F4EDE2]">
                        {chap}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Evidence Comparison Box (Prior Canon vs. Conflicting Scene) */}
                <div className="space-y-2">
                  <span className="font-typewriter text-[10px] text-[#C49A61] uppercase tracking-wider block font-bold">
                    Canon Conflict Evidence
                  </span>

                  {selectedIssue.previous_conflicting_info && (
                    <div className="p-2.5 rounded bg-[#1C1713] border-l-2 border-emerald-600 text-xs font-serif space-y-1">
                      <span className="font-typewriter text-[9px] text-emerald-400 font-bold uppercase block">
                        Prior Established Canon
                      </span>
                      <p className="text-[#C9B99B] italic">"{selectedIssue.previous_conflicting_info}"</p>
                    </div>
                  )}

                  {selectedIssue.current_conflicting_info && (
                    <div className="p-2.5 rounded bg-[#1C1713] border-l-2 border-red-600 text-xs font-serif space-y-1">
                      <span className="font-typewriter text-[9px] text-red-400 font-bold uppercase block">
                        Contradictory Scene
                      </span>
                      <p className="text-[#E0D7C7] italic">"{selectedIssue.current_conflicting_info}"</p>
                    </div>
                  )}
                </div>

                {/* Continuity Impact */}
                {selectedIssue.continuity_impact && (
                  <div className="space-y-1">
                    <span className="font-typewriter text-[10px] text-[#C49A61] uppercase tracking-wider block font-bold">
                      Narrative Continuity Impact
                    </span>
                    <p className="text-xs font-typewriter text-[#A69482] leading-relaxed bg-[#1A1410] p-2.5 rounded border border-[#2D2218]">
                      {selectedIssue.continuity_impact}
                    </p>
                  </div>
                )}

                {/* Suggested Correction */}
                {selectedIssue.suggested_correction && (
                  <div className="space-y-1">
                    <span className="font-typewriter text-[10px] text-[#C49A61] uppercase tracking-wider block font-bold">
                      AI Suggested Editorial Correction
                    </span>
                    <div className="p-3 rounded bg-[#201A12] border border-[#5A452B] text-xs font-serif text-[#F4EDE2] space-y-1">
                      <p className="italic leading-relaxed">{selectedIssue.suggested_correction}</p>
                    </div>
                  </div>
                )}

                {/* Status Toggle Actions */}
                <div className="pt-2 border-t border-[#2A2118] space-y-2">
                  <span className="font-typewriter text-[10px] text-[#8C7A65] uppercase tracking-wider block">
                    Update Investigation Status
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateIssueStatus(selectedIssue.id, 'resolved')}
                      className={`px-3 py-2 rounded text-xs font-typewriter font-bold uppercase transition-colors flex items-center justify-center gap-1.5 ${
                        selectedIssue.status === 'resolved'
                          ? 'bg-emerald-800 text-white'
                          : 'bg-[#201A14] text-[#A69482] hover:bg-emerald-950 hover:text-emerald-300'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Mark Resolved
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateIssueStatus(selectedIssue.id, 'dismissed')}
                      className={`px-3 py-2 rounded text-xs font-typewriter font-bold uppercase transition-colors flex items-center justify-center gap-1.5 ${
                        selectedIssue.status === 'dismissed'
                          ? 'bg-stone-700 text-white'
                          : 'bg-[#201A14] text-[#A69482] hover:bg-[#2C2118]'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      Dismiss
                    </button>
                  </div>

                  {onNavigateToStudio && (
                    <button
                      type="button"
                      onClick={() => onNavigateToStudio()}
                      className="w-full mt-2 py-2 rounded bg-[#C49A61] hover:bg-[#D6AB72] text-[#14100D] font-typewriter text-xs font-bold uppercase transition-colors flex items-center justify-center gap-1.5 shadow"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Open Chapter in Studio
                    </button>
                  )}
                </div>
              </div>
            ) : selectedConnection ? (
              /* 2. CONNECTION INSPECTOR SELECTED */
              <div className="space-y-4">
                <div className="p-3 rounded bg-[#201A14] border border-[#3E3123] space-y-2">
                  <span className="font-typewriter text-[10px] text-[#C49A61] uppercase tracking-wider block font-bold">
                    Connected Evidence Threads
                  </span>
                  <div className="flex items-center justify-between text-xs font-serif font-bold text-[#F4EDE2]">
                    <span>
                      {boardState.elements.find(e => e.id === selectedConnection.source_id)?.title || selectedConnection.source_id}
                    </span>
                    <ArrowRight className="w-4 h-4 text-[#C49A61]" />
                    <span>
                      {boardState.elements.find(e => e.id === selectedConnection.target_id)?.title || selectedConnection.target_id}
                    </span>
                  </div>
                </div>

                {/* Edit Relationship Label */}
                <div className="space-y-1.5">
                  <label className="font-typewriter text-[10px] text-[#A69482] uppercase tracking-wider block">
                    Relationship Label
                  </label>
                  <input
                    type="text"
                    value={selectedConnection.label || ''}
                    onChange={(e) => {
                      const updated = boardState.connections.map(c =>
                        c.id === selectedConnection.id ? { ...c, label: e.target.value } : c
                      );
                      const newState = { ...boardState, connections: updated };
                      setBoardState(newState);
                      scheduleSave(newState);
                    }}
                    className="w-full bg-[#1C1612] border border-[#3E3123] rounded p-2 text-xs text-[#F4EDE2] font-typewriter focus:outline-none focus:border-[#C49A61]"
                  />
                </div>

                {/* Quick Presets */}
                <div className="space-y-1">
                  <span className="font-typewriter text-[10px] text-[#8C7A65] uppercase tracking-wider block">
                    Preset Relationships
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {RELATIONSHIP_LABELS.slice(0, 6).map(lbl => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => {
                          const updated = boardState.connections.map(c =>
                            c.id === selectedConnection.id ? { ...c, label: lbl } : c
                          );
                          const newState = { ...boardState, connections: updated };
                          setBoardState(newState);
                          scheduleSave(newState);
                        }}
                        className="px-2 py-1 rounded bg-[#201A14] hover:bg-[#2E2419] border border-[#3E3123] text-[10px] font-typewriter text-[#C9B99B]"
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delete Connection */}
                <div className="pt-4 border-t border-[#2A2118]">
                  <button
                    type="button"
                    onClick={() => handleDeleteConnection(selectedConnection.id)}
                    className="w-full py-2 rounded bg-red-950/80 hover:bg-red-900 border border-red-700 text-red-200 text-xs font-typewriter font-bold uppercase transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    Sever Red Thread
                  </button>
                </div>
              </div>
            ) : selectedElement ? (
              /* 3. CARD ELEMENT INSPECTOR SELECTED */
              <div className="space-y-4">
                {/* Photo Preview & URL input */}
                {selectedElement.image_url && (
                  <div className="relative w-full h-36 rounded-lg overflow-hidden bg-[#18130E] border border-[#3E3123] shadow-md">
                    <img
                      src={selectedElement.image_url}
                      alt={selectedElement.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Title */}
                <div className="space-y-1">
                  <label className="font-typewriter text-[10px] text-[#A69482] uppercase tracking-wider block">
                    Card Title
                  </label>
                  <input
                    type="text"
                    value={selectedElement.title}
                    onChange={(e) => {
                      const updated = boardState.elements.map(el =>
                        el.id === selectedElement.id ? { ...el, title: e.target.value } : el
                      );
                      const newState = { ...boardState, elements: updated };
                      setBoardState(newState);
                      scheduleSave(newState);
                    }}
                    className="w-full bg-[#1C1612] border border-[#3E3123] rounded p-2 text-xs font-serif font-bold text-[#F4EDE2] focus:outline-none focus:border-[#C49A61]"
                  />
                </div>

                {/* Subtitle */}
                <div className="space-y-1">
                  <label className="font-typewriter text-[10px] text-[#A69482] uppercase tracking-wider block">
                    Subtitle / Role / Chapter
                  </label>
                  <input
                    type="text"
                    value={selectedElement.subtitle || ''}
                    onChange={(e) => {
                      const updated = boardState.elements.map(el =>
                        el.id === selectedElement.id ? { ...el, subtitle: e.target.value } : el
                      );
                      const newState = { ...boardState, elements: updated };
                      setBoardState(newState);
                      scheduleSave(newState);
                    }}
                    className="w-full bg-[#1C1612] border border-[#3E3123] rounded p-2 text-xs font-typewriter text-[#C9B99B] focus:outline-none focus:border-[#C49A61]"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="font-typewriter text-[10px] text-[#A69482] uppercase tracking-wider block">
                    Investigative Notes / Description
                  </label>
                  <textarea
                    rows={4}
                    value={selectedElement.description || ''}
                    onChange={(e) => {
                      const updated = boardState.elements.map(el =>
                        el.id === selectedElement.id ? { ...el, description: e.target.value } : el
                      );
                      const newState = { ...boardState, elements: updated };
                      setBoardState(newState);
                      scheduleSave(newState);
                    }}
                    className="w-full bg-[#1C1612] border border-[#3E3123] rounded p-2 text-xs font-handwriting text-[#E0D7C7] focus:outline-none focus:border-[#C49A61]"
                  />
                </div>

                {/* Image URL */}
                <div className="space-y-1">
                  <label className="font-typewriter text-[10px] text-[#A69482] uppercase tracking-wider block">
                    Photograph URL
                  </label>
                  <input
                    type="text"
                    value={selectedElement.image_url || ''}
                    placeholder="https://..."
                    onChange={(e) => {
                      const updated = boardState.elements.map(el =>
                        el.id === selectedElement.id ? { ...el, image_url: e.target.value } : el
                      );
                      const newState = { ...boardState, elements: updated };
                      setBoardState(newState);
                      scheduleSave(newState);
                    }}
                    className="w-full bg-[#1C1612] border border-[#3E3123] rounded p-1.5 text-xs text-[#C9B99B] font-typewriter focus:outline-none focus:border-[#C49A61]"
                  />
                </div>

                {/* CULPRIT DESIGNATION TOGGLE */}
                <div className="pt-2 border-t border-[#2A2118] space-y-2">
                  <button
                    type="button"
                    onClick={() => handleDesignateCulprit(selectedElement.id === boardState.culprit_id ? null : selectedElement.id)}
                    className={`w-full py-2.5 rounded text-xs font-cinzel font-bold tracking-wider uppercase transition-all shadow ${
                      selectedElement.id === boardState.culprit_id
                        ? 'bg-red-800 text-white ring-2 ring-red-500'
                        : 'bg-[#221A14] text-[#C49A61] border border-[#4A3828] hover:bg-red-950 hover:text-white'
                    }`}
                  >
                    {selectedElement.id === boardState.culprit_id
                      ? '★ CULPRIT DESIGNATED (CLICK TO CLEAR)'
                      : 'DESIGNATE AS PRIME CULPRIT'}
                  </button>
                </div>

                {/* Connected Elements */}
                <div className="pt-2 border-t border-[#2A2118] space-y-2">
                  <span className="font-typewriter text-[10px] text-[#C49A61] uppercase tracking-wider block font-bold">
                    Connected Evidence ({getConnectedElementIds(selectedElement.id).length})
                  </span>
                  <div className="space-y-1">
                    {boardState.connections
                      .filter(c => c.source_id === selectedElement.id || c.target_id === selectedElement.id)
                      .map(conn => {
                        const otherId = conn.source_id === selectedElement.id ? conn.target_id : conn.source_id;
                        const otherCard = boardState.elements.find(e => e.id === otherId);
                        return (
                          <div
                            key={conn.id}
                            className="p-2 rounded bg-[#1C1612] border border-[#2E2419] flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-serif font-bold text-[#F4EDE2] block">
                                {otherCard?.title || otherId}
                              </span>
                              <span className="font-typewriter text-[9px] text-[#A69482]">
                                {conn.label || 'Connected'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteConnection(conn.id)}
                              className="text-red-400 hover:text-red-200 p-1"
                              title="Sever connection"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Delete Card */}
                <div className="pt-3 border-t border-[#2A2118]">
                  <button
                    type="button"
                    onClick={() => handleDeleteCard(selectedElement.id)}
                    className="w-full py-2 rounded bg-red-950/70 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-typewriter font-bold uppercase transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Incinerate Card
                  </button>
                </div>
              </div>
            ) : (
              /* EMPTY INSPECTOR STATE */
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-[#8C7A65]">
                <FileText className="w-10 h-10 opacity-40 text-[#C49A61]" />
                <h4 className="font-serif text-sm font-bold text-[#C9B99B]">
                  No Investigative Target Selected
                </h4>
                <p className="font-typewriter text-xs text-[#6B5A49] leading-relaxed">
                  Click any card or plot-hole issue to inspect evidence, edit dossier coordinates, or tie red investigative threads.
                </p>
              </div>
            )}
          </div>
        </aside>

      </div>

      {/* =========================================================================
          BOTTOM PANEL: INVESTIGATION TIMELINE & CONTINUITY STATS
          ========================================================================= */}
      <footer className="interactive-control z-20 h-12 bg-[#14110E] border-t border-[#2A2118] px-4 flex items-center justify-between gap-4 shrink-0 shadow-lg">
        
        {/* Left: Continuity Metrics */}
        <div className="flex items-center gap-3">
          <span className="font-typewriter text-[11px] text-[#C49A61] font-bold uppercase tracking-wider hidden sm:inline">
            Continuity Radar:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-700 text-[10px] font-typewriter font-bold">
              {criticalCount} Critical
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 text-[10px] font-typewriter font-bold">
              {warningCount} Warnings
            </span>
            <span className="px-2 py-0.5 rounded bg-stone-900 text-stone-300 border border-stone-700 text-[10px] font-typewriter font-bold">
              {suggestionCount} Suggestions
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-typewriter font-bold">
              {resolvedCount} Resolved
            </span>
          </div>
        </div>

        {/* Center: Story Timeline Rail Quick Links */}
        <div className="hidden md:flex items-center gap-2 overflow-x-auto max-w-xl">
          <Clock className="w-3.5 h-3.5 text-[#C49A61] shrink-0" />
          {boardState.elements
            .filter(e => e.type === 'event')
            .map((ev, idx) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => {
                  setSelectedCardId(ev.id);
                  focusOnElements([ev.id]);
                  sound.playPaperRustle();
                }}
                className={`px-2 py-1 rounded text-[10px] font-typewriter truncate max-w-[140px] transition-colors border ${
                  selectedCardId === ev.id
                    ? 'bg-[#C49A61] text-[#14100D] font-bold border-[#C49A61]'
                    : 'bg-[#1C1612] text-[#A69482] border-[#2E2419] hover:text-[#F4EDE2]'
                }`}
                title={ev.title}
              >
                {idx + 1}. {ev.title}
              </button>
            ))}
        </div>

        {/* Right: Quick Action Reset */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetView}
            className="px-2.5 py-1 rounded bg-[#201A14] hover:bg-[#2C2118] border border-[#3E3123] text-xs font-typewriter text-[#A69482] transition-colors"
          >
            Reset View
          </button>
        </div>
      </footer>

      {/* =========================================================================
          MODAL: ADD NEW ELEMENT
          ========================================================================= */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#1C1612] border-2 border-[#8C7456] rounded-xl p-6 shadow-2xl text-[#E0D7C7] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#3D3023]/60 pb-3">
                <span className="font-typewriter text-xs text-[#C49A61] font-bold uppercase tracking-wider">
                  Pin New Evidence to Corkboard
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-[#8C7A65] hover:text-[#F4EDE2]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Element Type */}
              <div className="space-y-1.5">
                <label className="font-typewriter text-xs text-[#A69482] uppercase">
                  Element Category
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'character', label: 'Suspect' },
                    { id: 'location', label: 'Scene' },
                    { id: 'event', label: 'Timeline' },
                    { id: 'evidence', label: 'Evidence' },
                    { id: 'clue', label: 'Sticky Note' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setNewCardData(prev => ({
                        ...prev,
                        type: item.id as BoardElementType,
                        color: item.id === 'clue' ? 'yellow' : item.id === 'event' ? 'manila' : 'polaroid'
                      }))}
                      className={`p-2 rounded text-xs font-typewriter uppercase transition-colors border ${
                        newCardData.type === item.id
                          ? 'bg-[#C49A61] text-[#14100D] font-bold border-[#C49A61]'
                          : 'bg-[#241A14] text-[#A69482] border-[#3E3123] hover:bg-[#2E2218]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="font-typewriter text-xs text-[#A69482] uppercase">
                  Title / Subject Name *
                </label>
                <input
                  type="text"
                  value={newCardData.title}
                  onChange={(e) => setNewCardData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Broken Conservatory Key"
                  className="w-full bg-[#14110E] border border-[#3E3123] rounded p-2 text-xs font-serif font-bold text-[#F4EDE2] focus:outline-none focus:border-[#C49A61]"
                />
              </div>

              {/* Subtitle */}
              <div className="space-y-1">
                <label className="font-typewriter text-xs text-[#A69482] uppercase">
                  Subtitle / Role / Chapter Reference
                </label>
                <input
                  type="text"
                  value={newCardData.subtitle}
                  onChange={(e) => setNewCardData(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="e.g. Found in Chapter 2"
                  className="w-full bg-[#14110E] border border-[#3E3123] rounded p-2 text-xs font-typewriter text-[#C9B99B] focus:outline-none focus:border-[#C49A61]"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-typewriter text-xs text-[#A69482] uppercase">
                  Description / Observations
                </label>
                <textarea
                  rows={3}
                  value={newCardData.description}
                  onChange={(e) => setNewCardData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Notes from crime scene inspection..."
                  className="w-full bg-[#14110E] border border-[#3E3123] rounded p-2 text-xs font-typewriter text-[#E0D7C7] focus:outline-none focus:border-[#C49A61]"
                />
              </div>

              {/* Photo URL */}
              <div className="space-y-1">
                <label className="font-typewriter text-xs text-[#A69482] uppercase">
                  Photograph URL (Optional)
                </label>
                <input
                  type="text"
                  value={newCardData.image_url}
                  onChange={(e) => setNewCardData(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-[#14110E] border border-[#3E3123] rounded p-2 text-xs font-typewriter text-[#C9B99B] focus:outline-none focus:border-[#C49A61]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#3D3023]/60">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded bg-[#241A14] text-[#A69482] hover:bg-[#2E2218] text-xs font-typewriter uppercase"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateCard}
                  className="px-5 py-2 rounded bg-[#C49A61] hover:bg-[#D6AB72] text-[#14100D] text-xs font-typewriter font-bold uppercase shadow"
                >
                  Pin Card
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          MODAL: TIE RED STRING CONNECTION
          ========================================================================= */}
      <AnimatePresence>
        {connectionLabelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#1C1612] border-2 border-[#8C7456] rounded-xl p-5 shadow-2xl text-[#E0D7C7] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#3D3023]/60 pb-2">
                <span className="font-typewriter text-xs text-[#C49A61] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Link2 className="w-4 h-4 text-[#C49A61]" />
                  Tie Red Investigative Thread
                </span>
                <button
                  type="button"
                  onClick={() => setConnectionLabelModal(null)}
                  className="text-[#8C7A65] hover:text-[#F4EDE2]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="font-typewriter text-xs text-[#C9B99B]">
                Connecting: <strong>{boardState.elements.find(e => e.id === connectionLabelModal.sourceId)?.title}</strong> {'──>'} <strong>{boardState.elements.find(e => e.id === connectionLabelModal.targetId)?.title}</strong>
              </p>

              <div className="space-y-1.5">
                <label className="font-typewriter text-xs text-[#A69482] uppercase">
                  Relationship Label
                </label>
                <input
                  type="text"
                  value={connectionLabelModal.label}
                  onChange={(e) => setConnectionLabelModal(prev => prev ? ({ ...prev, label: e.target.value }) : null)}
                  className="w-full bg-[#14110E] border border-[#3E3123] rounded p-2 text-xs font-typewriter text-[#F4EDE2] focus:outline-none focus:border-[#C49A61]"
                />
              </div>

              <div className="space-y-1">
                <span className="font-typewriter text-[10px] text-[#8C7A65] uppercase block">
                  Presets:
                </span>
                <div className="flex flex-wrap gap-1">
                  {RELATIONSHIP_LABELS.slice(0, 6).map(lbl => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setConnectionLabelModal(prev => prev ? ({ ...prev, label: lbl }) : null)}
                      className="px-2 py-0.5 rounded bg-[#201A14] hover:bg-[#2C2118] border border-[#3E3123] text-[10px] font-typewriter text-[#C9B99B]"
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#3D3023]/60">
                <button
                  type="button"
                  onClick={() => setConnectionLabelModal(null)}
                  className="px-3 py-1.5 rounded bg-[#241A14] text-[#A69482] text-xs font-typewriter uppercase"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmConnection}
                  className="px-4 py-1.5 rounded bg-[#A82E25] hover:bg-[#C0392B] text-white text-xs font-typewriter font-bold uppercase shadow"
                >
                  Tie Thread
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
