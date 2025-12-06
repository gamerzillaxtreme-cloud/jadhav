import { WORLDS, getWorldForLevel } from "@/lib/config/worldConfig";
import { useEffect, useState } from "react";
import { useMobileDetect } from "@/lib/hooks/useMobileDetect";

interface LevelSelectProps {
  onSelectLevel: (level: number) => void;
  onBack: () => void;
}

export function LevelSelect({ onSelectLevel, onBack }: LevelSelectProps) {
  const worldOrder = ['forest', 'rocky', 'desert', 'ice', 'neon'];
  const { isMobile } = useMobileDetect();
  
  // Track viewport for responsive layout (with SSR-safe defaults)
  const [viewport, setViewport] = useState({ width: 800, height: 600 });
  const isLandscape = viewport.width > viewport.height;
  const isSmallHeight = viewport.height < 450;
  const isVerySmallHeight = viewport.height < 350;
  const isMobileLandscape = isMobile && isLandscape;
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const updateViewport = () => {
      const vp = window.visualViewport;
      setViewport({
        width: vp?.width ?? window.innerWidth,
        height: vp?.height ?? window.innerHeight
      });
    };
    
    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', () => setTimeout(updateViewport, 100));
    window.visualViewport?.addEventListener('resize', updateViewport);
    
    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      window.visualViewport?.removeEventListener('resize', updateViewport);
    };
  }, []);
  
  // Responsive grid columns - more columns on wider screens
  const getGridCols = () => {
    if (isVerySmallHeight) return 'grid-cols-10';
    if (isSmallHeight) return 'grid-cols-10';
    if (viewport.width < 400) return 'grid-cols-5';
    if (viewport.width < 600) return 'grid-cols-5';
    return 'grid-cols-10';
  };
  
  return (
    <div className="fixed inset-0 z-50 pointer-events-auto overflow-auto">
      <div 
        className="bg-black bg-opacity-95 min-h-full w-full flex flex-col items-center"
        style={{ 
          padding: isSmallHeight ? '8px 8px 16px' : '24px 16px',
        }}
      >
        <h1 className={`font-bold text-yellow-400 font-mono ${isSmallHeight ? 'text-xl mb-2' : 'text-4xl mb-4'}`}>
          SELECT LEVEL
        </h1>
        
        <button
          onClick={onBack}
          className={`text-gray-400 hover:text-white font-mono ${isSmallHeight ? 'text-xs mb-2' : 'text-sm mb-4'}`}
        >
          ← Back to Menu
        </button>
        
        <div className="w-full max-w-4xl px-2 md:px-4 space-y-3 md:space-y-6">
          {worldOrder.map((worldId) => {
            const world = WORLDS[worldId];
            const [startLevel, endLevel] = world.levelRange;
            const levels = [];
            for (let i = startLevel; i <= endLevel; i++) {
              levels.push(i);
            }
            
            return (
              <div 
                key={worldId} 
                className="bg-gray-900 rounded-lg"
                style={{ padding: isSmallHeight ? '8px' : '16px' }}
              >
                <div className={`flex items-center gap-2 ${isSmallHeight ? 'mb-1' : 'mb-3'}`}>
                  <div 
                    className={`rounded-full ${isSmallHeight ? 'w-3 h-3' : 'w-4 h-4'}`}
                    style={{ 
                      background: world.theme.pipeColor,
                      boxShadow: `0 0 10px ${world.theme.pipeColor}`
                    }}
                  />
                  <h2 
                    className={`font-bold font-mono ${isSmallHeight ? 'text-sm' : 'text-xl'}`} 
                    style={{ color: world.theme.pipeColor }}
                  >
                    {world.name}
                  </h2>
                  <span className={`text-gray-500 font-mono ${isSmallHeight ? 'text-xs' : 'text-sm'}`}>
                    L{startLevel}-{endLevel}
                  </span>
                </div>
                
                {!isVerySmallHeight && (
                  <p className={`text-gray-400 font-mono ${isSmallHeight ? 'text-xs mb-2' : 'text-sm mb-3'}`}>
                    {world.description}
                  </p>
                )}
                
                <div className={`grid ${getGridCols()} ${isSmallHeight ? 'gap-1' : 'gap-2'}`}>
                  {levels.map((level) => {
                    const isFirstOfWorld = level === startLevel;
                    
                    return (
                      <button
                        key={level}
                        onClick={() => onSelectLevel(level)}
                        className={`
                          aspect-square rounded font-mono font-bold
                          transition-all duration-150 hover:scale-105 active:scale-95
                          ${isSmallHeight ? 'text-xs rounded-md' : 'text-sm rounded-lg'}
                          ${isFirstOfWorld 
                            ? 'bg-yellow-500 hover:bg-yellow-400 text-black ring-2 ring-yellow-300' 
                            : 'bg-gray-700 hover:bg-gray-600 text-white'
                          }
                        `}
                        title={`Level ${level} - ${world.name}`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
                
                {!isSmallHeight && (
                  <div className="mt-2 flex flex-wrap gap-1 md:gap-2 text-xs text-gray-500 font-mono">
                    {world.mechanics.hasMovingPipes && <span className="bg-gray-800 px-2 py-1 rounded">Moving</span>}
                    {world.mechanics.hasSlidingPipes && <span className="bg-gray-800 px-2 py-1 rounded">Sliding</span>}
                    {world.mechanics.hasRotatingObstacles && <span className="bg-gray-800 px-2 py-1 rounded">Rotating</span>}
                    {world.mechanics.hasFallingRocks && <span className="bg-gray-800 px-2 py-1 rounded">Falling</span>}
                    {world.mechanics.hasEnemies && <span className="bg-gray-800 px-2 py-1 rounded">Enemies</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className={`text-gray-500 font-mono text-center ${isSmallHeight ? 'mt-2 text-xs' : 'mt-6 text-xs'}`}>
          50 Levels across 5 Worlds
        </div>
      </div>
    </div>
  );
}
