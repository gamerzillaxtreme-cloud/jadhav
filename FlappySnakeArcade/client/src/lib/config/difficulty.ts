import { WorldConfig } from './worldConfig';

export interface DifficultySettings {
  scrollSpeed: number;
  gapSize: number;
  pipeMoveChance: number;
  enemyChance: number;
  mazeComplexity: number;
}

const BASE_SPEED = 3.0;
const BASE_GAP = 180;

export function calculateDifficulty(
  level: number,
  world: WorldConfig
): DifficultySettings {
  const worldMultiplier = world.difficultyMultiplier;
  
  const scrollSpeed = (BASE_SPEED + level * 0.015) * worldMultiplier;
  
  const gapSize = Math.max(100, BASE_GAP - level * 0.7);
  
  const pipeMoveChance = Math.min(0.5, level * 0.02);
  
  const enemyChance = Math.max(0, (level - 15) * 0.015);
  
  const mazeComplexity = Math.floor(level / 10);
  
  return {
    scrollSpeed,
    gapSize,
    pipeMoveChance,
    enemyChance,
    mazeComplexity,
  };
}

export function getSpeedIncreasePerLevel(): number {
  return 0.015;
}

export function getGapDecreasePerLevel(): number {
  return 0.7;
}
