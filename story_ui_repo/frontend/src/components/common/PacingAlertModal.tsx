import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Clock, ShieldAlert } from 'lucide-react';

interface PacingAlertModalProps {
  threshold?: number; // Number of clicks in window
  windowMs?: number;  // Time window in ms
}

export const PacingAlertModal: React.FC<PacingAlertModalProps> = ({
  threshold = 5,
  windowMs = 1200,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const clickTimesRef = useRef<number[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(() => {
    const now = Date.now();
    // Filter timestamps within window
    clickTimesRef.current = clickTimesRef.current.filter(t => now - t < windowMs);
    clickTimesRef.current.push(now);

    if (clickTimesRef.current.length >= threshold) {
      // Trigger pacing alert
      clickTimesRef.current = []; // Reset after trigger
      setIsOpen(true);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 3500);
    }
  }, [threshold, windowMs]);

  useEffect(() => {
    // Listen to all clicks on the window with capture phase
    window.addEventListener('click', handleClick, { capture: true });
    return () => {
      window.removeEventListener('click', handleClick, { capture: true });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [handleClick]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[99999] pointer-events-none flex items-center justify-center p-4"
          aria-live="assertive"
          role="alert"
        >
          {/* Backdrop flash */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto"
            onClick={() => setIsOpen(false)}
          />

          {/* Detective Noir Pacing Toast / Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ type: "spring", stiffness: 350, damping: 26 }}
            className="relative pointer-events-auto max-w-md w-full bg-[#18120C] border-2 border-[#C49A61] rounded-2xl p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_40px_rgba(196,154,97,0.35)] text-center space-y-4"
          >
            {/* Wax seal / warning icon */}
            <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-[#8A2B20] to-[#551811] border-2 border-[#E5A8A3]/60 text-white flex items-center justify-center shadow-lg">
              <ShieldAlert className="w-7 h-7 text-[#F5C2BC] animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <span className="font-typewriter text-[11px] text-[#C49A61] uppercase tracking-[0.25em] font-bold block">
                ARCHIVAL PACING TELEMETRY
              </span>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#F4EDE2] tracking-wide">
                Please slow it down a little bit and retry
              </h3>
            </div>

            <p className="font-typewriter text-xs text-[#B5A18C] leading-relaxed">
              Archival evidence, relationship threads, and story dossiers are synchronizing. Rapid clicking was paused to prevent memory desynchronization.
            </p>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#C49A61] to-[#A37B47] hover:from-[#D4AA71] hover:to-[#B38B57] text-[#14100D] font-typewriter text-xs font-bold uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                Understood, Continue
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
