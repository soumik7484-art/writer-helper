import React from 'react';
import { motion } from 'framer-motion';
import { StoryboardPanel } from './StoryboardPanel';

interface Panel {
  id: string;
  panel_number: number;
  chapter_number: number;
  chapter_title: string;
  scene_title: string;
  visual_description: string;
  characters: string[];
  location: string;
  dialogue_excerpt?: string;
  emotional_tone?: string;
  illustration_url?: string | null;
}

interface PlotHole {
  id: string;
  affected_panel_ids: string[];
  visual_marker_type: string;
}

interface StoryboardCanvasProps {
  panels: Panel[];
  plotHoles?: PlotHole[];
  onPanelClick?: (panel: Panel) => void;
  loading?: boolean;
}

export const StoryboardCanvas: React.FC<StoryboardCanvasProps> = ({
  panels,
  plotHoles = [],
  onPanelClick,
  loading = false
}) => {
  // Group panels by chapter
  const panelsByChapter = panels.reduce((acc, panel) => {
    const chapterNum = panel.chapter_number;
    if (!acc[chapterNum]) {
      acc[chapterNum] = [];
    }
    acc[chapterNum].push(panel);
    return acc;
  }, {} as Record<number, Panel[]>);

  const sortedChapters = Object.keys(panelsByChapter)
    .map(Number)
    .sort((a, b) => a - b);

  // Check if panel has plot hole
  const getPanelIssue = (panelId: string) => {
    const issue = plotHoles.find(ph => ph.affected_panel_ids.includes(panelId));
    if (!issue) return null;
    
    return {
      hasIssue: true,
      issueType: issue.visual_marker_type === 'critical' ? 'critical' as const :
                 issue.visual_marker_type === 'warning' ? 'warning' as const :
                 'suggestion' as const
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <div
            className="w-16 h-16 mx-auto rounded-lg animate-pulse"
            style={{ backgroundColor: '#C49A61' }}
          />
          <p className="font-typewriter text-sm" style={{ color: '#8A7969' }}>
            Generating storyboard panels...
          </p>
        </div>
      </div>
    );
  }

  if (panels.length === 0) {
    return (
      <div
        className="rounded-lg p-12 text-center border-2 border-dashed"
        style={{
          backgroundColor: '#F5F3EC',
          borderColor: '#C4BCB0',
        }}
      >
        <div className="max-w-md mx-auto space-y-3">
          <div
            className="w-20 h-20 mx-auto rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#D9CBB0' }}
          >
            <span className="text-4xl">📋</span>
          </div>
          <h3 className="font-serif text-xl font-bold" style={{ color: '#2C2416' }}>
            No Storyboard Generated
          </h3>
          <p className="font-typewriter text-sm" style={{ color: '#6E5943' }}>
            Upload a story document or run the detector to generate visual panels
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {sortedChapters.map((chapterNum) => {
        const chapterPanels = panelsByChapter[chapterNum];
        const chapterTitle = chapterPanels[0]?.chapter_title || `Chapter ${chapterNum}`;

        return (
          <motion.div
            key={chapterNum}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: chapterNum * 0.1 }}
            className="space-y-4"
          >
            {/* Chapter header */}
            <div
              className="flex items-center space-x-4 pb-3 border-b-2"
              style={{ borderColor: '#8A7969' }}
            >
              <div
                className="px-4 py-2 rounded"
                style={{
                  backgroundColor: '#8B6914',
                  boxShadow: '0 2px 8px rgba(139, 105, 20, 0.3)',
                }}
              >
                <span className="font-typewriter text-sm font-bold text-white">
                  CHAPTER {chapterNum}
                </span>
              </div>
              <h2 className="font-serif text-2xl font-bold" style={{ color: '#2C2416' }}>
                {chapterTitle}
              </h2>
              <div className="flex-1" />
              <span className="font-typewriter text-xs" style={{ color: '#8A7969' }}>
                {chapterPanels.length} Panels
              </span>
            </div>

            {/* Panel grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {chapterPanels.map((panel) => {
                const issueData = getPanelIssue(panel.id);
                return (
                  <StoryboardPanel
                    key={panel.id}
                    panel={panel}
                    hasIssue={issueData?.hasIssue || false}
                    issueType={issueData?.issueType}
                    onClick={() => onPanelClick?.(panel)}
                  />
                );
              })}
            </div>

            {/* Chapter connector line (visual connection to next chapter) */}
            {chapterNum < Math.max(...sortedChapters) && (
              <div className="flex items-center justify-center py-6">
                <div className="flex items-center space-x-2">
                  <div
                    className="h-0.5 w-16"
                    style={{ backgroundColor: '#C4BCB0' }}
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: '#C49A61' }}
                  />
                  <div
                    className="h-0.5 w-16"
                    style={{ backgroundColor: '#C4BCB0' }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        );
      })}

      {/* Summary footer */}
      <div
        className="rounded-lg p-6 mt-8"
        style={{
          backgroundColor: '#F5F3EC',
          border: '2px solid #C4BCB0',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-typewriter text-xs uppercase tracking-wider font-bold" style={{ color: '#8A7969' }}>
              Storyboard Complete
            </p>
            <p className="font-serif text-lg font-semibold mt-1" style={{ color: '#2C2416' }}>
              {panels.length} Total Panels Across {sortedChapters.length} Chapters
            </p>
          </div>
          {plotHoles.length > 0 && (
            <div
              className="px-4 py-2 rounded"
              style={{
                backgroundColor: '#F5EAEA',
                border: '1px solid #B4473E',
              }}
            >
              <span className="font-typewriter text-sm font-bold" style={{ color: '#B4473E' }}>
                {plotHoles.length} Issues Detected
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
