import { WorldConfig } from './worldConfig';

export interface DifficultySettings {
  snakeSpeed: number;      // Constant speed for snake movement
  scrollSpeed: number;     // Increasing speed for world/obstacles
  gapSize: number;
  pipeMoveChance: number;
  enemyChance: number;
  mazeComplexity: number;
}

const BASE_SPEED = 3.0;
const SNAKE_SPEED = 3.2;   // Constant snake speed - comfortable for maneuvering
const BASE_GAP = 180;

// Speed reduction multiplier when ad bonus is active (50% slower)
const SPEED_REDUCTION_MULTIPLIER = 0.5;

export function calculateDifficulty(
  level: number,
  world: WorldConfig,
  speedReductionActive: boolean = false
): DifficultySettings {
  const worldMultiplier = world.difficultyMultiplier;
  
  // Snake speed stays constant for maneuverability (not affected by speed reduction)
  const snakeSpeed = SNAKE_SPEED;
  
  // World/obstacle scroll speed increases with level
  let scrollSpeed = (BASE_SPEED + level * 0.02) * worldMultiplier;
  
  // Apply speed reduction only to obstacles/scroll (from watching ad)
  if (speedReductionActive) {
    scrollSpeed *= SPEED_REDUCTION_MULTIPLIER;
  }
  
  const gapSize = Math.max(100, BASE_GAP - level * 0.7);
  
  const pipeMoveChance = Math.min(0.5, level * 0.02);
  
  const enemyChance = Math.max(0, (level - 15) * 0.015);
  
  const mazeComplexity = Math.floor(level / 10);
  
  return {
    snakeSpeed,
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
