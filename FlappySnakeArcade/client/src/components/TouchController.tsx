import React, { useEffect, useRef, useCallback, useState } from 'react';

interface TouchControllerProps {
  onFlap: () => void;
  onMoveUp: (active: boolean) => void;
  onMoveDown: (active: boolean) => void;
  onMoveLeft?: (active: boolean) => void;
  onMoveRight?: (active: boolean) => void;
  canvasWidth: number;
  canvasHeight: number;
  enabled: boolean;
  showControls: boolean;
}

export function TouchController({
  onFlap,
  onMoveUp,
  onMoveDown,
  onMoveLeft,
  onMoveRight,
  canvasWidth,
  canvasHeight,
  enabled,
  showControls,
}: TouchControllerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeButtons, setActiveButtons] = useState<Set<string>>(new Set());
  const [showTapFeedback, setShowTapFeedback] = useState(false);
  const [tapPosition, setTapPosition] = useState({ x: 0, y: 0 });
  const lastFlapTime = useRef(0);
  const controlsOpacity = useRef(1);
  const fadeTimeout = useRef<NodeJS.Timeout | null>(null);
  const activeTouch = useRef<Map<number, string>>(new Map());

  const FLAP_COOLDOWN = 100;
  const DPAD_SIZE = 140;
  const BUTTON_SIZE = 50;
  const DPAD_MARGIN = 20;
  const DPAD_X = canvasWidth - DPAD_SIZE - DPAD_MARGIN;
  const DPAD_Y = canvasHeight - DPAD_SIZE - DPAD_MARGIN - 40;
  const DPAD_CENTER_X = DPAD_X + DPAD_SIZE / 2;
  const DPAD_CENTER_Y = DPAD_Y + DPAD_SIZE / 2;

  const resetFadeTimer = useCallback(() => {
    controlsOpacity.current = 1;
    if (fadeTimeout.current) {
      clearTimeout(fadeTimeout.current);
    }
    fadeTimeout.current = setTimeout(() => {
      controlsOpacity.current = 0.6;
    }, 3000);
  }, []);

  const getButtonAt = (x: number, y: number): string | null => {
    const dx = x - DPAD_CENTER_X;
    const dy = y - DPAD_CENTER_Y;
    const upY = DPAD_CENTER_Y - BUTTON_SIZE - 5;
    const downY = DPAD_CENTER_Y + 5;
    const leftX = DPAD_CENTER_X - BUTTON_SIZE - 5;
    const rightX = DPAD_CENTER_X + 5;
    if (x >= DPAD_CENTER_X - BUTTON_SIZE / 2 && x <= DPAD_CENTER_X + BUTTON_SIZE / 2 &&
        y >= upY && y <= upY + BUTTON_SIZE) {
      return 'up';
    }
    if (x >= DPAD_CENTER_X - BUTTON_SIZE / 2 && x <= DPAD_CENTER_X + BUTTON_SIZE / 2 &&
        y >= downY && y <= downY + BUTTON_SIZE) {
      return 'down';
    }
    if (x >= leftX && x <= leftX + BUTTON_SIZE &&
        y >= DPAD_CENTER_Y - BUTTON_SIZE / 2 && y <= DPAD_CENTER_Y + BUTTON_SIZE / 2) {
      return 'left';
    }
    if (x >= rightX && x <= rightX + BUTTON_SIZE &&
        y >= DPAD_CENTER_Y - BUTTON_SIZE / 2 && y <= DPAD_CENTER_Y + BUTTON_SIZE / 2) {
      return 'right';
    }
    return null;
  };

  const activateButton = (button: string) => {
    setActiveButtons(prev => {
      const next = new Set(Array.from(prev));
      next.add(button);
      return next;
    });
    if (button === 'up') onMoveUp(true);
    if (button === 'down') onMoveDown(true);
    if (button === 'left' && onMoveLeft) onMoveLeft(true);
    if (button === 'right' && onMoveRight) onMoveRight(true);
  };

  const deactivateButton = (button: string) => {
    setActiveButtons(prev => {
      const next = new Set(Array.from(prev));
      next.delete(button);
      return next;
    });
    if (button === 'up') onMoveUp(false);
    if (button === 'down') onMoveDown(false);
    if (button === 'left' && onMoveLeft) onMoveLeft(false);
    if (button === 'right' && onMoveRight) onMoveRight(false);
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    e.preventDefault();
    resetFadeTimer();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const x = (touch.clientX - rect.left) / rect.width * canvasWidth;
      const y = (touch.clientY - rect.top) / rect.height * canvasHeight;

      const button = getButtonAt(x, y);
      if (button) {
        activeTouch.current.set(touch.identifier, button);
        activateButton(button);
      } else {
        const now = Date.now();
        if (now - lastFlapTime.current > FLAP_COOLDOWN) {
          onFlap();
          lastFlapTime.current = now;
          setTapPosition({ x, y });
          setShowTapFeedback(true);
          setTimeout(() => setShowTapFeedback(false), 150);
        }
      }
    }
  }, [enabled, onFlap, canvasWidth, canvasHeight, resetFadeTimer]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    e.preventDefault();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const x = (touch.clientX - rect.left) / rect.width * canvasWidth;
      const y = (touch.clientY - rect.top) / rect.height * canvasHeight;

      const currentButton = activeTouch.current.get(touch.identifier);
      const newButton = getButtonAt(x, y);

      if (currentButton && currentButton !== newButton) {
        deactivateButton(currentButton);
        activeTouch.current.delete(touch.identifier);
      }
      if (newButton && newButton !== currentButton) {
        activeTouch.current.set(touch.identifier, newButton);
        activateButton(newButton);
      }
    }
  }, [enabled, canvasWidth, canvasHeight]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const button = activeTouch.current.get(touch.identifier);
      if (button) {
        deactivateButton(button);
        activeTouch.current.delete(touch.identifier);
      }
    }
  }, [enabled]);

  // Cleanup function to deactivate all active buttons
  const deactivateAllButtons = useCallback(() => {
    activeTouch.current.forEach((button) => {
      if (button === 'up') onMoveUp(false);
      if (button === 'down') onMoveDown(false);
      if (button === 'left' && onMoveLeft) onMoveLeft(false);
      if (button === 'right' && onMoveRight) onMoveRight(false);
    });
    activeTouch.current.clear();
    setActiveButtons(new Set());
    console.log("[TOUCH DEBUG] Deactivated all buttons");
  }, [onMoveUp, onMoveDown, onMoveLeft, onMoveRight]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const options: AddEventListenerOptions = { passive: false };
    
    container.addEventListener('touchstart', handleTouchStart, options);
    container.addEventListener('touchmove', handleTouchMove, options);
    container.addEventListener('touchend', handleTouchEnd, options);
    container.addEventListener('touchcancel', handleTouchEnd, options);
    
    // Also add window-level listeners as safety net for touches that end outside container
    window.addEventListener('touchend', handleTouchEnd, options);
    window.addEventListener('touchcancel', handleTouchEnd, options);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      // Deactivate all buttons when unmounting
      deactivateAllButtons();
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, deactivateAllButtons]);
  
  // Also deactivate all buttons when enabled changes to false
  useEffect(() => {
    if (!enabled) {
      deactivateAllButtons();
    }
  }, [enabled, deactivateAllButtons]);

  useEffect(() => {
    return () => {
      if (fadeTimeout.current) {
        clearTimeout(fadeTimeout.current);
      }
    };
  }, []);

  if (!showControls) return null;

  const upY = DPAD_CENTER_Y - BUTTON_SIZE - 5;
  const downY = DPAD_CENTER_Y + 5;
  const leftX = DPAD_CENTER_X - BUTTON_SIZE - 5;
  const rightX = DPAD_CENTER_X + 5;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        pointerEvents: enabled ? 'auto' : 'none',
        zIndex: 1000,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <defs>
          <linearGradient id="buttonGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
          </linearGradient>
          <linearGradient id="activeButtonGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(100,200,255,0.8)" />
            <stop offset="100%" stopColor="rgba(100,200,255,0.4)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <rect
          x={DPAD_X - 10}
          y={DPAD_Y - 10}
          width={DPAD_SIZE + 20}
          height={DPAD_SIZE + 20}
          rx={15}
          fill="rgba(0, 0, 0, 0.3)"
          opacity={controlsOpacity.current}
        />

        <rect
          x={DPAD_CENTER_X - BUTTON_SIZE / 2}
          y={upY}
          width={BUTTON_SIZE}
          height={BUTTON_SIZE}
          rx={8}
          fill={activeButtons.has('up') ? "url(#activeButtonGradient)" : "url(#buttonGradient)"}
          stroke={activeButtons.has('up') ? "rgba(100,200,255,0.9)" : "rgba(255,255,255,0.5)"}
          strokeWidth={2}
          filter={activeButtons.has('up') ? "url(#glow)" : undefined}
          opacity={controlsOpacity.current}
        />
        <text
          x={DPAD_CENTER_X}
          y={upY + BUTTON_SIZE / 2 + 6}
          textAnchor="middle"
          fill="white"
          fontSize="20"
          fontFamily="Arial"
          fontWeight="bold"
          opacity={controlsOpacity.current}
        >
          ▲
        </text>

        <rect
          x={DPAD_CENTER_X - BUTTON_SIZE / 2}
          y={downY}
          width={BUTTON_SIZE}
          height={BUTTON_SIZE}
          rx={8}
          fill={activeButtons.has('down') ? "url(#activeButtonGradient)" : "url(#buttonGradient)"}
          stroke={activeButtons.has('down') ? "rgba(100,200,255,0.9)" : "rgba(255,255,255,0.5)"}
          strokeWidth={2}
          filter={activeButtons.has('down') ? "url(#glow)" : undefined}
          opacity={controlsOpacity.current}
        />
        <text
          x={DPAD_CENTER_X}
          y={downY + BUTTON_SIZE / 2 + 6}
          textAnchor="middle"
          fill="white"
          fontSize="20"
          fontFamily="Arial"
          fontWeight="bold"
          opacity={controlsOpacity.current}
        >
          ▼
        </text>

        <rect
          x={leftX}
          y={DPAD_CENTER_Y - BUTTON_SIZE / 2}
          width={BUTTON_SIZE}
          height={BUTTON_SIZE}
          rx={8}
          fill={activeButtons.has('left') ? "url(#activeButtonGradient)" : "url(#buttonGradient)"}
          stroke={activeButtons.has('left') ? "rgba(100,200,255,0.9)" : "rgba(255,255,255,0.5)"}
          strokeWidth={2}
          filter={activeButtons.has('left') ? "url(#glow)" : undefined}
          opacity={controlsOpacity.current}
        />
        <text
          x={leftX + BUTTON_SIZE / 2}
          y={DPAD_CENTER_Y + 6}
          textAnchor="middle"
          fill="white"
          fontSize="20"
          fontFamily="Arial"
          fontWeight="bold"
          opacity={controlsOpacity.current}
        >
          ◀
        </text>

        <rect
          x={rightX}
          y={DPAD_CENTER_Y - BUTTON_SIZE / 2}
          width={BUTTON_SIZE}
          height={BUTTON_SIZE}
          rx={8}
          fill={activeButtons.has('right') ? "url(#activeButtonGradient)" : "url(#buttonGradient)"}
          stroke={activeButtons.has('right') ? "rgba(100,200,255,0.9)" : "rgba(255,255,255,0.5)"}
          strokeWidth={2}
          filter={activeButtons.has('right') ? "url(#glow)" : undefined}
          opacity={controlsOpacity.current}
        />
        <text
          x={rightX + BUTTON_SIZE / 2}
          y={DPAD_CENTER_Y + 6}
          textAnchor="middle"
          fill="white"
          fontSize="20"
          fontFamily="Arial"
          fontWeight="bold"
          opacity={controlsOpacity.current}
        >
          ▶
        </text>

        <text
          x={DPAD_CENTER_X}
          y={DPAD_Y + DPAD_SIZE + 25}
          textAnchor="middle"
          fill="rgba(255, 255, 255, 0.6)"
          fontSize="11"
          fontFamily="Arial"
          opacity={controlsOpacity.current}
        >
          MOVE
        </text>

        <text
          x={canvasWidth / 2}
          y={canvasHeight - 20}
          textAnchor="middle"
          fill="rgba(255, 255, 255, 0.4)"
          fontSize="14"
          fontFamily="Arial"
          opacity={controlsOpacity.current}
        >
          TAP ANYWHERE TO FLAP
        </text>

        {showTapFeedback && (
          <circle
            cx={tapPosition.x}
            cy={tapPosition.y}
            r={30}
            fill="none"
            stroke="rgba(255, 215, 0, 0.8)"
            strokeWidth={3}
            filter="url(#glow)"
          >
            <animate
              attributeName="r"
              from="20"
              to="50"
              dur="0.15s"
              fill="freeze"
            />
            <animate
              attributeName="opacity"
              from="1"
              to="0"
              dur="0.15s"
              fill="freeze"
            />
          </circle>
        )}
      </svg>
    </div>
  );
}
