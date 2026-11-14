import React from 'react';
import { motion } from 'framer-motion';

interface PolaroidProps {
  imageUrl?: string;
  caption: string;
  subcaption?: string;
  rotation?: number; // e.g. -2, 1, 3
  pinned?: boolean;
  tape?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  statusBadge?: string;
}

export const Polaroid: React.FC<PolaroidProps> = ({
  imageUrl,
  caption,
  subcaption,
  rotation = 0,
  pinned = false,
  tape = false,
  size = 'md',
  className = '',
  onClick,
  statusBadge,
}) => {
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    setImageError(false);
  }, [imageUrl]);
  const sizeClasses = {
    xs: 'w-28 sm:w-32 p-1.5 pb-4',
    sm: 'w-40 sm:w-44 p-2 pb-6',
    md: 'w-56 sm:w-64 p-3 pb-8',
    lg: 'w-72 sm:w-80 p-3.5 pb-10',
  }[size];

  const imgHeightClasses = {
    xs: 'h-24 sm:h-28',
    sm: 'h-32 sm:h-36',
    md: 'h-48 sm:h-52',
    lg: 'h-64 sm:h-72',
  }[size];

  const captionSizeClasses = {
    xs: 'text-sm sm:text-base',
    sm: 'text-lg sm:text-xl',
    md: 'text-xl sm:text-2xl',
    lg: 'text-2xl sm:text-3xl',
  }[size];

  return (
    <motion.div
      whileHover={{ scale: 1.03, rotate: 0 }}
      style={{ rotate: `${rotation}deg` }}
      onClick={onClick}
      className={`relative polaroid-card max-w-full ${sizeClasses} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Tape Effect */}
      {tape && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-5 tape-strip -rotate-1 z-20"></div>
      )}

      {/* Pushpin Effect */}
      {pinned && (
        <div className="pushpin"></div>
      )}

      {/* Photo Frame Container */}
      <div className={`relative w-full ${imgHeightClasses} bg-[#1A1816] rounded-sm overflow-hidden shadow-inner border border-black/20`}>
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={caption}
            className="w-full h-full object-cover filter contrast-[1.06] brightness-[0.98] sepia-[0.12] transition-transform duration-500 hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#25201C] p-4 text-center">
            <span className="text-3xl text-[#C49A61]/50 mb-2">👁️</span>
            <span className="font-typewriter text-xs text-[#A8987E]">EVIDENCE ARCHIVE</span>
          </div>
        )}

        {/* Vintage Light Flare / Vignette Overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-white/10"></div>

        {/* Status Badge */}
        {statusBadge && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/75 border border-[#C49A61]/50 text-[10px] font-typewriter tracking-widest text-[#E0B77D] uppercase shadow">
            {statusBadge}
          </div>
        )}
      </div>

      {/* Handwritten Caption Section */}
      <div className={`${size === 'xs' ? 'mt-1.5' : 'mt-3'} px-1`}>
        <p className={`font-handwriting ${captionSizeClasses} text-[#241D17] leading-tight font-bold tracking-wide truncate`}>
          {caption}
        </p>
        {subcaption && (
          <p className="font-sans text-[11px] text-[#6E5C4B] mt-0.5 tracking-wider uppercase truncate">
            {subcaption}
          </p>
        )}
      </div>
    </motion.div>
  );
};
