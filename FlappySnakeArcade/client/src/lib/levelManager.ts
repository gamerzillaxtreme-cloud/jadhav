import { getWorldForLevel, WorldConfig } from './config/worldConfig';
import { calculateDifficulty, DifficultySettings } from './config/difficulty';

export interface LevelConfig {
  levelNumber: number;
  worldId: string;
  worldName: string;
  targetDistance: number;
  hasMaze: boolean;
  theme: {
    backgroundColor: string;
    backgroundGradient: string;
    pipeColor: string;
    pipeColorVariant: string;
    obstacleColor: string;
    groundColor: string;
    textColor: string;
  };
  difficulty: DifficultySettings;
}

export class LevelManager {
  private currentLevel: number = 1;
  
  getCurrentLevel(): number {
    return this.currentLevel;
  }
  
  setLevel(level: number): void {
    this.currentLevel = Math.max(1, Math.min(50, level));
  }
  
  nextLevel(): void {
    if (this.currentLevel < 50) {
      this.currentLevel++;
    }
  }
  
  getLevelConfig(level: number = this.currentLevel): LevelConfig {
    const world = getWorldForLevel(level);
    const difficulty = calculateDifficulty(level, world);
    
    const hasMaze = true;
    
    const targetDistance = 4000;
    
    return {
      levelNumber: level,
      worldId: world.id,
      worldName: world.name,
      targetDistance,
      hasMaze,
      theme: {
        backgroundColor: world.theme.backgroundColor,
        backgroundGradient: world.theme.backgroundGradient,
        pipeColor: world.theme.pipeColor,
        pipeColorVariant: world.theme.pipeColorVariant,
        obstacleColor: world.theme.obstacleColor,
        groundColor: world.theme.groundColor,
        textColor: world.theme.textColor,
      },
      difficulty,
    };
  }
  
  resetToLevel(level: number): LevelConfig {
    this.setLevel(level);
    return this.getLevelConfig(level);
  }
  
  isMaxLevel(): boolean {
    return this.currentLevel >= 50;
  }
}

export const levelManager = new LevelManager();
