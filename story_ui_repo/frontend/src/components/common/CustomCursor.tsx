import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useCursor, CursorType } from '../../context/CursorContext';
import { CURSOR_PEN_SRC, CURSOR_HAND_SRC } from '../../assets/cursorAssetsBase64';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  maxLife: number;
  life: number;
  color: string;
}

interface InkRipple {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  birth: number;
}

export const CustomCursor: React.FC = () => {
  const { cursorType, setCursorType } = useCursor();

  // References for direct 60-120fps animation without re-renders
  const cursorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mouse & physics tracking
  const posRef = useRef({ x: -100, y: -100 });
  const renderPosRef = useRef({ x: -100, y: -100 });
  const velRef = useRef({ vx: 0, vy: 0 });
  const tiltRef = useRef(0);
  const isPressedRef = useRef(false);
  const isVisibleRef = useRef(false);
  const isTouchDeviceRef = useRef(false);

  // Local state for React-controlled visuals
  const [activeType, setActiveType] = useState<CursorType>(cursorType);
  const [isVisible, setIsVisible] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  // Particles and ripples
  const particlesRef = useRef<Particle[]>([]);
  const ripplesRef = useRef<InkRipple[]>([]);
  const lastTrailSpawnRef = useRef(0);
  const nextRippleId = useRef(1);

  // Sync activeType with context
  useEffect(() => {
    setActiveType(cursorType);
  }, [cursorType]);

  // Touch and coarse pointer detection
  useEffect(() => {
    const checkTouch = () => {
      const isCoarse = window.matchMedia('(pointer: coarse)').matches;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const touchOnly = isCoarse && hasTouch;
      setIsTouch(touchOnly);
      isTouchDeviceRef.current = touchOnly;
      if (!touchOnly) {
        document.documentElement.classList.add('custom-cursor-enabled');
      } else {
        document.documentElement.classList.remove('custom-cursor-enabled');
      }
    };

    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => {
      window.removeEventListener('resize', checkTouch);
      document.documentElement.classList.remove('custom-cursor-enabled');
    };
  }, []);

  // Spawn click burst / ink sparkles
  const spawnClickParticles = useCallback((x: number, y: number, count = 8) => {
    const newParticles: Particle[] = [];
    const colors = ['#F5E1A4', '#E0B77D', '#C49A61', '#FFF4D0', '#5B3A1E'];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 1.0 + Math.random() * 2.2;
      const color = colors[Math.floor(Math.random() * colors.length)];
      newParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.4,
        size: 1.6 + Math.random() * 1.8,
        alpha: 0.9,
        maxLife: 28 + Math.floor(Math.random() * 16),
        life: 0,
        color,
      });
    }

    particlesRef.current = [...particlesRef.current.slice(-20), ...newParticles];
  }, []);

  // Spawn movement trail particle (very subtle trailing ink / gold ember)
  const spawnTrailParticle = useCallback((x: number, y: number) => {
    if (particlesRef.current.length > 15) return;
    const colors = ['#E0B77D', '#C49A61', '#8C6F48'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    particlesRef.current.push({
      x: x + (Math.random() - 0.5) * 3,
      y: y + (Math.random() - 0.5) * 3,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4 - 0.2,
      size: 1.2 + Math.random() * 1.2,
      alpha: 0.65,
      maxLife: 14 + Math.floor(Math.random() * 8),
      life: 0,
      color,
    });
  }, []);

  // Spawn ink ripple on click
  const spawnRipple = useCallback((x: number, y: number) => {
    const newRipple: InkRipple = {
      id: nextRippleId.current++,
      x,
      y,
      radius: 3,
      maxRadius: 28,
      alpha: 0.8,
      birth: Date.now(),
    };
    ripplesRef.current = [...ripplesRef.current.slice(-5), newRipple];
  }, []);

  // Custom Event Listeners
  useEffect(() => {
    const handleCustomRipple = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.x === 'number' && typeof detail.y === 'number') {
        spawnRipple(detail.x, detail.y);
      }
    };

    const handleCustomSparkles = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.x === 'number' && typeof detail.y === 'number') {
        spawnClickParticles(detail.x, detail.y, detail.count || 6);
      }
    };

    window.addEventListener('storyweave-cursor-ripple', handleCustomRipple);
    window.addEventListener('storyweave-cursor-sparkles', handleCustomSparkles);
    return () => {
      window.removeEventListener('storyweave-cursor-ripple', handleCustomRipple);
      window.removeEventListener('storyweave-cursor-sparkles', handleCustomSparkles);
    };
  }, [spawnRipple, spawnClickParticles]);

  // Main interaction detection & pointer events
  useEffect(() => {
    if (isTouchDeviceRef.current) return;

    let targetElement: Element | null = null;

    const findCursorType = (el: Element | null): CursorType => {
      if (!el) return 'default';

      // 1. Check explicit data-cursor attribute
      const explicit = el.closest('[data-cursor]');
      if (explicit) {
        const val = explicit.getAttribute('data-cursor') as CursorType;
        if (val) return val;
      }

      // 2. Check disabled states
      const disabledEl = el.closest('button:disabled, input:disabled, select:disabled, [aria-disabled="true"], .cursor-not-allowed');
      if (disabledEl) return 'disabled';

      // 3. Check drag states
      const dragEl = el.closest('.cursor-grab, .cursor-grabbing, [draggable="true"]');
      if (dragEl) return 'drag';

      // 4. Check text input / editor areas -> hide custom cursor so native text selection is preserved!
      const isTextInput = el.closest('input[type="text"], input[type="search"], textarea, [contenteditable="true"], .parchment-sheet');
      if (isTextInput) return 'text';

      // 5. Check clickable elements -> transform into Golden Pointing Hand!
      const clickable = el.closest(
        'button, a, select, input[type="submit"], input[type="button"], input[type="checkbox"], input[type="radio"], [role="button"], [role="tab"], [role="menuitem"], .cursor-pointer, [onclick]'
      );
      if (clickable) return 'pointer';

      // 6. Inspect computed style as fallback
      try {
        const computed = window.getComputedStyle(el);
        if (computed.cursor === 'pointer') return 'pointer';
        if (computed.cursor === 'not-allowed') return 'disabled';
        if (computed.cursor === 'grab' || computed.cursor === 'grabbing') return 'drag';
      } catch {}

      return 'default';
    };

    const handlePointerMove = (e: PointerEvent) => {
      posRef.current.x = e.clientX;
      posRef.current.y = e.clientY;

      if (!isVisibleRef.current) {
        isVisibleRef.current = true;
        setIsVisible(true);
        renderPosRef.current.x = e.clientX;
        renderPosRef.current.y = e.clientY;
      }

      // Detect element underneath
      const currentTarget = document.elementFromPoint(e.clientX, e.clientY);
      if (currentTarget !== targetElement) {
        targetElement = currentTarget;
        const newType = findCursorType(currentTarget);
        setCursorType(newType);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isPressedRef.current = true;

      // Trigger ink ripple and nib sparkles
      spawnRipple(e.clientX, e.clientY);
      spawnClickParticles(e.clientX, e.clientY, 6);
    };

    const handleMouseUp = () => {
      isPressedRef.current = false;
    };

    const handleMouseLeave = () => {
      isVisibleRef.current = false;
      setIsVisible(false);
    };

    const handleMouseEnter = (e: MouseEvent) => {
      isVisibleRef.current = true;
      setIsVisible(true);
      posRef.current.x = e.clientX;
      posRef.current.y = e.clientY;
      renderPosRef.current.x = e.clientX;
      renderPosRef.current.y = e.clientY;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [setCursorType, spawnRipple, spawnClickParticles]);

  // Canvas size handling
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Animation Loop (High-Performance 60-120fps)
  useEffect(() => {
    if (isTouchDeviceRef.current) return;

    let animId: number;
    let prevX = renderPosRef.current.x;
    let prevY = renderPosRef.current.y;
    let restingAngle = 0;

    const render = () => {
      // 1. Physics interpolation for smooth following
      const targetX = posRef.current.x;
      const targetY = posRef.current.y;

      const dx = targetX - renderPosRef.current.x;
      const dy = targetY - renderPosRef.current.y;

      // Lerp for natural smooth motion
      renderPosRef.current.x += dx * 0.45;
      renderPosRef.current.y += dy * 0.45;

      // Velocity calculation
      const vx = renderPosRef.current.x - prevX;
      const vy = renderPosRef.current.y - prevY;
      velRef.current = { vx, vy };
      prevX = renderPosRef.current.x;
      prevY = renderPosRef.current.y;

      const speed = Math.hypot(vx, vy);

      // Tilt based on horizontal motion
      const targetTilt = Math.max(-14, Math.min(14, vx * 0.4));
      tiltRef.current += (targetTilt - tiltRef.current) * 0.16;

      // Particle trail generation during quick movement
      const now = Date.now();
      if (speed > 6.0 && now - lastTrailSpawnRef.current > 40) {
        spawnTrailParticle(renderPosRef.current.x, renderPosRef.current.y);
        lastTrailSpawnRef.current = now;
      }

      // Idle breathing when stationary
      if (speed < 0.2) {
        const time = now * 0.0025;
        restingAngle = Math.sin(time) * 1.2;
      } else {
        restingAngle = 0;
      }

      // 2. Direct DOM transform on cursor container
      if (cursorRef.current && isVisibleRef.current) {
        const totalTilt = tiltRef.current + restingAngle;
        const pressScale = isPressedRef.current ? 0.88 : 1.0;
        const pressY = isPressedRef.current ? 2 : 0;

        cursorRef.current.style.transform = `translate3d(${renderPosRef.current.x}px, ${renderPosRef.current.y + pressY}px, 0px) rotate(${totalTilt}deg) scale(${pressScale})`;
      }

      // 3. Canvas render for ink ripples and sparks
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Render Ripples
          if (ripplesRef.current.length > 0) {
            ripplesRef.current = ripplesRef.current.filter((r) => {
              r.radius += 1.4;
              r.alpha *= 0.93;

              if (r.alpha > 0.03 && r.radius < r.maxRadius) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(224, 183, 125, ${r.alpha})`;
                ctx.lineWidth = 1.4;
                ctx.shadowColor = 'rgba(244, 237, 226, 0.5)';
                ctx.shadowBlur = 5;
                ctx.stroke();

                // Inner ink halo
                ctx.beginPath();
                ctx.arc(r.x, r.y, r.radius * 0.6, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(180, 130, 75, ${r.alpha * 0.65})`;
                ctx.lineWidth = 0.9;
                ctx.stroke();

                ctx.restore();
                return true;
              }
              return false;
            });
          }

          // Render Particles
          if (particlesRef.current.length > 0) {
            particlesRef.current = particlesRef.current.filter((p) => {
              p.x += p.vx;
              p.y += p.vy;
              p.vx *= 0.94;
              p.vy *= 0.94;
              p.life += 1;
              const progress = p.life / p.maxLife;
              const currentAlpha = Math.max(0, p.alpha * (1 - progress));
              const currentSize = Math.max(0.5, p.size * (1 - progress * 0.4));

              if (progress < 1 && currentAlpha > 0.02) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = currentAlpha;
                ctx.shadowColor = 'rgba(255, 230, 160, 0.7)';
                ctx.shadowBlur = 3;
                ctx.fill();
                ctx.restore();
                return true;
              }
              return false;
            });
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [spawnTrailParticle]);

  // Touch screens: Do not display desktop custom cursor
  if (isTouch) {
    return null;
  }

  // Determine state flags
  const isPointerState = activeType === 'pointer';
  const isLoadingState = activeType === 'loading';
  const isDisabledState = activeType === 'disabled';
  const isTextState = activeType === 'text';

  return (
    <>
      {/* Background Interactive Canvas for Ink Ripples & Sparks */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-[999998]"
        style={{ width: '100vw', height: '100vh' }}
      />

      {/* Primary Custom Cursor Root */}
      <div
        ref={cursorRef}
        className={`fixed top-0 left-0 pointer-events-none z-[999999] will-change-transform transition-opacity duration-150 ${
          isVisible && !isTextState && activeType !== 'hidden' ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          transform: 'translate3d(-100px, -100px, 0px)',
        }}
      >
        {/* Hotspot Alignment Anchor */}
        <div className="relative select-none">
          {/* STATE 1: POINTER CURSOR — GOLDEN POINTING HAND (Image 1) */}
          <div
            className={`absolute top-0 left-0 transition-all duration-150 ease-out ${
              isPointerState
                ? 'opacity-100 scale-100 pointer-events-none'
                : 'opacity-0 scale-90 pointer-events-none'
            }`}
            style={{
              /* Hand hotspot is pointing fingertip: x=26.01%, y=1.25% */
              transform: 'translate(-26%, -1.25%)',
            }}
          >
            <div className="relative group">
              {/* Outer Golden Aura Glow */}
              <div
                className="absolute inset-0 rounded-full blur-[6px] pointer-events-none transition-opacity duration-200"
                style={{
                  background:
                    'radial-gradient(circle at 30% 15%, rgba(224, 183, 125, 0.7) 0%, rgba(196, 154, 97, 0.35) 60%, transparent 80%)',
                  transform: 'scale(1.2)',
                }}
              />

              {/* The Actual Uploaded Image: Golden Pointing Hand with Burgundy Cuff & Fleur-de-Lis */}
              <img
                src={CURSOR_HAND_SRC}
                alt="Pointer Cursor - Golden Hand"
                draggable={false}
                className="relative z-10 w-[28px] sm:w-[30px] h-auto object-contain select-none"
                style={{
                  filter:
                    'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.85)) drop-shadow(0 0 7px rgba(224, 183, 125, 0.6))',
                }}
              />

              {/* Fingertip Shimmer Spark */}
              <div className="absolute top-0 left-[26%] w-1.5 h-1.5 bg-[#FFF4D0] rounded-full blur-[0.5px] -translate-x-1/2 -translate-y-1/2 shadow-[0_0_5px_#FFE082]" />
            </div>
          </div>

          {/* STATE 2: DEFAULT CURSOR — GOLDEN FOUNTAIN PEN (Image 2) */}
          <div
            className={`absolute top-0 left-0 transition-all duration-150 ease-out ${
              !isPointerState
                ? 'opacity-100 scale-100 pointer-events-none'
                : 'opacity-0 scale-90 pointer-events-none'
            }`}
            style={{
              /* Fountain pen hotspot is the nib tip: x=5.96%, y=2.89% */
              transform: 'translate(-6%, -3%)',
            }}
          >
            <div className="relative group">
              {/* Subtle Golden Glow behind the Nib */}
              <div
                className={`absolute inset-0 rounded-full blur-[5px] pointer-events-none transition-opacity duration-200 ${
                  isDisabledState ? 'opacity-15' : 'opacity-50'
                }`}
                style={{
                  background:
                    'radial-gradient(circle at 10% 8%, rgba(224, 183, 125, 0.65) 0%, rgba(196, 154, 97, 0.3) 55%, transparent 75%)',
                  transform: 'scale(1.2)',
                }}
              />

              {/* The Actual Uploaded Image: Golden Fountain Pen Nib with Engravings & Burgundy Barrel */}
              <img
                src={CURSOR_PEN_SRC}
                alt="Default Cursor - Golden Fountain Pen"
                draggable={false}
                className={`relative z-10 w-[26px] sm:w-[28px] h-auto object-contain select-none transition-all duration-150 ${
                  isDisabledState
                    ? 'opacity-55 grayscale-[40%] contrast-90'
                    : ''
                }`}
                style={{
                  filter: isDisabledState
                    ? 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.85))'
                    : 'drop-shadow(0 2px 5px rgba(0, 0, 0, 0.85)) drop-shadow(0 0 6px rgba(224, 183, 125, 0.5))',
                }}
              />

              {/* Nib Tip Golden Sparkle */}
              <div
                className={`absolute top-0 left-[6%] w-1.5 h-1.5 bg-[#FFF4D0] rounded-full blur-[0.5px] -translate-x-1/2 -translate-y-1/2 shadow-[0_0_5px_#FFE082] transition-opacity duration-150 ${
                  isDisabledState ? 'opacity-0' : 'opacity-90'
                }`}
              />

              {/* LOADING SUB-STATE: Rotating Golden Circular Indicator */}
              {isLoadingState && (
                <div className="absolute top-[28%] left-[28%] -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                  <div className="w-5 h-5 rounded-full border-2 border-[#C49A61]/30 border-t-[#FFE299] border-r-[#E0B77D] animate-spin shadow-[0_0_6px_rgba(224,183,125,0.7)]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[8px] text-[#FFE299] font-serif animate-pulse">⏳</span>
                  </div>
                </div>
              )}

              {/* DISABLED / NOT ALLOWED SUB-STATE: Golden Prohibition Badge */}
              {isDisabledState && (
                <div className="absolute top-[32%] left-[32%] -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                  <div className="w-4 h-4 rounded-full border-2 border-[#C0392B] bg-[#1C1612]/85 shadow-[0_0_5px_rgba(192,57,43,0.7)] flex items-center justify-center relative">
                    <div className="w-3 h-[2px] bg-[#C0392B] -rotate-45" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
