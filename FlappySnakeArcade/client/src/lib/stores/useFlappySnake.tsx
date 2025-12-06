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
  velocityY?: number;
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
  pipeId?: string; // For cacti attached to pipes - follows pipe movement
  pipeBaseHeight?: number; // Original pipe height before moveOffset
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
  velocityY?: number;
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
  maxReachedX: number; // High-water mark - furthest X position reached this level
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
  spawnedObjectiveItems: Record<string, number>;
  
  deathCheckpoint: {
    score: number;
    distance: number;
    levelDistance: number;
    currentLevel: number;
    currentWorldId: string;
    worldScroll: number;
    snakeHead: Vector2D;
    snakeVelocity: Vector2D;
    snakeAngle: number;
    snakeLength: number;
    snakeSegments: SnakeSegment[];
    activePowerUps: ActivePowerUp[];
    objectiveProgress: Record<string, number>;
    spawnedObjectiveItems: Record<string, number>;
    inBonusScene: boolean;
    mazeSpawnedThisLevel: boolean;
    mazeCompletedThisLevel: boolean;
    pipes: Pipe[];
    obstacles: Obstacle[];
    bugs: Bug[];
    powerUps: PowerUp[];
    camera: { x: number; y: number; zoom: number };
    activeMaze: {
      x: number;
      grid: MazeCell[][];
      snakePos: { x: number; y: number };
      completed?: boolean;
    } | null;
    mazeCountdown: number;
  } | null;
  
  continueInvincibility: number;
  
  speedReductionActive: boolean;
  speedReductionEndTime: number;
  speedReductionUsedThisLevel: boolean;
  
  gravityDisabledActive: boolean;
  gravityDisabledEndTime: number;
  gravityDisabledUsedThisLevel: boolean;
  
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
  updateMaxReachedX: (x: number) => void;
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
  incrementSpawnedObjectiveItem: (type: string, amount?: number) => void;
  getRequiredSpawns: () => Record<string, { required: number; spawned: number }>;
  checkObjectivesComplete: () => boolean;
  createDeathCheckpoint: () => void;
  restoreFromDeathCheckpoint: () => boolean;
  clearDeathCheckpoint: () => void;
  updateContinueInvincibility: (time: number) => void;
  decrementContinueInvincibility: (delta: number) => void;
  startFromSpecificLevel: (level: number) => void;
  activateSpeedReduction: (durationSeconds: number) => void;
  updateSpeedReduction: (currentTime: number) => void;
  canShowSpeedReductionAd: () => boolean;
  activateGravityDisabled: (durationSeconds: number) => void;
  updateGravityDisabled: (currentTime: number) => void;
  canShowGravityDisabledAd: () => boolean;
}

