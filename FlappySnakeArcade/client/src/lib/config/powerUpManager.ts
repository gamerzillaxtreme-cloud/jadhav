import { WorldConfig } from './worldConfig';

export type PowerUpType = 
  | 'shield' 
  | 'ghost' 
  | 'slowmo' 
  | 'speed' 
  | 'mini' 
  | 'magnet';

export interface PowerUp {
  id: string;
  x: number;
  y: number;
  type: PowerUpType;
  size: number;
  collected?: boolean;
  opacity?: number;
  isTransitioning?: boolean;
}

export interface ActivePowerUpEffect {
  type: PowerUpType;
  expiresAt: number;
  duration: number;
  shieldHitsRemaining?: number;
  ghostUsesRemaining?: number;
}

const POWER_UP_DURATION = 5000;

export function createPowerUp(x: number, y: number, type: PowerUpType): PowerUp {
  return {
    id: `powerup-${Date.now()}-${Math.random()}`,
    x,
    y,
    type,
    size: 20,
    collected: false,
  };
}

export function getRandomPowerUpType(world: WorldConfig): PowerUpType {
  const types: PowerUpType[] = ['shield', 'ghost', 'slowmo', 'speed', 'mini', 'magnet'];
  
  const weights: Record<PowerUpType, number> = {
    shield: 1.5,
    ghost: 1.2,
    slowmo: 1.0,
    speed: 1.0,
    mini: 0.8,
    magnet: 1.3,
  };
  
  if (world.id === 'ice') {
    weights.slowmo = 1.5;
  } else if (world.id === 'desert') {
    weights.speed = 1.5;
  } else if (world.id === 'neon') {
    weights.ghost = 1.8;
  }
  
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  
  for (const type of types) {
    random -= weights[type];
    if (random <= 0) {
      return type;
    }
  }
  
  return types[0];
}

export function getPowerUpSpawnChance(level: number, world: WorldConfig): number {
  const baseChance = 0.005;
  const levelBonus = level * 0.0002;
  const worldMultiplier = world.difficultyMultiplier;
  
  return Math.min(0.02, (baseChance + levelBonus) * worldMultiplier);
}

export function activatePowerUp(type: PowerUpType): ActivePowerUpEffect {
  const now = Date.now();
  
  const effect: ActivePowerUpEffect = {
    type,
    expiresAt: now + POWER_UP_DURATION,
    duration: POWER_UP_DURATION,
  };
  
  if (type === 'shield') {
    effect.shieldHitsRemaining = 1;
  } else if (type === 'ghost') {
    effect.ghostUsesRemaining = 1;
  }
  
  return effect;
}

export function getPowerUpIcon(type: PowerUpType): string {
  switch (type) {
    case 'shield':
      return '🛡️';
    case 'ghost':
      return '👻';
    case 'slowmo':
      return '⏱️';
    case 'speed':
      return '⚡';
    case 'mini':
      return '🔻';
    case 'magnet':
      return '🧲';
    default:
      return '?';
  }
}

export function getPowerUpColor(type: PowerUpType): string {
  switch (type) {
    case 'shield':
      return '#FFD700';
    case 'ghost':
      return '#9370DB';
    case 'slowmo':
      return '#4169E1';
    case 'speed':
      return '#FF4500';
    case 'mini':
      return '#32CD32';
    case 'magnet':
      return '#FF1493';
    default:
      return '#FFFFFF';
  }
}

export function getPowerUpName(type: PowerUpType): string {
  switch (type) {
    case 'shield':
      return 'Shield';
    case 'ghost':
      return 'Ghost Mode';
    case 'slowmo':
      return 'Slow Motion';
    case 'speed':
      return 'Speed Boost';
    case 'mini':
      return 'Mini Snake';
    case 'magnet':
      return 'Magnet';
    default:
      return 'Power-Up';
  }
}
