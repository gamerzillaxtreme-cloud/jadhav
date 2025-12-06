import { useState, useEffect, useRef } from 'react';
import { useAds } from '@/lib/stores/useAds';
import { usePlatform } from '@/lib/hooks/usePlatform';

interface LevelCompleteOverlayProps {
  currentLevel: number;
  worldName: string;
  score: number;
  distance: number;
}

export function LevelCompleteOverlay({ 
  currentLevel, 
  worldName, 
  score, 
  distance 
}: LevelCompleteOverlayProps) {
  const { shouldShowLevelInterstitial, showInterstitialAd, incrementLevelsCompleted } = useAds();
  const platform = usePlatform();
  const [showingAd, setShowingAd] = useState(false);
  const [adCountdown, setAdCountdown] = useState(3);
  const hasTriggeredAd = useRef(false);

  useEffect(() => {
    incrementLevelsCompleted();
    
    if (!hasTriggeredAd.current && currentLevel > 1 && shouldShowLevelInterstitial()) {
      hasTriggeredAd.current = true;
      setShowingAd(true);
      setAdCountdown(3);
      
      const timer = setInterval(() => {
        setAdCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            showInterstitialAd(() => {
              setShowingAd(false);
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, []);

  if (showingAd) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-95 z-50">
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg shadow-2xl p-8 text-center max-w-md border-2 border-gray-600">
          <div className="text-4xl mb-4">📺</div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Loading Next Level...
          </h2>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-4">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-1000"
              style={{ width: `${((3 - adCountdown) / 3) * 100}%` }}
            />
          </div>
          <p className="text-gray-400 text-sm">
            {adCountdown > 0 ? `${adCountdown}s` : 'Continuing...'}
          </p>
          <p className="text-gray-600 text-xs mt-4">
            {platform.isWeb ? 'Ad placeholder - Configure AdSense for real ads' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg shadow-2xl p-12 text-center max-w-md border-4 border-yellow-400">
        <h1 className="text-6xl font-bold text-yellow-400 mb-4">
          LEVEL {currentLevel}
        </h1>
        <h2 className="text-4xl font-bold text-green-400 mb-8">
          COMPLETE!
        </h2>
        
        <div className="mb-8 space-y-2">
          <p className="text-2xl text-white">
            <span className="text-gray-400">World:</span> {worldName}
          </p>
          <p className="text-2xl text-white">
            <span className="text-gray-400">Score:</span> {score}
          </p>
          <p className="text-2xl text-white">
            <span className="text-gray-400">Distance:</span> {Math.floor(distance)}m
          </p>
        </div>

        {currentLevel < 50 ? (
          <>
            <div className="text-3xl font-bold text-cyan-400 mb-4">
              LEVEL {currentLevel + 1}
            </div>
            <p className="text-xl text-white mb-2">
              Press <span className="font-bold text-yellow-400">SPACE</span> or tap screen to continue
            </p>
          </>
        ) : (
          <div className="text-3xl font-bold text-purple-400 mb-4">
            🎉 GAME COMPLETED! 🎉
          </div>
        )}
      </div>
    </div>
  );
}
