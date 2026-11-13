import React from 'react';
import { useStory } from '../../context/StoryContext';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useStory();

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isError = toast.type === 'error' || toast.type === 'warning';
          const isSuccess = toast.type === 'success';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ duration: 0.25 }}
              className={`pointer-events-auto relative p-4 rounded-md border shadow-2xl parchment-subtle ${
                isError
                  ? 'border-red-800/60 text-[#301614]'
                  : isSuccess
                  ? 'border-emerald-800/60 text-[#192B19]'
                  : 'border-[#C49A61]/60 text-[#2B221B]'
              }`}
            >
              {/* Top pushpin */}
              <div className="absolute -top-2 left-6 w-3 h-3 rounded-full bg-[#B4473E] shadow-md border border-black/40"></div>

              <div className="flex items-start space-x-3">
                <div className="mt-0.5 shrink-0">
                  {isError ? (
                    <AlertCircle className="w-5 h-5 text-[#B4473E]" />
                  ) : isSuccess ? (
                    <CheckCircle2 className="w-5 h-5 text-[#4D7C44]" />
                  ) : (
                    <Info className="w-5 h-5 text-[#C49A61]" />
                  )}
                </div>

                <div className="flex-1 pr-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-typewriter text-[11px] font-bold tracking-widest uppercase opacity-75">
                      TELEGRAM NOTICE
                    </span>
                  </div>
                  <h4 className="font-serif text-sm font-bold text-[#1C1612] mt-0.5">
                    {toast.title}
                  </h4>
                  <p className="font-sans text-xs text-[#4A3D31] mt-1 leading-relaxed">
                    {toast.message}
                  </p>
                </div>

                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-[#6B5A4B] hover:text-black transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
