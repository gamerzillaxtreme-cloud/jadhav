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
      backgroundColor: '#2d5016',
      backgroundGradient: 'linear-gradient(to bottom, #4a7c2f 0%, #2d5016 100%)',
      pipeColor: '#2d5016',
      pipeColorVariant: '#3d6a1f',
      obstacleColor: '#8B4513',
      groundColor: '#1a3d0a',
      textColor: '#90EE90',
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
      backgroundColor: '#4a4a4a',
      backgroundGradient: 'linear-gradient(to bottom, #6b6b6b 0%, #4a4a4a 100%)',
      pipeColor: '#5a5a5a',
      pipeColorVariant: '#6a6a6a',
      obstacleColor: '#696969',
      groundColor: '#3a3a3a',
      textColor: '#D3D3D3',
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
      backgroundColor: '#d4a574',
      backgroundGradient: 'linear-gradient(to bottom, #f4d5a4 0%, #d4a574 100%)',
      pipeColor: '#704214',
      pipeColorVariant: '#8B5A2B',
      obstacleColor: '#CD853F',
      groundColor: '#b08d57',
      textColor: '#FFD700',
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
      backgroundColor: '#b0e0e6',
      backgroundGradient: 'linear-gradient(to bottom, #e0f6ff 0%, #b0e0e6 100%)',
      pipeColor: '#87ceeb',
      pipeColorVariant: '#b0e0e6',
      obstacleColor: '#4682B4',
      groundColor: '#7ec8e3',
      textColor: '#00FFFF',
    },
    mechanics: {
      hasMovingPipes: true,
      hasSlidingPipes: true,
      hasRotatingObstacles: true,
      hasFallingRocks: true,
      hasMovingPlatforms: true,
      hasEnemies: true,
    },
    difficultyMultiplier: 1.6,
    description: 'Frozen landscape with slippery surfaces',
  },
  
  neon: {
    id: 'neon',
    name: 'Neon Cave',
    levelRange: [41, 50],
    theme: {
      backgroundColor: '#1a1a2e',
      backgroundGradient: 'linear-gradient(to bottom, #16213e 0%, #0f0f1e 100%)',
      pipeColor: '#e94560',
      pipeColorVariant: '#0f3460',
      obstacleColor: '#00d9ff',
      groundColor: '#0a0a1e',
      textColor: '#ff00ff',
    },
    mechanics: {
      hasMovingPipes: true,
      hasSlidingPipes: true,
      hasRotatingObstacles: true,
      hasFallingRocks: true,
      hasMovingPlatforms: true,
      hasEnemies: true,
    },
    difficultyMultiplier: 2.0,
    description: 'Futuristic neon cave with all mechanics',
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
