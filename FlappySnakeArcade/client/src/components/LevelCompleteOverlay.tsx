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
