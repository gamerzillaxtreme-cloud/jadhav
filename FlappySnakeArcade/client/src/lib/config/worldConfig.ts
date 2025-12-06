export interface WorldConfig {
  id: string;
  name: string;
  levelRange: [number, number];
  theme: {
    backgroundColor: string;
    backgroundGradient: string;
    pipeColor: string;
    pipeColorVariant: string;
    obstacleColor: string;
    groundColor: string;
    textColor: string;
  };
  mechanics: {
    hasMovingPipes?: boolean;
    hasSlidingPipes?: boolean;
    hasRotatingObstacles?: boolean;
    hasFallingRocks?: boolean;
    hasMovingPlatforms?: boolean;
    hasEnemies?: boolean;
    hasGravity?: boolean;
  };
  difficultyMultiplier: number;
  description: string;
}

export const WORLDS: Record<string, WorldConfig> = {
  forest: {
    id: 'forest',
    name: 'Forest',
    levelRange: [1, 10],
    theme: {
      backgroundColor: '#87CEEB',
      backgroundGradient: 'linear-gradient(to bottom, #87CEEB 0%, #98FB98 100%)',
      pipeColor: '#73BF2E',
      pipeColorVariant: '#5FA328',
      obstacleColor: '#8B4513',
      groundColor: '#228B22',
      textColor: '#FFFFFF',
    },
    mechanics: {
      hasMovingPipes: false,
      hasSlidingPipes: false,
      hasRotatingObstacles: true,
      hasFallingRocks: false,
      hasMovingPlatforms: false,
      hasEnemies: false,
    },
    difficultyMultiplier: 1.0,
    description: 'Lush green forest with basic obstacles',
  },
  
  rocky: {
    id: 'rocky',
    name: 'Rocky Mountains',
    levelRange: [11, 20],
    theme: {
      backgroundColor: '#708090',
      backgroundGradient: 'linear-gradient(to bottom, #B0C4DE 0%, #708090 100%)',
      pipeColor: '#73BF2E',
      pipeColorVariant: '#5FA328',
      obstacleColor: '#696969',
      groundColor: '#4A4A4A',
      textColor: '#FFFFFF',
    },
    mechanics: {
      hasMovingPipes: true,
      hasSlidingPipes: false,
      hasRotatingObstacles: true,
      hasFallingRocks: true,
      hasMovingPlatforms: false,
      hasEnemies: true,
    },
    difficultyMultiplier: 1.2,
    description: 'Rocky terrain with moving pipes and falling rocks',
  },
  
  desert: {
    id: 'desert',
    name: 'Desert',
    levelRange: [21, 30],
    theme: {
      backgroundColor: '#FFB347',
      backgroundGradient: 'linear-gradient(to bottom, #FFD700 0%, #DEB887 100%)',
      pipeColor: '#73BF2E',
      pipeColorVariant: '#5FA328',
      obstacleColor: '#CD853F',
      groundColor: '#D2691E',
      textColor: '#FFFFFF',
    },
    mechanics: {
      hasMovingPipes: true,
      hasSlidingPipes: true,
      hasRotatingObstacles: true,
      hasFallingRocks: false,
      hasMovingPlatforms: true,
      hasEnemies: true,
    },
    difficultyMultiplier: 1.4,
    description: 'Sandy desert with sliding pipes and heat waves',
  },
  
  ice: {
    id: 'ice',
    name: 'Ice World',
    levelRange: [31, 40],
    theme: {
      backgroundColor: '#E0FFFF',
      backgroundGradient: 'linear-gradient(to bottom, #F0FFFF 0%, #87CEEB 100%)',
      pipeColor: '#73BF2E',
      pipeColorVariant: '#5FA328',
      obstacleColor: '#4682B4',
      groundColor: '#B0E0E6',
      textColor: '#000080',
    },
    mechanics: {
      hasMovingPipes: true,
      hasSlidingPipes: true,
      hasRotatingObstacles: true,
      hasFallingRocks: true,
      hasMovingPlatforms: true,
      hasEnemies: true,
      hasGravity: true,
    },
    difficultyMultiplier: 1.6,
    description: 'Frozen landscape with heavy gravity',
  },
  
  neon: {
    id: 'neon',
    name: 'Neon Cave',
    levelRange: [41, 50],
    theme: {
      backgroundColor: '#1a0a2e',
      backgroundGradient: 'linear-gradient(to bottom, #2d1b4e 0%, #0a0a1e 100%)',
      pipeColor: '#73BF2E',
      pipeColorVariant: '#5FA328',
      obstacleColor: '#00d9ff',
      groundColor: '#1a0a2e',
      textColor: '#FF00FF',
    },
    mechanics: {
      hasMovingPipes: true,
      hasSlidingPipes: true,
      hasRotatingObstacles: true,
      hasFallingRocks: true,
      hasMovingPlatforms: true,
      hasEnemies: true,
      hasGravity: true,
    },
    difficultyMultiplier: 2.0,
    description: 'Futuristic neon cave with extreme gravity',
  },
};

export function getWorldForLevel(level: number): WorldConfig {
  for (const world of Object.values(WORLDS)) {
    if (level >= world.levelRange[0] && level <= world.levelRange[1]) {
      return world;
    }
  }
  return WORLDS.forest;
}

export function getLevelProgress(level: number, world: WorldConfig): number {
  const [start, end] = world.levelRange;
  return ((level - start) / (end - start + 1)) * 100;
}

// Calculate extra gravity for Ice World and Neon Cave
// This is added ON TOP of normal GRAVITY (0.08)
// Values are significant enough to be noticeable but still playable
export function getExtraGravity(level: number, world: WorldConfig): number {
  if (!world.mechanics.hasGravity) {
    return 0;
  }
  
  // Ice World: levels 31-40, gravity starts at 0.06 and goes up to 0.12
  // Neon Cave: levels 41-50, gravity starts at 0.12 and goes up to 0.20
  if (world.id === 'ice') {
    // Level 31 = 0.06, Level 40 = 0.12
    const levelInWorld = level - 31;
    return 0.06 + (levelInWorld * 0.0067); // ~0.007 increase per level
  } else if (world.id === 'neon') {
    // Level 41 = 0.12, Level 50 = 0.20
    const levelInWorld = level - 41;
    return 0.12 + (levelInWorld * 0.009); // ~0.009 increase per level
  }
  
  return 0;
}
