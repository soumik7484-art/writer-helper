import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface MetalClipboardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  stampText?: string;
  stampType?: 'red' | 'green' | 'amber';
  className?: string;
  paperColor?: string;
}

export const MetalClipboard: React.FC<MetalClipboardProps> = ({
  children,
  title,
  subtitle,
  stampText,
  stampType = 'red',
  className = '',
}) => {
  return (
    <div className={`relative mx-auto w-full max-w-6xl pt-10 pb-16 px-2 sm:px-4 ${className}`}>
      {/* Outer Wooden / Heavy Leather Clipboard Backboard */}
      <div className="relative rounded-2xl bg-[#1A1410] p-4 sm:p-7 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_0_1px_rgba(196,154,97,0.2)] border-2 border-[#2C231B]">
        
        {/* Top Heavy Metal Clamp (Phasmophobia Signature Clip) */}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
          {/* Top Hanging Loop Hole */}
          <div className="w-14 h-6 border-4 border-[#5E5E5E] rounded-t-full bg-[#11100F] shadow-inner mb-[-2px] flex items-center justify-center">
            <div className="w-6 h-2 rounded-full bg-black/80"></div>
          </div>

          {/* Main Brushed Steel Clamp Body */}
          <div className="w-64 sm:w-80 h-14 rounded-md metal-clipboard-clip flex items-center justify-between px-6 border border-[#222]">
            {/* Left Rivet */}
            <div className="w-3.5 h-3.5 rounded-full bg-[#444] border border-[#222] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9),0_1px_1px_rgba(255,255,255,0.4)] flex items-center justify-center">
              <div className="w-2 h-0.5 bg-[#222]"></div>
            </div>

            {/* Center Embossed Brass Brand Plate */}
            <div className="flex items-center space-x-2 px-3 py-1 rounded bg-[#1A1613] border border-[#C49A61]/40 shadow-inner">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C49A61] animate-pulse"></span>
              <span className="font-serif text-xs font-bold tracking-widest text-[#E0B77D] uppercase">
                StoryWeave Case File
              </span>
            </div>

            {/* Right Rivet */}
            <div className="w-3.5 h-3.5 rounded-full bg-[#444] border border-[#222] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9),0_1px_1px_rgba(255,255,255,0.4)] flex items-center justify-center">
              <div className="w-2 h-0.5 bg-[#222]"></div>
            </div>
          </div>

          {/* Metal Tension Spring Lip Pressed Against Paper */}
          <div className="w-56 sm:w-72 h-3.5 bg-gradient-to-b from-[#4A4A4A] to-[#1F1F1F] rounded-b shadow-md -mt-0.5 border-x border-b border-[#111]"></div>
        </div>

        {/* Realistic Stacked Paper Edge Shadows underneath */}
        <div className="absolute inset-x-8 bottom-3 h-5 bg-[#A8987E] rounded-b -rotate-1 opacity-70"></div>
        <div className="absolute inset-x-7 bottom-4 h-5 bg-[#B8A88E] rounded-b rotate-0.5 opacity-80"></div>

        {/* Main Parchment Investigation Document */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative rounded-xl parchment-sheet min-h-[600px] p-6 sm:p-10 pt-12 overflow-hidden shadow-2xl"
        >
          {/* Subtle Paper Aging Stains and Vignette */}
          <div className="pointer-events-none absolute inset-0 bg-radial-gradient from-transparent via-transparent to-[#8F7651]/20 mix-blend-multiply"></div>
          <div className="pointer-events-none absolute top-0 left-0 w-32 h-32 bg-[radial-gradient(circle_at_0_0,rgba(110,80,45,0.18),transparent_70%)]"></div>
          <div className="pointer-events-none absolute bottom-0 right-0 w-44 h-44 bg-[radial-gradient(circle_at_100%_100%,rgba(110,80,45,0.22),transparent_70%)]"></div>

          {/* Document Header & Stamp */}
          {(title || stampText) && (
            <div className="relative z-10 flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#544434]/40 pb-5 mb-8">
              <div>
                {title && (
                  <h1 className="font-serif text-2xl sm:text-3xl lg:text-[34px] font-bold text-[#1C150F] tracking-tight leading-tight">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="font-sans text-sm sm:text-[15px] text-[#544131] mt-1 font-medium">
                    {subtitle}
                  </p>
                )}
              </div>

              {stampText && (
                <div
                  className={`select-none ${
                    stampType === 'green'
                      ? 'case-stamp-green'
                      : stampType === 'amber'
                      ? 'border-2 border-[#A86F28] text-[#A86F28] font-sans font-bold px-3.5 py-1 text-xs tracking-wider uppercase rotate-2'
                      : 'case-stamp text-xs sm:text-sm'
                  }`}
                >
                  {stampText}
                </div>
              )}
            </div>
          )}

          {/* Content Area */}
          <div className="relative z-10">
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
