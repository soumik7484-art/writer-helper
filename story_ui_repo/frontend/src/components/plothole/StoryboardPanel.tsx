import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Users, MessageSquare, AlertTriangle } from 'lucide-react';

interface StoryboardPanelProps {
  panel: {
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
  };
  hasIssue?: boolean;
  issueType?: 'critical' | 'warning' | 'suggestion';
  onClick?: () => void;
}

export const StoryboardPanel: React.FC<StoryboardPanelProps> = ({
  panel,
  hasIssue = false,
  issueType = 'warning',
  onClick
}) => {
  const borderColor = hasIssue
    ? issueType === 'critical'
      ? '#B4473E'
      : issueType === 'warning'
      ? '#C49A61'
      : '#4EA8A1'
    : '#8F7658';

  const badgeColor = hasIssue
    ? issueType === 'critical'
      ? '#B4473E'
      : issueType === 'warning'
      ? '#C49A61'
      : '#4EA8A1'
    : '#8B6914';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: hasIssue ? 1.02 : 1.01 }}
      onClick={onClick}
      className={`relative rounded-lg overflow-hidden shadow-lg transition-all ${
        onClick ? 'cursor-pointer' : ''
      }`}
      style={{
        backgroundColor: '#E8DCC8',
        border: `2px solid ${borderColor}`,
        boxShadow: hasIssue
          ? `0 4px 20px ${borderColor}40`
          : '0 4px 12px rgba(44, 36, 22, 0.15)',
      }}
    >
      {/* Issue indicator */}
      {hasIssue && (
        <div
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full shadow-lg"
          style={{ backgroundColor: badgeColor }}
        >
          <AlertTriangle className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Panel number badge */}
      <div
        className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded shadow-md"
        style={{
          backgroundColor: badgeColor,
          border: '1px solid rgba(0,0,0,0.2)',
        }}
      >
        <span className="font-typewriter text-xs font-bold text-white">
          #{panel.panel_number}
        </span>
      </div>

      {/* Illustration */}
      <div
        className="relative w-full bg-gradient-to-br from-[#D9CBB0] to-[#C8BFB0]"
        style={{ height: '240px' }}
      >
        {panel.illustration_url ? (
          <img
            src={panel.illustration_url}
            alt={panel.scene_title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div
              className="w-16 h-16 mb-3 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#8B6914' }}
            >
              <span className="font-typewriter text-2xl font-bold text-white">
                {panel.panel_number}
              </span>
            </div>
            <p className="font-typewriter text-xs" style={{ color: '#6E5943' }}>
              Illustration Placeholder
            </p>
          </div>
        )}

        {/* Chapter badge overlay */}
        <div
          className="absolute bottom-0 left-0 right-0 px-3 py-2"
          style={{
            background: 'linear-gradient(to top, rgba(28, 22, 16, 0.9), transparent)',
          }}
        >
          <p className="font-typewriter text-xs font-bold text-[#E0B77D]">
            Chapter {panel.chapter_number}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Scene title */}
        <div>
          <h3 className="font-serif text-base font-bold leading-tight" style={{ color: '#2C2416' }}>
            {panel.scene_title}
          </h3>
          {panel.emotional_tone && (
            <span
              className="inline-block mt-1.5 px-2 py-0.5 rounded text-xs font-typewriter font-semibold"
              style={{
                backgroundColor: '#F5E6C0',
                color: '#8B6914',
              }}
            >
              {panel.emotional_tone}
            </span>
          )}
        </div>

        {/* Visual description */}
        <p
          className="font-serif text-xs leading-relaxed line-clamp-3"
          style={{ color: '#3D3020' }}
        >
          {panel.visual_description}
        </p>

        {/* Metadata */}
        <div className="space-y-2 pt-2 border-t" style={{ borderColor: '#C4BCB0' }}>
          {/* Characters */}
          {panel.characters && panel.characters.length > 0 && (
            <div className="flex items-start space-x-2">
              <Users className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#8B6914' }} />
              <p className="font-typewriter text-xs" style={{ color: '#6E5943' }}>
                {panel.characters.join(', ')}
              </p>
            </div>
          )}

          {/* Location */}
          {panel.location && (
            <div className="flex items-start space-x-2">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#8B6914' }} />
              <p className="font-typewriter text-xs" style={{ color: '#6E5943' }}>
                {panel.location}
              </p>
            </div>
          )}

          {/* Dialogue */}
          {panel.dialogue_excerpt && (
            <div className="flex items-start space-x-2">
              <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#8B6914' }} />
              <p className="font-serif italic text-xs" style={{ color: '#6E5943' }}>
                "{panel.dialogue_excerpt}"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Issue marker line (if has issue) */}
      {hasIssue && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ backgroundColor: borderColor }}
        />
      )}
    </motion.div>
  );
};
