import { create } from "zustand";
import { generateMaze } from "@/lib/config/mazeGenerator";
import { getWorldForLevel } from "@/lib/config/worldConfig";
import { calculateDifficulty } from "@/lib/config/difficulty";
import { saveProgress } from "@/lib/gameProgress";
import { getLevelObjectives, type LevelObjective } from "@/lib/config/levelObjectives";

export type GamePhase = "ready" | "playing" | "ended";
export type PowerUpType = "magnet" | "ghost" | "shrink" | "shooter" | "shield" | "ice" | "speed";
export type Environment = "jungle" | "water" | "fire";

export interface Vector2D {
  x: number;
  y: number;
}

export interface SnakeSegment {
  x: number;
  y: number;
  size: number;
}

export interface Bug {
  id: string;
  x: number;
  y: number;
  glowPhase: number;
  type: "apple" | "banana" | "berry" | "mango";
}

export interface Obstacle {
  id: string;
  type: "spike" | "blob" | "fireball" | "cactus" | "fish" | "flame" | "chaser" | "rock";
  x: number;
  y: number;
  size: number;
  velocityX?: number;
  velocityY?: number;
  animationPhase?: "rising" | "active" | "falling" | "hidden";
  animationTimer?: number;
  pipeY?: number;
  swimDirection?: number;
  isChasing?: boolean;
  originalX?: number;
  originalY?: number;
  opacity?: number;
  isTransitioning?: boolean;
}

export interface Pipe {
  id: string;
  x: number;
  height: number;
  gap: number;
  hasBug: boolean;
  hasSpikes: boolean;
  isSpecial?: boolean;
  isEntered?: boolean;
  opacity?: number;
  isTransitioning?: boolean;
  isMoving?: boolean;
  moveSpeed?: number;
  moveRange?: number;
  moveOffset?: number;
  moveDirection?: number;
}

export interface PowerUp {
  id: string;
  type: PowerUpType;
  x: number;
  y: number;
  duration?: number;
}

export interface ActivePowerUp {
  type: PowerUpType;
  remainingTime: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
}

export interface MazeCell {
  x: number;
  y: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  isEntry?: boolean;
  isExit?: boolean;
  isFakeExit?: boolean;
  hasKey?: boolean;
  hasDoor?: boolean;
  doorId?: string;
  keyId?: string;
  isMovingBlock?: boolean;
  moveDirection?: 'horizontal' | 'vertical';
}

interface FlappySnakeState {
  score: number;
  combo: number;
  comboTimer: number;
  highScore: number;
  level: number;
  environment: Environment;
  distance: number;
  levelDistance: number;
  currentLevel: number;
  currentWorldId: string;
  inBonusScene: boolean;
  isBeingChased: boolean;
  bonusPowerUpsCollected: number;
  activeMaze: {
    x: number;
    grid: MazeCell[][];
    snakePos: { x: number; y: number };
    completed?: boolean;
  } | null;
  mazeCountdown: number;
  mazeSpawnedThisLevel: boolean;
  mazeCompletedThisLevel: boolean;
  levelObjectives: LevelObjective[];
  objectiveProgress: Record<string, number>;
  
  snake: {
    head: Vector2D;
    velocity: Vector2D;
    angle: number;
    segments: SnakeSegment[];
    length: number;
    evolutionStage: number;
  };
  
  bugs: Bug[];
  obstacles: Obstacle[];
  pipes: Pipe[];
  powerUps: PowerUp[];
  activePowerUps: ActivePowerUp[];
  projectiles: Projectile[];
  
  camera: {
    x: number;
    y: number;
    zoom: number;
  };
  
  worldScroll: number;
  
  resetGameState: () => void;
  saveHighScore: () => void;
  updateScore: (points: number) => void;
  incrementCombo: () => void;
  resetCombo: () => void;
  updateSnake: (updates: Partial<FlappySnakeState['snake']>) => void;
  setBugs: (bugs: Bug[]) => void;
  setObstacles: (obstacles: Obstacle[]) => void;
  setPipes: (pipes: Pipe[]) => void;
  setPowerUps: (powerUps: PowerUp[]) => void;
  setActivePowerUps: (powerUps: ActivePowerUp[]) => void;
  setProjectiles: (projectiles: Projectile[]) => void;
  updateCamera: (updates: Partial<FlappySnakeState['camera']>) => void;
  updateWorldScroll: (scroll: number) => void;
  decrementComboTimer: (delta: number) => void;
  updateLevel: (level: number) => void;
  updateEnvironment: (env: Environment) => void;
  updateDistance: (distance: number) => void;
  updateLevelDistance: (distance: number) => void;
  updateCurrentLevel: (level: number) => void;
  updateCurrentWorldId: (worldId: string) => void;
  startNextLevel: () => void;
  restoreFromProgress: (savedLevel: number) => void;
  setInBonusScene: (inBonus: boolean) => void;
  setIsBeingChased: (isChased: boolean) => void;
  incrementBonusPowerUps: () => void;
  resetBonusPowerUps: () => void;
  spawnMaze: (x: number) => void;
  clearMaze: () => void;
  updateMazeSnakePos: (pos: { x: number; y: number }) => void;
  updateMazeCountdown: (countdown: number) => void;
  incrementObjectiveProgress: (type: string, amount?: number) => void;
  checkObjectivesComplete: () => boolean;
}

