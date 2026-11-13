import React, { useState } from 'react';
import { useStory } from '../context/StoryContext';
import { api } from '../services/api';
import { NavTab } from '../components/common/Navbar';
import { Polaroid } from '../components/common/Polaroid';
import { Stamp } from '../components/common/Stamp';
import { sound } from '../services/audioService';
import { motion } from 'framer-motion';
import {
  Plus,
  Trash2,
  ArrowRight,
  BookMarked,
  Filter,
  Check
} from 'lucide-react';
import { Genre, Story } from '../types';

interface MyStoriesProps {
  onNavigate: (tab: NavTab) => void;
}

export const MyStories: React.FC<MyStoriesProps> = ({ onNavigate }) => {
  const { stories, activeStory, setActiveStoryId, refreshStories, addToast } = useStory();
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const genres = ['All', 'Mystery', 'Horror', 'Fantasy', 'Sci-Fi', 'Romance', 'Adventure'];

  const filteredStories = selectedGenre === 'All'
    ? stories
    : stories.filter(s => s.genre === selectedGenre);

  const handleDelete = async (storyId: string, title: string) => {
    if (!window.confirm(`Are you certain you wish to permanently incinerate case file '${title}'? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(storyId);
      await api.deleteStory(storyId);
      addToast("Case File Removed", `Dossier '${title}' incinerated from archive.`, "info");
      await refreshStories();
    } catch (e: any) {
      addToast("Error", "Could not delete story archive.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelectStory = (storyId: string) => {
    sound.playPaperRustle();
    setActiveStoryId(storyId);
    addToast("Case File Opened", "Active story universe switched.", "success");
    onNavigate('home');
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2C231B] pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#C49A61]"></span>
            <span className="font-typewriter text-xs text-[#C49A61] font-bold tracking-[0.25em] uppercase">
              ARCHIVE VAULT
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-black text-[#F2E8DC] mt-1">
            Story Case Archives
          </h1>
          <p className="font-typewriter text-xs sm:text-sm text-[#A69482] mt-1">
            Browse all established narrative worlds, active murder mysteries, and epic chronicles.
          </p>
        </div>

        <button
          onClick={() => {
            sound.playPaperRustle();
            onNavigate('architect');
          }}
          className="flex items-center space-x-2 px-5 py-2.5 rounded bg-[#C49A61] hover:bg-[#D6AB72] text-[#16120E] font-typewriter text-xs font-bold uppercase tracking-wider shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Architect New Case File</span>
        </button>
      </div>

      {/* Genre Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        <Filter className="w-3.5 h-3.5 text-[#8A7969] shrink-0" />
        {genres.map((g) => (
          <button
            key={g}
            onClick={() => setSelectedGenre(g)}
            className={`px-3 py-1 rounded text-xs font-typewriter tracking-wider uppercase transition-colors shrink-0 ${
              selectedGenre === g
                ? 'bg-[#C49A61]/25 text-[#E0B77D] border border-[#C49A61]/60 font-bold'
                : 'bg-[#1C1713] text-[#8C7A68] hover:text-[#C5B7A5] border border-[#2F261E]'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Stories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStories.map((story) => {
          const isActive = activeStory?.id === story.id;

          return (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative rounded-xl p-5 sm:p-6 flex flex-col justify-between transition-all shadow-xl ${
                isActive
                  ? 'bg-[#241C16] border-2 border-[#C49A61] shadow-[0_10px_30px_rgba(196,154,97,0.15)]'
                  : 'bg-[#1B1612] hover:bg-[#201A15] border border-[#382D22] hover:border-[#4E3F30]'
              }`}
            >
              <div>
                {/* Card Header Meta & Active Stamp */}
                <div className="flex items-center justify-between gap-3 mb-3.5 border-b border-[#2C231B] pb-2.5">
                  <span className="font-sans text-xs sm:text-[13px] text-[#A6937E] font-semibold uppercase tracking-wider truncate">
                    {story.mood || "Suspenseful"} • {story.time_period || "Case Era"}
                  </span>
                  {isActive && (
                    <Stamp label="ACTIVE INQUIRY" type="amber" rotation={-1} size="sm" />
                  )}
                </div>

                {/* Polaroid and Meta Details */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-28 sm:w-32 shrink-0">
                    <Polaroid
                      imageUrl={story.cover_url || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop"}
                      caption={story.genre}
                      rotation={-1}
                      size="xs"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-[#EDE3D4] truncate leading-snug" title={story.title}>
                      {story.title}
                    </h3>
                    <p className="font-sans text-xs sm:text-[13.5px] text-[#A69482] mt-1.5 line-clamp-3 leading-relaxed">
                      {story.description || "No case summary filed for this story universe."}
                    </p>
                  </div>
                </div>

                {/* Case Tags */}
                <div className="pt-2 border-t border-[#2C231B] flex flex-wrap gap-2 text-xs sm:text-[13px] font-sans">
                  <span className="px-2.5 py-1 rounded bg-[#292018] text-[#C49A61] border border-[#3E3125] font-medium">
                    Setting: {story.setting || "Unspecified"}
                  </span>
                  <span className="px-2.5 py-1 rounded bg-[#292018] text-[#A69482] border border-[#3E3125] font-medium">
                    {story.chapter_count || 6} Target Chapters
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-[#2C231B] flex items-center justify-between">
                <button
                  onClick={() => handleDelete(story.id, story.title)}
                  disabled={deletingId === story.id}
                  className="p-1.5 rounded text-[#80352F] hover:text-[#B4473E] hover:bg-red-950/20 transition-colors"
                  title="Incinerate Case"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleSelectStory(story.id)}
                    className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded font-typewriter text-xs font-bold uppercase tracking-wider transition-all ${
                      isActive
                        ? 'bg-[#C49A61]/20 text-[#E0B77D] border border-[#C49A61]/50 cursor-default'
                        : 'bg-[#292018] hover:bg-[#382C22] text-[#D8CEBE] hover:text-white border border-[#44362A]'
                    }`}
                  >
                    {isActive ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#C49A61]" />
                        <span>Active Case</span>
                      </>
                    ) : (
                      <>
                        <span>Select Case</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredStories.length === 0 && (
        <div className="rounded-lg bg-[#191512] p-12 text-center border border-[#332A21] max-w-lg mx-auto space-y-4">
          <BookMarked className="w-12 h-12 text-[#C49A61] mx-auto opacity-70" />
          <h3 className="font-serif text-xl font-bold text-[#E5DCce]">
            No Case Files in this Genre
          </h3>
          <p className="font-typewriter text-xs text-[#8C7A69]">
            The shelves for '{selectedGenre}' are currently clear. Draft a new story architecture to populate it.
          </p>
          <button
            onClick={() => onNavigate('architect')}
            className="px-4 py-2 rounded bg-[#C49A61] hover:bg-[#D6AB72] text-[#14100D] font-typewriter text-xs font-bold uppercase tracking-wider transition-colors inline-block"
          >
            Create New Case Dossier
          </button>
        </div>
      )}
    </div>
  );
};
