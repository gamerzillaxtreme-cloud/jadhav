import { hasProgress, loadProgress } from "@/lib/gameProgress";
import { useEffect, useState } from "react";

interface MainMenuProps {
  onNewGame: () => void;
  onContinue: (level: number) => void;
}

export function MainMenu({ onNewGame, onContinue }: MainMenuProps) {
  const [savedProgress, setSavedProgress] = useState<number | null>(null);

  useEffect(() => {
    const progress = loadProgress();
    if (progress && progress.currentLevel > 1) {
      setSavedProgress(progress.currentLevel);
    }
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-auto">
      <div className="bg-black bg-opacity-90 w-full h-full flex flex-col items-center justify-center">
        <h1 className="text-6xl font-bold text-yellow-400 mb-8 font-mono">
          FLAPPY SNAKE
        </h1>
        
        <div className="text-white text-center mb-12 space-y-2">
          <p className="text-lg">Use Arrow Keys to Control</p>
          <p className="text-lg">Eat Glowing Bugs to Grow</p>
          <p className="text-lg">Avoid Obstacles!</p>
          <p className="text-lg">Collect Power-Ups!</p>
          <p className="text-sm text-gray-400">(SPACE to Shoot with Shooter)</p>
        </div>

        <div className="flex flex-col gap-4 w-80">
          <button
            onClick={onNewGame}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-4 px-8 rounded-lg text-xl font-mono transition-colors"
          >
            NEW GAME
          </button>
          
          {savedProgress && (
            <button
              onClick={() => onContinue(savedProgress)}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-lg text-xl font-mono transition-colors"
            >
              CONTINUE (Level {savedProgress})
            </button>
          )}
        </div>
        
        <div className="mt-8 text-gray-400 text-sm font-mono">
          Click a button or press Enter to start
        </div>
      </div>
    </div>
  );
}