export const useFlappySnake = create<FlappySnakeState>((set, get) => ({
  score: 0,
  distance: 0,
  levelDistance: 0,
  currentLevel: 1,
  currentWorldId: 'forest',
  inBonusScene: false,
  isBeingChased: false,
  bonusPowerUpsCollected: 0,
  activeMaze: null,
  mazeCountdown: 0,
  mazeSpawnedThisLevel: false,
  mazeCompletedThisLevel: false,
  levelObjectives: getLevelObjectives(1),
  objectiveProgress: {},
  combo: 0,
  comboTimer: 0,
  highScore: parseInt(localStorage.getItem("flappySnakeHighScore") || "0"),
  level: 1,
  environment: "jungle",
  
  snake: {
    head: { x: 100, y: 300 },
    velocity: { x: 3, y: 0 },
    angle: 0,
    segments: [],
    length: 5,
    evolutionStage: 0,
  },
  
  bugs: [],
  obstacles: [],
  pipes: [],
  powerUps: [],
  activePowerUps: [],
  projectiles: [],
  
  camera: {
    x: 0,
    y: 0,
    zoom: 1,
  },
  
  worldScroll: 0,
  
  resetGameState: () => {
    const currentHighScore = get().highScore;
    set({
      score: 0,
      combo: 0,
      comboTimer: 0,
      level: 1,
      distance: 0,
      levelDistance: 0,
      currentLevel: 1,
      currentWorldId: 'forest',
      inBonusScene: false,
      isBeingChased: false,
      bonusPowerUpsCollected: 0,
      activeMaze: null,
      mazeSpawnedThisLevel: false,
      mazeCompletedThisLevel: false,
      levelObjectives: getLevelObjectives(1),
      objectiveProgress: {},
      snake: {
        head: { x: 100, y: 300 },
        velocity: { x: 3, y: 0 },
        angle: 0,
        segments: [],
        length: 5,
        evolutionStage: 0,
      },
      bugs: [],
      obstacles: [],
      pipes: [],
      powerUps: [],
      activePowerUps: [],
      projectiles: [],
      camera: { x: 0, y: 0, zoom: 1 },
      worldScroll: 0,
      highScore: currentHighScore,
      environment: "jungle",
    });
  },
  
  saveHighScore: () => {
    const { score, highScore } = get();
    const newHighScore = Math.max(score, highScore);
    if (newHighScore > highScore) {
      localStorage.setItem("flappySnakeHighScore", newHighScore.toString());
      set({ highScore: newHighScore });
    }
  },
  
  updateScore: (points: number) => {
    set((state) => ({ score: Math.max(0, state.score + points) }));
  },
  
  incrementCombo: () => {
    set((state) => ({ 
      combo: state.combo + 1,
      comboTimer: 2.0
    }));
  },
  
  resetCombo: () => {
    set({ combo: 0, comboTimer: 0 });
  },
  
  decrementComboTimer: (delta: number) => {
    set((state) => {
      const newTimer = Math.max(0, state.comboTimer - delta);
      if (newTimer === 0 && state.combo > 0) {
        return { comboTimer: 0, combo: 0 };
      }
      return { comboTimer: newTimer };
    });
  },
  
  updateSnake: (updates) => {
    set((state) => ({
      snake: { ...state.snake, ...updates }
    }));
  },
  
  setBugs: (bugs) => set({ bugs }),
  setObstacles: (obstacles) => set({ obstacles }),
  setPipes: (pipes) => set({ pipes }),
  setPowerUps: (powerUps) => set({ powerUps }),
  setActivePowerUps: (powerUps) => set({ activePowerUps: powerUps }),
  setProjectiles: (projectiles) => set({ projectiles }),
  
  updateCamera: (updates) => {
    set((state) => ({
      camera: { ...state.camera, ...updates }
    }));
  },
  
  updateWorldScroll: (scroll) => {
    set({ worldScroll: scroll });
  },
  
  updateLevel: (level) => {
    set({ level });
  },
  
  updateEnvironment: (env) => {
    set({ environment: env });
  },
  
  updateDistance: (distance) => {
    set({ distance });
  },
  
  updateCurrentLevel: (level) => {
    set({ currentLevel: level });
  },
  
  updateCurrentWorldId: (worldId) => {
    set({ currentWorldId: worldId });
  },
  
  updateLevelDistance: (distance) => {
    set({ levelDistance: distance });
  },
  
  startNextLevel: () => {
    const state = get();
    const nextLevel = Math.min(50, state.currentLevel + 1);
    const world = getWorldForLevel(nextLevel);
    
    saveProgress(nextLevel);
    
    set({
      currentLevel: nextLevel,
      currentWorldId: world.id,
      levelDistance: 0,
      levelObjectives: getLevelObjectives(nextLevel),
      objectiveProgress: {},
      snake: {
        head: { x: 100, y: 300 },
        velocity: { x: 3, y: 0 },
        angle: 0,
        segments: [],
        length: 5,
        evolutionStage: 0,
      },
      bugs: [],
      obstacles: [],
      pipes: [],
      powerUps: [],
      activePowerUps: [],
      projectiles: [],
      camera: { x: 0, y: 0, zoom: 1 },
      worldScroll: 0,
      activeMaze: null,
      mazeCountdown: 0,
      mazeSpawnedThisLevel: false,
      mazeCompletedThisLevel: false,
      inBonusScene: false,
      isBeingChased: false,
      bonusPowerUpsCollected: 0,
    });
  },
  
  restoreFromProgress: (savedLevel: number) => {
    const currentHighScore = get().highScore;
    const world = getWorldForLevel(savedLevel);
    const env: Environment = savedLevel >= 9 ? "fire" : (savedLevel >= 5 ? "water" : "jungle");
    
    set({
      score: 0,
      combo: 0,
      comboTimer: 0,
      level: savedLevel,
      distance: 0,
      levelDistance: 0,
      currentLevel: savedLevel,
      currentWorldId: world.id,
      environment: env,
      inBonusScene: false,
      isBeingChased: false,
      bonusPowerUpsCollected: 0,
      levelObjectives: getLevelObjectives(savedLevel),
      objectiveProgress: {},
      activeMaze: null,
      mazeCountdown: 0,
      mazeSpawnedThisLevel: false,
      mazeCompletedThisLevel: false,
      snake: {
        head: { x: 100, y: 300 },
        velocity: { x: 3, y: 0 },
        angle: 0,
        segments: [],
        length: 5,
        evolutionStage: 0,
      },
      bugs: [],
      obstacles: [],
      pipes: [],
      powerUps: [],
      activePowerUps: [],
      projectiles: [],
      camera: { x: 0, y: 0, zoom: 1 },
      worldScroll: 0,
      highScore: currentHighScore,
    });
  },
  
  setInBonusScene: (inBonus) => {
    set({ inBonusScene: inBonus });
  },
  
  setIsBeingChased: (isChased) => {
    set({ isBeingChased: isChased });
  },
  
  incrementBonusPowerUps: () => {
    set((state) => ({ bonusPowerUpsCollected: state.bonusPowerUpsCollected + 1 }));
  },
  
  resetBonusPowerUps: () => {
    set({ bonusPowerUpsCollected: 0 });
  },
  
  spawnMaze: (x) => {
    const state = get();
    const currentLevel = state.currentLevel;
    const world = getWorldForLevel(currentLevel);
    const difficulty = calculateDifficulty(currentLevel, world);
    
    const maze = generateMaze({
      complexity: difficulty.mazeComplexity,
      worldId: world.id,
      world,
    });
    
    const grid: MazeCell[][] = [];
    for (let row = 0; row < maze.height; row++) {
      const rowCells: MazeCell[] = [];
      for (let col = 0; col < maze.width; col++) {
        const cell = maze.grid[row][col];
        rowCells.push({
          x: col,
          y: row,
          walls: cell.walls,
          isEntry: cell.isEntry,
          isExit: cell.isExit,
          isFakeExit: cell.isFakeExit,
          hasKey: cell.hasKey,
          hasDoor: cell.hasDoor,
          doorId: cell.doorId,
          keyId: cell.keyId,
          isMovingBlock: cell.isMovingBlock,
          moveDirection: cell.moveDirection,
        });
      }
      grid.push(rowCells);
    }
    
    set({
      activeMaze: {
        x,
        grid,
        snakePos: { x: 0, y: 0 },
      },
      mazeCountdown: 0,
      mazeSpawnedThisLevel: true,
    });
  },
  
  clearMaze: () => {
    set({ activeMaze: null, mazeCountdown: 0 });
  },
  
  updateMazeSnakePos: (pos) => {
    set((state) => {
      if (!state.activeMaze) return {};
      return {
        activeMaze: {
          ...state.activeMaze,
          snakePos: pos,
        },
      };
    });
  },
  
  updateMazeCountdown: (countdown) => {
    set({ mazeCountdown: countdown });
  },
  
  incrementObjectiveProgress: (type, amount = 1) => {
    set((state) => ({
      objectiveProgress: {
        ...state.objectiveProgress,
        [type]: (state.objectiveProgress[type] || 0) + amount,
      },
    }));
  },
  
  checkObjectivesComplete: () => {
    const state = get();
    const { levelObjectives, objectiveProgress } = state;
    
    return levelObjectives.every(objective => {
      const progress = objectiveProgress[objective.type] || 0;
      return progress >= objective.target;
    });
  },
}));
