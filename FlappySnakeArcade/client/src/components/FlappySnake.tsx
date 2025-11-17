import { useEffect, useRef, useState } from "react";
import { useFlappySnake, type Bug, type Obstacle, type Pipe, type PowerUp, type SnakeSegment, type ActivePowerUp, type Projectile, type Environment, type MazeCell } from "@/lib/stores/useFlappySnake";
import { useGame } from "@/lib/stores/useGame";
import { useAudio } from "@/lib/stores/useAudio";
import { getWorldForLevel } from "@/lib/config/worldConfig";
import { calculateDifficulty } from "@/lib/config/difficulty";
import { LevelCompleteOverlay } from "./LevelCompleteOverlay";
import { WorldUnlockCelebration } from "./WorldUnlockCelebration";
import { MainMenu } from "./MainMenu";
import { saveProgress, clearProgress } from "@/lib/gameProgress";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.08;
const TURN_RATE = 0.08;
const BASE_SPEED = 3.0;
const PIPE_SPACING = 400;
const PIPE_WIDTH = 60;
const MIN_PIPE_HEIGHT = 100;
const MAX_PIPE_HEIGHT = 350;
const PIPE_GAP = 180;

export default function FlappySnake() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const lastShotTimeRef = useRef<number>(0);
  const keysPressed = useRef<Set<string>>(new Set());
  
  const { 
    score, 
    combo,
    comboTimer,
    highScore,
    level,
    environment,
    distance,
    levelDistance,
    currentLevel,
    currentWorldId,
    inBonusScene,
    isBeingChased,
    bonusPowerUpsCollected,
    snake, 
    bugs, 
    obstacles, 
    pipes,
    powerUps,
    activePowerUps,
    projectiles,
    camera, 
    worldScroll,
    resetGameState,
    saveHighScore,
    updateScore,
    incrementCombo,
    resetCombo,
    decrementComboTimer,
    updateSnake,
    setBugs,
    setObstacles,
    setPipes,
    setPowerUps,
    setActivePowerUps,
    setProjectiles,
    updateCamera,
    updateWorldScroll,
    updateLevel,
    updateEnvironment,
    updateDistance,
    updateLevelDistance,
    updateCurrentLevel,
    updateCurrentWorldId,
    setInBonusScene,
    setIsBeingChased,
    incrementBonusPowerUps,
    resetBonusPowerUps,
    spawnMaze,
    activeMaze,
    mazeCountdown,
    mazeSpawnedThisLevel,
    mazeCompletedThisLevel,
    updateMazeSnakePos,
    updateMazeCountdown,
    clearMaze,
    levelObjectives,
    objectiveProgress,
    incrementObjectiveProgress,
    checkObjectivesComplete,
  } = useFlappySnake();
  
  const { phase, start, restart, end, completeLevel, worldUnlockMessage, showWorldUnlock, clearWorldUnlock } = useGame();
  
  const { playHit, playSuccess, isMusicMuted, isSoundEffectsMuted, toggleMusicMute, toggleSoundEffectsMute } = useAudio();
  
  const [showSettings, setShowSettings] = useState(false);
  const [mazePaused, setMazePaused] = useState(false);
  
  const [pixelatedClouds] = useState(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      x: i * 200 + Math.random() * 100,
      y: 50 + Math.random() * 100,
      size: 40 + Math.random() * 30,
      speed: 0.3 + Math.random() * 0.2,
    }));
  });
  
  const [jungleElements] = useState(() => {
    return Array.from({ length: 15 }, (_, i) => ({
      x: i * 150 + Math.random() * 100,
      y: 300 + Math.random() * 200,
      type: Math.random() > 0.5 ? "vine" : (Math.random() > 0.5 ? "leaf" : "platform"),
      size: 30 + Math.random() * 20,
      speed: 0.5 + Math.random() * 0.3,
    }));
  });
  
  const [mountains] = useState(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      x: i * 300,
      height: 100 + Math.random() * 100,
      speed: 0.2,
    }));
  });
  
  const [particles, setParticles] = useState<Array<{
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
  }>>([]);

  const handleNewGame = () => {
    clearProgress();
    resetGameState();
    start();
  };

  const handleContinue = (level: number) => {
    const { restoreFromProgress } = useFlappySnake.getState();
    restoreFromProgress(level);
    start();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key);
      
      if (mazePaused && e.key === " ") {
        setMazePaused(false);
        return;
      }
      
      if (phase === "ended" && e.key === " ") {
        resetGameState();
        restart();
      } else if (phase === "levelComplete" && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        const currentLevelBefore = useFlappySnake.getState().currentLevel;
        const currentWorldBefore = getWorldForLevel(currentLevelBefore);
        
        const startNextLevel = useFlappySnake.getState().startNextLevel;
        const { nextLevel } = useGame.getState();
        startNextLevel();
        nextLevel();
        
        const currentLevelAfter = useFlappySnake.getState().currentLevel;
        const currentWorldAfter = getWorldForLevel(currentLevelAfter);
        
        if (currentWorldBefore.id !== currentWorldAfter.id) {
          showWorldUnlock(currentWorldAfter.name, currentWorldAfter.id, currentWorldAfter.description);
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key);
    };
    
    let touchStartX = 0;
    let touchStartY = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      
      if (phase === "ended") {
        resetGameState();
        restart();
      } else if (phase === "levelComplete") {
        e.preventDefault();
        const currentLevelBefore = useFlappySnake.getState().currentLevel;
        const currentWorldBefore = getWorldForLevel(currentLevelBefore);
        
        const startNextLevel = useFlappySnake.getState().startNextLevel;
        const { nextLevel } = useGame.getState();
        startNextLevel();
        nextLevel();
        
        const currentLevelAfter = useFlappySnake.getState().currentLevel;
        const currentWorldAfter = getWorldForLevel(currentLevelAfter);
        
        if (currentWorldBefore.id !== currentWorldAfter.id) {
          showWorldUnlock(currentWorldAfter.name, currentWorldAfter.id, currentWorldAfter.description);
        }
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (phase !== "playing") return;
      
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const deltaX = touchX - touchStartX;
      const deltaY = touchY - touchStartY;
      
      keysPressed.current.clear();
      
      if (Math.abs(deltaX) > 20) {
        if (deltaX > 0) keysPressed.current.add("ArrowRight");
        else keysPressed.current.add("ArrowLeft");
      }
      
      if (Math.abs(deltaY) > 20) {
        if (deltaY > 0) keysPressed.current.add("ArrowDown");
        else keysPressed.current.add("ArrowUp");
      }
      
      touchStartX = touchX;
      touchStartY = touchY;
    };
    
    const handleTouchEnd = () => {
      keysPressed.current.clear();
    };
    
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [phase, start, restart, mazePaused]);

  useEffect(() => {
    if (phase !== "playing") return;
    
    const gameLoop = (currentTime: number) => {
      const deltaTime = lastTimeRef.current ? (currentTime - lastTimeRef.current) / 1000 : 0.016;
      lastTimeRef.current = currentTime;
      
      update(deltaTime);
      render();
      renderUI();
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };
    
    lastTimeRef.current = performance.now();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [phase, snake, bugs, obstacles, pipes, powerUps, activePowerUps, worldScroll, combo, comboTimer]);

  const update = (deltaTime: number) => {
    if (mazePaused) {
      return;
    }
    
    const currentMazeCompleted = useFlappySnake.getState().mazeCompletedThisLevel;
    if (currentMazeCompleted) {
      console.log(`Level ${currentLevel} complete! Maze completed`);
      completeLevel();
      return;
    }
    
    let mazeNearby = false;
    if (activeMaze && !activeMaze.completed) {
      const CELL_SIZE = 60;
      const mazeWidth = CELL_SIZE * 10;
      const mazeScreenX = activeMaze.x - camera.x;
      const mazeRightEdge = mazeScreenX + mazeWidth;
      
      mazeNearby = mazeScreenX < CANVAS_WIDTH && mazeRightEdge > 0;
    }
    
    const currentWorld = getWorldForLevel(currentLevel);
    const difficulty = calculateDifficulty(currentLevel, currentWorld);
    const SPEED = difficulty.scrollSpeed;
    
    let newAngle = snake.angle;
    let newVelocityX = snake.velocity.x;
    let newVelocityY = snake.velocity.y;
    
    if (mazeNearby) {
      const MAZE_SPEED = 2.5;
      
      if (keysPressed.current.has("ArrowUp")) {
        newAngle = -Math.PI / 2;
      } else if (keysPressed.current.has("ArrowDown")) {
        newAngle = Math.PI / 2;
      } else if (keysPressed.current.has("ArrowLeft")) {
        newAngle = Math.PI;
      } else if (keysPressed.current.has("ArrowRight")) {
        newAngle = 0;
      }
      
      newVelocityX = Math.cos(newAngle) * MAZE_SPEED;
      newVelocityY = Math.sin(newAngle) * MAZE_SPEED;
    } else {
      let turnDirection = 0;
      
      if (keysPressed.current.has("ArrowUp")) {
        const targetAngle = -Math.PI / 2;
        let angleDiff = targetAngle - newAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        turnDirection = Math.sign(angleDiff);
      } else if (keysPressed.current.has("ArrowDown")) {
        const targetAngle = Math.PI / 2;
        let angleDiff = targetAngle - newAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        turnDirection = Math.sign(angleDiff);
      } else if (keysPressed.current.has("ArrowLeft")) {
        const targetAngle = Math.PI;
        let angleDiff = targetAngle - newAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        turnDirection = Math.sign(angleDiff);
      } else if (keysPressed.current.has("ArrowRight")) {
        const targetAngle = 0;
        let angleDiff = targetAngle - newAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        turnDirection = Math.sign(angleDiff);
      }
      
      newAngle += turnDirection * TURN_RATE;
      
      newVelocityX = Math.cos(newAngle) * SPEED;
      newVelocityY = Math.sin(newAngle) * SPEED;
      
      newVelocityY += GRAVITY * deltaTime * 60;
    }
    
    const hasGhostMode = activePowerUps.some(p => p.type === "ghost");
    const hasShield = activePowerUps.some(p => p.type === "shield");
    const hasSpeed = activePowerUps.some(p => p.type === "speed");
    const speedMultiplier = hasSpeed ? 1.5 : 1;
    
    let newHeadX = snake.head.x + newVelocityX * speedMultiplier;
    let newHeadY = snake.head.y + newVelocityY * speedMultiplier;
    
    if (!hasGhostMode) {
      if (newHeadY < 0) newHeadY = 0;
      if (newHeadY > CANVAS_HEIGHT) {
        saveHighScore();
        end();
        playHit();
        return;
      }
    }
    
    const newSegments: SnakeSegment[] = [
      { x: snake.head.x, y: snake.head.y, size: 12 },
      ...snake.segments.slice(0, snake.length - 1)
    ];
    
    updateSnake({
      head: { x: newHeadX, y: newHeadY },
      velocity: { x: newVelocityX, y: newVelocityY },
      angle: newAngle,
      segments: newSegments,
    });
    
    if (activeMaze && mazeCountdown <= 0 && !activeMaze.completed) {
      const CELL_SIZE = 60;
      const MAZE_OFFSET_Y = 0;
      const relativeX = newHeadX - activeMaze.x;
      const relativeY = newHeadY - MAZE_OFFSET_Y;
      
      const gridX = Math.floor(relativeX / CELL_SIZE);
      const gridY = Math.floor(relativeY / CELL_SIZE);
      
      const objectivesComplete = checkObjectivesComplete();
      if (!objectivesComplete && newHeadX >= activeMaze.x) {
        newHeadX = activeMaze.x - 1;
        newVelocityX = Math.min(newVelocityX, 0);
        updateSnake({
          head: { x: newHeadX, y: newHeadY },
          velocity: { x: newVelocityX, y: newVelocityY }
        });
      }
      
      if (gridX >= 0 && gridX < 10 && gridY >= 0 && gridY < 10) {
        const cell = activeMaze.grid[gridY][gridX];
        
        const cellLocalX = relativeX - gridX * CELL_SIZE;
        const cellLocalY = relativeY - gridY * CELL_SIZE;
        
        const distanceToMaze = activeMaze.x - newHeadX;
        const TRANSITION_DISTANCE = 300;
        let currentScale = 1.0;
        if (distanceToMaze < TRANSITION_DISTANCE && distanceToMaze > -CELL_SIZE * 10 - 100) {
          if (distanceToMaze > 0) {
            const progress = 1 - (distanceToMaze / TRANSITION_DISTANCE);
            currentScale = 1.0 - (progress * 0.6);
          } else {
            currentScale = 0.4;
          }
        }
        const headRadius = 16 * currentScale;
        
        let hitWall = false;
        
        if (cell.walls.top && cellLocalY - headRadius < 0) hitWall = true;
        if (cell.walls.bottom && cellLocalY + headRadius > CELL_SIZE) hitWall = true;
        if (cell.walls.left && cellLocalX - headRadius < 0) hitWall = true;
        if (cell.walls.right && cellLocalX + headRadius > CELL_SIZE) hitWall = true;
        
        if (hitWall && !hasGhostMode) {
          saveHighScore();
          end();
          playHit();
          return;
        }
        
        if (cell.isExit && !activeMaze.completed) {
          updateScore(200);
          playSuccess();
          const completedMaze = {
            ...activeMaze,
            completed: true
          };
          useFlappySnake.setState({ 
            activeMaze: completedMaze,
            mazeCompletedThisLevel: true 
          });
          setMazePaused(false);
        }
      }
    }
    
    if (activeMaze && activeMaze.completed) {
      const CELL_SIZE = 60;
      const mazeEndX = activeMaze.x + CELL_SIZE * 10;
      const SAFE_DISTANCE = 300;
      
      if (newHeadX > mazeEndX + SAFE_DISTANCE) {
        clearMaze();
      }
    }
    
    const newWorldScroll = worldScroll + SPEED * 0.6;
    updateWorldScroll(newWorldScroll);
    
    updateCamera({
      x: newHeadX - CANVAS_WIDTH / 3,
      y: newHeadY - CANVAS_HEIGHT / 2,
      zoom: Math.max(0.8, 1 - snake.length * 0.005),
    });
    
    let newBugs = bugs.filter(b => Math.abs(b.x - newHeadX) < 1200);
    const hasMagnet = activePowerUps.some(p => p.type === "magnet");
    
    for (let i = newBugs.length - 1; i >= 0; i--) {
      const bug = newBugs[i];
      bug.glowPhase += 0.1;
      
      if (hasMagnet) {
        const dx = newHeadX - bug.x;
        const dy = newHeadY - bug.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 400) {
          bug.x += (dx / dist) * 4;
          bug.y += (dy / dist) * 4;
        }
      }
      
      const dx = newHeadX - bug.x;
      const dy = newHeadY - bug.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 20) {
        newBugs.splice(i, 1);
        
        levelObjectives.forEach(objective => {
          if (objective.targetFruitType === bug.type) {
            incrementObjectiveProgress(objective.type);
          }
        });
        
        const currentCombo = useFlappySnake.getState().combo;
        
        let points = 0;
        let lengthChange = 0;
        let particleCount = 8;
        let particleColor = "#FFA500";
        
        switch (bug.type) {
          case "apple":
            points = 10 + currentCombo * 5;
            lengthChange = 3;
            particleCount = combo > 1 ? 15 : 8;
            particleColor = combo > 1 ? "#FFD700" : "#FF6B6B";
            break;
          case "banana":
            points = 12 + currentCombo * 5;
            lengthChange = 4;
            particleCount = 10;
            particleColor = "#FFD700";
            break;
          case "berry":
            points = 15 + currentCombo * 5;
            lengthChange = 5;
            particleCount = 12;
            particleColor = "#E91E63";
            break;
          case "mango":
            points = 20 + currentCombo * 7;
            lengthChange = 6;
            particleCount = 15;
            particleColor = "#FF9800";
            break;
        }
        
        updateScore(points);
        incrementCombo();
        playSuccess();
        
        const newLength = Math.max(5, snake.length + lengthChange);
        updateSnake({ length: newLength });
        
        const evolutionStage = Math.floor(newLength / 10);
        updateSnake({ evolutionStage });
        
        const newParticles: Array<{id: string; x: number; y: number; vx: number; vy: number; life: number; color: string}> = [];
        for (let p = 0; p < particleCount; p++) {
          newParticles.push({
            id: `particle-${Date.now()}-${Math.random()}`,
            x: bug.x,
            y: bug.y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 1.0,
            color: particleColor,
          });
        }
        setParticles(prev => [...prev, ...newParticles]);
      }
    }
    setBugs(newBugs);
    
    if (!hasGhostMode && mazeCountdown <= 0 && !mazeNearby) {
      let obstaclesAfterCollision = [...obstacles];
      for (let i = obstaclesAfterCollision.length - 1; i >= 0; i--) {
        const obstacle = obstaclesAfterCollision[i];
        
        if (obstacle.isTransitioning || (obstacle.opacity !== undefined && obstacle.opacity < 1)) {
          continue;
        }
        
        if (activeMaze && activeMaze.completed) {
          const CELL_SIZE = 60;
          const mazeStartX = activeMaze.x;
          const mazeEndX = activeMaze.x + CELL_SIZE * 10;
          const SAFE_DISTANCE = 300;
          
          if (obstacle.x >= mazeStartX - 100 && obstacle.x <= mazeEndX + SAFE_DISTANCE) {
            continue;
          }
        }
        
        let collisionY = obstacle.y;
        if (obstacle.type === "cactus") {
          const fullHeight = obstacle.size * 2;
          const stemHeight = fullHeight * 0.6;
          const headSize = obstacle.size * 0.8;
          collisionY = obstacle.y - stemHeight - headSize / 2;
        }
        
        const dx = newHeadX - obstacle.x;
        const dy = newHeadY - collisionY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < obstacle.size + 12) {
          if (snake.length >= 20 || hasShield) {
            obstaclesAfterCollision.splice(i, 1);
            incrementObjectiveProgress("destroy_obstacles");
            if (obstacle.type === "chaser") {
              incrementObjectiveProgress("destroy_chasers");
            }
            playSuccess();
            updateScore(20);
            const destroyParticles: Array<{id: string; x: number; y: number; vx: number; vy: number; life: number; color: string}> = [];
            for (let p = 0; p < 15; p++) {
              destroyParticles.push({
                id: `particle-${Date.now()}-${Math.random()}`,
                x: obstacle.x,
                y: collisionY,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1.0,
                color: hasShield ? "#FFD700" : (obstacle.type === "fireball" ? "#FF8C00" : "#E74C3C"),
              });
            }
            setParticles(prev => [...prev, ...destroyParticles]);
          } else {
            saveHighScore();
            end();
            playHit();
            return;
          }
        }
      }
      setObstacles(obstaclesAfterCollision);
      
      for (const pipe of pipes) {
        if (pipe.isTransitioning || (pipe.opacity !== undefined && pipe.opacity < 1)) {
          continue;
        }
        
        if (activeMaze && activeMaze.completed) {
          const CELL_SIZE = 60;
          const mazeStartX = activeMaze.x;
          const mazeEndX = activeMaze.x + CELL_SIZE * 10;
          const SAFE_DISTANCE = 300;
          
          if (pipe.x >= mazeStartX - 100 && pipe.x <= mazeEndX + SAFE_DISTANCE) {
            continue;
          }
        }
        
        const headRadius = 16;
        const effectiveHeight = pipe.height + (pipe.moveOffset || 0);
        const inPipeX = newHeadX + headRadius > pipe.x && newHeadX - headRadius < pipe.x + PIPE_WIDTH;
        const hitTopPipe = newHeadY - headRadius < effectiveHeight;
        const hitBottomPipe = newHeadY + headRadius > effectiveHeight + pipe.gap;
        
        if (pipe.isSpecial && !pipe.isEntered) {
          continue;
        }
        
        if (inPipeX && (hitTopPipe || hitBottomPipe)) {
          saveHighScore();
          end();
          playHit();
          return;
        }
      }
    }
    
    let newPowerUps = [...powerUps];
    let currentActivePowerUps = [...activePowerUps];
    
    for (let i = newPowerUps.length - 1; i >= 0; i--) {
      const powerUp = newPowerUps[i];
      const dx = newHeadX - powerUp.x;
      const dy = newHeadY - powerUp.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 25) {
        newPowerUps.splice(i, 1);
        incrementObjectiveProgress("collect_powerups");
        playSuccess();
        
        if (inBonusScene) {
          incrementBonusPowerUps();
        }
        
        const newActivePowerUp: ActivePowerUp = {
          type: powerUp.type,
          remainingTime: 5.0,
        };
        currentActivePowerUps = [...currentActivePowerUps.filter(p => p.type !== powerUp.type), newActivePowerUp];
      }
    }
    setPowerUps(newPowerUps);
    
    const updatedActivePowerUps = currentActivePowerUps
      .map(p => ({ ...p, remainingTime: p.remainingTime - deltaTime }))
      .filter(p => p.remainingTime > 0);
    setActivePowerUps(updatedActivePowerUps);
    
    const fruitObjective = levelObjectives.find(obj => obj.targetFruitType);
    const targetFruit = fruitObjective?.targetFruitType;
    
    while (newBugs.length < 10) {
      const fruitTypes: Bug["type"][] = ["apple", "banana", "berry", "mango"];
      let foodType: Bug["type"];
      
      if (targetFruit && Math.random() < 0.7) {
        foodType = targetFruit;
      } else {
        foodType = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
      }
      
      const spawnAhead = Math.random() > 0.3;
      let spawnX = spawnAhead ? newHeadX + 250 + Math.random() * 400 : newHeadX - 250 - Math.random() * 400;
      
      const difficultyFactor = Math.min(currentLevel / 50, 1);
      let spawnY;
      if (Math.random() < difficultyFactor * 0.5) {
        spawnY = Math.random() < 0.5 ? 50 + Math.random() * 80 : CANVAS_HEIGHT - 130 + Math.random() * 80;
      } else {
        spawnY = 100 + Math.random() * (CANVAS_HEIGHT - 200);
      }
      
      const newBug: Bug = {
        id: `bug-${Date.now()}-${Math.random()}`,
        x: spawnX,
        y: spawnY,
        glowPhase: 0,
        type: foodType,
      };
      newBugs.push(newBug);
    }
    setBugs(newBugs);
    
    let newPipes = pipes.filter(p => Math.abs(p.x - newHeadX) < 1500);
    
    const levelGapReduction = Math.min(40, (currentLevel - 1) * 8);
    const levelBasedGap = Math.max(120, PIPE_GAP - levelGapReduction);
    
    while (newPipes.length < 8) {
      const lastPipe = newPipes[newPipes.length - 1];
      let newX = lastPipe ? lastPipe.x + PIPE_SPACING : newHeadX + 500;
      
      if (activeMaze) {
        const CELL_SIZE = 60;
        const mazeEndX = activeMaze.x + CELL_SIZE * 10;
        const SAFE_DISTANCE = 300;
        const minSafeX = mazeEndX + SAFE_DISTANCE;
        
        if (newX >= activeMaze.x - 100 && newX < minSafeX) {
          newX = Math.max(newX, minSafeX);
        }
      }
      
      const newHeight = MIN_PIPE_HEIGHT + Math.random() * (MAX_PIPE_HEIGHT - MIN_PIPE_HEIGHT);
      const hasBug = Math.random() > 0.6;
      const hasSpikes = Math.random() > 0.5;
      
      const isSpecial = currentLevel >= 5 && Math.random() > 0.9;
      const isMoving = currentLevel >= 11 && Math.random() > 0.7;
      
      newPipes.push({
        id: `pipe-${Date.now()}-${Math.random()}`,
        x: newX,
        height: newHeight,
        gap: levelBasedGap,
        hasBug,
        hasSpikes,
        isSpecial,
        isEntered: false,
        isMoving,
        moveSpeed: isMoving ? 0.5 + Math.random() * 0.5 : undefined,
        moveRange: isMoving ? 50 + Math.random() * 50 : undefined,
        moveOffset: isMoving ? 0 : undefined,
        moveDirection: isMoving ? 1 : undefined,
      });
    }
    if (activeMaze) {
      const mazeStartX = activeMaze.x;
      const mazeEndX = activeMaze.x + 600;
      
      newPipes = newPipes.map(pipe => {
        const wasHidden = pipe.x >= mazeStartX - 100 && pipe.x <= mazeEndX + 100;
        const isNowVisible = !activeMaze || pipe.x < mazeStartX - 100 || pipe.x > mazeEndX + 100;
        
        if (wasHidden && !pipe.isTransitioning && pipe.opacity === undefined) {
          return { ...pipe, isTransitioning: true, opacity: 0 };
        }
        
        if (pipe.isTransitioning) {
          const newOpacity = Math.min(1, (pipe.opacity || 0) + deltaTime * 2);
          if (newOpacity >= 1) {
            return { ...pipe, opacity: 1, isTransitioning: false };
          }
          return { ...pipe, opacity: newOpacity };
        }
        
        return { ...pipe, opacity: pipe.opacity === undefined ? 1 : pipe.opacity };
      });
    } else {
      newPipes = newPipes.map(pipe => ({ 
        ...pipe, 
        opacity: 1, 
        isTransitioning: false 
      }));
    }
    
    newPipes = newPipes.map(pipe => {
      if (pipe.isMoving && pipe.moveSpeed !== undefined && pipe.moveRange !== undefined && 
          pipe.moveOffset !== undefined && pipe.moveDirection !== undefined) {
        
        let newOffset = pipe.moveOffset + pipe.moveSpeed * pipe.moveDirection;
        let newDirection = pipe.moveDirection;
        
        if (newOffset > pipe.moveRange) {
          newOffset = pipe.moveRange;
          newDirection = -1;
        } else if (newOffset < -pipe.moveRange) {
          newOffset = -pipe.moveRange;
          newDirection = 1;
        }
        
        return {
          ...pipe,
          moveOffset: newOffset,
          moveDirection: newDirection,
        };
      }
      return pipe;
    });
    
    setPipes(newPipes);
    
    let newObstacles = obstacles.filter(o => {
      if (o.type === "rock" && o.y > CANVAS_HEIGHT + 50) {
        return false;
      }
      return Math.abs(o.x - newHeadX) < 1200;
    });
    
    const currentScore = useFlappySnake.getState().score;
    const difficultyMultiplier = 1 + Math.floor(currentScore / 100) * 0.1;
    const spawnChance = Math.max(0.94, 0.98 - Math.floor(currentScore / 50) * 0.005);
    
    const currentEnv = useFlappySnake.getState().environment;
    const hasIce = activePowerUps.some(p => p.type === "ice");
    const slowMultiplier = hasIce ? 0.5 : 1;
    
    if (currentEnv === "water" && newObstacles.length < 8 && Math.random() > 0.96) {
      const swimDir = Math.random() > 0.5 ? 1 : -1;
      newObstacles.push({
        id: `fish-${Date.now()}-${Math.random()}`,
        type: "fish",
        x: swimDir > 0 ? newHeadX - 200 : newHeadX + 800,
        y: 100 + Math.random() * (CANVAS_HEIGHT - 200),
        size: 20,
        velocityX: swimDir * (2 + Math.random()) * difficultyMultiplier,
        velocityY: (Math.random() - 0.5) * 0.5,
        swimDirection: swimDir,
      });
    }
    
    if (newObstacles.length < 6 && Math.random() > spawnChance) {
      const obstacleType = Math.random();
      const spawnAhead = Math.random() > 0.3;
      newObstacles.push({
        id: `obstacle-${Date.now()}-${Math.random()}`,
        type: obstacleType > 0.7 ? "fireball" : (obstacleType > 0.35 ? "blob" : "spike"),
        x: spawnAhead ? newHeadX + 400 + Math.random() * 300 : newHeadX - 400 - Math.random() * 300,
        y: 100 + Math.random() * (CANVAS_HEIGHT - 200),
        size: 15,
        velocityX: obstacleType > 0.7 ? -2 * difficultyMultiplier : undefined,
        velocityY: obstacleType > 0.7 ? (Math.random() - 0.5) * 2 : undefined,
      });
    }
    
    const activeChaser = newObstacles.filter(o => o.type === "chaser");
    if (currentLevel >= 6 && activeChaser.length < 2 && Math.random() > 0.993) {
      newObstacles.push({
        id: `chaser-${Date.now()}-${Math.random()}`,
        type: "chaser",
        x: newHeadX + 600 + Math.random() * 200,
        y: 100 + Math.random() * (CANVAS_HEIGHT - 200),
        size: 18,
        isChasing: false,
        originalX: newHeadX + 600 + Math.random() * 200,
        originalY: 100 + Math.random() * (CANVAS_HEIGHT - 200),
        velocityX: 0,
        velocityY: 0,
      });
    }
    
    if (currentLevel >= 3 && newObstacles.length < 8 && Math.random() > 0.97) {
      for (const pipe of newPipes) {
        if (Math.abs(pipe.x - newHeadX) < 600 && Math.random() > 0.7) {
          const pipeBottomY = pipe.height + pipe.gap;
          newObstacles.push({
            id: `cactus-${Date.now()}-${Math.random()}`,
            type: "cactus",
            x: pipe.x + PIPE_WIDTH / 2,
            y: pipeBottomY,
            size: 20,
            animationPhase: "rising",
            animationTimer: 0,
            pipeY: pipeBottomY,
          });
          break;
        }
      }
    }
    
    if (currentLevel >= 16 && newObstacles.length < 8 && Math.random() > 0.97) {
      newObstacles.push({
        id: `rock-${Date.now()}-${Math.random()}`,
        type: "rock",
        x: newHeadX + 200 + Math.random() * 400,
        y: -20,
        size: 18,
        velocityX: (Math.random() - 0.5) * 1,
        velocityY: 2 + Math.random() * 2,
      });
    }
    
    for (const obstacle of newObstacles) {
      if (obstacle.type === "fireball" && obstacle.velocityX !== undefined) {
        obstacle.x += obstacle.velocityX * slowMultiplier;
        if (obstacle.velocityY !== undefined) {
          obstacle.y += obstacle.velocityY * slowMultiplier;
          if (obstacle.y < 50 || obstacle.y > CANVAS_HEIGHT - 50) {
            obstacle.velocityY *= -1;
          }
        }
      }
      
      if (obstacle.type === "fish" && obstacle.velocityX !== undefined) {
        obstacle.x += obstacle.velocityX * slowMultiplier;
        if (obstacle.velocityY !== undefined) {
          obstacle.y += obstacle.velocityY * slowMultiplier;
          if (obstacle.y < 80 || obstacle.y > CANVAS_HEIGHT - 80) {
            obstacle.velocityY *= -1;
          }
        }
      }
      
      if (obstacle.type === "flame" && obstacle.velocityX !== undefined && obstacle.velocityY !== undefined) {
        obstacle.x += obstacle.velocityX * slowMultiplier;
        obstacle.y += obstacle.velocityY * slowMultiplier;
      }
      
      if (obstacle.type === "rock" && obstacle.velocityX !== undefined && obstacle.velocityY !== undefined) {
        obstacle.x += obstacle.velocityX * slowMultiplier;
        obstacle.y += obstacle.velocityY * slowMultiplier;
        obstacle.velocityY += 0.15;
      }
      
      if (obstacle.type === "chaser") {
        const distToSnake = Math.sqrt(Math.pow(obstacle.x - newHeadX, 2) + Math.pow(obstacle.y - newHeadY, 2));
        
        if (distToSnake < 300 && !obstacle.isChasing) {
          obstacle.isChasing = true;
          setIsBeingChased(true);
        }
        
        if (obstacle.isChasing) {
          const chaseSpeed = 2.5 * slowMultiplier;
          const dx = newHeadX - obstacle.x;
          const dy = newHeadY - obstacle.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            obstacle.velocityX = (dx / dist) * chaseSpeed;
            obstacle.velocityY = (dy / dist) * chaseSpeed;
            obstacle.x += obstacle.velocityX;
            obstacle.y += obstacle.velocityY;
          }
        }
      }
      
      if (obstacle.type === "cactus" && obstacle.animationPhase && obstacle.pipeY !== undefined) {
        const timer = (obstacle.animationTimer || 0) + deltaTime;
        obstacle.animationTimer = timer;
        const fullHeight = obstacle.size * 2;
        
        if (obstacle.animationPhase === "rising") {
          const progress = Math.min(timer / 0.5, 1);
          obstacle.y = obstacle.pipeY + fullHeight - (fullHeight * progress);
          if (progress >= 1) {
            obstacle.animationPhase = "active";
            obstacle.animationTimer = 0;
          }
        } else if (obstacle.animationPhase === "active") {
          obstacle.y = obstacle.pipeY;
          
          if (currentEnv === "fire" && timer > 1.5 && timer < 1.6 && Math.random() > 0.7) {
            newObstacles.push({
              id: `flame-${Date.now()}-${Math.random()}`,
              type: "flame",
              x: obstacle.x + 10,
              y: obstacle.y,
              size: 12,
              velocityX: 3,
              velocityY: -1,
            });
          }
          
          if (timer > 3.0) {
            obstacle.animationPhase = "falling";
            obstacle.animationTimer = 0;
          }
        } else if (obstacle.animationPhase === "falling") {
          const fullHeight = obstacle.size * 2;
          const progress = Math.min(timer / 0.5, 1);
          obstacle.y = obstacle.pipeY + (fullHeight * progress);
        }
      }
    }
    
    newObstacles = newObstacles.filter(o => {
      if (o.type === "cactus" && o.animationPhase === "falling" && (o.animationTimer || 0) > 0.5) {
        return false;
      }
      return true;
    });
    
    const anyChasing = newObstacles.some(o => o.type === "chaser" && o.isChasing);
    if (!anyChasing && isBeingChased) {
      setIsBeingChased(false);
    }
    
    if (activeMaze) {
      const mazeStartX = activeMaze.x;
      const mazeEndX = activeMaze.x + 600;
      
      newObstacles = newObstacles.map(obstacle => {
        const wasHidden = obstacle.x >= mazeStartX - 100 && obstacle.x <= mazeEndX + 100;
        const isNowVisible = !activeMaze || obstacle.x < mazeStartX - 100 || obstacle.x > mazeEndX + 100;
        
        if (wasHidden && !obstacle.isTransitioning && obstacle.opacity === undefined) {
          return { ...obstacle, isTransitioning: true, opacity: 0 };
        }
        
        if (obstacle.isTransitioning) {
          const newOpacity = Math.min(1, (obstacle.opacity || 0) + deltaTime * 2);
          if (newOpacity >= 1) {
            return { ...obstacle, opacity: 1, isTransitioning: false };
          }
          return { ...obstacle, opacity: newOpacity };
        }
        
        return { ...obstacle, opacity: obstacle.opacity === undefined ? 1 : obstacle.opacity };
      });
    } else {
      newObstacles = newObstacles.map(obstacle => ({ 
        ...obstacle, 
        opacity: 1, 
        isTransitioning: false 
      }));
    }
    
    setObstacles(newObstacles);
    
    for (const pipe of newPipes) {
      if (pipe.isSpecial && !pipe.isEntered) {
        const headRadius = 16;
        const effectiveHeight = pipe.height + (pipe.moveOffset || 0);
        const inPipeX = newHeadX + headRadius > pipe.x && newHeadX - headRadius < pipe.x + PIPE_WIDTH;
        const inPipeY = newHeadY > effectiveHeight && newHeadY < effectiveHeight + pipe.gap;
        
        if (inPipeX && inPipeY) {
          pipe.isEntered = true;
          setInBonusScene(true);
          resetBonusPowerUps();
          
          const shooterPowerUp: ActivePowerUp = {
            type: "shooter",
            remainingTime: 10.0,
          };
          
          const newActivePowerUps = currentActivePowerUps.filter(p => p.type !== "shooter");
          newActivePowerUps.push(shooterPowerUp);
          setActivePowerUps(newActivePowerUps);
          playSuccess();
        }
      }
    }
    
    const powerUpSpawnChance = inBonusScene ? 0.97 : 0.995;
    const maxPowerUps = inBonusScene ? 3 : 1;
    
    if (newPowerUps.length < maxPowerUps && Math.random() > powerUpSpawnChance) {
      let powerUpTypes: Array<"magnet" | "ghost" | "shrink" | "shooter" | "shield" | "ice" | "speed"> = ["magnet", "ghost", "shrink", "shooter"];
      
      const currentEnvironment = useFlappySnake.getState().environment;
      if (currentEnvironment === "water") {
        powerUpTypes = [...powerUpTypes, "ice", "ice", "speed"];
      } else if (currentEnvironment === "fire") {
        powerUpTypes = [...powerUpTypes, "shield", "shield", "ice"];
      } else {
        powerUpTypes.push("speed");
      }
      
      newPowerUps.push({
        id: `powerup-${Date.now()}-${Math.random()}`,
        type: powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)],
        x: newHeadX + 350 + Math.random() * 150,
        y: 100 + Math.random() * (CANVAS_HEIGHT - 200),
      });
      setPowerUps(newPowerUps);
    }
    
    if (inBonusScene && bonusPowerUpsCollected >= 3) {
      setInBonusScene(false);
    }
    
    const hasShooter = activePowerUps.some(p => p.type === "shooter");
    let newProjectiles = projectiles.filter(p => Math.abs(p.x - newHeadX) < 1000);
    
    if (hasShooter && keysPressed.current.has(" ")) {
      const timeSinceLastShot = lastTimeRef.current;
      if (!lastShotTimeRef.current || timeSinceLastShot - lastShotTimeRef.current > 200) {
        const projectileSpeed = 8;
        const projVelX = Math.cos(newAngle) * projectileSpeed;
        const projVelY = Math.sin(newAngle) * projectileSpeed;
        
        newProjectiles.push({
          id: `proj-${Date.now()}-${Math.random()}`,
          x: newHeadX,
          y: newHeadY,
          velocityX: projVelX,
          velocityY: projVelY,
        });
        
        lastShotTimeRef.current = timeSinceLastShot;
      }
    }
    
    for (const proj of newProjectiles) {
      proj.x += proj.velocityX;
      proj.y += proj.velocityY;
    }
    
    for (let i = newProjectiles.length - 1; i >= 0; i--) {
      const proj = newProjectiles[i];
      for (let j = newObstacles.length - 1; j >= 0; j--) {
        const obstacle = newObstacles[j];
        
        let projCollisionY = obstacle.y;
        if (obstacle.type === "cactus") {
          const fullHeight = obstacle.size * 2;
          const stemHeight = fullHeight * 0.6;
          const headSize = obstacle.size * 0.8;
          projCollisionY = obstacle.y - stemHeight - headSize / 2;
        }
        
        const dx = proj.x - obstacle.x;
        const dy = proj.y - projCollisionY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < obstacle.size + 5) {
          newProjectiles.splice(i, 1);
          newObstacles.splice(j, 1);
          incrementObjectiveProgress("destroy_obstacles");
          if (obstacle.type === "chaser") {
            incrementObjectiveProgress("destroy_chasers");
          }
          updateScore(10);
          playSuccess();
          
          for (let p = 0; p < 8; p++) {
            const angle = (Math.PI * 2 * p) / 8;
            setParticles(prev => [...prev, {
              id: `particle-${Date.now()}-${p}`,
              x: obstacle.x,
              y: projCollisionY,
              vx: Math.cos(angle) * 3,
              vy: Math.sin(angle) * 3,
              life: 1,
              color: "#FFD700",
            }]);
          }
          break;
        }
      }
    }
    
    setProjectiles(newProjectiles);
    
    setParticles(prev => 
      prev.map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy + 0.2,
        life: p.life - deltaTime * 2,
      })).filter(p => p.life > 0)
    );
    
    decrementComboTimer(deltaTime);
    
    const latestDistance = useFlappySnake.getState().distance;
    const latestLevelDistance = useFlappySnake.getState().levelDistance;
    const newDistance = latestDistance + Math.abs(newVelocityX * speedMultiplier * deltaTime * 60);
    const newLevelDistance = latestLevelDistance + Math.abs(newVelocityX * speedMultiplier * deltaTime * 60);
    updateDistance(newDistance);
    updateLevelDistance(newLevelDistance);
    
    const MAZE_SPAWN_DISTANCE = 3500;
    const MAZE_SPAWN_OFFSET = 800;
    
    const currentMazeSpawned = useFlappySnake.getState().mazeSpawnedThisLevel;
    
    if (!currentMazeSpawned && newLevelDistance >= MAZE_SPAWN_DISTANCE) {
      console.log(`Spawning maze at distance ${newLevelDistance}m for level ${currentLevel}`);
      spawnMaze(newHeadX + MAZE_SPAWN_OFFSET);
    }
    
    const newEnv: Environment = currentLevel >= 9 ? "fire" : (currentLevel >= 5 ? "water" : "jungle");
    if (newEnv !== environment) {
      updateEnvironment(newEnv);
    }
  };

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.save();
    ctx.translate(-camera.x * camera.zoom, -camera.y * camera.zoom);
    ctx.scale(camera.zoom, camera.zoom);
    
    const currentWorld = getWorldForLevel(currentLevel);
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    
    if (currentWorld && currentWorld.theme.backgroundGradient) {
      gradient.addColorStop(0, currentWorld.theme.backgroundColor);
      gradient.addColorStop(1, currentWorld.theme.groundColor);
    } else if (environment === "water") {
      gradient.addColorStop(0, "#1E90FF");
      gradient.addColorStop(1, "#4682B4");
    } else if (environment === "fire") {
      gradient.addColorStop(0, "#FF4500");
      gradient.addColorStop(1, "#8B0000");
    } else {
      gradient.addColorStop(0, "#87CEEB");
      gradient.addColorStop(1, "#E0F6FF");
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(camera.x, camera.y, CANVAS_WIDTH / camera.zoom, CANVAS_HEIGHT / camera.zoom);
    
    for (const mountain of mountains) {
      const mountainX = mountain.x + worldScroll * mountain.speed * 0.1;
      ctx.fillStyle = "rgba(100, 100, 120, 0.3)";
      ctx.beginPath();
      ctx.moveTo((mountainX % (CANVAS_WIDTH + 400)) + camera.x - 200, CANVAS_HEIGHT);
      ctx.lineTo((mountainX % (CANVAS_WIDTH + 400)) + camera.x - 50, CANVAS_HEIGHT - mountain.height);
      ctx.lineTo((mountainX % (CANVAS_WIDTH + 400)) + camera.x + 100, CANVAS_HEIGHT);
      ctx.closePath();
      ctx.fill();
    }
    
    for (const cloud of pixelatedClouds) {
      const cloudX = cloud.x + worldScroll * cloud.speed * 0.3;
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillRect(cloudX % (CANVAS_WIDTH + 200) + camera.x - 100, cloud.y, cloud.size, cloud.size * 0.6);
      ctx.fillRect(cloudX % (CANVAS_WIDTH + 200) + camera.x - 100 + cloud.size * 0.3, cloud.y - cloud.size * 0.3, cloud.size * 0.6, cloud.size * 0.6);
    }
    
    for (const element of jungleElements) {
      const elementX = element.x + worldScroll * element.speed * 0.4;
      const wrappedX = (elementX % (CANVAS_WIDTH + 300)) + camera.x - 150;
      
      if (element.type === "vine") {
        ctx.strokeStyle = "#228B22";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(wrappedX, camera.y);
        ctx.quadraticCurveTo(wrappedX + 10, element.y, wrappedX, element.y + 50);
        ctx.stroke();
        
        ctx.fillStyle = "#32CD32";
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(wrappedX - 5, element.y + i * 20, 10, 8);
        }
      } else if (element.type === "leaf") {
        ctx.fillStyle = "#2E8B57";
        ctx.beginPath();
        ctx.ellipse(wrappedX, element.y, element.size * 0.4, element.size * 0.6, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "#8B4513";
        ctx.fillRect(wrappedX - element.size / 2, element.y, element.size, 15);
        ctx.fillStyle = "#A0522D";
        ctx.fillRect(wrappedX - element.size / 2 + 2, element.y + 2, element.size - 4, 11);
      }
    }
    
    for (const pipe of pipes) {
      let shouldRenderPipe = true;
      if (activeMaze) {
        const mazeStartX = activeMaze.x;
        const mazeEndX = activeMaze.x + 600;
        shouldRenderPipe = pipe.x < mazeStartX - 100 || pipe.x > mazeEndX + 100;
      }
      
      if (shouldRenderPipe) {
        ctx.save();
        if (pipe.opacity !== undefined && pipe.opacity < 1) {
          ctx.globalAlpha = pipe.opacity;
        }
        
        const effectiveHeight = pipe.height + (pipe.moveOffset || 0);
        
        if (pipe.isSpecial) {
          const specialGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
          specialGradient.addColorStop(0, "#FFD700");
          specialGradient.addColorStop(0.5, "#FFA500");
          specialGradient.addColorStop(1, "#FFD700");
          ctx.fillStyle = specialGradient;
        } else {
          ctx.fillStyle = currentWorld ? currentWorld.theme.pipeColor : "#7CCD7C";
        }
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, effectiveHeight);
        ctx.fillRect(pipe.x, effectiveHeight + pipe.gap, PIPE_WIDTH, CANVAS_HEIGHT - effectiveHeight - pipe.gap);
        
        const pipeStrokeColor = pipe.isSpecial ? "#FF8C00" : (currentWorld ? currentWorld.theme.pipeColorVariant : "#5BA55B");
        ctx.strokeStyle = pipeStrokeColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, effectiveHeight);
        ctx.strokeRect(pipe.x, effectiveHeight + pipe.gap, PIPE_WIDTH, CANVAS_HEIGHT - effectiveHeight - pipe.gap);
        
        ctx.fillStyle = pipeStrokeColor;
        ctx.fillRect(pipe.x - 5, 0, PIPE_WIDTH + 10, 30);
        ctx.fillRect(pipe.x - 5, effectiveHeight - 30, PIPE_WIDTH + 10, 30);
        ctx.fillRect(pipe.x - 5, effectiveHeight + pipe.gap, PIPE_WIDTH + 10, 30);
        
        if (pipe.isSpecial && !pipe.isEntered) {
          ctx.fillStyle = "#FFF";
          ctx.font = "bold 14px monospace";
          ctx.textAlign = "center";
          ctx.fillText("⭐", pipe.x + PIPE_WIDTH / 2, effectiveHeight + pipe.gap / 2);
        }
        
        if (pipe.hasSpikes) {
          for (let i = 0; i < 4; i++) {
            ctx.fillStyle = "#FF4444";
            ctx.beginPath();
            ctx.moveTo(pipe.x + i * 15 + 5, effectiveHeight);
            ctx.lineTo(pipe.x + i * 15 + 12, effectiveHeight - 15);
            ctx.lineTo(pipe.x + i * 15 + 19, effectiveHeight);
            ctx.fill();
          }
        }
        
        ctx.restore();
      }
    }
    
    if (activeMaze) {
      const CELL_SIZE = 60;
      const MAZE_OFFSET_Y = (CANVAS_HEIGHT - CELL_SIZE * 10) / 2;
      
      for (let y = 0; y < activeMaze.grid.length; y++) {
        for (let x = 0; x < activeMaze.grid[y].length; x++) {
          const cell = activeMaze.grid[y][x];
          const cellX = activeMaze.x + x * CELL_SIZE;
          const cellY = MAZE_OFFSET_Y + y * CELL_SIZE;
          
          const BRICK_WIDTH = 20;
          const BRICK_HEIGHT = 8;
          const WALL_THICKNESS = 8;
          
          if (cell.walls.top) {
            for (let bx = 0; bx < CELL_SIZE; bx += BRICK_WIDTH) {
              ctx.fillStyle = "#A0522D";
              ctx.fillRect(cellX + bx, cellY, Math.min(BRICK_WIDTH - 2, CELL_SIZE - bx), WALL_THICKNESS);
              ctx.fillStyle = "#8B4513";
              ctx.fillRect(cellX + bx + 1, cellY + 1, Math.min(BRICK_WIDTH - 4, CELL_SIZE - bx - 2), WALL_THICKNESS - 2);
            }
          }
          if (cell.walls.bottom) {
            for (let bx = 0; bx < CELL_SIZE; bx += BRICK_WIDTH) {
              ctx.fillStyle = "#A0522D";
              ctx.fillRect(cellX + bx, cellY + CELL_SIZE - WALL_THICKNESS, Math.min(BRICK_WIDTH - 2, CELL_SIZE - bx), WALL_THICKNESS);
              ctx.fillStyle = "#8B4513";
              ctx.fillRect(cellX + bx + 1, cellY + CELL_SIZE - WALL_THICKNESS + 1, Math.min(BRICK_WIDTH - 4, CELL_SIZE - bx - 2), WALL_THICKNESS - 2);
            }
          }
          if (cell.walls.left) {
            for (let by = 0; by < CELL_SIZE; by += BRICK_HEIGHT) {
              ctx.fillStyle = "#A0522D";
              ctx.fillRect(cellX, cellY + by, WALL_THICKNESS, Math.min(BRICK_HEIGHT - 1, CELL_SIZE - by));
              ctx.fillStyle = "#8B4513";
              ctx.fillRect(cellX + 1, cellY + by + 1, WALL_THICKNESS - 2, Math.min(BRICK_HEIGHT - 3, CELL_SIZE - by - 2));
            }
          }
          if (cell.walls.right) {
            for (let by = 0; by < CELL_SIZE; by += BRICK_HEIGHT) {
              ctx.fillStyle = "#A0522D";
              ctx.fillRect(cellX + CELL_SIZE - WALL_THICKNESS, cellY + by, WALL_THICKNESS, Math.min(BRICK_HEIGHT - 1, CELL_SIZE - by));
              ctx.fillStyle = "#8B4513";
              ctx.fillRect(cellX + CELL_SIZE - WALL_THICKNESS + 1, cellY + by + 1, WALL_THICKNESS - 2, Math.min(BRICK_HEIGHT - 3, CELL_SIZE - by - 2));
            }
          }
        }
      }
      
      for (let y = 0; y < activeMaze.grid.length; y++) {
        for (let x = 0; x < activeMaze.grid[y].length; x++) {
          const cell = activeMaze.grid[y][x];
          const cellX = activeMaze.x + x * CELL_SIZE;
          const cellY = MAZE_OFFSET_Y + y * CELL_SIZE;
          
          if (cell.isEntry) {
            const objectivesComplete = checkObjectivesComplete();
            if (objectivesComplete) {
              ctx.fillStyle = "rgba(0, 255, 0, 0.7)";
              ctx.fillRect(cellX + 10, cellY + 10, CELL_SIZE - 20, CELL_SIZE - 20);
              ctx.fillStyle = "#00FF00";
              ctx.font = "bold 18px monospace";
              ctx.textAlign = "center";
              ctx.fillText("ENTER", cellX + CELL_SIZE / 2, cellY + CELL_SIZE / 2 + 6);
              
              ctx.fillStyle = "#FFD700";
              ctx.font = "bold 50px monospace";
              ctx.fillText("→", cellX - 50, cellY + CELL_SIZE / 2 + 15);
            } else {
              ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
              ctx.fillRect(cellX + 10, cellY + 10, CELL_SIZE - 20, CELL_SIZE - 20);
              ctx.fillStyle = "#FF0000";
              ctx.font = "bold 14px monospace";
              ctx.textAlign = "center";
              ctx.fillText("LOCKED", cellX + CELL_SIZE / 2, cellY + CELL_SIZE / 2 - 5);
              
              ctx.fillStyle = "#FFD700";
              ctx.font = "bold 30px monospace";
              ctx.fillText("🔒", cellX + CELL_SIZE / 2, cellY + CELL_SIZE / 2 + 20);
            }
          } else if (cell.isExit) {
            const time = Date.now() / 500;
            const glow = Math.sin(time) * 0.3 + 0.5;
            ctx.fillStyle = `rgba(255, 215, 0, ${glow * 0.6})`;
            ctx.fillRect(cellX + 10, cellY + 10, CELL_SIZE - 20, CELL_SIZE - 20);
            
            ctx.fillStyle = "#FFD700";
            ctx.font = "bold 36px monospace";
            ctx.textAlign = "center";
            ctx.fillText("★", cellX + CELL_SIZE / 2, cellY + CELL_SIZE / 2 + 12);
          }
        }
      }
    }
    
    for (const obstacle of obstacles) {
      let shouldRenderObstacle = true;
      if (activeMaze) {
        const mazeStartX = activeMaze.x;
        const mazeEndX = activeMaze.x + 600;
        shouldRenderObstacle = obstacle.x < mazeStartX - 100 || obstacle.x > mazeEndX + 100;
      }
      
      if (shouldRenderObstacle) {
        ctx.save();
        if (obstacle.opacity !== undefined && obstacle.opacity < 1) {
          ctx.globalAlpha = obstacle.opacity;
        }
        
        if (obstacle.type === "blob") {
        ctx.fillStyle = "#9B59B6";
        ctx.beginPath();
        ctx.arc(obstacle.x, obstacle.y, obstacle.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#8E44AD";
        ctx.beginPath();
        ctx.arc(obstacle.x - 5, obstacle.y - 5, obstacle.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (obstacle.type === "fireball") {
        const fireGradient = ctx.createRadialGradient(obstacle.x, obstacle.y, 0, obstacle.x, obstacle.y, obstacle.size);
        fireGradient.addColorStop(0, "#FFD700");
        fireGradient.addColorStop(0.4, "#FF8C00");
        fireGradient.addColorStop(0.7, "#FF4500");
        fireGradient.addColorStop(1, "rgba(255, 0, 0, 0.3)");
        ctx.fillStyle = fireGradient;
        ctx.beginPath();
        ctx.arc(obstacle.x, obstacle.y, obstacle.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#FFF";
        ctx.beginPath();
        ctx.arc(obstacle.x - 3, obstacle.y - 3, obstacle.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (obstacle.type === "cactus") {
        const fullHeight = obstacle.size * 2;
        const stemHeight = fullHeight * 0.6;
        const headSize = obstacle.size * 0.8;
        
        ctx.fillStyle = "#228B22";
        ctx.fillRect(obstacle.x - 6, obstacle.y - stemHeight, 12, stemHeight);
        
        ctx.fillStyle = environment === "fire" ? "#DC143C" : "#FF6347";
        ctx.beginPath();
        ctx.ellipse(obstacle.x, obstacle.y - stemHeight - headSize / 2, headSize, headSize * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#FFF";
        ctx.beginPath();
        ctx.arc(obstacle.x - headSize * 0.3, obstacle.y - stemHeight - headSize / 2 - 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(obstacle.x + headSize * 0.3, obstacle.y - stemHeight - headSize / 2 - 2, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(obstacle.x - headSize * 0.3, obstacle.y - stemHeight - headSize / 2 - 2, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(obstacle.x + headSize * 0.3, obstacle.y - stemHeight - headSize / 2 - 2, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = "#8B0000";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(obstacle.x, obstacle.y - stemHeight - headSize / 2 + 5, headSize * 0.4, 0, Math.PI);
        ctx.stroke();
      } else if (obstacle.type === "fish") {
        const fishGradient = ctx.createRadialGradient(obstacle.x, obstacle.y, 0, obstacle.x, obstacle.y, obstacle.size);
        fishGradient.addColorStop(0, "#00CED1");
        fishGradient.addColorStop(0.7, "#4682B4");
        fishGradient.addColorStop(1, "#1E90FF");
        ctx.fillStyle = fishGradient;
        
        ctx.save();
        ctx.translate(obstacle.x, obstacle.y);
        if ((obstacle.swimDirection || 1) < 0) ctx.scale(-1, 1);
        
        ctx.beginPath();
        ctx.ellipse(0, 0, obstacle.size, obstacle.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#FFF";
        ctx.beginPath();
        ctx.arc(-obstacle.size * 0.4, -obstacle.size * 0.2, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#4682B4";
        ctx.beginPath();
        ctx.moveTo(obstacle.size * 0.8, 0);
        ctx.lineTo(obstacle.size * 1.3, -obstacle.size * 0.3);
        ctx.lineTo(obstacle.size * 1.3, obstacle.size * 0.3);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
      } else if (obstacle.type === "flame") {
        const flameGradient = ctx.createRadialGradient(obstacle.x, obstacle.y, 0, obstacle.x, obstacle.y, obstacle.size);
        flameGradient.addColorStop(0, "#FFF");
        flameGradient.addColorStop(0.3, "#FFD700");
        flameGradient.addColorStop(0.6, "#FF4500");
        flameGradient.addColorStop(1, "rgba(255, 0, 0, 0)");
        ctx.fillStyle = flameGradient;
        ctx.beginPath();
        ctx.arc(obstacle.x, obstacle.y, obstacle.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (obstacle.type === "chaser") {
        const chaserGradient = ctx.createRadialGradient(obstacle.x, obstacle.y, 0, obstacle.x, obstacle.y, obstacle.size);
        if (obstacle.isChasing) {
          chaserGradient.addColorStop(0, "#FF0000");
          chaserGradient.addColorStop(0.5, "#8B0000");
          chaserGradient.addColorStop(1, "#4B0000");
        } else {
          chaserGradient.addColorStop(0, "#FFD700");
          chaserGradient.addColorStop(0.5, "#FFA500");
          chaserGradient.addColorStop(1, "#FF8C00");
        }
        ctx.fillStyle = chaserGradient;
        ctx.beginPath();
        ctx.arc(obstacle.x, obstacle.y, obstacle.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = obstacle.isChasing ? "#FFF" : "#000";
        ctx.beginPath();
        ctx.arc(obstacle.x - 5, obstacle.y - 3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(obstacle.x + 5, obstacle.y - 3, 3, 0, Math.PI * 2);
        ctx.fill();
        
        if (obstacle.isChasing) {
          ctx.strokeStyle = "#FFF";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(obstacle.x, obstacle.y + 5, 5, 0, Math.PI);
          ctx.stroke();
        }
      } else if (obstacle.type === "rock") {
        const rockGradient = ctx.createRadialGradient(
          obstacle.x - obstacle.size * 0.3, 
          obstacle.y - obstacle.size * 0.3, 
          0, 
          obstacle.x, 
          obstacle.y, 
          obstacle.size
        );
        rockGradient.addColorStop(0, "#A9A9A9");
        rockGradient.addColorStop(0.5, "#696969");
        rockGradient.addColorStop(1, "#505050");
        ctx.fillStyle = rockGradient;
        ctx.beginPath();
        ctx.arc(obstacle.x, obstacle.y, obstacle.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#D3D3D3";
        ctx.beginPath();
        ctx.arc(obstacle.x - obstacle.size * 0.4, obstacle.y - obstacle.size * 0.4, obstacle.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = "#404040";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(obstacle.x, obstacle.y, obstacle.size, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#E74C3C";
        ctx.beginPath();
        ctx.moveTo(obstacle.x, obstacle.y - obstacle.size);
        ctx.lineTo(obstacle.x + obstacle.size, obstacle.y + obstacle.size);
        ctx.lineTo(obstacle.x - obstacle.size, obstacle.y + obstacle.size);
        ctx.closePath();
        ctx.fill();
      }
      
      ctx.restore();
      }
    }
    
    for (const bug of bugs) {
      const glowSize = 8 + Math.sin(bug.glowPhase) * 3;
      
      if (bug.type === "apple") {
        const appleGradient = ctx.createRadialGradient(bug.x - 3, bug.y - 3, 0, bug.x, bug.y, 10);
        appleGradient.addColorStop(0, "#FF6B6B");
        appleGradient.addColorStop(0.7, "#EE5A6F");
        appleGradient.addColorStop(1, "#C23B52");
        ctx.fillStyle = appleGradient;
        ctx.beginPath();
        ctx.arc(bug.x, bug.y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#4CAF50";
        ctx.beginPath();
        ctx.arc(bug.x + 3, bug.y - 6, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = "#2E7D32";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bug.x + 3, bug.y - 6);
        ctx.lineTo(bug.x + 1, bug.y - 3);
        ctx.stroke();
      } else if (bug.type === "banana") {
        const bananaGradient = ctx.createRadialGradient(bug.x - 5, bug.y, 0, bug.x, bug.y, 12);
        bananaGradient.addColorStop(0, "#FFEB3B");
        bananaGradient.addColorStop(0.7, "#FFD700");
        bananaGradient.addColorStop(1, "#FFC107");
        ctx.fillStyle = bananaGradient;
        ctx.beginPath();
        ctx.arc(bug.x - 3, bug.y - 2, 4, 0.3, Math.PI * 1.5);
        ctx.arc(bug.x, bug.y + 1, 5, Math.PI * 1.5, Math.PI * 0.3);
        ctx.arc(bug.x + 3, bug.y - 2, 4, Math.PI * 0.3, Math.PI * 1.5);
        ctx.fill();
        
        ctx.strokeStyle = "#FF9800";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bug.x - 3, bug.y - 4);
        ctx.lineTo(bug.x + 3, bug.y - 4);
        ctx.stroke();
      } else if (bug.type === "berry") {
        const berryGradient = ctx.createRadialGradient(bug.x, bug.y, 0, bug.x, bug.y, 6);
        berryGradient.addColorStop(0, "#E91E63");
        berryGradient.addColorStop(0.7, "#C2185B");
        berryGradient.addColorStop(1, "#880E4F");
        
        ctx.fillStyle = berryGradient;
        ctx.beginPath();
        ctx.arc(bug.x - 2, bug.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bug.x + 2, bug.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bug.x, bug.y - 2, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#4CAF50";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText("••", bug.x, bug.y + 2);
      } else if (bug.type === "mango") {
        const mangoGradient = ctx.createRadialGradient(bug.x - 3, bug.y - 3, 0, bug.x, bug.y, 10);
        mangoGradient.addColorStop(0, "#FFD54F");
        mangoGradient.addColorStop(0.5, "#FFB300");
        mangoGradient.addColorStop(1, "#FF6F00");
        ctx.fillStyle = mangoGradient;
        
        ctx.beginPath();
        ctx.ellipse(bug.x, bug.y, 7, 9, 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#8BC34A";
        ctx.beginPath();
        ctx.arc(bug.x + 2, bug.y - 7, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = "#689F38";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bug.x + 2, bug.y - 7);
        ctx.lineTo(bug.x + 1, bug.y - 4);
        ctx.stroke();
      }
    }
    
    for (const powerUp of powerUps) {
      const powerUpColor = powerUp.type === "magnet" ? "#3498DB" : 
                          (powerUp.type === "ghost" ? "#E67E22" : 
                          (powerUp.type === "shooter" ? "#E74C3C" :
                          (powerUp.type === "shield" ? "#FFD700" :
                          (powerUp.type === "ice" ? "#00FFFF" :
                          (powerUp.type === "speed" ? "#32CD32" : "#9B59B6")))));
      const powerUpLabel = powerUp.type === "magnet" ? "M" : 
                          (powerUp.type === "ghost" ? "G" : 
                          (powerUp.type === "shooter" ? "⚡" :
                          (powerUp.type === "shield" ? "🛡" :
                          (powerUp.type === "ice" ? "❄" :
                          (powerUp.type === "speed" ? "⚡" : "S")))));
      
      ctx.fillStyle = powerUpColor;
      ctx.strokeStyle = "#FFF";
      ctx.lineWidth = 2;
      ctx.fillRect(powerUp.x - 12, powerUp.y - 12, 24, 24);
      ctx.strokeRect(powerUp.x - 12, powerUp.y - 12, 24, 24);
      
      ctx.fillStyle = "#FFF";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(powerUpLabel, powerUp.x, powerUp.y);
    }
    
    for (const proj of projectiles) {
      ctx.fillStyle = "#FFD700";
      ctx.strokeStyle = "#FF8C00";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      const glowGradient = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, 10);
      glowGradient.addColorStop(0, "rgba(255, 215, 0, 0.6)");
      glowGradient.addColorStop(1, "rgba(255, 215, 0, 0)");
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const hasShrink = activePowerUps.some(p => p.type === "shrink");
    const segmentsToShow = hasShrink ? Math.ceil(snake.segments.length * 0.3) : snake.segments.length;
    
    let mazeScale = 1.0;
    if (activeMaze) {
      const CELL_SIZE = 60;
      const distanceToMaze = activeMaze.x - snake.head.x;
      const TRANSITION_DISTANCE = 300;
      
      if (distanceToMaze < TRANSITION_DISTANCE && distanceToMaze > -CELL_SIZE * 10 - 100) {
        if (distanceToMaze > 0) {
          const progress = 1 - (distanceToMaze / TRANSITION_DISTANCE);
          mazeScale = 1.0 - (progress * 0.6);
        } else {
          mazeScale = 0.4;
        }
      }
    }
    
    for (let i = segmentsToShow - 1; i >= 0; i--) {
      if (i >= snake.segments.length) continue;
      const segment = snake.segments[i];
      const alpha = 1 - (i / snake.segments.length) * 0.3;
      
      const baseHue = 120;
      const hue = baseHue + (snake.evolutionStage * 15);
      
      const scaledSegmentSize = segment.size * mazeScale;
      
      const gradient = ctx.createRadialGradient(
        segment.x - scaledSegmentSize * 0.3, segment.y - scaledSegmentSize * 0.3, 0,
        segment.x, segment.y, scaledSegmentSize
      );
      gradient.addColorStop(0, `hsla(${hue}, 60%, 55%, ${alpha})`);
      gradient.addColorStop(0.6, `hsla(${hue}, 70%, 40%, ${alpha})`);
      gradient.addColorStop(1, `hsla(${hue}, 60%, 25%, ${alpha * 0.7})`);
      ctx.fillStyle = gradient;
      
      ctx.beginPath();
      ctx.arc(segment.x, segment.y, scaledSegmentSize * 0.85, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = `hsla(${hue}, 50%, 30%, ${alpha * 0.5})`;
      ctx.lineWidth = 2 * mazeScale;
      ctx.beginPath();
      ctx.arc(segment.x, segment.y, scaledSegmentSize * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      
      if (i % 2 === 0) {
        ctx.fillStyle = `hsla(${hue + 10}, 40%, 45%, ${alpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(segment.x + 3 * mazeScale, segment.y - 2 * mazeScale, scaledSegmentSize * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    const headHue = 120 + (snake.evolutionStage * 15);
    ctx.save();
    ctx.translate(snake.head.x, snake.head.y);
    ctx.rotate(snake.angle);
    
    const headWidth = 16 * mazeScale;
    const headHeight = 11 * mazeScale;
    
    const headGradient = ctx.createRadialGradient(-5 * mazeScale, 0, 0, 0, 0, 18 * mazeScale);
    headGradient.addColorStop(0, `hsl(${headHue}, 65%, 50%)`);
    headGradient.addColorStop(0.7, `hsl(${headHue}, 70%, 40%)`);
    headGradient.addColorStop(1, `hsl(${headHue}, 60%, 30%)`);
    ctx.fillStyle = headGradient;
    
    ctx.beginPath();
    ctx.ellipse(0, 0, headWidth, headHeight, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = `hsl(${headHue}, 50%, 25%)`;
    ctx.lineWidth = 2 * mazeScale;
    ctx.stroke();
    
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(16 * mazeScale, -4 * mazeScale);
    ctx.lineTo(20 * mazeScale, -2 * mazeScale);
    ctx.lineTo(16 * mazeScale, 0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(16 * mazeScale, 4 * mazeScale);
    ctx.lineTo(20 * mazeScale, 2 * mazeScale);
    ctx.lineTo(16 * mazeScale, 0);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = "#FFF";
    ctx.beginPath();
    ctx.arc(8 * mazeScale, -5 * mazeScale, 4 * mazeScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(8 * mazeScale, 5 * mazeScale, 4 * mazeScale, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(9 * mazeScale, -5 * mazeScale, 2.5 * mazeScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(9 * mazeScale, 5 * mazeScale, 2.5 * mazeScale, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#FFF";
    ctx.beginPath();
    ctx.arc(10 * mazeScale, -6 * mazeScale, 1 * mazeScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(10 * mazeScale, 4 * mazeScale, 1 * mazeScale, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    for (const particle of particles) {
      ctx.globalAlpha = particle.life;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    
    ctx.restore();
  };

  const renderUI = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.fillStyle = "#FFF";
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${score}`, 20, 40);
    
    ctx.fillStyle = "#FFD700";
    ctx.fillText(`Distance: ${Math.floor(distance)}m`, 20, 70);
    
    if (isBeingChased) {
      ctx.fillStyle = "#FF0000";
      ctx.font = "bold 22px monospace";
      ctx.fillText("⚠️ BEING CHASED!", 20, 100);
    }
    
    if (inBonusScene) {
      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 22px monospace";
      ctx.fillText("⭐ BONUS SCENE", 20, inBonusScene && isBeingChased ? 130 : 100);
    }
    
    const currentWorldConfig = getWorldForLevel(currentLevel);
    const levelY = inBonusScene && isBeingChased ? 160 : (isBeingChased || inBonusScene ? 130 : 100);
    const objectiveHeight = levelObjectives.length * 25;
    const hudHeight = Math.max((isBeingChased || inBonusScene) ? (isBeingChased && inBonusScene ? 170 : 140) : 110, levelY + 30 + objectiveHeight);
    
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(10, 10, 320, hudHeight);
    
    ctx.fillStyle = "#00D4FF";
    ctx.font = "bold 20px monospace";
    ctx.fillText(`Level ${currentLevel} - ${currentWorldConfig.name}`, 20, levelY);
    
    let objectiveY = levelY + 30;
    levelObjectives.forEach((objective) => {
      const progress = objectiveProgress[objective.type] || 0;
      const isComplete = progress >= objective.target;
      ctx.fillStyle = isComplete ? "#00FF00" : "#FFFFFF";
      ctx.font = "16px monospace";
      ctx.fillText(`${isComplete ? "✓" : "○"} ${objective.description}: ${progress}/${objective.target}`, 20, objectiveY);
      objectiveY += 25;
    });
    
    if (combo > 1) {
      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 24px monospace";
      ctx.fillText(`Combo x${combo}!`, 20, 100);
    }
    
    if (activePowerUps.length > 0) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(10, 130, 200, activePowerUps.length * 30 + 10);
      
      activePowerUps.forEach((powerUp, i) => {
        ctx.fillStyle = powerUp.type === "magnet" ? "#3498DB" : 
                       (powerUp.type === "ghost" ? "#E67E22" : 
                       (powerUp.type === "shooter" ? "#E74C3C" :
                       (powerUp.type === "shield" ? "#FFD700" :
                       (powerUp.type === "ice" ? "#00FFFF" :
                       (powerUp.type === "speed" ? "#32CD32" : "#9B59B6")))));
        ctx.font = "bold 16px monospace";
        ctx.fillText(`${powerUp.type.toUpperCase()}: ${powerUp.remainingTime.toFixed(1)}s`, 20, 155 + i * 30);
      });
    }
    
    
    if (mazePaused) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 36px monospace";
      ctx.textAlign = "center";
      ctx.fillText("MAZE AHEAD!", CANVAS_WIDTH / 2, 200);
      
      ctx.fillStyle = "#FFF";
      ctx.font = "20px monospace";
      ctx.fillText("Navigate through the maze to the golden star", CANVAS_WIDTH / 2, 250);
      ctx.fillText("Avoid hitting the walls", CANVAS_WIDTH / 2, 280);
      
      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 24px monospace";
      ctx.fillText("Press SPACE to Continue", CANVAS_WIDTH / 2, 350);
    }
    
    if (phase === "ended") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      ctx.fillStyle = "#FF4444";
      ctx.font = "bold 48px monospace";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", CANVAS_WIDTH / 2, 120);
      
      ctx.fillStyle = "#FFF";
      ctx.font = "24px monospace";
      ctx.fillText(`Final Score: ${score}`, CANVAS_WIDTH / 2, 200);
      
      const leaderboardData = localStorage.getItem("flappySnakeLeaderboard");
      let leaderboard: number[] = leaderboardData ? JSON.parse(leaderboardData) : [];
      
      if (!leaderboard.includes(score) && score > 0) {
        leaderboard.push(score);
        leaderboard.sort((a, b) => b - a);
        leaderboard = leaderboard.slice(0, 5);
        localStorage.setItem("flappySnakeLeaderboard", JSON.stringify(leaderboard));
      }
      
      if (leaderboard.length > 0) {
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 20px monospace";
        ctx.fillText("LEADERBOARD", CANVAS_WIDTH / 2, 260);
        
        ctx.fillStyle = "#FFF";
        ctx.font = "18px monospace";
        leaderboard.forEach((s, i) => {
          const color = s === score ? "#FFD700" : "#FFF";
          ctx.fillStyle = color;
          ctx.fillText(`${i + 1}. ${s} points`, CANVAS_WIDTH / 2, 290 + i * 30);
        });
      }
      
      ctx.fillStyle = "#FFD700";
      ctx.font = "20px monospace";
      ctx.fillText("Press SPACE to Restart", CANVAS_WIDTH / 2, 500);
    }
    
  };

  useEffect(() => {
    if (canvasRef.current) {
      render();
      renderUI();
    }
  }, [phase, score, combo, highScore, activePowerUps, mazePaused]);

  return (
    <div style={{ 
      width: "100vw", 
      height: "100vh", 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center",
      background: "linear-gradient(to bottom, #1a1a2e, #16213e)"
    }}>
      <div style={{ position: "relative" }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            border: "4px solid #FFD700",
            borderRadius: "8px",
            boxShadow: "0 0 20px rgba(255, 215, 0, 0.5)",
            imageRendering: "pixelated",
          }}
        />
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "2px solid #FFD700",
            background: "rgba(0, 0, 0, 0.7)",
            color: "#FFD700",
            fontSize: "20px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          ⚙️
        </button>
        
        {showSettings && (
          <div style={{
            position: "absolute",
            top: "60px",
            right: "10px",
            background: "rgba(0, 0, 0, 0.9)",
            border: "3px solid #FFD700",
            borderRadius: "8px",
            padding: "20px",
            minWidth: "250px",
            zIndex: 1000,
          }}>
            <div style={{
              color: "#FFD700",
              fontSize: "20px",
              fontFamily: "monospace",
              fontWeight: "bold",
              marginBottom: "15px",
              textAlign: "center",
            }}>
              SETTINGS
            </div>
            
            <div style={{
              marginBottom: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <span style={{
                color: "#FFF",
                fontSize: "16px",
                fontFamily: "monospace",
              }}>
                Music
              </span>
              <button
                onClick={toggleMusicMute}
                style={{
                  background: isMusicMuted ? "#FF4444" : "#44FF44",
                  border: "none",
                  borderRadius: "20px",
                  padding: "8px 16px",
                  color: "#000",
                  fontSize: "14px",
                  fontFamily: "monospace",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {isMusicMuted ? "OFF" : "ON"}
              </button>
            </div>
            
            <div style={{
              marginBottom: "15px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <span style={{
                color: "#FFF",
                fontSize: "16px",
                fontFamily: "monospace",
              }}>
                Sound Effects
              </span>
              <button
                onClick={toggleSoundEffectsMute}
                style={{
                  background: isSoundEffectsMuted ? "#FF4444" : "#44FF44",
                  border: "none",
                  borderRadius: "20px",
                  padding: "8px 16px",
                  color: "#000",
                  fontSize: "14px",
                  fontFamily: "monospace",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {isSoundEffectsMuted ? "OFF" : "ON"}
              </button>
            </div>
            
            <div style={{
              marginTop: "15px",
              paddingTop: "15px",
              borderTop: "1px solid #444",
            }}>
              <button
                onClick={() => {
                  resetGameState();
                  restart();
                  setShowSettings(false);
                }}
                style={{
                  width: "100%",
                  background: "#FFD700",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px",
                  color: "#000",
                  fontSize: "16px",
                  fontFamily: "monospace",
                  fontWeight: "bold",
                  cursor: "pointer",
                  marginBottom: "10px",
                }}
              >
                NEW GAME
              </button>
              
              {phase === "ended" && (
                <button
                  onClick={() => {
                    start();
                    setShowSettings(false);
                  }}
                  style={{
                    width: "100%",
                    background: "#44FF44",
                    border: "none",
                    borderRadius: "8px",
                    padding: "12px",
                    color: "#000",
                    fontSize: "16px",
                    fontFamily: "monospace",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  CONTINUE
                </button>
              )}
            </div>
            
            <div style={{
              color: "#AAA",
              fontSize: "12px",
              fontFamily: "monospace",
              marginTop: "10px",
              textAlign: "center",
            }}>
              Level up every 50 points!<br/>
              Speed increases each level
            </div>
          </div>
        )}
        
        {phase === "levelComplete" && (
          <LevelCompleteOverlay
            currentLevel={currentLevel}
            worldName={getWorldForLevel(currentLevel).name}
            score={score}
            distance={distance}
          />
        )}
        
        {worldUnlockMessage && (
          <WorldUnlockCelebration
            worldName={worldUnlockMessage.worldName}
            worldId={worldUnlockMessage.worldId}
            description={worldUnlockMessage.description}
            onDismiss={clearWorldUnlock}
          />
        )}
        
        {phase === "ready" && (
          <MainMenu
            onNewGame={handleNewGame}
            onContinue={handleContinue}
          />
        )}
      </div>
    </div>
  );
}
