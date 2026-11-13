import React, { useState, useEffect } from 'react';
import { useStory } from '../../context/StoryContext';
import { api } from '../../services/api';
import { sound } from '../../services/audioService';
import { motion } from 'framer-motion';
import { 
  X, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  useStory();
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [volume, setVolume] = useState<number>(0.35);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());

  useEffect(() => {
    if (isOpen) {
      checkBackend();
      setIsMuted(sound.getMuted());
    }
  }, [isOpen]);

  const checkBackend = async () => {
    try {
      setBackendStatus('checking');
      await api.checkHealth();
      setBackendStatus('online');
    } catch {
      setBackendStatus('offline');
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    sound.setVolume(newVol);
  };

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg parchment-sheet p-6 sm:p-8 rounded-2xl border-2 border-[#8F7454] shadow-2xl text-[#2B2117]"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#5E4D3E] hover:text-black p-1.5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="border-b border-[#6E5A44]/40 pb-3 mb-5">
          <span className="font-sans text-xs font-bold text-[#8A332B] uppercase tracking-wider">
            Studio Engine Settings
          </span>
          <h3 className="font-serif text-2xl font-bold text-[#1E1711] mt-0.5">
            Investigation Studio Configuration
          </h3>
        </div>

        <div className="space-y-5 font-sans text-sm">
          
          {/* Service Status Diagnostics */}
          <div className="bg-[#BFAEA0]/40 p-4 rounded-xl border border-[#8F785C] space-y-3">
            <span className="font-bold text-[#574433] text-xs uppercase tracking-wider block">
              Diagnostic Telemetry
            </span>

            {/* FastAPI Backend */}
            <div className="flex items-center justify-between">
              <span className="text-[#332A22] font-medium">FastAPI Backend Service:</span>
              <div className="flex items-center space-x-1.5">
                {backendStatus === 'online' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#356D2C]" />
                    <span className="text-[#356D2C] font-semibold text-xs">ONLINE (Port 8000)</span>
                  </>
                ) : backendStatus === 'checking' ? (
                  <span className="text-[#966E37] text-xs font-medium">Probing...</span>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-[#A8382F]" />
                    <span className="text-[#A8382F] font-semibold text-xs">LOCAL STORE (Offline)</span>
                  </>
                )}
              </div>
            </div>

            {/* Gemini API Status */}
            <div className="flex items-center justify-between">
              <span className="text-[#332A22] font-medium">Gemini Cognitive Engine:</span>
              <span className="font-semibold text-[#2A2016] text-xs">Flash 1.5 Grounded</span>
            </div>

            {/* Vector Memory */}
            <div className="flex items-center justify-between">
              <span className="text-[#332A22] font-medium">Vector Memory Store:</span>
              <span className="font-semibold text-[#2A2016] text-xs">ChromaDB / all-MiniLM-L6-v2</span>
            </div>

            {/* Database */}
            <div className="flex items-center justify-between">
              <span className="text-[#332A22] font-medium">Database Persistence:</span>
              <span className="font-semibold text-[#2A2016] text-xs">MongoDB Atlas & Local Store</span>
            </div>
          </div>

          {/* Ambient Sound Settings */}
          <div className="bg-[#BFAEA0]/40 p-4 rounded-xl border border-[#8F785C] space-y-3.5">
            <span className="font-bold text-[#574433] text-xs uppercase tracking-wider block">
              Atmospheric Audio (Web Audio API)
            </span>

            <div className="flex items-center justify-between">
              <span className="text-[#2A2016] font-medium">Ambient Rain & Room Tone:</span>
              <button
                onClick={handleToggleMute}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                  !isMuted
                    ? 'bg-[#35281D] text-[#E0B77D] shadow-sm'
                    : 'bg-[#B4473E]/20 text-[#852C25] border border-[#B4473E]/40'
                }`}
              >
                {!isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span>{!isMuted ? "Sound Active" : "Sound Muted"}</span>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-[#524131] mb-1 font-medium">
                <span>Ambient Volume:</span>
                <span>{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full accent-[#8F332B] h-2 bg-[#8F785C]/50 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Close Button */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg bg-[#2B2016] text-[#E0B77D] hover:bg-[#3D2D20] font-sans text-sm font-semibold shadow-md transition-colors"
            >
              Close Diagnostics
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
