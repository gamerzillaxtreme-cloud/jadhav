const PROGRESS_KEY = 'flappy-snake-progress';

export interface GameProgress {
  currentLevel: number;
  lastPlayed: string;
}

export const saveProgress = (level: number): void => {
  const progress: GameProgress = {
    currentLevel: level,
    lastPlayed: new Date().toISOString(),
  };
  
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
};

export const loadProgress = (): GameProgress | null => {
  try {
    const saved = localStorage.getItem(PROGRESS_KEY);
    if (!saved) return null;
    
    const progress = JSON.parse(saved) as GameProgress;
    return progress;
  } catch (error) {
    console.error('Failed to load progress:', error);
    return null;
  }
};

export const clearProgress = (): void => {
  try {
    localStorage.removeItem(PROGRESS_KEY);
  } catch (error) {
    console.error('Failed to clear progress:', error);
  }
};

export const hasProgress = (): boolean => {
  return loadProgress() !== null;
};
