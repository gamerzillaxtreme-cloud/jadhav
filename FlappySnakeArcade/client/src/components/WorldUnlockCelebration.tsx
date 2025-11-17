import { useEffect } from "react";

interface WorldUnlockCelebrationProps {
  worldName: string;
  worldId: string;
  description: string;
  onDismiss: () => void;
}

export function WorldUnlockCelebration({ 
  worldName, 
  worldId,
  description,
  onDismiss 
}: WorldUnlockCelebrationProps) {
  
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 4000);
    
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const getWorldColor = (id: string) => {
    switch(id) {
      case 'forest': return 'from-green-600 to-green-800';
      case 'rocky': return 'from-gray-600 to-gray-800';
      case 'desert': return 'from-yellow-600 to-orange-700';
      case 'ice': return 'from-cyan-400 to-blue-600';
      case 'neon': return 'from-purple-600 to-pink-600';
      default: return 'from-blue-600 to-blue-800';
    }
  };

  const getWorldEmoji = (id: string) => {
    switch(id) {
      case 'forest': return '🌲';
      case 'rocky': return '⛰️';
      case 'desert': return '🏜️';
      case 'ice': return '❄️';
      case 'neon': return '✨';
      default: return '🌍';
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 z-40 animate-in fade-in duration-500">
      <div className={`bg-gradient-to-br ${getWorldColor(worldId)} rounded-2xl shadow-2xl p-8 text-center max-w-lg border-4 border-white transform scale-100 animate-in zoom-in duration-700`}>
        <div className="text-8xl mb-4 animate-bounce">
          {getWorldEmoji(worldId)}
        </div>
        
        <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">
          NEW WORLD UNLOCKED!
        </h1>
        
        <h2 className="text-6xl font-bold text-yellow-300 mb-4 drop-shadow-lg">
          {worldName}
        </h2>
        
        <p className="text-2xl text-white mb-6 drop-shadow-md">
          {description}
        </p>
        
        <div className="flex items-center justify-center gap-2 text-white text-lg">
          <div className="animate-pulse">✨</div>
          <span>Get ready for new challenges!</span>
          <div className="animate-pulse">✨</div>
        </div>
      </div>
    </div>
  );
}
