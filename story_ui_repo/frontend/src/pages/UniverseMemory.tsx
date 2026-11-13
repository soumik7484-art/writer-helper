import React, { useState, useEffect } from 'react';
import { useStory } from '../context/StoryContext';
import { api } from '../services/api';
import { Memory, MemoryCategory, VectorPipelineExplanation } from '../types';
import { Stamp } from '../components/common/Stamp';
import { sound } from '../services/audioService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Search, 
  Plus, 
  Filter, 
  Sparkles, 
  Trash2, 
  Edit3, 
  Database, 
  Info, 
  X, 
  BookOpen, 
  Layers, 
  Cpu, 
  Compass,
  ArrowRight
} from 'lucide-react';

export const UniverseMemory: React.FC = () => {
  const { activeStory, addToast } = useStory();

  const [memories, setMemories] = useState<Memory[]>([]);
  const [pipelineInfo, setPipelineInfo] = useState<VectorPipelineExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showPipelineExplainer, setShowPipelineExplainer] = useState(false);

  // Edit / Create Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Partial<Memory> | null>(null);

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: 'All Codex Fragments' },
    { id: 'character_facts', label: 'Character Facts' },
    { id: 'locations', label: 'Locations' },
    { id: 'relationships', label: 'Relationships' },
    { id: 'important_events', label: 'Important Events' },
    { id: 'objects', label: 'Objects & Relics' },
    { id: 'world_rules', label: 'World Rules' },
    { id: 'history', label: 'Historical Lore' },
    { id: 'unresolved_mysteries', label: 'Unresolved Mysteries' },
  ];

  const fetchMemories = async () => {
    if (!activeStory) return;
    try {
      setLoading(true);
      const [mems, pipe] = await Promise.all([
        api.getStoryMemories(activeStory.id),
        api.getPipelineExplanation().catch(() => null)
      ]);
      setMemories(mems);
      if (pipe) setPipelineInfo(pipe);
    } catch (e: any) {
      addToast("Failed to load memory store", e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, [activeStory]);

  // Semantic Vector Search test
  const handleVectorSearch = async () => {
    if (!activeStory || !searchQuery.trim()) {
      fetchMemories();
      return;
    }

    try {
      setLoading(true);
      sound.playTypewriterKeystroke();
      const res = await api.searchMemories(activeStory.id, searchQuery, 8);
      setMemories(res.results);
      addToast("Vector Search Run", `Found ${res.count} semantically related memory fragments.`, "success");
    } catch (e: any) {
      addToast("Search Error", e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMemory = async (mem: Partial<Memory>) => {
    if (!activeStory || !mem.title?.trim() || !mem.description?.trim()) return;
    try {
      if (mem.id) {
        await api.updateMemory(mem.id, mem);
        addToast("Memory Updated", `Codex entry '${mem.title}' revised.`, "success");
      } else {
        await api.createMemory(activeStory.id, mem);
        addToast("Memory Inscribed", `New memory fragment committed to ChromaDB store.`, "success");
      }
      setModalOpen(false);
      setEditingMemory(null);
      await fetchMemories();
    } catch (e: any) {
      addToast("Error", "Could not commit memory.", "error");
    }
  };

  const handleDeleteMemory = async (memId: string, title: string) => {
    if (!window.confirm(`Expunge memory fragment '${title}' from persistent storage?`)) return;
    try {
      await api.deleteMemory(memId);
      addToast("Memory Expunged", `Entry '${title}' removed.`, "info");
      await fetchMemories();
    } catch (e: any) {
      addToast("Error", "Could not delete memory fragment.", "error");
    }
  };

  const filteredMemories = memories.filter(m => {
    if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-8 space-y-6">
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2C231B] pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#C49A61]"></span>
            <span className="font-typewriter text-xs text-[#C49A61] font-bold tracking-[0.25em] uppercase">
              CHROMADB SEMANTIC STORE & KNOWLEDGE CODEX
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-black text-[#F2E8DC] mt-1">
            Universe Memory
          </h1>
          <p className="font-typewriter text-xs sm:text-sm text-[#A69482] mt-1">
            Persistent facts, relics, and world rules injected into Gemini during story generation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Explain Vector Retrieval Button */}
          <button
            onClick={() => setShowPipelineExplainer(!showPipelineExplainer)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded bg-[#2A2016] hover:bg-[#382C20] text-[#E0B77D] border border-[#C49A61]/40 font-typewriter text-xs uppercase font-bold tracking-wider transition-colors"
          >
            <Info className="w-4 h-4 text-[#C49A61]" />
            <span>How AI Retrieves Lore</span>
          </button>

          {/* Add Manual Memory */}
          <button
            onClick={() => {
              setEditingMemory({
                title: '',
                description: '',
                category: 'world_rules',
                source_chapter: 'Chapter 1',
                importance: 'High',
              });
              setModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 rounded bg-[#C49A61] hover:bg-[#D6AB72] text-[#14100D] font-typewriter text-xs uppercase font-bold tracking-wider shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Memory Fragment</span>
          </button>
        </div>
      </div>

      {/* Visual Explanation Banner (Accordion / Flowchart) */}
      <AnimatePresence>
        {showPipelineExplainer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg bg-[#1B1612] p-6 border border-[#3E3125] shadow-2xl space-y-4 font-typewriter text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#2C231B] pb-3">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-[#C49A61]" />
                <h3 className="font-cinzel text-base font-bold text-[#E5DCce]">
                  SEMANTIC VECTOR RETRIEVAL PIPELINE (RAG ARCHITECTURE)
                </h3>
              </div>
              <span className="text-xs sm:text-[13px] text-[#A69380] uppercase">
                ENGINE: {pipelineInfo?.active_engine || "ChromaDB + all-MiniLM-L6-v2"}
              </span>
            </div>

            {/* 4 Pipeline Steps Flowchart */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {[
                {
                  step: 1,
                  title: "1. Chunk & Segment",
                  desc: "When chapters or lore are filed, world rules and entity traits are decomposed into discrete semantic tokens."
                },
                {
                  step: 2,
                  title: "2. Vector Embedding",
                  desc: "Fragments are embedded into high-dimensional vectors via Hugging Face all-MiniLM-L6-v2 and stored in ChromaDB."
                },
                {
                  step: 3,
                  title: "3. Cosine Distance Query",
                  desc: "During scene drafting, the last 400 characters query the vector space to calculate semantic proximity."
                },
                {
                  step: 4,
                  title: "4. Targeted Injection",
                  desc: "Only the top 4 relevant facts are sent to Gemini Flash, avoiding token bloat and eliminating hallucinations."
                }
              ].map((s) => (
                <div key={s.step} className="p-3.5 rounded bg-[#241D17] border border-[#3A2E24] space-y-1.5">
                  <span className="font-bold text-[#C49A61] uppercase block">{s.title}</span>
                  <p className="text-xs sm:text-[13px] text-[#A89886] font-sans leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search and Filters Bar */}
      <div className="bg-[#191512] p-4 rounded-lg border border-[#30261E] space-y-3 font-typewriter text-xs">
        {/* Search Input with Vector Search Trigger */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#7A6958] absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVectorSearch()}
              placeholder="Query semantic memory (e.g. 'stopped pocket watch', 'breakwater vault', 'Alistair fear')..."
              className="w-full bg-[#130F0D] border border-[#2E241C] text-[#CBBCA9] text-xs rounded pl-9 pr-3 py-2.5 font-typewriter focus:outline-none focus:border-[#C49A61]"
            />
          </div>

          <button
            onClick={handleVectorSearch}
            className="px-4 py-2.5 rounded bg-[#2D2319] hover:bg-[#3D2E20] text-[#E0B77D] border border-[#C49A61]/50 uppercase font-bold tracking-wider"
          >
            Vector Search
          </button>

          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                fetchMemories();
              }}
              className="p-2 text-[#7A6958] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1 rounded text-xs uppercase tracking-wider transition-colors shrink-0 ${
                selectedCategory === c.id
                  ? 'bg-[#C49A61] text-[#14100D] font-bold shadow'
                  : 'bg-[#221B16] text-[#8C7A68] hover:text-[#C5B7A5]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Memory Index Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredMemories.map((mem) => (
          <motion.div
            key={mem.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-lg parchment-sheet p-5 border border-[#8C765C] shadow-lg flex flex-col justify-between group"
          >
            <div>
              {/* Header: Title and Category Stamp */}
              <div className="flex items-start justify-between gap-3 border-b border-[#6E5943]/30 pb-2 mb-3">
                <div>
                  <span className="font-typewriter text-xs text-[#7A644E] uppercase tracking-wider font-bold block">
                    {mem.category.replace('_', ' ')}
                  </span>
                  <h3 className="font-serif text-base font-bold text-[#1C150F]">
                    {mem.title}
                  </h3>
                </div>

                <span className={`px-2 py-0.5 rounded text-xs font-typewriter uppercase shrink-0 font-bold ${
                  mem.importance === 'High'
                    ? 'bg-[#8F332B] text-white'
                    : 'bg-[#5A4533] text-[#F3EAD9]'
                }`}>
                  {mem.importance}
                </span>
              </div>

              {/* Memory Fact Description */}
              <p className="font-serif text-xs text-[#2A2016] leading-relaxed mb-4">
                {mem.description}
              </p>
            </div>

            {/* Footer Metadata */}
            <div className="pt-3 border-t border-[#6E5943]/25 font-typewriter text-xs sm:text-[13px] text-[#695441] space-y-1">
              <div className="flex items-center justify-between">
                <span>Origin: <strong>{mem.source_chapter}</strong></span>
                {mem.relevance_score !== undefined && (
                  <span className="text-[#8F332B] font-bold">
                    Score: {Math.round(mem.relevance_score * 100)}%
                  </span>
                )}
              </div>

              {(mem.related_character || mem.related_location) && (
                <div className="flex flex-wrap gap-2 text-[#4A3A2C]">
                  {mem.related_character && <span>Subject: {mem.related_character}</span>}
                  {mem.related_location && <span>• Location: {mem.related_location}</span>}
                </div>
              )}

              {/* Card Action Controls */}
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  onClick={() => {
                    setEditingMemory(mem);
                    setModalOpen(true);
                  }}
                  className="p-1 text-[#4A3B2D] hover:text-black"
                  title="Edit Memory"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteMemory(mem.id, mem.title)}
                  className="p-1 text-[#8F332B] hover:text-[#B4473E]"
                  title="Expunge Memory"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredMemories.length === 0 && !loading && (
        <div className="p-12 text-center bg-[#191512] rounded-lg border border-[#332A22]">
          <Brain className="w-10 h-10 text-[#C49A61] mx-auto opacity-70 mb-3" />
          <h3 className="font-serif text-lg font-bold text-[#E5DCce]">
            No Memory Fragments Found
          </h3>
          <p className="font-typewriter text-xs text-[#8C7A68] max-w-sm mx-auto mt-1">
            No lore fragments match the query '{searchQuery}'. Clear search or inscribe a new memory fragment.
          </p>
        </div>
      )}

      {/* MEMORY CREATE / EDIT MODAL */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto parchment-sheet p-6 sm:p-8 rounded-lg border-2 border-[#8F7454] shadow-2xl text-[#2B2117]"
            >
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 text-[#5E4D3E] hover:text-black p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="border-b border-[#6E5A44]/40 pb-3 mb-5">
                <span className="font-typewriter text-xs font-bold text-[#8A332B] uppercase tracking-wider">
                  CODEX INSCRIPTION
                </span>
                <h3 className="font-serif text-2xl font-bold text-[#1E1711]">
                  {editingMemory?.id ? "Revise Memory Fragment" : "Inscribe Universe Memory"}
                </h3>
              </div>

              <div className="space-y-4 font-typewriter text-xs">
                <div>
                  <label className="block font-bold uppercase mb-1">Memory Title *</label>
                  <input
                    type="text"
                    value={editingMemory?.title || ''}
                    onChange={(e) => setEditingMemory(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. The Cipher Word REVERIE"
                    className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] font-serif font-bold text-sm text-[#231A13]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold uppercase mb-1">Category</label>
                    <select
                      value={editingMemory?.category || 'world_rules'}
                      onChange={(e) => setEditingMemory(prev => ({ ...prev, category: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] text-[#231A13]"
                    >
                      <option value="character_facts">Character Facts</option>
                      <option value="locations">Locations</option>
                      <option value="relationships">Relationships</option>
                      <option value="important_events">Important Events</option>
                      <option value="objects">Objects & Relics</option>
                      <option value="world_rules">World Rules</option>
                      <option value="history">Historical Lore</option>
                      <option value="unresolved_mysteries">Unresolved Mysteries</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold uppercase mb-1">Importance</label>
                    <select
                      value={editingMemory?.importance || 'High'}
                      onChange={(e) => setEditingMemory(prev => ({ ...prev, importance: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] text-[#231A13]"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold uppercase mb-1">Source Chapter</label>
                    <input
                      type="text"
                      value={editingMemory?.source_chapter || 'Chapter 1'}
                      onChange={(e) => setEditingMemory(prev => ({ ...prev, source_chapter: e.target.value }))}
                      className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] text-[#231A13]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold uppercase mb-1">Related Character</label>
                    <input
                      type="text"
                      value={editingMemory?.related_character || ''}
                      onChange={(e) => setEditingMemory(prev => ({ ...prev, related_character: e.target.value }))}
                      placeholder="e.g. Silas Vance"
                      className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] text-[#231A13]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold uppercase mb-1">Detailed Lore / Rule Description *</label>
                  <textarea
                    rows={4}
                    value={editingMemory?.description || ''}
                    onChange={(e) => setEditingMemory(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter the indisputable canon fact, physical rule, or discovered secret..."
                    className="w-full px-3 py-2 rounded bg-[#E4D9C3] border border-[#9A846A] font-serif text-xs text-[#231A13]"
                  />
                </div>

                <div className="pt-4 border-t border-[#7A644E]/40 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded border border-[#6B553E] text-[#2B2117] font-bold uppercase"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => editingMemory && handleSaveMemory(editingMemory)}
                    className="px-6 py-2 rounded bg-[#2B2016] text-[#E0B77D] hover:bg-[#3D2D20] font-bold uppercase shadow"
                  >
                    Inscribe to ChromaDB
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
