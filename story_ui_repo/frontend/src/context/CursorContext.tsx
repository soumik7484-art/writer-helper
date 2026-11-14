import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type CursorType = 'default' | 'pointer' | 'text' | 'disabled' | 'loading' | 'drag' | 'hidden';

export interface CursorRipple {
  id: number;
  x: number;
  y: number;
}

export interface CursorParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  maxLife: number;
  life: number;
}

interface CursorContextType {
  cursorType: CursorType;
  setCursorType: (type: CursorType) => void;
  overrideCursor: (type: CursorType | null) => void;
  triggerRipple: (x: number, y: number) => void;
  triggerSparkles: (x: number, y: number, count?: number) => void;
}

const CursorContext = createContext<CursorContextType | undefined>(undefined);

export const CursorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cursorType, setCursorTypeState] = useState<CursorType>('default');
  const overrideRef = useRef<CursorType | null>(null);

  const setCursorType = useCallback((type: CursorType) => {
    if (overrideRef.current !== null) return;
    setCursorTypeState(type);
  }, []);

  const overrideCursor = useCallback((type: CursorType | null) => {
    overrideRef.current = type;
    if (type !== null) {
      setCursorTypeState(type);
    } else {
      setCursorTypeState('default');
    }
  }, []);

  const triggerRipple = useCallback((x: number, y: number) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('storyweave-cursor-ripple', { detail: { x, y } }));
    }
  }, []);

  const triggerSparkles = useCallback((x: number, y: number, count = 6) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('storyweave-cursor-sparkles', { detail: { x, y, count } }));
    }
  }, []);

  return (
    <CursorContext.Provider
      value={{
        cursorType,
        setCursorType,
        overrideCursor,
        triggerRipple,
        triggerSparkles,
      }}
    >
      {children}
    </CursorContext.Provider>
  );
};

export const useCursor = (): CursorContextType => {
  const context = useContext(CursorContext);
  if (!context) {
    throw new Error('useCursor must be used within a CursorProvider');
  }
  return context;
};
