import { hasProgress, loadProgress } from "@/lib/gameProgress";
import { useEffect, useState } from "react";
import { useAudio } from "@/lib/stores/useAudio";
import { useMobileDetect } from "@/lib/hooks/useMobileDetect";

interface MainMenuProps {
  onNewGame: () => void;
  onContinue: (level: number) => void;
  onLevelSelect: () => void;
}

export function MainMenu({ onNewGame, onContinue, onLevelSelect }: MainMenuProps) {
  const [savedProgress, setSavedProgress] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { isMuted, toggleMute, isMusicMuted, toggleMusicMute } = useAudio();
  const { isMobile } = useMobileDetect();
  
  // Track viewport dimensions for responsive layout (with SSR-safe defaults)
  const [viewport, setViewport] = useState({ width: 800, height: 600 });
  const isLandscape = viewport.width > viewport.height;
  const isSmallHeight = viewport.height < 500;
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

  useEffect(() => {
    const progress = loadProgress();
    if (progress && progress.currentLevel > 1) {
      setSavedProgress(progress.currentLevel);
    }
  }, []);

  // Responsive sizing based on viewport
  const titleSize = isSmallHeight ? 'text-2xl' : (isMobileLandscape ? 'text-3xl' : 'text-5xl');
  const buttonPadding = isSmallHeight ? 'py-2 px-4' : 'py-3 px-6';
  const buttonText = isSmallHeight ? 'text-sm' : 'text-base';

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto overflow-auto">
      <div 
        className="bg-black bg-opacity-90 min-h-full w-full flex flex-col items-center"
        style={{ 
          padding: isSmallHeight ? '8px 16px' : '24px 16px',
          justifyContent: isSmallHeight ? 'flex-start' : 'center',
          minHeight: '100%'
        }}
      >
        <h1 className={`font-bold text-yellow-400 font-mono ${titleSize} mb-2 md:mb-4`}>
          FLAPPY SNAKE
        </h1>
        
        <div className={`text-white text-center mb-3 md:mb-6 ${isSmallHeight ? 'text-xs' : 'text-sm md:text-base'}`}>
          <p>{isMobile ? 'Tap to Control' : 'Use Arrow Keys to Control'}</p>
          <p>Eat Bugs to Grow • Avoid Obstacles</p>
        </div>

        {/* Responsive button layout - horizontal for landscape/small height, vertical otherwise */}
        {(isMobileLandscape || isSmallHeight) ? (
          <div className="flex flex-wrap justify-center gap-2 px-2 max-w-full">
            <button
              onClick={onNewGame}
              className={`bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg font-mono transition-colors ${buttonPadding} ${buttonText}`}
              style={{ minWidth: '110px' }}
            >
              NEW GAME
            </button>
            
            {savedProgress && (
              <button
                onClick={() => onContinue(savedProgress)}
                className={`bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg font-mono transition-colors ${buttonPadding} ${buttonText}`}
                style={{ minWidth: '110px' }}
              >
                CONTINUE (L{savedProgress})
              </button>
            )}
            
            <button
              onClick={onLevelSelect}
              className={`bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg font-mono transition-colors ${buttonPadding} ${buttonText}`}
              style={{ minWidth: '110px' }}
            >
              SELECT LEVEL
            </button>
            
            <button
              onClick={() => setShowSettings(true)}
              className={`bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg font-mono transition-colors ${buttonPadding} ${buttonText}`}
              style={{ minWidth: '90px' }}
            >
              SETTINGS
            </button>
          </div>
        ) : (
          /* Desktop/portrait: vertical button layout */
          <div className="flex flex-col gap-3 w-72 max-w-[90vw]">
            <button
              onClick={onNewGame}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg text-lg font-mono transition-colors"
            >
              NEW GAME
            </button>
            
            {savedProgress && (
              <button
                onClick={() => onContinue(savedProgress)}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg text-lg font-mono transition-colors"
              >
                CONTINUE (Level {savedProgress})
              </button>
            )}
            
            <button
              onClick={onLevelSelect}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg text-lg font-mono transition-colors"
            >
              SELECT LEVEL
            </button>
            
            <button
              onClick={() => setShowSettings(true)}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg text-lg font-mono transition-colors"
            >
              SETTINGS
            </button>
          </div>
        )}
      </div>
      
      {/* Settings modal - responsive */}
      {showSettings && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black bg-opacity-80 p-4 overflow-auto">
          <div 
            className="bg-gray-900 border-4 border-yellow-400 rounded-xl w-full max-w-sm"
            style={{ padding: isSmallHeight ? '16px' : '32px' }}
          >
            <h2 className={`font-bold text-yellow-400 font-mono text-center ${isSmallHeight ? 'text-xl mb-3' : 'text-3xl mb-6'}`}>
              SETTINGS
            </h2>
            
            <div className={isSmallHeight ? 'space-y-3' : 'space-y-6'}>
              <div className="flex items-center justify-between">
                <span className={`text-white font-mono ${isSmallHeight ? 'text-sm' : 'text-lg'}`}>Sound Effects</span>
                <button
                  onClick={toggleMute}
                  className={`rounded-lg font-bold font-mono transition-colors ${isSmallHeight ? 'px-4 py-1 text-sm' : 'px-6 py-2'} ${
                    isMuted 
                      ? "bg-red-600 hover:bg-red-700 text-white" 
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  {isMuted ? "OFF" : "ON"}
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <span className={`text-white font-mono ${isSmallHeight ? 'text-sm' : 'text-lg'}`}>Music</span>
                <button
                  onClick={toggleMusicMute}
                  className={`rounded-lg font-bold font-mono transition-colors ${isSmallHeight ? 'px-4 py-1 text-sm' : 'px-6 py-2'} ${
                    isMusicMuted 
                      ? "bg-red-600 hover:bg-red-700 text-white" 
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  {isMusicMuted ? "OFF" : "ON"}
                </button>
              </div>
            </div>
            
            <button
              onClick={() => setShowSettings(false)}
              className={`w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg font-mono transition-colors ${isSmallHeight ? 'mt-4 py-2 text-base' : 'mt-8 py-3 text-xl'}`}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
