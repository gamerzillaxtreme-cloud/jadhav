import { WorldConfig } from './worldConfig';

export interface MovingPipe {
  id: string;
  x: number;
  y: number;
  height: number;
  gap: number;
  type: 'moving-vertical' | 'sliding-horizontal';
  moveSpeed: number;
  moveDirection: number;
  moveRange: number;
  initialY?: number;
  initialX?: number;
  opacity?: number;
  isTransitioning?: boolean;
}

export interface RotatingObstacle {
  id: string;
  x: number;
  y: number;
  size: number;
  type: 'rotating';
  angle: number;
  rotationSpeed: number;
  opacity?: number;
  isTransitioning?: boolean;
}

export interface FallingRock {
  id: string;
  x: number;
  y: number;
  size: number;
  type: 'falling-rock';
  fallSpeed: number;
  opacity?: number;
  isTransitioning?: boolean;
}

export interface Enemy {
  id: string;
  x: number;
  y: number;
  size: number;
  type: 'enemy';
  moveSpeed: number;
  moveDirection: number;
  moveRange: number;
  initialX: number;
  opacity?: number;
  isTransitioning?: boolean;
}

export interface MovingPlatform {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'moving-platform';
  moveSpeed: number;
  moveDirection: number;
  moveRange: number;
  initialY: number;
}

export type ExtendedObstacle = 
  | MovingPipe 
  | RotatingObstacle 
  | FallingRock 
  | Enemy 
  | MovingPlatform;

export function createMovingVerticalPipe(
  x: number,
  canvasHeight: number,
  difficultyMultiplier: number = 1.0
): MovingPipe {
  const height = Math.random() * (canvasHeight * 0.3) + 100;
  const gap = 140;
  
  return {
    id: `moving-pipe-${Date.now()}-${Math.random()}`,
    x,
    y: height,
    height,
    gap,
    type: 'moving-vertical',
    moveSpeed: (0.5 + Math.random() * 0.5) * difficultyMultiplier,
    moveDirection: Math.random() > 0.5 ? 1 : -1,
    moveRange: 80,
    initialY: height,
  };
}

export function createSlidingHorizontalPipe(
  x: number,
  canvasHeight: number,
  difficultyMultiplier: number = 1.0
): MovingPipe {
  const height = Math.random() * (canvasHeight * 0.3) + 100;
  const gap = 140;
  
  return {
    id: `sliding-pipe-${Date.now()}-${Math.random()}`,
    x,
    y: height,
    height,
    gap,
    type: 'sliding-horizontal',
    moveSpeed: (1.0 + Math.random() * 1.0) * difficultyMultiplier,
    moveDirection: Math.random() > 0.5 ? 1 : -1,
    moveRange: 60,
    initialX: x,
  };
}

export function createRotatingObstacle(
  x: number,
  y: number,
  difficultyMultiplier: number = 1.0
): RotatingObstacle {
  return {
    id: `rotating-${Date.now()}-${Math.random()}`,
    x,
    y,
    size: 25 + Math.random() * 15,
    type: 'rotating',
    angle: 0,
    rotationSpeed: (0.02 + Math.random() * 0.03) * difficultyMultiplier,
  };
}

export function createFallingRock(
  x: number,
  startY: number = -50,
  difficultyMultiplier: number = 1.0
): FallingRock {
  return {
    id: `falling-rock-${Date.now()}-${Math.random()}`,
    x,
    y: startY,
    size: 20 + Math.random() * 20,
    type: 'falling-rock',
    fallSpeed: (2.0 + Math.random() * 2.0) * difficultyMultiplier,
  };
}

export function createEnemy(
  x: number,
  y: number,
  difficultyMultiplier: number = 1.0
): Enemy {
  return {
    id: `enemy-${Date.now()}-${Math.random()}`,
    x,
    y,
    size: 20,
    type: 'enemy',
    moveSpeed: (1.5 + Math.random() * 1.0) * difficultyMultiplier,
    moveDirection: 1,
    moveRange: 150,
    initialX: x,
  };
}

export function createMovingPlatform(
  x: number,
  y: number,
  difficultyMultiplier: number = 1.0
): MovingPlatform {
  return {
    id: `platform-${Date.now()}-${Math.random()}`,
    x,
    y,
    width: 80,
    height: 20,
    type: 'moving-platform',
    moveSpeed: 0.8 * difficultyMultiplier,
    moveDirection: 1,
    moveRange: 100,
    initialY: y,
  };
}

export function shouldSpawnObstacleType(
  world: WorldConfig,
  obstacleType: string
): boolean {
  switch (obstacleType) {
    case 'moving-vertical':
      return world.mechanics.hasMovingPipes ?? false;
    case 'sliding-horizontal':
      return world.mechanics.hasSlidingPipes ?? false;
    case 'rotating':
      return world.mechanics.hasRotatingObstacles ?? false;
    case 'falling-rock':
      return world.mechanics.hasFallingRocks ?? false;
    case 'moving-platform':
      return world.mechanics.hasMovingPlatforms ?? false;
    case 'enemy':
      return world.mechanics.hasEnemies ?? false;
    default:
      return false;
  }
}
