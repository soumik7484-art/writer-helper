import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Story, Chapter, Genre } from '../types';
import { api } from '../services/api';
import { sound } from '../services/audioService';

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
}

interface GenreAesthetic {
  genre: Genre;
  accentColor: string;
  badgeBg: string;
  paperTint: string;
  subtleBorder: string;
  tagline: string;
}

interface StoryContextType {
  stories: Story[];
  activeStory: Story | null;
  activeChapterId: string | null;
  loading: boolean;
  toasts: ToastMessage[];
  setActiveStoryId: (id: string) => void;
  setActiveChapterId: (id: string | null) => void;
  refreshStories: () => Promise<void>;
  addToast: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
  genreAesthetics: GenreAesthetic;
}

const StoryContext = createContext<StoryContextType | undefined>(undefined);

export const StoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const refreshStories = async () => {
    try {
      setLoading(true);
      const data = await api.getStories();
      setStories(data);

      if (data.length > 0) {
        if (!activeStory || !data.some(s => s.id === activeStory.id)) {
          setActiveStory(data[0]);
        } else {
          const updated = data.find(s => s.id === activeStory.id);
          if (updated) setActiveStory(updated);
        }
      } else {
        setActiveStory(null);
      }
    } catch (err: any) {
      addToast("Connection Alert", "Could not reach story archives. Using local workspace state.", "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStories();
  }, []);

  const setActiveStoryId = (id: string) => {
    const found = stories.find(s => s.id === id);
    if (found) {
      setActiveStory(found);
      sound.playPaperRustle();
    }
  };

  const getGenreAesthetics = (genre?: Genre): GenreAesthetic => {
    switch (genre) {
      case 'Horror':
        return {
          genre: 'Horror',
          accentColor: '#B4473E',
          badgeBg: 'bg-red-950/40 text-red-300 border-red-800/50',
          paperTint: 'bg-[#C2B195]',
          subtleBorder: 'border-red-900/30',
          tagline: 'Paranormal Dossier & Investigation Archive'
        };
      case 'Fantasy':
        return {
          genre: 'Fantasy',
          accentColor: '#D4AF37',
          badgeBg: 'bg-amber-950/40 text-amber-200 border-amber-700/50',
          paperTint: 'bg-[#D6C5A2]',
          subtleBorder: 'border-amber-900/30',
          tagline: 'Arcane Chronicle & Lore Codex'
        };
      case 'Sci-Fi':
        return {
          genre: 'Sci-Fi',
          accentColor: '#4EA8A1',
          badgeBg: 'bg-cyan-950/40 text-cyan-200 border-cyan-800/50',
          paperTint: 'bg-[#CBD0CD]',
          subtleBorder: 'border-cyan-900/30',
          tagline: 'Mission Log & Telemetry Archive'
        };
      case 'Romance':
        return {
          genre: 'Romance',
          accentColor: '#C47A73',
          badgeBg: 'bg-rose-950/40 text-rose-200 border-rose-800/50',
          paperTint: 'bg-[#D8C7B9]',
          subtleBorder: 'border-rose-900/30',
          tagline: 'Memoir of Sentiments & Kept Letters'
        };
      case 'Adventure':
        return {
          genre: 'Adventure',
          accentColor: '#B87333',
          badgeBg: 'bg-orange-950/40 text-orange-200 border-orange-800/50',
          paperTint: 'bg-[#CEBDA0]',
          subtleBorder: 'border-orange-900/30',
          tagline: 'Expedition Field Log & Cartography'
        };
      case 'Mystery':
      default:
        return {
          genre: 'Mystery',
          accentColor: '#C49A61',
          badgeBg: 'bg-amber-950/30 text-amber-300 border-[#C49A61]/40',
          paperTint: 'bg-[#C9B99B]',
          subtleBorder: 'border-[#C49A61]/30',
          tagline: 'Case File & Detective Inquiry Ledger'
        };
    }
  };

  const genreAesthetics = getGenreAesthetics(activeStory?.genre);

  return (
    <StoryContext.Provider
      value={{
        stories,
        activeStory,
        activeChapterId,
        loading,
        toasts,
        setActiveStoryId,
        setActiveChapterId,
        refreshStories,
        addToast,
        removeToast,
        genreAesthetics,
      }}
    >
      {children}
    </StoryContext.Provider>
  );
};

export const useStory = () => {
  const context = useContext(StoryContext);
  if (!context) {
    throw new Error('useStory must be used within a StoryProvider');
  }
  return context;
};
