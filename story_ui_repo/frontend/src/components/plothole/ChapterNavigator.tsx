import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, AlertTriangle, ChevronRight } from 'lucide-react';

interface Chapter {
  number: number;
  title: string;
  panelCount: number;
  issueCount: number;
}

interface ChapterNavigatorProps {
  chapters: Chapter[];
  activeChapter: number | null;
  onChapterSelect: (chapterNumber: number) => void;
}

export const ChapterNavigator: React.FC<ChapterNavigatorProps> = ({
  chapters,
  activeChapter,
  onChapterSelect
}) => {
  if (chapters.length === 0) {
    return (
      <div
        className="rounded-lg p-6 text-center"
        style={{
          backgroundColor: '#F5F3EC',
          border: '1px solid #C4BCB0',
        }}
      >
        <BookOpen className="w-8 h-8 mx-auto mb-2" style={{ color: '#8A7969' }} />
        <p className="font-typewriter text-xs" style={{ color: '#8A7969' }}>
          No chapters available
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="px-3 py-2">
        <p className="font-typewriter text-xs uppercase tracking-wider font-bold" style={{ color: '#8A7969' }}>
          Chapter Navigation
        </p>
      </div>

      {/* Chapter list */}
      <div className="space-y-1">
        {chapters.map((chapter) => {
          const isActive = activeChapter === chapter.number;
          const hasIssues = chapter.issueCount > 0;

          return (
            <motion.button
              key={chapter.number}
              whileHover={{ x: 4 }}
              onClick={() => onChapterSelect(chapter.number)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                isActive ? 'shadow-md' : ''
              }`}
              style={{
                backgroundColor: isActive ? '#E8DCC8' : 'transparent',
                border: isActive ? '2px solid #C49A61' : '2px solid transparent',
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span
                      className="font-typewriter text-xs font-bold"
                      style={{ color: isActive ? '#C49A61' : '#8A7969' }}
                    >
                      CH {chapter.number}
                    </span>
                    {hasIssues && (
                      <div
                        className="flex items-center space-x-1 px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: '#F5EAEA' }}
                      >
                        <AlertTriangle className="w-3 h-3" style={{ color: '#B4473E' }} />
                        <span className="font-typewriter text-xs font-bold" style={{ color: '#B4473E' }}>
                          {chapter.issueCount}
                        </span>
                      </div>
                    )}
                  </div>
                  <p
                    className={`font-serif text-sm font-semibold truncate ${
                      isActive ? 'text-[#2C2416]' : 'text-[#6E5943]'
                    }`}
                  >
                    {chapter.title}
                  </p>
                  <p className="font-typewriter text-xs mt-0.5" style={{ color: '#8A7969' }}>
                    {chapter.panelCount} panels
                  </p>
                </div>
                {isActive && (
                  <ChevronRight className="w-4 h-4 shrink-0" style={{ color: '#C49A61' }} />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* View all button */}
      <button
        onClick={() => onChapterSelect(0)}
        className={`w-full px-4 py-2 rounded-lg font-typewriter text-xs font-bold uppercase tracking-wider transition-all ${
          activeChapter === 0 || activeChapter === null ? 'shadow-md' : ''
        }`}
        style={{
          backgroundColor: activeChapter === 0 || activeChapter === null ? '#C49A61' : '#D9CBB0',
          color: activeChapter === 0 || activeChapter === null ? '#14100D' : '#6E5943',
        }}
      >
        View All Chapters
      </button>
    </div>
  );
};