export const useFlappySnake = create<FlappySnakeState>((set, get) => ({
  score: 0,
  distance: 0,
  levelDistance: 0,
  maxReachedX: 100, // Start at initial snake position
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
  spawnedObjectiveItems: {},
  deathCheckpoint: null,
  continueInvincibility: 0,
  speedReductionActive: false,
  speedReductionEndTime: 0,
  speedReductionUsedThisLevel: false,
  gravityDisabledActive: false,
  gravityDisabledEndTime: 0,
  gravityDisabledUsedThisLevel: false,
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
      maxReachedX: 100, // Reset high-water mark to initial position
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
      spawnedObjectiveItems: {},
      deathCheckpoint: null,
      continueInvincibility: 0,
      speedReductionActive: false,
      speedReductionEndTime: 0,
      speedReductionUsedThisLevel: false,
      gravityDisabledActive: false,
      gravityDisabledEndTime: 0,
      gravityDisabledUsedThisLevel: false,
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
  
  updateMaxReachedX: (x) => {
    set({ maxReachedX: x });
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
      maxReachedX: 100, // Reset high-water mark for new level
      levelObjectives: getLevelObjectives(nextLevel),
      objectiveProgress: {},
      spawnedObjectiveItems: {},
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
      speedReductionActive: false,
      speedReductionEndTime: 0,
      speedReductionUsedThisLevel: false,
      gravityDisabledActive: false,
      gravityDisabledEndTime: 0,
      gravityDisabledUsedThisLevel: false,
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
      maxReachedX: 100, // Reset high-water mark
      currentLevel: savedLevel,
      currentWorldId: world.id,
      environment: env,
      inBonusScene: false,
      isBeingChased: false,
      bonusPowerUpsCollected: 0,
      levelObjectives: getLevelObjectives(savedLevel),
      objectiveProgress: {},
      spawnedObjectiveItems: {},
      activeMaze: null,
      mazeCountdown: 0,
      mazeSpawnedThisLevel: false,
      mazeCompletedThisLevel: false,
      speedReductionActive: false,
      speedReductionEndTime: 0,
      speedReductionUsedThisLevel: false,
      gravityDisabledActive: false,
      gravityDisabledEndTime: 0,
      gravityDisabledUsedThisLevel: false,
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
  
  incrementSpawnedObjectiveItem: (type, amount = 1) => {
    set((state) => ({
      spawnedObjectiveItems: {
        ...state.spawnedObjectiveItems,
        [type]: (state.spawnedObjectiveItems[type] || 0) + amount,
      },
    }));
  },
  
  getRequiredSpawns: () => {
    const state = get();
    const { levelObjectives, spawnedObjectiveItems } = state;
    const result: Record<string, { required: number; spawned: number }> = {};
    
    for (const objective of levelObjectives) {
      const extraBuffer = Math.ceil(objective.target * 0.5);
      const required = objective.target + extraBuffer;
      const spawned = spawnedObjectiveItems[objective.type] || 0;
      result[objective.type] = { required, spawned };
    }
    
    return result;
  },
  
  checkObjectivesComplete: () => {
    const state = get();
    const { levelObjectives, objectiveProgress } = state;
    
    return levelObjectives.every(objective => {
      const progress = objectiveProgress[objective.type] || 0;
      return progress >= objective.target;
    });
  },
  
  createDeathCheckpoint: () => {
    const state = get();
    console.log("[CHECKPOINT] Creating death checkpoint:", {
      score: state.score,
      distance: state.distance,
      level: state.currentLevel,
      snakeLength: state.snake.length,
      pipeCount: state.pipes.length,
      cameraX: state.camera.x,
      hasMaze: !!state.activeMaze,
      mazeCountdown: state.mazeCountdown
    });
    set({
      deathCheckpoint: {
        score: state.score,
        distance: state.distance,
        levelDistance: state.levelDistance,
        currentLevel: state.currentLevel,
        currentWorldId: state.currentWorldId,
        worldScroll: state.worldScroll,
        snakeHead: { ...state.snake.head },
        snakeVelocity: { ...state.snake.velocity },
        snakeAngle: state.snake.angle,
        snakeLength: state.snake.length,
        snakeSegments: state.snake.segments.map(s => ({ ...s })),
        activePowerUps: state.activePowerUps.map(p => ({ ...p })),
        objectiveProgress: { ...state.objectiveProgress },
        spawnedObjectiveItems: { ...state.spawnedObjectiveItems },
        inBonusScene: state.inBonusScene,
        mazeSpawnedThisLevel: state.mazeSpawnedThisLevel,
        mazeCompletedThisLevel: state.mazeCompletedThisLevel,
        pipes: state.pipes.map(p => ({ ...p })),
        obstacles: state.obstacles.map(o => ({ ...o })),
        bugs: state.bugs.map(b => ({ ...b })),
        powerUps: state.powerUps.map(p => ({ ...p })),
        camera: { ...state.camera },
        activeMaze: state.activeMaze ? {
          x: state.activeMaze.x,
          grid: state.activeMaze.grid.map(row => row.map(cell => ({ ...cell }))),
          snakePos: { ...state.activeMaze.snakePos },
          completed: state.activeMaze.completed
        } : null,
        mazeCountdown: state.mazeCountdown,
      },
    });
  },
  
  restoreFromDeathCheckpoint: () => {
    const checkpoint = get().deathCheckpoint;
    console.log("[CHECKPOINT] Restoring from checkpoint:", checkpoint);
    if (!checkpoint) {
      console.log("[CHECKPOINT] No checkpoint found!");
      return false;
    }
    
    console.log("[CHECKPOINT] Restoring EXACT state:", {
      snakeHeadX: checkpoint.snakeHead.x,
      snakeHeadY: checkpoint.snakeHead.y,
      cameraX: checkpoint.camera.x,
      worldScroll: checkpoint.worldScroll,
      distance: checkpoint.distance,
      score: checkpoint.score,
      snakeLength: checkpoint.snakeLength,
      pipeCount: checkpoint.pipes.length,
      obstacleCount: checkpoint.obstacles.length,
      bugCount: checkpoint.bugs.length,
      hasMaze: !!checkpoint.activeMaze,
      mazeCountdown: checkpoint.mazeCountdown
    });
    
    // If restoring inside an active maze, clamp position to maze boundaries
    let restoredHead = { ...checkpoint.snakeHead };
    let restoredVelocity = { ...checkpoint.snakeVelocity };
    
    if (checkpoint.activeMaze && !checkpoint.activeMaze.completed) {
      const CELL_SIZE = 60;
      const mazeStartX = checkpoint.activeMaze.x;
      const mazeEndX = mazeStartX + CELL_SIZE * 10;
      const mazeTopY = CELL_SIZE * 0.4; // headRadius margin
      const mazeBottomY = CELL_SIZE * 10 - CELL_SIZE * 0.4;
      
      // Clamp position inside maze with small margin
      if (restoredHead.x >= mazeStartX && restoredHead.x <= mazeEndX) {
        restoredHead.y = Math.max(mazeTopY, Math.min(mazeBottomY, restoredHead.y));
      }
      
      // Zero velocity to prevent immediate wall collision
      restoredVelocity = { x: 0, y: 0 };
      
      console.log("[CHECKPOINT] Clamped position for maze:", {
        originalY: checkpoint.snakeHead.y,
        clampedY: restoredHead.y,
        mazeTopY,
        mazeBottomY
      });
    }
    
    set({
      score: checkpoint.score,
      distance: checkpoint.distance,
      levelDistance: checkpoint.levelDistance,
      currentLevel: checkpoint.currentLevel,
      currentWorldId: checkpoint.currentWorldId,
      worldScroll: checkpoint.worldScroll,
      inBonusScene: checkpoint.inBonusScene,
      mazeSpawnedThisLevel: checkpoint.mazeSpawnedThisLevel,
      mazeCompletedThisLevel: checkpoint.mazeCompletedThisLevel,
      objectiveProgress: { ...checkpoint.objectiveProgress },
      spawnedObjectiveItems: { ...checkpoint.spawnedObjectiveItems },
      activePowerUps: checkpoint.activePowerUps.map(p => ({ ...p })),
      activeMaze: checkpoint.activeMaze ? {
        x: checkpoint.activeMaze.x,
        grid: checkpoint.activeMaze.grid.map(row => row.map(cell => ({ ...cell }))),
        snakePos: { ...checkpoint.activeMaze.snakePos },
        completed: checkpoint.activeMaze.completed
      } : null,
      mazeCountdown: checkpoint.mazeCountdown,
      obstacles: checkpoint.obstacles.map(o => ({ ...o })),
      pipes: checkpoint.pipes.map(p => ({ ...p })),
      bugs: checkpoint.bugs.map(b => ({ ...b })),
      powerUps: checkpoint.powerUps.map(p => ({ ...p })),
      projectiles: [],
      continueInvincibility: 3.0,
      camera: { ...checkpoint.camera },
      snake: {
        head: restoredHead,
        velocity: restoredVelocity,
        angle: checkpoint.snakeAngle,
        segments: checkpoint.snakeSegments.map(s => ({ ...s })),
        length: checkpoint.snakeLength,
        evolutionStage: Math.floor(checkpoint.snakeLength / 10),
      },
      deathCheckpoint: null,
    });
    
    return true;
  },
  
  clearDeathCheckpoint: () => {
    set({ deathCheckpoint: null });
  },
  
  updateContinueInvincibility: (time: number) => {
    set({ continueInvincibility: time });
  },
  
  decrementContinueInvincibility: (delta: number) => {
    set((state) => ({
      continueInvincibility: Math.max(0, state.continueInvincibility - delta),
    }));
  },
  
  startFromSpecificLevel: (level: number) => {
    const targetLevel = Math.max(1, Math.min(50, level));
    const world = getWorldForLevel(targetLevel);
    const currentHighScore = get().highScore;
    
    set({
      score: 0,
      combo: 0,
      comboTimer: 0,
      level: 1,
      distance: 0,
      levelDistance: 0,
      maxReachedX: 100,
      currentLevel: targetLevel,
      currentWorldId: world.id,
      inBonusScene: false,
      isBeingChased: false,
      bonusPowerUpsCollected: 0,
      activeMaze: null,
      mazeSpawnedThisLevel: false,
      mazeCompletedThisLevel: false,
      mazeCountdown: 0,
      levelObjectives: getLevelObjectives(targetLevel),
      objectiveProgress: {},
      spawnedObjectiveItems: {},
      deathCheckpoint: null,
      continueInvincibility: 0,
      speedReductionActive: false,
      speedReductionEndTime: 0,
      speedReductionUsedThisLevel: false,
      gravityDisabledActive: false,
      gravityDisabledEndTime: 0,
      gravityDisabledUsedThisLevel: false,
      highScore: currentHighScore,
      environment: "jungle",
      snake: {
        head: { x: 100, y: 300 },
        velocity: { x: 3, y: 0 },
        angle: 0,
        segments: [],
        length: 5,
        evolutionStage: 0,
      },
      camera: {
        x: 0,
        y: 0,
        zoom: 1,
      },
      worldScroll: 0,
      bugs: [],
      obstacles: [],
      pipes: [],
      powerUps: [],
      activePowerUps: [],
      projectiles: [],
    });
  },
  
  activateSpeedReduction: (durationSeconds: number) => {
    const endTime = Date.now() + (durationSeconds * 1000);
    set({
      speedReductionActive: true,
      speedReductionEndTime: endTime,
      speedReductionUsedThisLevel: true,
    });
  },
  
  updateSpeedReduction: (currentTime: number) => {
    const state = get();
    if (state.speedReductionActive && currentTime >= state.speedReductionEndTime) {
      set({
        speedReductionActive: false,
        speedReductionEndTime: 0,
      });
    }
  },
  
  canShowSpeedReductionAd: () => {
    const state = get();
    // Show ad offer at level 10+ when speed reduction hasn't been used this level
    // and speed reduction is not currently active
    return state.currentLevel >= 10 && 
           !state.speedReductionUsedThisLevel && 
           !state.speedReductionActive;
  },
  
  activateGravityDisabled: (durationSeconds: number) => {
    const endTime = Date.now() + (durationSeconds * 1000);
    set({
      gravityDisabledActive: true,
      gravityDisabledEndTime: endTime,
      gravityDisabledUsedThisLevel: true,
    });
  },
  
  updateGravityDisabled: (currentTime: number) => {
    const state = get();
    if (state.gravityDisabledActive && currentTime >= state.gravityDisabledEndTime) {
      set({
        gravityDisabledActive: false,
        gravityDisabledEndTime: 0,
      });
    }
  },
  
  canShowGravityDisabledAd: () => {
    const state = get();
    // Show ad offer at level 31+ (Ice World and Neon Cave) when gravity disabled hasn't been used this level
    // and gravity disabled is not currently active
    return state.currentLevel >= 31 && 
           !state.gravityDisabledUsedThisLevel && 
           !state.gravityDisabledActive;
  },
}));
