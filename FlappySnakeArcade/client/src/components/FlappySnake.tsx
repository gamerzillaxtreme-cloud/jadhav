import { useEffect, useRef, useState, useCallback } from "react";
import { useFlappySnake, type Bug, type Obstacle, type Pipe, type PowerUp, type SnakeSegment, type ActivePowerUp, type Projectile, type Environment, type MazeCell } from "@/lib/stores/useFlappySnake";
import { useGame } from "@/lib/stores/useGame";
import { useAudio } from "@/lib/stores/useAudio";
import { useAds } from "@/lib/stores/useAds";
import { getWorldForLevel, getExtraGravity } from "@/lib/config/worldConfig";
import { calculateDifficulty } from "@/lib/config/difficulty";
import { LevelCompleteOverlay } from "./LevelCompleteOverlay";
import { WorldUnlockCelebration } from "./WorldUnlockCelebration";
import { MainMenu } from "./MainMenu";
import { LevelSelect } from "./LevelSelect";
import { saveProgress, clearProgress } from "@/lib/gameProgress";
import { TouchController } from "./TouchController";
import { useMobileDetect } from "@/lib/hooks/useMobileDetect";
import { MobileTutorial, useMobileTutorial } from "./MobileTutorial";
import { WebAdOverlay } from "./WebAdOverlay";
import { usePlatform } from "@/lib/hooks/usePlatform";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.08;
const TURN_RATE = 0.08;
const BASE_SPEED = 3.0;
const PIPE_SPACING = 400;
const PIPE_WIDTH = 70; // Must match rendering width
const CAP_HEIGHT = 26; // Height of pipe cap
const CAP_EXTEND = 4;  // How much cap extends beyond pipe body
const MIN_PIPE_HEIGHT = 100;
const MAX_PIPE_HEIGHT = 350;
const PIPE_GAP = 180;

export default function FlappySnake() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const lastShotTimeRef = useRef<number>(0);
  const keysPressed = useRef<Set<string>>(new Set());
  const debugFrameCountRef = useRef<number>(0);
  
  const { isMobile, inputMode } = useMobileDetect();
  const { showTutorial, dismissTutorial } = useMobileTutorial();
  const platform = usePlatform();
  const { initialize: initializeAds, updateCooldown: updateAdCooldown } = useAds();
  const touchMoveUp = useRef(false);
  const touchMoveDown = useRef(false);
  const touchMoveLeft = useRef(false);
  const touchMoveRight = useRef(false);
  
  const [canvasScale, setCanvasScale] = useState(1);
  const [viewportSize, setViewportSize] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
  const [canvasCssDimensions, setCanvasCssDimensions] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
  const [isPortrait, setIsPortrait] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportMetricsRef = useRef({
    cssScale: 1,
    dpr: 1,
    displayWidth: CANVAS_WIDTH,
    displayHeight: CANVAS_HEIGHT,
  });
  
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
    continueInvincibility,
    snake, 
    bugs,
    createDeathCheckpoint,
    restoreFromDeathCheckpoint,
    clearDeathCheckpoint,
    decrementContinueInvincibility,
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
    spawnedObjectiveItems,
    incrementObjectiveProgress,
    incrementSpawnedObjectiveItem,
    getRequiredSpawns,
    checkObjectivesComplete,
    speedReductionActive,
    speedReductionEndTime,
    speedReductionUsedThisLevel,
    activateSpeedReduction,
    updateSpeedReduction,
    canShowSpeedReductionAd,
    gravityDisabledActive,
    gravityDisabledEndTime,
    activateGravityDisabled,
    updateGravityDisabled,
    canShowGravityDisabledAd,
    startFromSpecificLevel,
  } = useFlappySnake();
  
  const { phase, start, restart, continueGame, end, completeLevel, worldUnlockMessage, showWorldUnlock, clearWorldUnlock, openLevelSelect, closeLevelSelect, startFromLevel } = useGame();
  
  const { playHit, playSuccess, playDeath } = useAudio();
  
  const [mazePaused, setMazePaused] = useState(false);
  const [showingAd, setShowingAd] = useState(false);
  const [adCountdown, setAdCountdown] = useState(0);
  const [speedAdCountdown, setSpeedAdCountdown] = useState(0);
  const [watchingSpeedAd, setWatchingSpeedAd] = useState(false);
  const [pendingSpeedReduction, setPendingSpeedReduction] = useState(false); // True when user watched speed ad, apply on next try
  const [gravityAdCountdown, setGravityAdCountdown] = useState(0);
  const [watchingGravityAd, setWatchingGravityAd] = useState(false);
  const [pendingGravityDisabled, setPendingGravityDisabled] = useState(false); // True when user watched gravity ad
  
  const { 
    isAdLoaded, 
    isShowingAd, 
    canUseContinue, 
    useContinue, 
    resetContinues,
    showRewardedAd,
    incrementDeaths,
    continuesUsed,
    maxContinuesPerGame
  } = useAds();
  
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
  
  const [showGameOver, setShowGameOver] = useState(false);
  const isDyingRef = useRef(false);

  useEffect(() => {
    initializeAds();
  }, [initializeAds]);

  const handleTouchFlap = useCallback(() => {
    if (phase !== "playing" || mazePaused || showGameOver) return;
    
    const currentState = useFlappySnake.getState();
    const liveSnake = currentState.snake;
    
    if (liveSnake) {
      const newVelocityY = Math.max(liveSnake.velocity.y - 4.5, -8);
      console.log("[TOUCH DEBUG] Flap triggered:", { oldVelY: liveSnake.velocity.y, newVelY: newVelocityY });
      currentState.updateSnake({ 
        velocity: { x: liveSnake.velocity.x, y: newVelocityY } 
      });
    }
  }, [phase, mazePaused, showGameOver]);

  const handleTouchMoveUp = useCallback((active: boolean) => {
    console.log("[TOUCH DEBUG] MoveUp:", active);
    touchMoveUp.current = active;
  }, []);

  const handleTouchMoveDown = useCallback((active: boolean) => {
    console.log("[TOUCH DEBUG] MoveDown:", active);
    touchMoveDown.current = active;
  }, []);

  const handleTouchMoveLeft = useCallback((active: boolean) => {
    touchMoveLeft.current = active;
  }, []);

  const handleTouchMoveRight = useCallback((active: boolean) => {
    touchMoveRight.current = active;
  }, []);

  const resetTouchControls = useCallback(() => {
    touchMoveUp.current = false;
    touchMoveDown.current = false;
    touchMoveLeft.current = false;
    touchMoveRight.current = false;
    console.log("[TOUCH DEBUG] Reset all touch controls");
  }, []);

  const handleNewGame = () => {
    resetTouchControls();
    clearProgress();
    resetGameState();
    resetContinues();
    clearDeathCheckpoint();
    setShowGameOver(false);
    isDyingRef.current = false;
    start();
  };
  
  const handleDeath = () => {
    if (isDyingRef.current) return; // Prevent multiple death triggers
    isDyingRef.current = true;
    
    createDeathCheckpoint();
    saveHighScore();
    incrementDeaths();
    playHit(); // Play hit sound for death
    
    // Show game over immediately
    setShowGameOver(true);
    end();
  };
  
  const handleWatchAdToContinue = () => {
    if (!canUseContinue()) return;
    
    setShowingAd(true);
    setAdCountdown(5);
    
    const countdownInterval = setInterval(() => {
      setAdCountdown(prev => {
        if (prev <= 0.1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
    
    showRewardedAd(
      () => {
        console.log("[AD] Reward received, attempting to continue...");
        resetTouchControls(); // Reset any stuck touch states
        // Apply any pending effects before continuing
        if (pendingSpeedReduction) {
          console.log("[AD EFFECT] Activating speed reduction for 60 seconds");
          activateSpeedReduction(60);
          setPendingSpeedReduction(false);
        }
        if (pendingGravityDisabled) {
          console.log("[AD EFFECT] Activating gravity disabled for 60 seconds");
          activateGravityDisabled(60);
          setPendingGravityDisabled(false);
        }
        useContinue();
        const restored = restoreFromDeathCheckpoint();
        console.log("[AD] Checkpoint restored:", restored);
        setShowingAd(false);
        setAdCountdown(0);
        setShowGameOver(false);
        isDyingRef.current = false;
        continueGame();
        console.log("[AD] Game continued, phase should be playing now");
      },
      () => {
        setShowingAd(false);
        setAdCountdown(0);
      }
    );
  };
  
  // Handler for watching ad to reduce speed (from game over screen)
  const handleWatchAdToReduceSpeed = () => {
    if (pendingSpeedReduction || currentLevel < 10) return; // Already pending or level too low
    
    setWatchingSpeedAd(true);
    setSpeedAdCountdown(3); // 3 second ad for testing
  };
  
  // Handler for watching ad to disable gravity (from game over screen)
  const handleWatchAdToDisableGravity = () => {
    if (pendingGravityDisabled || currentLevel < 31) return; // Already pending or level too low
    
    setWatchingGravityAd(true);
    setGravityAdCountdown(3); // 3 second ad for testing
  };

  const handleContinue = (level: number) => {
    resetTouchControls(); // Reset any stuck touch states
    const { restoreFromProgress } = useFlappySnake.getState();
    restoreFromProgress(level);
    start();
  };

  const handleLevelSelect = () => {
    openLevelSelect();
  };

  const handleSelectLevel = (level: number) => {
    const { startFromSpecificLevel } = useFlappySnake.getState();
    startFromSpecificLevel(level);
    startFromLevel();
  };

  const handleBackFromLevelSelect = () => {
    closeLevelSelect();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key);
      
      if (mazePaused && e.key === " ") {
        setMazePaused(false);
        return;
      }
      
      if (showGameOver && e.key === " " && !showingAd && !watchingSpeedAd && !watchingGravityAd) {
        const levelToRestart = currentLevel;
        const applySpeedReduction = pendingSpeedReduction;
        const applyGravityDisabled = pendingGravityDisabled;
        console.log("[KEYBOARD] Try Again pressed, level:", levelToRestart, "speedReduction:", applySpeedReduction, "gravityDisabled:", applyGravityDisabled);
        
        // Clear pending flags now
        if (applySpeedReduction) setPendingSpeedReduction(false);
        if (applyGravityDisabled) setPendingGravityDisabled(false);
        
        // Reset and restart at same level
        setShowGameOver(false);
        isDyingRef.current = false;
        resetContinues();
        clearDeathCheckpoint();
        restart();
        // Use setTimeout to allow phase transition to complete
        setTimeout(() => {
          startFromSpecificLevel(levelToRestart);
          // Apply effects AFTER startFromSpecificLevel (which resets them)
          if (applySpeedReduction) {
            console.log("[EFFECT] Activating speed reduction for 60 seconds");
            activateSpeedReduction(60);
          }
          if (applyGravityDisabled) {
            console.log("[EFFECT] Activating gravity disabled for 60 seconds");
            activateGravityDisabled(60);
          }
          start();
        }, 0);
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
      
      if (showGameOver && !showingAd) {
        // Restart at the same level
        const levelToRestart = useFlappySnake.getState().currentLevel;
        setShowGameOver(false);
        isDyingRef.current = false;
        resetContinues();
        clearDeathCheckpoint();
        restart();
        setTimeout(() => {
          startFromSpecificLevel(levelToRestart);
          start();
        }, 0);
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
      if (inputMode === "touch") return;
      
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
      if (inputMode === "touch") return;
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
  }, [phase, start, restart, mazePaused, showingAd, startFromSpecificLevel, currentLevel, inputMode]);

  // Handle speed ad countdown timer (from game over screen)
  useEffect(() => {
    if (!watchingSpeedAd) return;
    if (speedAdCountdown <= 0) {
      // Ad complete - mark as pending so it activates on Continue or Try Again
      setWatchingSpeedAd(false);
      setPendingSpeedReduction(true);
      return;
    }
    
    const timer = setTimeout(() => {
      setSpeedAdCountdown(prev => prev - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [watchingSpeedAd, speedAdCountdown]);

  // Handle gravity ad countdown timer (from game over screen)
  useEffect(() => {
    if (!watchingGravityAd) return;
    if (gravityAdCountdown <= 0) {
      // Ad complete - mark as pending so it activates on restart
      setWatchingGravityAd(false);
      setPendingGravityDisabled(true);
      return;
    }
    
    const timer = setTimeout(() => {
      setGravityAdCountdown(prev => prev - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [watchingGravityAd, gravityAdCountdown]);

  useEffect(() => {
    let lastOrientation: 'portrait' | 'landscape' | null = null;
    let resizeTimeout: NodeJS.Timeout | null = null;
    
    const updateViewport = (force = false) => {
      // Use visualViewport for stable measurements on mobile (avoids browser chrome flickering)
      const visualVP = window.visualViewport;
      const vw = visualVP?.width ?? window.innerWidth;
      const vh = visualVP?.height ?? window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      
      // Check if mobile device is in portrait mode (height > width)
      const portrait = vh > vw && isMobile;
      const currentOrientation = portrait ? 'portrait' : 'landscape';
      
      // On mobile, only update canvas dimensions when orientation truly changes
      // This prevents stutter from dynamic browser chrome on Android
      if (isMobile && !force && lastOrientation === currentOrientation) {
        return;
      }
      lastOrientation = currentOrientation;
      
      setIsPortrait(portrait);
      setViewportSize({ width: vw, height: vh });
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Calculate CSS scale to fit viewport while maintaining 4:3 aspect ratio (contain)
      const scaleX = vw / CANVAS_WIDTH;
      const scaleY = vh / CANVAS_HEIGHT;
      const cssScale = Math.min(scaleX, scaleY);
      
      // CSS display dimensions - locked to 4:3 aspect ratio, never stretched
      const displayWidth = Math.floor(CANVAS_WIDTH * cssScale);
      const displayHeight = Math.floor(CANVAS_HEIGHT * cssScale);
      
      // Set canvas buffer to match CSS display size for crisp rendering
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      
      // Store viewport metrics for render transforms and input handling
      viewportMetricsRef.current = {
        cssScale,
        dpr,
        displayWidth,
        displayHeight,
      };
      
      setCanvasScale(cssScale);
      setCanvasCssDimensions({ width: displayWidth, height: displayHeight });
    };
    
    // Throttled resize handler for mobile stability
    const handleResize = () => {
      if (isMobile) {
        // Throttle updates on mobile to avoid flickering from dynamic browser chrome
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => updateViewport(), 150);
      } else {
        updateViewport(true);
      }
    };
    
    const handleOrientationChange = () => {
      // Orientation change - force update after a brief delay for new dimensions
      setTimeout(() => updateViewport(true), 100);
    };
    
    // Initial update
    updateViewport(true);
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Also listen to visualViewport resize for mobile stability
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, [isMobile]);

  useEffect(() => {
    if (phase !== "playing") return;
    
    debugFrameCountRef.current = 0;
    
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
  }, [phase]);
  
  const update = (deltaTime: number) => {
    updateAdCooldown(deltaTime);
    
    if (mazePaused) {
      return;
    }
    
    const currentState = useFlappySnake.getState();
    const liveSnake = currentState.snake;
    const liveCamera = currentState.camera;
    const liveWorldScroll = currentState.worldScroll;
    const liveContinueInvincibility = currentState.continueInvincibility;
    const liveActiveMaze = currentState.activeMaze;
    const liveCurrentLevel = currentState.currentLevel;
    const liveLevelDistance = currentState.levelDistance;
    const livePipes = currentState.pipes;
    const liveBugs = currentState.bugs;
    const liveObstacles = currentState.obstacles;
    const livePowerUps = currentState.powerUps;
    const liveActivePowerUps = currentState.activePowerUps;
    const liveProjectiles = currentState.projectiles;
    
    if (liveContinueInvincibility > 0) {
      decrementContinueInvincibility(deltaTime);
    }
    
    const isInvincible = liveContinueInvincibility > 0;
    
    const findSafeSpawnY = (spawnX: number, pipes: typeof livePipes): number => {
      const PIPE_WIDTH = 70;
      const margin = 20;
      
      for (const pipe of pipes) {
        if (spawnX >= pipe.x - margin && spawnX <= pipe.x + PIPE_WIDTH + margin) {
          const effectiveHeight = pipe.height + (pipe.moveOffset || 0);
          const gapTop = effectiveHeight + margin;
          const gapBottom = effectiveHeight + pipe.gap - margin;
          const gapHeight = gapBottom - gapTop;
          
          if (gapHeight > 40) {
            return gapTop + Math.random() * gapHeight;
          }
        }
      }
      
      return 80 + Math.random() * (CANVAS_HEIGHT - 160);
    };
    
    const currentMazeCompleted = currentState.mazeCompletedThisLevel;
    
    let mazeNearby = false;
    if (liveActiveMaze && !liveActiveMaze.completed) {
      const MAZE_PLAYABLE = CANVAS_HEIGHT - 80; // 520px playable area
      const mazeGridRowsNearby = liveActiveMaze.grid.length;
      const mazeGridColsNearby = liveActiveMaze.grid[0]?.length || 10;
      const CELL_SIZE = Math.floor(MAZE_PLAYABLE / mazeGridRowsNearby);
      const mazeWidth = CELL_SIZE * mazeGridColsNearby;
      const mazeScreenX = liveActiveMaze.x - liveCamera.x;
      const mazeRightEdge = mazeScreenX + mazeWidth;
      
      mazeNearby = mazeScreenX < CANVAS_WIDTH && mazeRightEdge > 0;
    }
    
    const currentWorld = getWorldForLevel(liveCurrentLevel);
    const liveSpeedReductionActive = useFlappySnake.getState().speedReductionActive;
    const liveGravityDisabledActive = useFlappySnake.getState().gravityDisabledActive;
    
    // Debug log gravity state every 60 frames (about 1 second)
    if (debugFrameCountRef.current % 60 === 0 && currentWorld.mechanics.hasGravity) {
      console.log("[GRAVITY DEBUG]", {
        level: liveCurrentLevel,
        worldHasGravity: currentWorld.mechanics.hasGravity,
        gravityDisabledActive: liveGravityDisabledActive,
        effectiveGravity: currentWorld.mechanics.hasGravity && !liveGravityDisabledActive
      });
    }
    
    const difficulty = calculateDifficulty(liveCurrentLevel, currentWorld, liveSpeedReductionActive);
    const SNAKE_SPEED = difficulty.snakeSpeed;    // Constant speed for snake maneuverability
    const SCROLL_SPEED = difficulty.scrollSpeed;  // Increasing speed for world/obstacles
    
    // Update speed reduction and gravity disabled timers
    updateSpeedReduction(Date.now());
    updateGravityDisabled(Date.now());
    
    let newAngle = liveSnake.angle;
    let newVelocityX = liveSnake.velocity.x;
    let newVelocityY = liveSnake.velocity.y;
    
    const isMovingUp = keysPressed.current.has("ArrowUp") || touchMoveUp.current;
    const isMovingDown = keysPressed.current.has("ArrowDown") || touchMoveDown.current;
    const isMovingLeft = keysPressed.current.has("ArrowLeft") || touchMoveLeft.current;
    const isMovingRight = keysPressed.current.has("ArrowRight") || touchMoveRight.current;
    
    if (mazeNearby) {
      const MAZE_SPEED = 2.5;
      
      if (isMovingUp) {
        newAngle = -Math.PI / 2;
      } else if (isMovingDown) {
        newAngle = Math.PI / 2;
      } else if (isMovingLeft) {
        newAngle = Math.PI;
      } else if (isMovingRight) {
        newAngle = 0;
      }
      
      newVelocityX = Math.cos(newAngle) * MAZE_SPEED;
      newVelocityY = Math.sin(newAngle) * MAZE_SPEED;
    } else {
      let turnDirection = 0;
      
      if (isMovingUp) {
        const targetAngle = -Math.PI / 2;
        let angleDiff = targetAngle - newAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        turnDirection = Math.sign(angleDiff);
      } else if (isMovingDown) {
        const targetAngle = Math.PI / 2;
        let angleDiff = targetAngle - newAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        turnDirection = Math.sign(angleDiff);
      } else if (isMovingLeft) {
        const targetAngle = Math.PI;
        let angleDiff = targetAngle - newAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        turnDirection = Math.sign(angleDiff);
      } else if (isMovingRight) {
        const targetAngle = 0;
        let angleDiff = targetAngle - newAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        turnDirection = Math.sign(angleDiff);
      }
      
      newAngle += turnDirection * TURN_RATE;
      
      // Check if this world has gravity (Ice World and Neon Cave)
      // Gravity can be disabled via ad reward
      const hasWorldGravity = currentWorld.mechanics.hasGravity && !liveGravityDisabledActive;
      
      if (hasWorldGravity) {
        // GRAVITY WORLDS (31-50): Velocity persists, gravity accumulates
        const targetVX = Math.cos(newAngle) * SNAKE_SPEED;
        const targetVY = Math.sin(newAngle) * SNAKE_SPEED;
        
        // X velocity follows angle directly
        newVelocityX = targetVX;
        
        // Start from previous frame's velocity
        newVelocityY = liveSnake.velocity.y;
        
        // Apply gravity FIRST (so steering can counteract it)
        const extraGravity = getExtraGravity(currentLevel, currentWorld);
        newVelocityY += (GRAVITY + extraGravity) * deltaTime * 60;
        
        // Check if player is pressing vertical keys or using touch controls
        const verticalInput = isMovingUp || isMovingDown;
        
        // Adaptive blend: strong when pressing up/down (0.9), weak when idle (0.1)
        // This lets player easily overcome gravity when steering
        const blendStrength = verticalInput ? 0.9 : 0.1;
        newVelocityY += (targetVY - newVelocityY) * blendStrength;
        
        // Clamp vertical velocity to prevent extreme speeds
        const maxVelocity = SNAKE_SPEED * 2.5;
        newVelocityY = Math.max(-maxVelocity, Math.min(maxVelocity, newVelocityY));
        
        // Update angle based on actual velocity for visual consistency
        newAngle = Math.atan2(newVelocityY, newVelocityX);
      } else {
        // NORMAL WORLDS (1-30): Original angle-based movement, no gravity accumulation
        newVelocityX = Math.cos(newAngle) * SNAKE_SPEED;
        newVelocityY = Math.sin(newAngle) * SNAKE_SPEED;
        
        // Apply only base gravity (no accumulation - resets each frame)
        newVelocityY += GRAVITY * deltaTime * 60;
      }
    }
    
    const hasGhostMode = liveActivePowerUps.some(p => p.type === "ghost");
    const hasShield = liveActivePowerUps.some(p => p.type === "shield");
    const hasSpeed = liveActivePowerUps.some(p => p.type === "speed");
    const speedMultiplier = hasSpeed ? 1.5 : 1;
    
    let newHeadX = liveSnake.head.x + newVelocityX * speedMultiplier;
    let newHeadY = liveSnake.head.y + newVelocityY * speedMultiplier;
    
    // Concrete ceiling (45px) and floor (50px) collision
    const CEILING_BOUNDARY = 45;
    const FLOOR_BOUNDARY = CANVAS_HEIGHT - 50;
    
    // Always clamp snake to boundaries (even when invincible or ghost mode)
    // This prevents the snake from escaping the play area
    if (newHeadY < CEILING_BOUNDARY) {
      if (!hasGhostMode && !isInvincible) {
        console.log(`[DEATH] Hit ceiling: snakeY=${newHeadY}, CEILING=${CEILING_BOUNDARY}`);
        handleDeath();
        return;
      }
      // Clamp to boundary when invincible/ghost
      newHeadY = CEILING_BOUNDARY;
      newVelocityY = Math.max(0, newVelocityY); // Bounce off ceiling
    }
    if (newHeadY > FLOOR_BOUNDARY) {
      if (!hasGhostMode && !isInvincible) {
        console.log(`[DEATH] Hit floor: snakeY=${newHeadY}, FLOOR=${FLOOR_BOUNDARY}`);
        handleDeath();
        return;
      }
      // Clamp to boundary when invincible/ghost
      newHeadY = FLOOR_BOUNDARY;
      newVelocityY = Math.min(0, newVelocityY); // Bounce off floor
    }
    
    const newSegments: SnakeSegment[] = [
      { x: liveSnake.head.x, y: liveSnake.head.y, size: 12 },
      ...liveSnake.segments.slice(0, liveSnake.length - 1)
    ];
    
    updateSnake({
      head: { x: newHeadX, y: newHeadY },
      velocity: { x: newVelocityX, y: newVelocityY },
      angle: newAngle,
      segments: newSegments,
    });
    
    const GROUND_HEIGHT = 80;
    const CEILING_HEIGHT = 50; // Start maze below ceiling (ceiling boundary is at 45)
    const PLAYABLE_HEIGHT = CANVAS_HEIGHT - GROUND_HEIGHT - CEILING_HEIGHT; // 470px (below ceiling, above ground)
    // Get actual maze dimensions - grids can vary from 10x10 to 20x20 based on complexity
    const mazeGridRows = liveActiveMaze ? liveActiveMaze.grid.length : 10;
    const mazeGridCols = liveActiveMaze ? (liveActiveMaze.grid[0]?.length || 10) : 10;
    const CELL_SIZE_MAZE = Math.floor(PLAYABLE_HEIGHT / mazeGridRows);
    const mazeActive = liveActiveMaze && mazeCountdown <= 0 && !liveActiveMaze.completed;
    const mazeStartX = liveActiveMaze ? liveActiveMaze.x : 0;
    const mazeEndX = liveActiveMaze ? liveActiveMaze.x + CELL_SIZE_MAZE * mazeGridCols : 0;
    const mazeTopY = CEILING_HEIGHT; // Start maze below ceiling
    const mazeBottomY = CEILING_HEIGHT + CELL_SIZE_MAZE * mazeGridRows; // Maze only goes to playable area based on actual size
    const isInsideMaze = mazeActive && 
      newHeadX >= mazeStartX && newHeadX <= mazeEndX &&
      newHeadY >= mazeTopY && newHeadY <= mazeBottomY;
    
    if (mazeActive) {
      // Use actual maze dimensions from the grid
      const mazeGridHeight = liveActiveMaze.grid.length;
      const mazeGridWidth = liveActiveMaze.grid[0]?.length || 10;
      
      // Calculate cell size to fit maze within playable area (below ceiling)
      const CELL_SIZE = Math.floor(PLAYABLE_HEIGHT / mazeGridHeight);
      const MAZE_OFFSET_Y = CEILING_HEIGHT; // Start maze below ceiling
      const mazeWidthPx = CELL_SIZE * mazeGridWidth;
      const mazeHeightPx = CELL_SIZE * mazeGridHeight;
      
      const relativeX = newHeadX - liveActiveMaze.x;
      const relativeY = newHeadY - MAZE_OFFSET_Y;
      
      const gridX = Math.floor(relativeX / CELL_SIZE);
      const gridY = Math.floor(relativeY / CELL_SIZE);
      
      const objectivesComplete = checkObjectivesComplete();
      if (!objectivesComplete && newHeadX >= liveActiveMaze.x) {
        newHeadX = liveActiveMaze.x - 1;
        newVelocityX = Math.min(newVelocityX, 0);
        updateSnake({
          head: { x: newHeadX, y: newHeadY },
          velocity: { x: newVelocityX, y: newVelocityY }
        });
      }
      
      // Note: Removed outer boundary clamping here - the individual cell wall 
      // collision logic below handles boundaries. The extra clamping was causing 
      // the snake to get stuck at the bottom of the maze.
      
      // PERIMETER GUARD: Snake can only enter the maze through the designated entry (row 0)
      // Calculate snake size based on distance to maze (matches the scaling in cell collision)
      const distanceToMazePerimeter = liveActiveMaze.x - newHeadX;
      const TRANSITION_DISTANCE = 300;
      let perimeterScale = 1.0;
      if (distanceToMazePerimeter < TRANSITION_DISTANCE && distanceToMazePerimeter > -mazeWidthPx - 100) {
        if (distanceToMazePerimeter > 0) {
          const progress = 1 - (distanceToMazePerimeter / TRANSITION_DISTANCE);
          perimeterScale = 1.0 - (progress * 0.6);
        } else {
          perimeterScale = 0.4;
        }
      }
      // Use 16px to match visual head width (headWidth = 16 in rendering)
      const perimeterHeadRadius = 16 * perimeterScale;
      
      // Pixel-perfect collision: snake dies when its RIGHT edge touches the maze left wall
      // The maze perimeter wall is at liveActiveMaze.x (cells have left walls)
      const snakeRightEdge = newHeadX + perimeterHeadRadius;
      const mazeLeftWall = liveActiveMaze.x;
      
      // Only check collision when snake is approaching but not yet inside the maze
      if (gridX < 0 && snakeRightEdge >= mazeLeftWall) {
        // Find the entry row (always row 0 in current maze generator)
        const entryRow = 0;
        const entryCellTopY = MAZE_OFFSET_Y + entryRow * CELL_SIZE;
        const entryCellBottomY = MAZE_OFFSET_Y + (entryRow + 1) * CELL_SIZE;
        
        // Check if snake is NOT aligned with entry row
        if (newHeadY < entryCellTopY || newHeadY > entryCellBottomY) {
          if (!hasGhostMode) {
            // When not invincible: die on hitting maze perimeter wall
            if (!isInvincible) {
              console.log(`[DEATH] Maze perimeter wall collision: snakeX=${newHeadX}, snakeY=${newHeadY}, snakeRightEdge=${snakeRightEdge}, mazeLeftWall=${mazeLeftWall}, entryY=${entryCellTopY}-${entryCellBottomY}`);
              handleDeath();
              return;
            }
            // When invincible: block entry - push snake back to just before wall
            newHeadX = mazeLeftWall - perimeterHeadRadius - 1;
            newVelocityX = Math.min(0, newVelocityX);
            updateSnake({
              head: { x: newHeadX, y: newHeadY },
              velocity: { x: newVelocityX, y: newVelocityY }
            });
          }
        }
      }
      
      // Use actual maze grid dimensions for bounds checking
      if (gridX >= 0 && gridX < mazeGridWidth && gridY >= 0 && gridY < mazeGridHeight) {
        const cell = liveActiveMaze.grid[gridY][gridX];
        
        const cellLocalX = relativeX - gridX * CELL_SIZE;
        const cellLocalY = relativeY - gridY * CELL_SIZE;
        
        const distanceToMaze = liveActiveMaze.x - newHeadX;
        const TRANSITION_DISTANCE = 300;
        let currentScale = 1.0;
        if (distanceToMaze < TRANSITION_DISTANCE && distanceToMaze > -mazeWidthPx - 100) {
          if (distanceToMaze > 0) {
            const progress = 1 - (distanceToMaze / TRANSITION_DISTANCE);
            currentScale = 1.0 - (progress * 0.6);
          } else {
            currentScale = 0.4;
          }
        }
        // Use visual head width (16px) for precise collision - matches rendering
        const headRadius = 16 * currentScale;
        
        // WALL_THICKNESS must match the rendering (8px consistent for all walls)
        const WALL_THICKNESS = 8;
        
        let hitWallX = false;
        let hitWallY = false;
        let blockedX = newHeadX;
        let blockedY = newHeadY;
        
        // Pixel-perfect collision: snake dies when it visually touches the wall surface
        // Walls are drawn INSIDE the cell with WALL_THICKNESS from the edge
        // Top wall occupies: 0 to WALL_THICKNESS
        // Bottom wall occupies: CELL_SIZE - WALL_THICKNESS to CELL_SIZE
        // Left wall occupies: 0 to WALL_THICKNESS
        // Right wall occupies: CELL_SIZE - WALL_THICKNESS to CELL_SIZE
        
        // Top wall: snake's bottom edge (cellLocalY + headRadius) hits wall when entering from below
        // Or snake's top edge (cellLocalY - headRadius) enters wall area from above
        if (cell.walls.top && cellLocalY - headRadius < WALL_THICKNESS) {
          hitWallY = true;
          blockedY = MAZE_OFFSET_Y + gridY * CELL_SIZE + WALL_THICKNESS + headRadius;
        }
        // Bottom wall: snake's bottom edge enters wall area
        if (cell.walls.bottom && cellLocalY + headRadius > CELL_SIZE - WALL_THICKNESS) {
          hitWallY = true;
          blockedY = MAZE_OFFSET_Y + (gridY + 1) * CELL_SIZE - WALL_THICKNESS - headRadius;
        }
        // Left wall: snake's left edge enters wall area
        if (cell.walls.left && cellLocalX - headRadius < WALL_THICKNESS) {
          hitWallX = true;
          blockedX = liveActiveMaze.x + gridX * CELL_SIZE + WALL_THICKNESS + headRadius;
        }
        // Right wall: snake's right edge enters wall area
        if (cell.walls.right && cellLocalX + headRadius > CELL_SIZE - WALL_THICKNESS) {
          hitWallX = true;
          blockedX = liveActiveMaze.x + (gridX + 1) * CELL_SIZE - WALL_THICKNESS - headRadius;
        }
        
        const hitWall = hitWallX || hitWallY;
        
        if (hitWall && !hasGhostMode) {
          // Block snake from passing through walls - ALWAYS block, regardless of invincibility
          // Position is pushed back and velocity into wall is zeroed
          if (hitWallX) {
            newHeadX = blockedX;
            newVelocityX = 0; // Zero velocity into wall to prevent penetration
          }
          if (hitWallY) {
            newHeadY = blockedY;
            newVelocityY = 0; // Zero velocity into wall to prevent penetration
          }
          
          // Update position with blocked coordinates
          updateSnake({
            head: { x: newHeadX, y: newHeadY },
            velocity: { x: newVelocityX, y: newVelocityY }
          });
          
          // When not invincible, die on wall contact
          if (!isInvincible) {
            console.log(`[DEATH] Maze wall collision: gridX=${gridX}, gridY=${gridY}, snakeX=${newHeadX}, snakeY=${newHeadY}, walls=${JSON.stringify(cell.walls)}`);
            handleDeath();
            return;
          }
          // When invincible, just return early - we've already blocked the movement
          return;
        }
        
        if (cell.isExit && !liveActiveMaze.completed) {
          updateScore(200);
          playSuccess();
          const completedMaze = {
            ...liveActiveMaze,
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
    
    if (liveActiveMaze && liveActiveMaze.completed) {
      const MAZE_PLAYABLE_CLR = CANVAS_HEIGHT - 80;
      const mazeGridRowsClear = liveActiveMaze.grid.length;
      const mazeGridColsClear = liveActiveMaze.grid[0]?.length || 10;
      const CELL_SIZE = Math.floor(MAZE_PLAYABLE_CLR / mazeGridRowsClear);
      const mazeEndX = liveActiveMaze.x + CELL_SIZE * mazeGridColsClear;
      const SAFE_DISTANCE = 300;
      
      if (newHeadX > mazeEndX + SAFE_DISTANCE) {
        clearMaze();
      }
    }
    
    const newWorldScroll = liveWorldScroll + SCROLL_SPEED * 0.6;
    updateWorldScroll(newWorldScroll);
    
    updateCamera({
      x: newHeadX - CANVAS_WIDTH / 3,
      y: newHeadY - CANVAS_HEIGHT / 2,
      zoom: Math.max(0.8, 1 - liveSnake.length * 0.005),
    });
    
    let newBugs = liveBugs.filter(b => Math.abs(b.x - newHeadX) < 1200);
    const hasMagnet = liveActivePowerUps.some(p => p.type === "magnet");
    
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
        
        const newLength = Math.max(5, liveSnake.length + lengthChange);
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
    
    // Check collisions unless ghost mode or invincible (mazeCountdown should NOT skip collisions)
    const shouldCheckCollision = !hasGhostMode && !isInvincible;
    
    // Only skip collisions when snake is INSIDE an active maze (navigating it)
    // This prevents hidden pipes from killing the snake inside the maze
    // But does NOT skip collisions outside the maze area
    const skipCollisionsDueToMaze = isInsideMaze;
    
    // Skip pipe/obstacle collisions ONLY when actually inside the maze
    if (shouldCheckCollision && !skipCollisionsDueToMaze) {
      let obstaclesAfterCollision = [...liveObstacles];
      for (let i = obstaclesAfterCollision.length - 1; i >= 0; i--) {
        const obstacle = obstaclesAfterCollision[i];
        
        if (obstacle.isTransitioning || (obstacle.opacity !== undefined && obstacle.opacity < 1)) {
          continue;
        }
        
        // Only skip obstacles that are HIDDEN inside an active (not completed) maze
        // After maze is completed, all obstacles should cause death as normal
        if (mazeActive && liveActiveMaze) {
          const MAZE_PLAYABLE_OBS = CANVAS_HEIGHT - 80;
          const mazeGridRowsObs = liveActiveMaze.grid.length;
          const mazeGridColsObs = liveActiveMaze.grid[0]?.length || 10;
          const CELL_SIZE = Math.floor(MAZE_PLAYABLE_OBS / mazeGridRowsObs);
          const mazeStartX = liveActiveMaze.x;
          const mazeEndX = liveActiveMaze.x + CELL_SIZE * mazeGridColsObs;
          
          // Skip obstacles that are within the maze area (they're hidden)
          if (obstacle.x >= mazeStartX && obstacle.x <= mazeEndX) {
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
        
        // Precise collision using visual head width (16px) for pixel-perfect collision
        // This ensures death only triggers when snake visually touches the obstacle
        const snakeCollisionRadius = 16; // Match visual head width from rendering
        const collisionRadius = obstacle.size + snakeCollisionRadius;
        
        if (dist < collisionRadius) {
          if (hasShield) {
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
                color: "#FFD700",
              });
            }
            setParticles(prev => [...prev, ...destroyParticles]);
          } else {
            console.log(`[DEATH] Obstacle collision: type=${obstacle.type}, obstacleX=${obstacle.x}, obstacleY=${collisionY}, snakeX=${newHeadX}, snakeY=${newHeadY}, dist=${dist}`);
            handleDeath();
            return;
          }
        }
      }
      setObstacles(obstaclesAfterCollision);
      
      for (const pipe of livePipes) {
        if (pipe.isTransitioning || (pipe.opacity !== undefined && pipe.opacity < 1)) {
          continue;
        }
        
        // Only skip pipes that are HIDDEN inside an active (not completed) maze
        // After maze is completed, all pipes should cause death as normal
        if (mazeActive && liveActiveMaze) {
          const MAZE_PLAYABLE_PIPE = CANVAS_HEIGHT - 80;
          const mazeGridRowsPipe = liveActiveMaze.grid.length;
          const mazeGridColsPipe = liveActiveMaze.grid[0]?.length || 10;
          const CELL_SIZE = Math.floor(MAZE_PLAYABLE_PIPE / mazeGridRowsPipe);
          const mazeStartX = liveActiveMaze.x;
          const mazeEndX = liveActiveMaze.x + CELL_SIZE * mazeGridColsPipe;
          
          // Skip pipes that are within the maze area (they're hidden)
          if (pipe.x >= mazeStartX && pipe.x <= mazeEndX) {
            continue;
          }
        }
        
        // Skip special pipes that haven't been entered yet (they're passable)
        if (pipe.isSpecial && !pipe.isEntered) {
          continue;
        }
        
        // Use visual head width (16px) for precise collision - matches rendering
        const headRadius = 16;
        const effectiveHeight = pipe.height + (pipe.moveOffset || 0);
        
        // PROPER PIPE COLLISION: Check all 4 pipe parts separately
        // Snake bounding box (matches visual 16px head width)
        const snakeLeft = newHeadX - headRadius;
        const snakeRight = newHeadX + headRadius;
        const snakeTop = newHeadY - headRadius;
        const snakeBottom = newHeadY + headRadius;
        
        // Pipe body X range (narrower)
        const pipeBodyLeft = pipe.x;
        const pipeBodyRight = pipe.x + PIPE_WIDTH;
        
        // Pipe cap X range (wider - extends beyond body)
        const pipeCapLeft = pipe.x - CAP_EXTEND;
        const pipeCapRight = pipe.x + PIPE_WIDTH + CAP_EXTEND;
        
        // TOP PIPE consists of:
        // 1. Top pipe body: from y=0 to y=(effectiveHeight - CAP_HEIGHT)
        const topBodyBottom = effectiveHeight - CAP_HEIGHT;
        const hitTopBody = snakeRight > pipeBodyLeft && snakeLeft < pipeBodyRight &&
                          snakeTop < topBodyBottom && snakeBottom > 0;
        
        // 2. Top pipe cap: from y=(effectiveHeight - CAP_HEIGHT) to y=effectiveHeight
        const hitTopCap = snakeRight > pipeCapLeft && snakeLeft < pipeCapRight &&
                         snakeTop < effectiveHeight && snakeBottom > topBodyBottom;
        
        // BOTTOM PIPE consists of:
        // 1. Bottom pipe cap: from y=(effectiveHeight + gap) to y=(effectiveHeight + gap + CAP_HEIGHT)
        const bottomCapTop = effectiveHeight + pipe.gap;
        const bottomCapBottom = bottomCapTop + CAP_HEIGHT;
        const hitBottomCap = snakeRight > pipeCapLeft && snakeLeft < pipeCapRight &&
                            snakeTop < bottomCapBottom && snakeBottom > bottomCapTop;
        
        // 2. Bottom pipe body: from y=(effectiveHeight + gap + CAP_HEIGHT) to y=CANVAS_HEIGHT
        const hitBottomBody = snakeRight > pipeBodyLeft && snakeLeft < pipeBodyRight &&
                             snakeTop < CANVAS_HEIGHT && snakeBottom > bottomCapBottom;
        
        if (hitTopBody || hitTopCap || hitBottomCap || hitBottomBody) {
          const hitPart = hitTopBody ? "topBody" : hitTopCap ? "topCap" : hitBottomCap ? "bottomCap" : "bottomBody";
          console.log(`[DEATH] Pipe collision: part=${hitPart}, pipeX=${pipe.x}, effectiveHeight=${effectiveHeight}, gap=${pipe.gap}, snakeX=${newHeadX}, snakeY=${newHeadY}`);
          handleDeath();
          return;
        }
      }
    }
    
    let newPowerUps = [...livePowerUps];
    let currentActivePowerUps = [...liveActivePowerUps];
    
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
    const fruitObjectiveType = fruitObjective?.type;
    
    const LEVEL_DISTANCE = 4000;
    const progressRatio = Math.min(1, liveLevelDistance / LEVEL_DISTANCE);
    
    const requiredSpawns = getRequiredSpawns();
    
    let fruitSpawnRatio = 0.85;
    if (fruitObjectiveType && requiredSpawns[fruitObjectiveType]) {
      const { required, spawned } = requiredSpawns[fruitObjectiveType];
      const expectedByNow = Math.ceil(required * progressRatio);
      if (spawned < expectedByNow) {
        fruitSpawnRatio = 0.95;
      }
    }
    
    while (newBugs.length < 10) {
      const fruitTypes: Bug["type"][] = ["apple", "banana", "berry", "mango"];
      let foodType: Bug["type"];
      
      if (targetFruit && Math.random() < fruitSpawnRatio) {
        foodType = targetFruit;
        if (fruitObjectiveType) {
          incrementSpawnedObjectiveItem(fruitObjectiveType);
        }
      } else {
        foodType = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
      }
      
      const spawnAhead = Math.random() > 0.3;
      let spawnX = spawnAhead ? newHeadX + 250 + Math.random() * 400 : newHeadX - 250 - Math.random() * 400;
      
      const spawnY = findSafeSpawnY(spawnX, livePipes);
      
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
    
    let newPipes = livePipes.filter(p => Math.abs(p.x - newHeadX) < 1500);
    
    // Gap decreases progressively from 180 (level 1) to 100 (level 50)
    // About 1.6px reduction per level across all 50 levels
    const levelGapReduction = Math.min(80, (liveCurrentLevel - 1) * 1.65);
    const levelBasedGap = Math.max(100, PIPE_GAP - levelGapReduction);
    
    while (newPipes.length < 8) {
      const lastPipe = newPipes[newPipes.length - 1];
      let newX = lastPipe ? lastPipe.x + PIPE_SPACING : newHeadX + 500;
      
      if (liveActiveMaze) {
        const MAZE_PLAYABLE_SPAWN = CANVAS_HEIGHT - 80;
        const mazeGridRowsSpawn = liveActiveMaze.grid.length;
        const mazeGridColsSpawn = liveActiveMaze.grid[0]?.length || 10;
        const CELL_SIZE = Math.floor(MAZE_PLAYABLE_SPAWN / mazeGridRowsSpawn);
        const mazeEndX = liveActiveMaze.x + CELL_SIZE * mazeGridColsSpawn;
        const SAFE_DISTANCE = 300;
        const minSafeX = mazeEndX + SAFE_DISTANCE;
        
        if (newX >= liveActiveMaze.x - 100 && newX < minSafeX) {
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
    if (liveActiveMaze) {
      const MAZE_PLAYABLE_HIDE = CANVAS_HEIGHT - 80;
      const mazeGridRowsHide = liveActiveMaze.grid.length;
      const mazeGridColsHide = liveActiveMaze.grid[0]?.length || 10;
      const CELL_SIZE_HIDE = Math.floor(MAZE_PLAYABLE_HIDE / mazeGridRowsHide);
      const mazeStartX = liveActiveMaze.x;
      const mazeEndX = liveActiveMaze.x + CELL_SIZE_HIDE * mazeGridColsHide;
      
      newPipes = newPipes.map(pipe => {
        const wasHidden = pipe.x >= mazeStartX - 100 && pipe.x <= mazeEndX + 100;
        const isNowVisible = !liveActiveMaze || pipe.x < mazeStartX - 100 || pipe.x > mazeEndX + 100;
        
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
    
    // Calculate speed reduction for moving pipes
    const pipeSlowMultiplier = liveSpeedReductionActive ? 0.5 : 1;
    
    newPipes = newPipes.map(pipe => {
      if (pipe.isMoving && pipe.moveSpeed !== undefined && pipe.moveRange !== undefined && 
          pipe.moveOffset !== undefined && pipe.moveDirection !== undefined) {
        
        let newOffset = pipe.moveOffset + pipe.moveSpeed * pipe.moveDirection * pipeSlowMultiplier;
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
    
    // Update cactus positions to follow their attached pipes
    let newObstacles = liveObstacles.map(obstacle => {
      if (obstacle.type === "cactus") {
        if (obstacle.pipeId) {
          const attachedPipe = newPipes.find(p => p.id === obstacle.pipeId);
          if (attachedPipe) {
            // Calculate new Y position based on pipe's current moveOffset
            const effectivePipeHeight = attachedPipe.height + (attachedPipe.moveOffset || 0);
            const newPipeY = effectivePipeHeight + attachedPipe.gap;
            // Update BOTH y AND pipeY so the animation code uses the correct base position
            return { 
              ...obstacle, 
              y: newPipeY, 
              pipeY: newPipeY, // Critical: update pipeY so animation uses correct base
              x: attachedPipe.x + PIPE_WIDTH / 2 
            };
          } else {
            // Pipe no longer exists - remove the pipeId so cactus stays in place
            return { ...obstacle, pipeId: undefined };
          }
        }
      }
      return obstacle;
    });
    
    newObstacles = newObstacles.filter(o => {
      if (o.type === "rock" && o.y > CANVAS_HEIGHT + 50) {
        return false;
      }
      return Math.abs(o.x - newHeadX) < 1200;
    });
    
    const currentScore = useFlappySnake.getState().score;
    const spawnChance = Math.max(0.94, 0.98 - Math.floor(currentScore / 50) * 0.005);
    
    // Use world difficulty multiplier for obstacle speeds (increases per world)
    const worldDifficultyMultiplier = currentWorld.difficultyMultiplier;
    
    const currentEnv = useFlappySnake.getState().environment;
    const hasIce = activePowerUps.some(p => p.type === "ice");
    // Combine ice power-up AND speed reduction from watching ad
    let slowMultiplier = 1;
    if (hasIce) slowMultiplier *= 0.5;
    if (liveSpeedReductionActive) slowMultiplier *= 0.5;
    
    if (currentEnv === "water" && newObstacles.length < 8 && Math.random() > 0.96) {
      const swimDir = Math.random() > 0.5 ? 1 : -1;
      const fishX = swimDir > 0 ? newHeadX - 200 : newHeadX + 800;
      const fishY = findSafeSpawnY(fishX, newPipes);
      newObstacles.push({
        id: `fish-${Date.now()}-${Math.random()}`,
        type: "fish",
        x: fishX,
        y: fishY,
        size: 20,
        velocityX: swimDir * (2 + Math.random()) * worldDifficultyMultiplier,
        velocityY: (Math.random() - 0.5) * 0.5 * worldDifficultyMultiplier,
        swimDirection: swimDir,
      });
    }
    
    if (newObstacles.length < 6 && Math.random() > spawnChance) {
      const obstacleType = Math.random();
      const spawnAhead = Math.random() > 0.3;
      const obstacleX = spawnAhead ? newHeadX + 400 + Math.random() * 300 : newHeadX - 400 - Math.random() * 300;
      const obstacleY = findSafeSpawnY(obstacleX, newPipes);
      newObstacles.push({
        id: `obstacle-${Date.now()}-${Math.random()}`,
        type: obstacleType > 0.7 ? "fireball" : (obstacleType > 0.35 ? "blob" : "spike"),
        x: obstacleX,
        y: obstacleY,
        size: 15,
        velocityX: obstacleType > 0.7 ? -2 * worldDifficultyMultiplier : undefined,
        velocityY: obstacleType > 0.7 ? (Math.random() - 0.5) * 2 * worldDifficultyMultiplier : undefined,
      });
    }
    
    const activeChaser = newObstacles.filter(o => o.type === "chaser");
    if (currentLevel >= 6 && activeChaser.length < 2 && Math.random() > 0.993) {
      const chaserX = newHeadX + 600 + Math.random() * 200;
      const chaserY = findSafeSpawnY(chaserX, newPipes);
      newObstacles.push({
        id: `chaser-${Date.now()}-${Math.random()}`,
        type: "chaser",
        x: chaserX,
        y: chaserY,
        size: 18,
        isChasing: false,
        originalX: chaserX,
        originalY: chaserY,
        velocityX: 0,
        velocityY: 0,
      });
    }
    
    if (currentLevel >= 3 && newObstacles.length < 8 && Math.random() > 0.97) {
      for (const pipe of newPipes) {
        if (Math.abs(pipe.x - newHeadX) < 600 && Math.random() > 0.7) {
          // Cactus sits on top of bottom pipe (at the gap position)
          const effectivePipeHeight = pipe.height + (pipe.moveOffset || 0);
          const pipeBottomY = effectivePipeHeight + pipe.gap;
          newObstacles.push({
            id: `cactus-${Date.now()}-${Math.random()}`,
            type: "cactus",
            x: pipe.x + PIPE_WIDTH / 2,
            y: pipeBottomY,
            size: 20,
            animationPhase: "rising",
            animationTimer: 0,
            pipeY: pipeBottomY,
            pipeId: pipe.id, // Track which pipe this cactus is attached to
            pipeBaseHeight: pipe.height, // Store base height for offset calculation
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
        velocityX: (Math.random() - 0.5) * 1 * worldDifficultyMultiplier,
        velocityY: (2 + Math.random() * 2) * worldDifficultyMultiplier,
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
          // Chaser speed is constant at 1.8 - NOT affected by speed reduction
          const chaseSpeed = 1.8;
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
              velocityX: 3 * worldDifficultyMultiplier,
              velocityY: -1 * worldDifficultyMultiplier,
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
    
    if (liveActiveMaze) {
      const mazeStartX = liveActiveMaze.x;
      const mazeEndX = liveActiveMaze.x + 600;
      
      newObstacles = newObstacles.map(obstacle => {
        const wasHidden = obstacle.x >= mazeStartX - 100 && obstacle.x <= mazeEndX + 100;
        const isNowVisible = !liveActiveMaze || obstacle.x < mazeStartX - 100 || obstacle.x > mazeEndX + 100;
        
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
        // Use visual head width (16px) for precise collision - matches rendering
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
    
    const maxPowerUps = inBonusScene ? 3 : 2;
    
    const powerUpObjective = requiredSpawns["collect_powerups"];
    let shouldSpawnPowerUp = false;
    
    if (debugFrameCountRef.current <= 10 || (debugFrameCountRef.current % 300 === 0)) {
      console.log("[POWERUP DEBUG]", {
        level: liveCurrentLevel,
        distance: liveLevelDistance,
        powerUpObjective,
        currentPowerUps: newPowerUps.length,
        maxPowerUps,
        requiredSpawns
      });
    }
    
    if (powerUpObjective && liveCurrentLevel >= 5) {
      const { required, spawned } = powerUpObjective;
      const spawnInterval = LEVEL_DISTANCE / (required + 2);
      const nextSpawnDistance = (spawned + 1) * spawnInterval;
      
      if (debugFrameCountRef.current <= 10 || (debugFrameCountRef.current % 300 === 0)) {
        console.log("[POWERUP SPAWN CHECK]", {
          required,
          spawned,
          spawnInterval,
          nextSpawnDistance,
          shouldSpawn: liveLevelDistance >= nextSpawnDistance && spawned < required + 2
        });
      }
      
      if (liveLevelDistance >= nextSpawnDistance && spawned < required + 2) {
        shouldSpawnPowerUp = newPowerUps.length < maxPowerUps;
        if (shouldSpawnPowerUp) {
          console.log("[POWERUP] Spawning power-up at distance", liveLevelDistance);
        }
      }
    }
    
    if (!shouldSpawnPowerUp && newPowerUps.length < maxPowerUps) {
      const baseChance = inBonusScene ? 0.02 : 0.008;
      shouldSpawnPowerUp = Math.random() < baseChance;
    }
    
    if (shouldSpawnPowerUp) {
      let powerUpTypes: Array<"magnet" | "ghost" | "shrink" | "shooter" | "shield" | "ice" | "speed"> = ["magnet", "ghost", "shrink", "shooter"];
      
      const currentEnvironment = useFlappySnake.getState().environment;
      if (currentEnvironment === "water") {
        powerUpTypes = [...powerUpTypes, "ice", "ice", "speed"];
      } else if (currentEnvironment === "fire") {
        powerUpTypes = [...powerUpTypes, "shield", "shield", "ice"];
      } else {
        powerUpTypes.push("speed");
      }
      
      const powerUpX = newHeadX + 350 + Math.random() * 150;
      const powerUpY = findSafeSpawnY(powerUpX, newPipes);
      
      newPowerUps.push({
        id: `powerup-${Date.now()}-${Math.random()}`,
        type: powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)],
        x: powerUpX,
        y: powerUpY,
      });
      
      incrementSpawnedObjectiveItem("collect_powerups");
      setPowerUps(newPowerUps);
    }
    
    if (inBonusScene && bonusPowerUpsCollected >= 3) {
      setInBonusScene(false);
    }
    
    const hasShooter = liveActivePowerUps.some(p => p.type === "shooter");
    let newProjectiles = liveProjectiles.filter(p => Math.abs(p.x - newHeadX) < 1000);
    
    // AUTO-FIRE: Shooter power-up automatically fires projectiles
    // But NOT during maze navigation (mazeActive) and limit max projectiles
    const MAX_PROJECTILES = 10;
    if (hasShooter && !mazeActive && newProjectiles.length < MAX_PROJECTILES) {
      const timeSinceLastShot = lastTimeRef.current;
      const FIRE_RATE = 180; // Fire every 180ms for balanced auto-fire
      if (!lastShotTimeRef.current || timeSinceLastShot - lastShotTimeRef.current > FIRE_RATE) {
        const projectileSpeed = 10;
        // Always fire forward (positive X direction) for consistent behavior
        const fireAngle = newVelocityX >= 0 ? newAngle : Math.PI + newAngle;
        const projVelX = Math.cos(fireAngle) * projectileSpeed;
        const projVelY = Math.sin(fireAngle) * projectileSpeed;
        
        newProjectiles.push({
          id: `proj-${Date.now()}-${Math.random()}`,
          x: newHeadX + Math.cos(fireAngle) * 20,
          y: newHeadY + Math.sin(fireAngle) * 20,
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
    
    // HIGH-WATER MARK APPROACH: Only count distance when exceeding previous maximum X
    // This prevents oscillating back and forth to inflate distance
    const currentMaxReachedX = useFlappySnake.getState().maxReachedX;
    const INITIAL_X = 100; // Snake starts at x=100
    
    // If snake has moved past its previous maximum, update the high-water mark
    if (newHeadX > currentMaxReachedX) {
      useFlappySnake.getState().updateMaxReachedX(newHeadX);
    }
    
    // Level distance is based on how far past the starting point the high-water mark is
    const effectiveMaxX = Math.max(currentMaxReachedX, newHeadX);
    const newLevelDistance = Math.max(0, effectiveMaxX - INITIAL_X);
    const latestDistance = useFlappySnake.getState().distance;
    
    // Total distance only increases when we exceed the previous max
    const distanceGain = Math.max(0, newHeadX - currentMaxReachedX);
    const newDistance = latestDistance + distanceGain;
    
    updateDistance(newDistance);
    updateLevelDistance(newLevelDistance);
    
    const MAZE_SPAWN_DISTANCE = 3500;
    const MAZE_SPAWN_OFFSET = 800;
    
    const currentMazeSpawned = useFlappySnake.getState().mazeSpawnedThisLevel;
    
    // Only spawn maze when distance threshold reached (high-water mark approach prevents exploitation)
    if (!currentMazeSpawned && newLevelDistance >= MAZE_SPAWN_DISTANCE) {
      console.log(`Spawning maze at distance ${newLevelDistance}m for level ${liveCurrentLevel}`);
      spawnMaze(newHeadX + MAZE_SPAWN_OFFSET);
    }
    
    const newEnv: Environment = liveCurrentLevel >= 9 ? "fire" : (liveCurrentLevel >= 5 ? "water" : "jungle");
    if (newEnv !== environment) {
      updateEnvironment(newEnv);
    }
    
    if (currentMazeCompleted) {
      console.log(`Level ${liveCurrentLevel} complete! Maze completed`);
      completeLevel();
    }
  };

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const renderState = useFlappySnake.getState();
    const renderCamera = renderState.camera;
    const renderSnake = renderState.snake;
    const renderPipes = renderState.pipes;
    const renderBugs = renderState.bugs;
    const renderObstacles = renderState.obstacles;
    const renderPowerUps = renderState.powerUps;
    const renderActivePowerUps = renderState.activePowerUps;
    const renderProjectiles = renderState.projectiles;
    const renderActiveMaze = renderState.activeMaze;
    const renderCurrentLevel = renderState.currentLevel;
    const renderWorldScroll = renderState.worldScroll;
    
    debugFrameCountRef.current++;
    if (debugFrameCountRef.current <= 5) {
      console.log(`[RENDER Frame ${debugFrameCountRef.current}]`, {
        cameraX: renderCamera.x,
        snakeHeadX: renderSnake.head.x,
        worldScroll: renderWorldScroll,
        distance: renderState.distance,
        score: renderState.score,
        visualSnakeX: renderSnake.head.x - renderCamera.x
      });
    }
    
    // Get actual canvas dimensions (may be viewport size on mobile)
    const actualWidth = canvas.width;
    const actualHeight = canvas.height;
    
    // Reset and clear in physical pixels
    ctx.resetTransform();
    ctx.clearRect(0, 0, actualWidth, actualHeight);
    
    // Apply combined scaling (cssScale × dpr) for crisp rendering at any viewport size
    const metrics = viewportMetricsRef.current;
    const totalScale = metrics.cssScale * metrics.dpr;
    ctx.setTransform(totalScale, 0, 0, totalScale, 0, 0);
    
    ctx.save();
    ctx.translate(-renderCamera.x * renderCamera.zoom, -renderCamera.y * renderCamera.zoom);
    ctx.scale(renderCamera.zoom, renderCamera.zoom);
    
    const currentWorld = getWorldForLevel(renderCurrentLevel);
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    
    if (currentWorld && currentWorld.theme.backgroundGradient) {
      gradient.addColorStop(0, currentWorld.theme.backgroundColor);
      gradient.addColorStop(1, currentWorld.theme.groundColor);
    } else {
      gradient.addColorStop(0, "#87CEEB");
      gradient.addColorStop(1, "#E0F6FF");
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(renderCamera.x, renderCamera.y, CANVAS_WIDTH / renderCamera.zoom, CANVAS_HEIGHT / renderCamera.zoom);
    
    // Full concrete ceiling
    const CEILING_HEIGHT = 45;
    const concreteGradTop = ctx.createLinearGradient(0, 0, 0, CEILING_HEIGHT);
    concreteGradTop.addColorStop(0, "#4A4A4A");
    concreteGradTop.addColorStop(0.2, "#5A5A5A");
    concreteGradTop.addColorStop(0.5, "#656565");
    concreteGradTop.addColorStop(0.8, "#555555");
    concreteGradTop.addColorStop(1, "#3D3D3D");
    ctx.fillStyle = concreteGradTop;
    ctx.fillRect(renderCamera.x, 0, CANVAS_WIDTH / renderCamera.zoom, CEILING_HEIGHT);
    
    // Concrete texture - horizontal lines
    ctx.strokeStyle = "#3A3A3A";
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(renderCamera.x, 8 + i * 10);
      ctx.lineTo(renderCamera.x + CANVAS_WIDTH / renderCamera.zoom, 8 + i * 10);
      ctx.stroke();
    }
    // Vertical crack lines
    for (let i = 0; i < 15; i++) {
      const lineX = ((i * 60 + renderWorldScroll * 0.02) % (CANVAS_WIDTH + 100)) + renderCamera.x;
      ctx.strokeStyle = "#333";
      ctx.beginPath();
      ctx.moveTo(lineX, 0);
      ctx.lineTo(lineX + 5, CEILING_HEIGHT * 0.6);
      ctx.stroke();
    }
    // Bottom edge of ceiling - darker strip
    ctx.fillStyle = "#2D2D2D";
    ctx.fillRect(renderCamera.x, CEILING_HEIGHT - 6, CANVAS_WIDTH / renderCamera.zoom, 6);
    ctx.fillStyle = "#555";
    ctx.fillRect(renderCamera.x, CEILING_HEIGHT - 8, CANVAS_WIDTH / renderCamera.zoom, 2);
    // Highlight strip
    ctx.fillStyle = "#707070";
    ctx.fillRect(renderCamera.x, 2, CANVAS_WIDTH / renderCamera.zoom, 2);
    
    // Full concrete floor - much darker and more distinct
    const FLOOR_HEIGHT = 50;
    const concreteGradBottom = ctx.createLinearGradient(0, CANVAS_HEIGHT - FLOOR_HEIGHT, 0, CANVAS_HEIGHT);
    concreteGradBottom.addColorStop(0, "#1A1A1A");
    concreteGradBottom.addColorStop(0.15, "#2A2A2A");
    concreteGradBottom.addColorStop(0.4, "#3A3A3A");
    concreteGradBottom.addColorStop(0.7, "#333333");
    concreteGradBottom.addColorStop(1, "#252525");
    ctx.fillStyle = concreteGradBottom;
    ctx.fillRect(renderCamera.x, CANVAS_HEIGHT - FLOOR_HEIGHT, CANVAS_WIDTH / renderCamera.zoom, FLOOR_HEIGHT);
    
    // Concrete texture - horizontal lines (lighter for visibility)
    ctx.strokeStyle = "#4A4A4A";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(renderCamera.x, CANVAS_HEIGHT - 8 - i * 9);
      ctx.lineTo(renderCamera.x + CANVAS_WIDTH / renderCamera.zoom, CANVAS_HEIGHT - 8 - i * 9);
      ctx.stroke();
    }
    // Vertical crack lines
    for (let i = 0; i < 15; i++) {
      const lineX = ((i * 60 + renderWorldScroll * 0.02) % (CANVAS_WIDTH + 100)) + renderCamera.x;
      ctx.strokeStyle = "#1A1A1A";
      ctx.beginPath();
      ctx.moveTo(lineX, CANVAS_HEIGHT);
      ctx.lineTo(lineX + 8, CANVAS_HEIGHT - FLOOR_HEIGHT * 0.7);
      ctx.stroke();
    }
    // Top edge of floor - bright yellow/orange warning stripe
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(renderCamera.x, CANVAS_HEIGHT - FLOOR_HEIGHT, CANVAS_WIDTH / renderCamera.zoom, 4);
    ctx.fillStyle = "#1A1A1A";
    ctx.fillRect(renderCamera.x, CANVAS_HEIGHT - FLOOR_HEIGHT + 4, CANVAS_WIDTH / renderCamera.zoom, 3);
    // Hazard stripes pattern
    ctx.fillStyle = "#FFD700";
    for (let i = 0; i < 50; i++) {
      const stripeX = ((i * 30) % (CANVAS_WIDTH + 100)) + renderCamera.x;
      ctx.beginPath();
      ctx.moveTo(stripeX, CANVAS_HEIGHT - FLOOR_HEIGHT);
      ctx.lineTo(stripeX + 15, CANVAS_HEIGHT - FLOOR_HEIGHT);
      ctx.lineTo(stripeX + 8, CANVAS_HEIGHT - FLOOR_HEIGHT + 7);
      ctx.lineTo(stripeX - 7, CANVAS_HEIGHT - FLOOR_HEIGHT + 7);
      ctx.closePath();
      ctx.fill();
    }
    // Dark strip after hazard
    ctx.fillStyle = "#0A0A0A";
    ctx.fillRect(renderCamera.x, CANVAS_HEIGHT - FLOOR_HEIGHT + 7, CANVAS_WIDTH / renderCamera.zoom, 3);
    
    const worldId = currentWorld?.id || 'forest';
    
    if (worldId === 'forest') {
      for (const cloud of pixelatedClouds) {
        const cloudX = cloud.x + renderWorldScroll * cloud.speed * 0.3;
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.fillRect(cloudX % (CANVAS_WIDTH + 200) + renderCamera.x - 100, cloud.y, cloud.size, cloud.size * 0.6);
        ctx.fillRect(cloudX % (CANVAS_WIDTH + 200) + renderCamera.x - 100 + cloud.size * 0.3, cloud.y - cloud.size * 0.3, cloud.size * 0.6, cloud.size * 0.6);
      }
      
      for (let i = 0; i < 8; i++) {
        const treeX = ((i * 120 + renderWorldScroll * 0.2) % (CANVAS_WIDTH + 200)) + renderCamera.x - 100;
        ctx.fillStyle = "#8B4513";
        ctx.fillRect(treeX, CANVAS_HEIGHT - 100, 20, 60);
        ctx.fillStyle = "#228B22";
        ctx.beginPath();
        ctx.moveTo(treeX - 25, CANVAS_HEIGHT - 100);
        ctx.lineTo(treeX + 10, CANVAS_HEIGHT - 160);
        ctx.lineTo(treeX + 45, CANVAS_HEIGHT - 100);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(treeX - 20, CANVAS_HEIGHT - 130);
        ctx.lineTo(treeX + 10, CANVAS_HEIGHT - 180);
        ctx.lineTo(treeX + 40, CANVAS_HEIGHT - 130);
        ctx.closePath();
        ctx.fill();
      }
      
      ctx.fillStyle = "#228B22";
      ctx.fillRect(renderCamera.x, CANVAS_HEIGHT - 40, CANVAS_WIDTH / renderCamera.zoom, 40);
      ctx.fillStyle = "#32CD32";
      for (let i = 0; i < 30; i++) {
        const grassX = ((i * 30 + renderWorldScroll * 0.1) % (CANVAS_WIDTH + 50)) + renderCamera.x;
        ctx.fillRect(grassX, CANVAS_HEIGHT - 45, 3, 10);
        ctx.fillRect(grassX + 8, CANVAS_HEIGHT - 42, 2, 7);
      }
    } else if (worldId === 'rocky') {
      for (const mountain of mountains) {
        const mountainX = mountain.x + renderWorldScroll * mountain.speed * 0.1;
        ctx.fillStyle = "#5C5C5C";
        ctx.beginPath();
        ctx.moveTo((mountainX % (CANVAS_WIDTH + 400)) + renderCamera.x - 200, CANVAS_HEIGHT);
        ctx.lineTo((mountainX % (CANVAS_WIDTH + 400)) + renderCamera.x - 50, CANVAS_HEIGHT - mountain.height);
        ctx.lineTo((mountainX % (CANVAS_WIDTH + 400)) + renderCamera.x + 100, CANVAS_HEIGHT);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = "#DCDCDC";
        ctx.beginPath();
        ctx.moveTo((mountainX % (CANVAS_WIDTH + 400)) + renderCamera.x - 50, CANVAS_HEIGHT - mountain.height);
        ctx.lineTo((mountainX % (CANVAS_WIDTH + 400)) + renderCamera.x - 30, CANVAS_HEIGHT - mountain.height + 30);
        ctx.lineTo((mountainX % (CANVAS_WIDTH + 400)) + renderCamera.x - 70, CANVAS_HEIGHT - mountain.height + 30);
        ctx.closePath();
        ctx.fill();
      }
      
      ctx.fillStyle = "#696969";
      ctx.fillRect(renderCamera.x, CANVAS_HEIGHT - 50, CANVAS_WIDTH / renderCamera.zoom, 50);
      
      for (let i = 0; i < 15; i++) {
        const rockX = ((i * 60 + renderWorldScroll * 0.15) % (CANVAS_WIDTH + 100)) + renderCamera.x;
        ctx.fillStyle = "#808080";
        ctx.beginPath();
        ctx.arc(rockX, CANVAS_HEIGHT - 35, 12 + (i % 3) * 5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (worldId === 'desert') {
      for (let i = 0; i < 5; i++) {
        const duneX = ((i * 200 + renderWorldScroll * 0.1) % (CANVAS_WIDTH + 300)) + renderCamera.x - 100;
        ctx.fillStyle = "#DEB887";
        ctx.beginPath();
        ctx.moveTo(duneX, CANVAS_HEIGHT);
        ctx.quadraticCurveTo(duneX + 100, CANVAS_HEIGHT - 80 - (i % 2) * 30, duneX + 200, CANVAS_HEIGHT);
        ctx.closePath();
        ctx.fill();
      }
      
      for (let i = 0; i < 4; i++) {
        const cactusX = ((i * 180 + 50 + renderWorldScroll * 0.2) % (CANVAS_WIDTH + 200)) + renderCamera.x;
        ctx.fillStyle = "#2E8B57";
        ctx.fillRect(cactusX, CANVAS_HEIGHT - 80, 15, 50);
        ctx.fillRect(cactusX - 20, CANVAS_HEIGHT - 60, 20, 10);
        ctx.fillRect(cactusX - 20, CANVAS_HEIGHT - 70, 8, 20);
        ctx.fillRect(cactusX + 15, CANVAS_HEIGHT - 50, 18, 8);
        ctx.fillRect(cactusX + 25, CANVAS_HEIGHT - 65, 8, 23);
      }
      
      ctx.fillStyle = "#D2691E";
      ctx.fillRect(renderCamera.x, CANVAS_HEIGHT - 30, CANVAS_WIDTH / renderCamera.zoom, 30);
      
      ctx.fillStyle = "rgba(255, 200, 100, 0.3)";
      ctx.beginPath();
      ctx.arc(renderCamera.x + 80, 60, 50, 0, Math.PI * 2);
      ctx.fill();
    } else if (worldId === 'ice') {
      for (const cloud of pixelatedClouds) {
        const cloudX = cloud.x + renderWorldScroll * cloud.speed * 0.4;
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.fillRect(cloudX % (CANVAS_WIDTH + 200) + renderCamera.x - 100, cloud.y, cloud.size * 1.2, cloud.size * 0.5);
        ctx.fillRect(cloudX % (CANVAS_WIDTH + 200) + renderCamera.x - 100 + cloud.size * 0.4, cloud.y - cloud.size * 0.2, cloud.size * 0.7, cloud.size * 0.5);
      }
      
      for (let i = 0; i < 6; i++) {
        const icebergX = ((i * 150 + renderWorldScroll * 0.15) % (CANVAS_WIDTH + 200)) + renderCamera.x;
        ctx.fillStyle = "#E0FFFF";
        ctx.beginPath();
        ctx.moveTo(icebergX, CANVAS_HEIGHT - 40);
        ctx.lineTo(icebergX + 30, CANVAS_HEIGHT - 90 - (i % 3) * 20);
        ctx.lineTo(icebergX + 60, CANVAS_HEIGHT - 40);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#B0E0E6";
        ctx.beginPath();
        ctx.moveTo(icebergX + 30, CANVAS_HEIGHT - 90 - (i % 3) * 20);
        ctx.lineTo(icebergX + 60, CANVAS_HEIGHT - 40);
        ctx.lineTo(icebergX + 45, CANVAS_HEIGHT - 40);
        ctx.closePath();
        ctx.fill();
      }
      
      ctx.fillStyle = "#B0E0E6";
      ctx.fillRect(renderCamera.x, CANVAS_HEIGHT - 40, CANVAS_WIDTH / renderCamera.zoom, 40);
      
      for (let i = 0; i < 20; i++) {
        const snowX = ((i * 40 + renderWorldScroll * 0.5 + Date.now() * 0.02) % (CANVAS_WIDTH + 100)) + renderCamera.x;
        const snowY = ((i * 30 + Date.now() * 0.03) % CANVAS_HEIGHT);
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.beginPath();
        ctx.arc(snowX, snowY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (worldId === 'neon') {
      ctx.strokeStyle = "#FF00FF";
      ctx.lineWidth = 1;
      for (let i = 0; i < 10; i++) {
        const lineY = 50 + i * 60;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(renderCamera.x, lineY);
        ctx.lineTo(renderCamera.x + CANVAS_WIDTH / renderCamera.zoom, lineY);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      
      for (let i = 0; i < 8; i++) {
        const crystalX = ((i * 120 + renderWorldScroll * 0.2) % (CANVAS_WIDTH + 200)) + renderCamera.x;
        const hue = (i * 40 + Date.now() * 0.05) % 360;
        ctx.fillStyle = `hsla(${hue}, 100%, 60%, 0.7)`;
        ctx.beginPath();
        ctx.moveTo(crystalX, CANVAS_HEIGHT - 30);
        ctx.lineTo(crystalX + 15, CANVAS_HEIGHT - 80 - (i % 3) * 20);
        ctx.lineTo(crystalX + 30, CANVAS_HEIGHT - 30);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = `hsla(${hue}, 100%, 80%, 1)`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      ctx.fillStyle = "#1a0a2e";
      ctx.fillRect(renderCamera.x, CANVAS_HEIGHT - 30, CANVAS_WIDTH / renderCamera.zoom, 30);
      
      ctx.strokeStyle = "#00FFFF";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(renderCamera.x, CANVAS_HEIGHT - 30);
      ctx.lineTo(renderCamera.x + CANVAS_WIDTH / renderCamera.zoom, CANVAS_HEIGHT - 30);
      ctx.stroke();
      
      for (let i = 0; i < 15; i++) {
        const starX = ((i * 60 + renderWorldScroll * 0.1) % (CANVAS_WIDTH + 100)) + renderCamera.x;
        const starY = 30 + (i * 37) % 150;
        const brightness = 0.5 + 0.5 * Math.sin(Date.now() * 0.005 + i);
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
        ctx.beginPath();
        ctx.arc(starX, starY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    for (const pipe of renderPipes) {
      let shouldRenderPipe = true;
      if (renderActiveMaze) {
        const mazeGridRowsRenderPipe = renderActiveMaze.grid.length;
        const mazeGridColsRenderPipe = renderActiveMaze.grid[0]?.length || 10;
        const MAZE_CELL_SIZE_PIPE = Math.floor((CANVAS_HEIGHT - 80 - 50) / mazeGridRowsRenderPipe); // 470px playable (below ceiling, above ground)
        const mazeStartX = renderActiveMaze.x;
        const mazeEndX = renderActiveMaze.x + MAZE_CELL_SIZE_PIPE * mazeGridColsRenderPipe;
        // Only hide pipes actually INSIDE the maze - no margin to prevent invisible deadly pipes
        shouldRenderPipe = pipe.x < mazeStartX || pipe.x > mazeEndX;
      }
      
      if (shouldRenderPipe) {
        ctx.save();
        if (pipe.opacity !== undefined && pipe.opacity < 1) {
          ctx.globalAlpha = pipe.opacity;
        }
        
        const effectiveHeight = pipe.height + (pipe.moveOffset || 0);
        // Using global CAP_HEIGHT and CAP_EXTEND constants
        
        if (pipe.isSpecial) {
          const topGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
          topGradient.addColorStop(0, "#FFD700");
          topGradient.addColorStop(0.3, "#FFEC8B");
          topGradient.addColorStop(0.5, "#FFD700");
          topGradient.addColorStop(0.7, "#DAA520");
          topGradient.addColorStop(1, "#B8860B");
          
          ctx.fillStyle = topGradient;
          ctx.fillRect(pipe.x, 0, PIPE_WIDTH, effectiveHeight - CAP_HEIGHT);
          ctx.fillRect(pipe.x, effectiveHeight + pipe.gap + CAP_HEIGHT, PIPE_WIDTH, CANVAS_HEIGHT - effectiveHeight - pipe.gap - CAP_HEIGHT);
          
          ctx.fillStyle = "#DAA520";
          ctx.fillRect(pipe.x - CAP_EXTEND, effectiveHeight - CAP_HEIGHT, PIPE_WIDTH + CAP_EXTEND * 2, CAP_HEIGHT);
          ctx.fillRect(pipe.x - CAP_EXTEND, effectiveHeight + pipe.gap, PIPE_WIDTH + CAP_EXTEND * 2, CAP_HEIGHT);
          
          ctx.strokeStyle = "#8B6914";
          ctx.lineWidth = 2;
          ctx.strokeRect(pipe.x - CAP_EXTEND, effectiveHeight - CAP_HEIGHT, PIPE_WIDTH + CAP_EXTEND * 2, CAP_HEIGHT);
          ctx.strokeRect(pipe.x - CAP_EXTEND, effectiveHeight + pipe.gap, PIPE_WIDTH + CAP_EXTEND * 2, CAP_HEIGHT);
          
          ctx.fillStyle = "#FFEC8B";
          ctx.fillRect(pipe.x + 4, 4, 6, effectiveHeight - CAP_HEIGHT - 8);
          ctx.fillRect(pipe.x + 4, effectiveHeight + pipe.gap + CAP_HEIGHT + 4, 6, CANVAS_HEIGHT - effectiveHeight - pipe.gap - CAP_HEIGHT - 8);
          
          if (!pipe.isEntered) {
            ctx.fillStyle = "#FFF";
            ctx.font = "bold 20px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("⭐", pipe.x + PIPE_WIDTH / 2, effectiveHeight + pipe.gap / 2);
          }
        } else {
          const pipeGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
          pipeGradient.addColorStop(0, "#73BF2E");
          pipeGradient.addColorStop(0.2, "#8CD43D");
          pipeGradient.addColorStop(0.4, "#73BF2E");
          pipeGradient.addColorStop(0.6, "#5FA328");
          pipeGradient.addColorStop(1, "#4A8020");
          
          ctx.fillStyle = pipeGradient;
          ctx.fillRect(pipe.x, 0, PIPE_WIDTH, effectiveHeight - CAP_HEIGHT);
          ctx.fillRect(pipe.x, effectiveHeight + pipe.gap + CAP_HEIGHT, PIPE_WIDTH, CANVAS_HEIGHT - effectiveHeight - pipe.gap - CAP_HEIGHT);
          
          const capGradient = ctx.createLinearGradient(pipe.x - CAP_EXTEND, 0, pipe.x + PIPE_WIDTH + CAP_EXTEND, 0);
          capGradient.addColorStop(0, "#5FA328");
          capGradient.addColorStop(0.2, "#73BF2E");
          capGradient.addColorStop(0.5, "#5FA328");
          capGradient.addColorStop(0.8, "#4A8020");
          capGradient.addColorStop(1, "#3D6A1A");
          
          ctx.fillStyle = capGradient;
          ctx.fillRect(pipe.x - CAP_EXTEND, effectiveHeight - CAP_HEIGHT, PIPE_WIDTH + CAP_EXTEND * 2, CAP_HEIGHT);
          ctx.fillRect(pipe.x - CAP_EXTEND, effectiveHeight + pipe.gap, PIPE_WIDTH + CAP_EXTEND * 2, CAP_HEIGHT);
          
          ctx.strokeStyle = "#3D6A1A";
          ctx.lineWidth = 2;
          ctx.strokeRect(pipe.x - CAP_EXTEND, effectiveHeight - CAP_HEIGHT, PIPE_WIDTH + CAP_EXTEND * 2, CAP_HEIGHT);
          ctx.strokeRect(pipe.x - CAP_EXTEND, effectiveHeight + pipe.gap, PIPE_WIDTH + CAP_EXTEND * 2, CAP_HEIGHT);
          
          ctx.fillStyle = "#8CD43D";
          ctx.fillRect(pipe.x + 4, 4, 6, effectiveHeight - CAP_HEIGHT - 8);
          ctx.fillRect(pipe.x + 4, effectiveHeight + pipe.gap + CAP_HEIGHT + 4, 6, CANVAS_HEIGHT - effectiveHeight - pipe.gap - CAP_HEIGHT - 8);
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
        
        // World-themed pipe bases at top and bottom
        const world = getWorldForLevel(currentLevel);
        const baseHeight = 18;
        const baseExtend = 8;
        
        if (world.id === 'forest') {
          // Forest: Green organic vine-like bases with leaves
          const forestGrad = ctx.createLinearGradient(pipe.x - baseExtend, 0, pipe.x + PIPE_WIDTH + baseExtend, 0);
          forestGrad.addColorStop(0, "#2D5016");
          forestGrad.addColorStop(0.5, "#3D6B1E");
          forestGrad.addColorStop(1, "#2D5016");
          
          // Top base (ceiling mount)
          ctx.fillStyle = forestGrad;
          ctx.fillRect(pipe.x - baseExtend, 0, PIPE_WIDTH + baseExtend * 2, baseHeight);
          ctx.fillStyle = "#4A8020";
          ctx.fillRect(pipe.x - baseExtend + 2, 2, PIPE_WIDTH + baseExtend * 2 - 4, 3);
          // Leaf decorations
          ctx.fillStyle = "#228B22";
          ctx.beginPath();
          ctx.ellipse(pipe.x - 2, baseHeight - 2, 6, 4, -0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(pipe.x + PIPE_WIDTH + 2, baseHeight - 2, 6, 4, 0.3, 0, Math.PI * 2);
          ctx.fill();
          
          // Bottom base (ground mount)
          ctx.fillStyle = forestGrad;
          ctx.fillRect(pipe.x - baseExtend, CANVAS_HEIGHT - baseHeight, PIPE_WIDTH + baseExtend * 2, baseHeight);
          ctx.fillStyle = "#4A8020";
          ctx.fillRect(pipe.x - baseExtend + 2, CANVAS_HEIGHT - 5, PIPE_WIDTH + baseExtend * 2 - 4, 3);
          // Root decorations
          ctx.fillStyle = "#5D4037";
          ctx.beginPath();
          ctx.moveTo(pipe.x - 4, CANVAS_HEIGHT - baseHeight);
          ctx.quadraticCurveTo(pipe.x - 8, CANVAS_HEIGHT - 8, pipe.x - 6, CANVAS_HEIGHT);
          ctx.lineTo(pipe.x - 2, CANVAS_HEIGHT);
          ctx.closePath();
          ctx.fill();
          
        } else if (world.id === 'rocky') {
          // Rocky Mountains: Stone/rock texture bases
          const rockGrad = ctx.createLinearGradient(pipe.x - baseExtend, 0, pipe.x + PIPE_WIDTH + baseExtend, 0);
          rockGrad.addColorStop(0, "#4A4A4A");
          rockGrad.addColorStop(0.3, "#6B6B6B");
          rockGrad.addColorStop(0.7, "#5A5A5A");
          rockGrad.addColorStop(1, "#3A3A3A");
          
          // Top base with rock texture
          ctx.fillStyle = rockGrad;
          ctx.fillRect(pipe.x - baseExtend, 0, PIPE_WIDTH + baseExtend * 2, baseHeight + 4);
          ctx.strokeStyle = "#2A2A2A";
          ctx.lineWidth = 2;
          ctx.strokeRect(pipe.x - baseExtend, 0, PIPE_WIDTH + baseExtend * 2, baseHeight + 4);
          // Stone cracks
          ctx.strokeStyle = "#333";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pipe.x + 10, 0);
          ctx.lineTo(pipe.x + 15, baseHeight);
          ctx.moveTo(pipe.x + PIPE_WIDTH - 10, 0);
          ctx.lineTo(pipe.x + PIPE_WIDTH - 5, baseHeight);
          ctx.stroke();
          
          // Bottom base
          ctx.fillStyle = rockGrad;
          ctx.fillRect(pipe.x - baseExtend, CANVAS_HEIGHT - baseHeight - 4, PIPE_WIDTH + baseExtend * 2, baseHeight + 4);
          ctx.strokeStyle = "#2A2A2A";
          ctx.lineWidth = 2;
          ctx.strokeRect(pipe.x - baseExtend, CANVAS_HEIGHT - baseHeight - 4, PIPE_WIDTH + baseExtend * 2, baseHeight + 4);
          
        } else if (world.id === 'desert') {
          // Desert: Golden ornate Egyptian-style bases
          const goldGrad = ctx.createLinearGradient(pipe.x - baseExtend, 0, pipe.x + PIPE_WIDTH + baseExtend, 0);
          goldGrad.addColorStop(0, "#B8860B");
          goldGrad.addColorStop(0.3, "#DAA520");
          goldGrad.addColorStop(0.5, "#FFD700");
          goldGrad.addColorStop(0.7, "#DAA520");
          goldGrad.addColorStop(1, "#B8860B");
          
          // Top base with Egyptian styling
          ctx.fillStyle = goldGrad;
          ctx.fillRect(pipe.x - baseExtend - 4, 0, PIPE_WIDTH + baseExtend * 2 + 8, baseHeight + 6);
          ctx.fillStyle = "#8B6914";
          ctx.fillRect(pipe.x - baseExtend - 2, baseHeight + 2, PIPE_WIDTH + baseExtend * 2 + 4, 4);
          // Hieroglyph-like decorations
          ctx.strokeStyle = "#654321";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pipe.x + PIPE_WIDTH / 2, 10, 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(pipe.x + PIPE_WIDTH / 2 - 3, 8);
          ctx.lineTo(pipe.x + PIPE_WIDTH / 2, 4);
          ctx.lineTo(pipe.x + PIPE_WIDTH / 2 + 3, 8);
          ctx.stroke();
          
          // Bottom base
          ctx.fillStyle = goldGrad;
          ctx.fillRect(pipe.x - baseExtend - 4, CANVAS_HEIGHT - baseHeight - 6, PIPE_WIDTH + baseExtend * 2 + 8, baseHeight + 6);
          ctx.fillStyle = "#8B6914";
          ctx.fillRect(pipe.x - baseExtend - 2, CANVAS_HEIGHT - baseHeight - 6, PIPE_WIDTH + baseExtend * 2 + 4, 4);
          
        } else if (world.id === 'ice') {
          // Ice World: Crystal/icy bases with icicles
          const iceGrad = ctx.createLinearGradient(pipe.x - baseExtend, 0, pipe.x + PIPE_WIDTH + baseExtend, 0);
          iceGrad.addColorStop(0, "#87CEEB");
          iceGrad.addColorStop(0.3, "#B0E0E6");
          iceGrad.addColorStop(0.5, "#E0FFFF");
          iceGrad.addColorStop(0.7, "#B0E0E6");
          iceGrad.addColorStop(1, "#87CEEB");
          
          // Top base with icicles hanging down
          ctx.fillStyle = iceGrad;
          ctx.fillRect(pipe.x - baseExtend, 0, PIPE_WIDTH + baseExtend * 2, baseHeight);
          ctx.strokeStyle = "#4682B4";
          ctx.lineWidth = 2;
          ctx.strokeRect(pipe.x - baseExtend, 0, PIPE_WIDTH + baseExtend * 2, baseHeight);
          // Icicles
          ctx.fillStyle = "#ADD8E6";
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(pipe.x + i * 15 + 5, baseHeight);
            ctx.lineTo(pipe.x + i * 15 + 8, baseHeight + 12);
            ctx.lineTo(pipe.x + i * 15 + 11, baseHeight);
            ctx.fill();
          }
          
          // Bottom base with ice crystals pointing up
          ctx.fillStyle = iceGrad;
          ctx.fillRect(pipe.x - baseExtend, CANVAS_HEIGHT - baseHeight, PIPE_WIDTH + baseExtend * 2, baseHeight);
          ctx.strokeStyle = "#4682B4";
          ctx.strokeRect(pipe.x - baseExtend, CANVAS_HEIGHT - baseHeight, PIPE_WIDTH + baseExtend * 2, baseHeight);
          // Ice crystals
          ctx.fillStyle = "#ADD8E6";
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(pipe.x + i * 18 + 8, CANVAS_HEIGHT - baseHeight);
            ctx.lineTo(pipe.x + i * 18 + 12, CANVAS_HEIGHT - baseHeight - 10);
            ctx.lineTo(pipe.x + i * 18 + 16, CANVAS_HEIGHT - baseHeight);
            ctx.fill();
          }
          
        } else if (world.id === 'neon') {
          // Neon Cave: Glowing tech/circuit-style bases
          const time = Date.now() * 0.003;
          const glowIntensity = 0.7 + 0.3 * Math.sin(time);
          
          // Top base with neon glow
          ctx.fillStyle = "#1a0a2e";
          ctx.fillRect(pipe.x - baseExtend - 2, 0, PIPE_WIDTH + baseExtend * 2 + 4, baseHeight + 4);
          ctx.strokeStyle = `rgba(0, 255, 255, ${glowIntensity})`;
          ctx.lineWidth = 3;
          ctx.strokeRect(pipe.x - baseExtend - 2, 0, PIPE_WIDTH + baseExtend * 2 + 4, baseHeight + 4);
          // Circuit lines
          ctx.strokeStyle = `rgba(255, 0, 255, ${glowIntensity})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(pipe.x, baseHeight);
          ctx.lineTo(pipe.x + 10, 8);
          ctx.lineTo(pipe.x + 20, 8);
          ctx.moveTo(pipe.x + PIPE_WIDTH - 20, 8);
          ctx.lineTo(pipe.x + PIPE_WIDTH - 10, 8);
          ctx.lineTo(pipe.x + PIPE_WIDTH, baseHeight);
          ctx.stroke();
          // Glowing dots
          ctx.fillStyle = `rgba(0, 255, 255, ${glowIntensity})`;
          ctx.beginPath();
          ctx.arc(pipe.x + PIPE_WIDTH / 2, 8, 4, 0, Math.PI * 2);
          ctx.fill();
          
          // Bottom base
          ctx.fillStyle = "#1a0a2e";
          ctx.fillRect(pipe.x - baseExtend - 2, CANVAS_HEIGHT - baseHeight - 4, PIPE_WIDTH + baseExtend * 2 + 4, baseHeight + 4);
          ctx.strokeStyle = `rgba(0, 255, 255, ${glowIntensity})`;
          ctx.lineWidth = 3;
          ctx.strokeRect(pipe.x - baseExtend - 2, CANVAS_HEIGHT - baseHeight - 4, PIPE_WIDTH + baseExtend * 2 + 4, baseHeight + 4);
          ctx.fillStyle = `rgba(255, 0, 255, ${glowIntensity})`;
          ctx.beginPath();
          ctx.arc(pipe.x + PIPE_WIDTH / 2, CANVAS_HEIGHT - 10, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.restore();
      }
    }
    
    if (activeMaze) {
      const GROUND_HEIGHT_RENDER = 80;
      const CEILING_HEIGHT_RENDER = 50; // Below ceiling
      const PLAYABLE_HEIGHT_RENDER = CANVAS_HEIGHT - GROUND_HEIGHT_RENDER - CEILING_HEIGHT_RENDER; // 470px
      // Use actual maze grid dimensions for rendering
      const mazeGridRowsRender = activeMaze.grid.length;
      const CELL_SIZE = Math.floor(PLAYABLE_HEIGHT_RENDER / mazeGridRowsRender);
      const MAZE_OFFSET_Y = CEILING_HEIGHT_RENDER; // Start below ceiling
      
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
    
    for (const obstacle of renderObstacles) {
      let shouldRenderObstacle = true;
      if (renderActiveMaze) {
        const mazeGridRowsRenderObs = renderActiveMaze.grid.length;
        const mazeGridColsRenderObs = renderActiveMaze.grid[0]?.length || 10;
        const MAZE_CELL_SIZE_OBS = Math.floor((CANVAS_HEIGHT - 80 - 50) / mazeGridRowsRenderObs); // 470px playable (below ceiling, above ground)
        const mazeStartX = renderActiveMaze.x;
        const mazeEndX = renderActiveMaze.x + MAZE_CELL_SIZE_OBS * mazeGridColsRenderObs;
        // Only hide obstacles that are actually INSIDE the maze (matching collision logic)
        // No margin - if it can kill you, you should see it!
        shouldRenderObstacle = obstacle.x < mazeStartX || obstacle.x > mazeEndX;
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
    
    for (const bug of renderBugs) {
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
    
    for (const powerUp of renderPowerUps) {
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
    
    for (const proj of renderProjectiles) {
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
    
    const hasShrink = renderActivePowerUps.some(p => p.type === "shrink");
    const segmentsToShow = hasShrink ? Math.ceil(renderSnake.segments.length * 0.3) : renderSnake.segments.length;
    
    let mazeScale = 1.0;
    if (renderActiveMaze) {
      const MAZE_PLAYABLE_SCALE = CANVAS_HEIGHT - 80 - 50; // 470px (below ceiling, above ground)
      const mazeGridRowsScale = renderActiveMaze.grid.length;
      const mazeGridColsScale = renderActiveMaze.grid[0]?.length || 10;
      const CELL_SIZE = Math.floor(MAZE_PLAYABLE_SCALE / mazeGridRowsScale);
      const mazeWidthPxScale = CELL_SIZE * mazeGridColsScale;
      const distanceToMaze = renderActiveMaze.x - renderSnake.head.x;
      const TRANSITION_DISTANCE = 300;
      
      if (distanceToMaze < TRANSITION_DISTANCE && distanceToMaze > -mazeWidthPxScale - 100) {
        if (distanceToMaze > 0) {
          const progress = 1 - (distanceToMaze / TRANSITION_DISTANCE);
          mazeScale = 1.0 - (progress * 0.6);
        } else {
          mazeScale = 0.4;
        }
      }
    }
    
    for (let i = segmentsToShow - 1; i >= 0; i--) {
      if (i >= renderSnake.segments.length) continue;
      const segment = renderSnake.segments[i];
      const alpha = 1 - (i / renderSnake.segments.length) * 0.3;
      
      const baseHue = 120;
      const hue = baseHue + (renderSnake.evolutionStage * 15);
      
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
    
    const headHue = 120 + (renderSnake.evolutionStage * 15);
    ctx.save();
    ctx.translate(renderSnake.head.x, renderSnake.head.y);
    ctx.rotate(renderSnake.angle);
    
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
    
    ctx.restore(); // Camera transform
  };

  const renderUI = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Apply combined scaling for UI (cssScale × dpr) - matches render transform
    const metrics = viewportMetricsRef.current;
    const totalScale = metrics.cssScale * metrics.dpr;
    ctx.setTransform(totalScale, 0, 0, totalScale, 0, 0);
    ctx.save();
    
    const currentWorldConfig = getWorldForLevel(currentLevel);
    
    const hasGravityWorld = currentWorldConfig.mechanics.hasGravity;
    const gravityStrength = getExtraGravity(currentLevel, currentWorldConfig);
    
    let hudLines = 2;
    if (levelObjectives.length > 0) hudLines += Math.min(levelObjectives.length, 3);
    if (continueInvincibility > 0 || isBeingChased || inBonusScene) hudLines += 1;
    if (speedReductionActive) hudLines += 1;
    if (hasGravityWorld) hudLines += 1; // Show gravity world indicator
    
    const hudHeight = 8 + hudLines * 18;
    const hudWidth = 200;
    
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.roundRect ? ctx.roundRect(8, 8, hudWidth, hudHeight, 6) : ctx.fillRect(8, 8, hudWidth, hudHeight);
    ctx.fill();
    
    ctx.textAlign = "left";
    let y = 24;
    
    ctx.fillStyle = "#00D4FF";
    ctx.font = "bold 13px monospace";
    ctx.fillText(`L${currentLevel} ${currentWorldConfig.name}`, 14, y);
    
    ctx.fillStyle = "#FFF";
    ctx.fillText(`${score}`, 14 + hudWidth - 60, y);
    y += 16;
    
    ctx.fillStyle = "#AAA";
    ctx.font = "12px monospace";
    ctx.fillText(`${Math.floor(distance)}m`, 14, y);
    
    if (combo > 1) {
      ctx.fillStyle = "#FFD700";
      ctx.fillText(`x${combo}`, 70, y);
    }
    y += 16;
    
    if (continueInvincibility > 0) {
      ctx.fillStyle = Math.floor(Date.now() / 100) % 2 === 0 ? "#00FF00" : "#FFF";
      ctx.font = "bold 11px monospace";
      ctx.fillText(`🛡️${continueInvincibility.toFixed(0)}s`, 14, y);
    }
    if (isBeingChased) {
      ctx.fillStyle = "#FF4444";
      ctx.font = "bold 11px monospace";
      ctx.fillText("⚠️CHASE!", continueInvincibility > 0 ? 70 : 14, y);
    }
    if (inBonusScene) {
      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 11px monospace";
      const bonusX = isBeingChased ? 130 : (continueInvincibility > 0 ? 70 : 14);
      ctx.fillText("⭐BONUS", bonusX, y);
    }
    if (continueInvincibility > 0 || isBeingChased || inBonusScene) y += 16;
    
    // Speed reduction indicator
    if (speedReductionActive) {
      const remainingMs = Math.max(0, speedReductionEndTime - Date.now());
      const remainingSecs = Math.ceil(remainingMs / 1000);
      ctx.fillStyle = Math.floor(Date.now() / 300) % 2 === 0 ? "#00FF88" : "#00FFFF";
      ctx.font = "bold 12px monospace";
      ctx.fillText(`🐢 SLOW MODE: ${remainingSecs}s`, 14, y);
      y += 16;
    }
    
    // Gravity indicator for Ice World and Neon Cave
    if (hasGravityWorld) {
      if (gravityDisabledActive) {
        // Show gravity disabled timer
        const remainingMs = Math.max(0, gravityDisabledEndTime - Date.now());
        const remainingSecs = Math.ceil(remainingMs / 1000);
        ctx.fillStyle = Math.floor(Date.now() / 300) % 2 === 0 ? "#00FF00" : "#FFFF00";
        ctx.font = "bold 12px monospace";
        ctx.fillText(`🎈 NO GRAVITY: ${remainingSecs}s`, 14, y);
      } else {
        const gravityLevel = Math.round(gravityStrength * 100);
        const gravityColor = currentWorldConfig.id === 'neon' ? "#FF00FF" : "#00BFFF";
        ctx.fillStyle = Math.floor(Date.now() / 400) % 2 === 0 ? gravityColor : "#FFFFFF";
        ctx.font = "bold 12px monospace";
        ctx.fillText(`⬇️ GRAVITY +${gravityLevel}%`, 14, y);
      }
      y += 16;
    }
    
    levelObjectives.slice(0, 3).forEach((objective) => {
      const progress = objectiveProgress[objective.type] || 0;
      const isComplete = progress >= objective.target;
      ctx.fillStyle = isComplete ? "#00FF00" : "#CCC";
      ctx.font = "11px monospace";
      const shortDesc = objective.description.replace("Collect ", "").replace("Destroy ", "").replace("Navigate ", "");
      ctx.fillText(`${isComplete ? "✓" : "○"} ${shortDesc.slice(0, 18)}: ${progress}/${objective.target}`, 14, y);
      y += 16;
    });
    
    if (activePowerUps.length > 0) {
      const pwrY = CANVAS_HEIGHT - 30;
      let pwrX = 10;
      
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(8, pwrY - 8, activePowerUps.length * 55, 28);
      
      activePowerUps.forEach((powerUp) => {
        const color = powerUp.type === "magnet" ? "#3498DB" : 
                     (powerUp.type === "ghost" ? "#E67E22" : 
                     (powerUp.type === "shooter" ? "#E74C3C" :
                     (powerUp.type === "shield" ? "#FFD700" :
                     (powerUp.type === "ice" ? "#00FFFF" :
                     (powerUp.type === "speed" ? "#32CD32" : "#9B59B6")))));
        ctx.fillStyle = color;
        ctx.font = "bold 12px monospace";
        const label = powerUp.type.slice(0, 3).toUpperCase();
        ctx.fillText(`${label}:${powerUp.remainingTime.toFixed(0)}`, pwrX, pwrY + 8);
        pwrX += 55;
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
    
    if (showGameOver && !showingAd && !watchingSpeedAd && !watchingGravityAd) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      ctx.textAlign = "center";
      
      // Title - more compact
      ctx.fillStyle = "#FF4444";
      ctx.font = "bold 36px monospace";
      ctx.fillText("GAME OVER", CANVAS_WIDTH / 2, 50);
      
      // Score info - compact
      ctx.fillStyle = "#FFF";
      ctx.font = "18px monospace";
      ctx.fillText(`Score: ${score}  |  Level ${currentLevel}`, CANVAS_WIDTH / 2, 85);
      
      const currentWorldConfig = getWorldForLevel(currentLevel);
      
      // Compact button layout for better mobile fit
      const BTN_WIDTH = 260;
      const BTN_HEIGHT = 36;
      const BTN_X = CANVAS_WIDTH / 2 - BTN_WIDTH / 2;
      const BTN_SPACING = 42;
      let btnY = 110;
      
      // Continue button
      if (canUseContinue()) {
        ctx.fillStyle = "#32CD32";
        ctx.fillRect(BTN_X, btnY, BTN_WIDTH, BTN_HEIGHT);
        ctx.fillStyle = "#000";
        ctx.font = "bold 14px monospace";
        ctx.fillText(`📺 CONTINUE (${maxContinuesPerGame - continuesUsed} left)`, CANVAS_WIDTH / 2, btnY + 24);
        btnY += BTN_SPACING;
      }
      
      // Speed reduction button (level 10+)
      if (currentLevel >= 10) {
        if (pendingSpeedReduction) {
          ctx.fillStyle = "#228B22";
          ctx.fillRect(BTN_X, btnY, BTN_WIDTH, BTN_HEIGHT);
          ctx.fillStyle = "#FFF";
          ctx.font = "bold 14px monospace";
          ctx.fillText("✓ SLOW MODE READY", CANVAS_WIDTH / 2, btnY + 24);
        } else {
          ctx.fillStyle = "#4169E1";
          ctx.fillRect(BTN_X, btnY, BTN_WIDTH, BTN_HEIGHT);
          ctx.fillStyle = "#FFF";
          ctx.font = "bold 14px monospace";
          ctx.fillText("🐢 AD FOR 60s SLOW MODE", CANVAS_WIDTH / 2, btnY + 24);
        }
        btnY += BTN_SPACING;
      }
      
      // Gravity button (level 31+)
      if (currentWorldConfig.mechanics.hasGravity) {
        if (pendingGravityDisabled) {
          ctx.fillStyle = "#2E8B57";
          ctx.fillRect(BTN_X, btnY, BTN_WIDTH, BTN_HEIGHT);
          ctx.fillStyle = "#FFF";
          ctx.font = "bold 14px monospace";
          ctx.fillText("✓ NO GRAVITY READY", CANVAS_WIDTH / 2, btnY + 24);
        } else {
          ctx.fillStyle = "#8B4513";
          ctx.fillRect(BTN_X, btnY, BTN_WIDTH, BTN_HEIGHT);
          ctx.fillStyle = "#FFF";
          ctx.font = "bold 14px monospace";
          ctx.fillText("🎈 AD FOR 60s NO GRAVITY", CANVAS_WIDTH / 2, btnY + 24);
        }
        btnY += BTN_SPACING;
      }
      
      // Pending effects message - compact
      if (pendingSpeedReduction || pendingGravityDisabled) {
        ctx.fillStyle = "#90EE90";
        ctx.font = "11px monospace";
        const effects = [
          pendingSpeedReduction ? "🐢Slow" : "",
          pendingGravityDisabled ? "🎈NoGrav" : ""
        ].filter(Boolean).join(" + ");
        ctx.fillText(`Effects on restart: ${effects}`, CANVAS_WIDTH / 2, btnY);
        btnY += 18;
      }
      
      // High scores (compact) - inline format
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
        ctx.font = "bold 12px monospace";
        const topScores = leaderboard.slice(0, 3).map((s, i) => `#${i+1}:${s}`).join("  ");
        ctx.fillText(`HIGH SCORES  ${topScores}`, CANVAS_WIDTH / 2, btnY + 8);
        btnY += 28;
      } else {
        btnY += 10;
      }
      
      // Try Again button - use remaining space efficiently
      const TRY_AGAIN_Y = Math.min(btnY, 450);
      ctx.fillStyle = "#666";
      ctx.fillRect(BTN_X, TRY_AGAIN_Y, BTN_WIDTH, BTN_HEIGHT);
      ctx.fillStyle = "#FFF";
      ctx.font = "bold 15px monospace";
      ctx.fillText("TRY AGAIN", CANVAS_WIDTH / 2, TRY_AGAIN_Y + 24);
      
      // Main Menu button - right below Try Again
      const MAIN_MENU_Y = TRY_AGAIN_Y + BTN_HEIGHT + 6;
      ctx.fillStyle = "#444";
      ctx.fillRect(BTN_X, MAIN_MENU_Y, BTN_WIDTH, BTN_HEIGHT);
      ctx.fillStyle = "#CCC";
      ctx.font = "bold 15px monospace";
      ctx.fillText("MAIN MENU", CANVAS_WIDTH / 2, MAIN_MENU_Y + 24);
    }
    
    // Speed ad watching overlay
    if (watchingSpeedAd) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      const videoAreaX = 50;
      const videoAreaY = 80;
      const videoAreaW = CANVAS_WIDTH - 100;
      const videoAreaH = 320;
      
      const gradient = ctx.createLinearGradient(videoAreaX, videoAreaY, videoAreaX + videoAreaW, videoAreaY + videoAreaH);
      const time = Date.now() / 1000;
      gradient.addColorStop(0, `hsl(${(time * 20) % 360}, 60%, 30%)`);
      gradient.addColorStop(0.5, `hsl(${(time * 20 + 180) % 360}, 60%, 40%)`);
      gradient.addColorStop(1, `hsl(${(time * 20 + 90) % 360}, 60%, 30%)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(videoAreaX, videoAreaY, videoAreaW, videoAreaH);
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font = "bold 42px Arial";
      ctx.textAlign = "center";
      ctx.fillText("🐢 TURBO SLOW PRO", CANVAS_WIDTH / 2, videoAreaY + 100);
      
      ctx.fillStyle = "#90EE90";
      ctx.font = "bold 28px Arial";
      ctx.fillText("Master Any Level!", CANVAS_WIDTH / 2, videoAreaY + 150);
      
      ctx.fillStyle = "#FFF";
      ctx.font = "22px Arial";
      ctx.fillText("★★★★★ Millions of Downloads", CANVAS_WIDTH / 2, videoAreaY + 200);
      
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(videoAreaX, videoAreaY, 120, 35);
      ctx.fillStyle = "#FF0";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "left";
      ctx.fillText("⚠️ TEST AD", videoAreaX + 10, videoAreaY + 24);
      
      ctx.textAlign = "center";
      ctx.fillStyle = "#4169E1";
      ctx.font = "bold 22px monospace";
      ctx.fillText("🎁 REWARD: 60s Slow Mode", CANVAS_WIDTH / 2, videoAreaY + videoAreaH + 40);
      
      const barY = videoAreaY + videoAreaH + 70;
      const barWidth = CANVAS_WIDTH - 100;
      const adDuration = 3;
      const elapsed = adDuration - speedAdCountdown;
      const progress = elapsed / adDuration;
      
      ctx.fillStyle = "#333";
      ctx.fillRect(50, barY, barWidth, 25);
      ctx.fillStyle = "#4169E1";
      ctx.fillRect(50, barY, barWidth * progress, 25);
      
      ctx.fillStyle = "#FFF";
      ctx.font = "14px Arial";
      ctx.fillText(`${speedAdCountdown}s remaining`, CANVAS_WIDTH / 2, barY + 50);
      
      ctx.fillStyle = "#666";
      ctx.font = "12px Arial";
      ctx.fillText("This is a simulated test ad. Real ads appear after mobile deployment.", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30);
    }
    
    // Gravity ad watching overlay
    if (watchingGravityAd) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      const videoAreaX = 50;
      const videoAreaY = 80;
      const videoAreaW = CANVAS_WIDTH - 100;
      const videoAreaH = 320;
      
      const gradient = ctx.createLinearGradient(videoAreaX, videoAreaY, videoAreaX + videoAreaW, videoAreaY + videoAreaH);
      const time = Date.now() / 1000;
      gradient.addColorStop(0, `hsl(${(time * 15) % 360}, 50%, 25%)`);
      gradient.addColorStop(0.5, `hsl(${(time * 15 + 90) % 360}, 50%, 35%)`);
      gradient.addColorStop(1, `hsl(${(time * 15 + 180) % 360}, 50%, 25%)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(videoAreaX, videoAreaY, videoAreaW, videoAreaH);
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font = "bold 42px Arial";
      ctx.textAlign = "center";
      ctx.fillText("🎈 ANTI-GRAVITY PRO", CANVAS_WIDTH / 2, videoAreaY + 100);
      
      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 28px Arial";
      ctx.fillText("Float Through Any Level!", CANVAS_WIDTH / 2, videoAreaY + 150);
      
      ctx.fillStyle = "#FFF";
      ctx.font = "22px Arial";
      ctx.fillText("★★★★★ Millions of Downloads", CANVAS_WIDTH / 2, videoAreaY + 200);
      
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(videoAreaX, videoAreaY, 120, 35);
      ctx.fillStyle = "#FF0";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "left";
      ctx.fillText("⚠️ TEST AD", videoAreaX + 10, videoAreaY + 24);
      
      ctx.textAlign = "center";
      ctx.fillStyle = "#8B4513";
      ctx.font = "bold 22px monospace";
      ctx.fillText("🎁 REWARD: 60s No Gravity", CANVAS_WIDTH / 2, videoAreaY + videoAreaH + 40);
      
      const barY = videoAreaY + videoAreaH + 70;
      const barWidth = CANVAS_WIDTH - 100;
      const adDuration = 3;
      const elapsed = adDuration - gravityAdCountdown;
      const progress = elapsed / adDuration;
      
      ctx.fillStyle = "#333";
      ctx.fillRect(50, barY, barWidth, 25);
      ctx.fillStyle = "#8B4513";
      ctx.fillRect(50, barY, barWidth * progress, 25);
      
      ctx.fillStyle = "#FFF";
      ctx.font = "14px Arial";
      ctx.fillText(`${gravityAdCountdown}s remaining`, CANVAS_WIDTH / 2, barY + 50);
      
      ctx.fillStyle = "#666";
      ctx.font = "12px Arial";
      ctx.fillText("This is a simulated test ad. Real ads appear after mobile deployment.", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30);
    }
    
    if (showingAd) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      const videoAreaX = 50;
      const videoAreaY = 80;
      const videoAreaW = CANVAS_WIDTH - 100;
      const videoAreaH = 320;
      
      const gradient = ctx.createLinearGradient(videoAreaX, videoAreaY, videoAreaX + videoAreaW, videoAreaY + videoAreaH);
      const time = Date.now() / 1000;
      gradient.addColorStop(0, `hsl(${(time * 30) % 360}, 70%, 40%)`);
      gradient.addColorStop(0.5, `hsl(${(time * 30 + 120) % 360}, 70%, 50%)`);
      gradient.addColorStop(1, `hsl(${(time * 30 + 240) % 360}, 70%, 40%)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(videoAreaX, videoAreaY, videoAreaW, videoAreaH);
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font = "bold 48px Arial";
      ctx.textAlign = "center";
      ctx.fillText("🎮 SUPER GAME PRO", CANVAS_WIDTH / 2, videoAreaY + 100);
      
      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 32px Arial";
      ctx.fillText("Download Now - FREE!", CANVAS_WIDTH / 2, videoAreaY + 160);
      
      ctx.fillStyle = "#FFF";
      ctx.font = "24px Arial";
      ctx.fillText("★★★★★ 4.8 Rating", CANVAS_WIDTH / 2, videoAreaY + 210);
      
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(videoAreaX, videoAreaY, 120, 35);
      ctx.fillStyle = "#FF0";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "left";
      ctx.fillText("⚠️ TEST AD", videoAreaX + 10, videoAreaY + 24);
      
      const adDuration = 5;
      const elapsed = adDuration - adCountdown;
      const canSkip = elapsed >= 3;
      
      ctx.textAlign = "right";
      if (canSkip) {
        ctx.fillStyle = "#FFF";
        ctx.fillRect(CANVAS_WIDTH - 150, videoAreaY, 100, 35);
        ctx.fillStyle = "#000";
        ctx.font = "bold 14px Arial";
        ctx.fillText("Skip Ad ➜", CANVAS_WIDTH - 60, videoAreaY + 24);
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.font = "14px Arial";
        ctx.fillText(`Skip in ${Math.ceil(3 - elapsed)}s`, CANVAS_WIDTH - 60, videoAreaY + 24);
      }
      
      ctx.textAlign = "center";
      ctx.fillStyle = "#32CD32";
      ctx.font = "bold 24px monospace";
      ctx.fillText("🎁 REWARD: Extra Life + 3s Invincibility", CANVAS_WIDTH / 2, videoAreaY + videoAreaH + 50);
      
      const barY = videoAreaY + videoAreaH + 80;
      const barWidth = CANVAS_WIDTH - 100;
      const progress = elapsed / adDuration;
      
      ctx.fillStyle = "#333";
      ctx.fillRect(50, barY, barWidth, 12);
      ctx.fillStyle = "#FF4444";
      ctx.fillRect(50, barY, barWidth * progress, 12);
      
      ctx.fillStyle = "#888";
      ctx.font = "14px Arial";
      ctx.fillText(`${Math.ceil(adCountdown)}s remaining`, CANVAS_WIDTH / 2, barY + 35);
      
      ctx.fillStyle = "#666";
      ctx.font = "12px Arial";
      ctx.fillText("This is a simulated test ad. Real ads appear after mobile deployment.", CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30);
    }
    
    ctx.restore(); // Mobile scaling
  };

  useEffect(() => {
    if (canvasRef.current) {
      render();
      renderUI();
    }
  }, [phase, score, combo, highScore, activePowerUps, mazePaused, showingAd, adCountdown, continuesUsed, watchingSpeedAd, speedAdCountdown, pendingSpeedReduction, watchingGravityAd, gravityAdCountdown, pendingGravityDisabled, currentLevel, showGameOver]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;
      
      // Convert screen coordinates to logical coordinates (800x600)
      // Use the bounding rect to get actual CSS dimensions for robust conversion
      const scaleX = rect.width / CANVAS_WIDTH;
      const scaleY = rect.height / CANVAS_HEIGHT;
      x = x / scaleX;
      y = y / scaleY;
      
      console.log("[CLICK DEBUG]", { rawX: e.clientX - rect.left, rawY: e.clientY - rect.top, x, y, scaleX, scaleY, rectWidth: rect.width, rectHeight: rect.height });
      
      if (showGameOver && !showingAd && !watchingSpeedAd && !watchingGravityAd) {
        // Same compact button layout as rendering - must match exactly!
        const currentWorldConfig = getWorldForLevel(currentLevel);
        const BTN_WIDTH = 260;
        const BTN_HEIGHT = 36;
        const BTN_X = CANVAS_WIDTH / 2 - BTN_WIDTH / 2;
        const BTN_SPACING = 42;
        let btnY = 110;
        
        // Continue button
        if (canUseContinue()) {
          if (x >= BTN_X && x <= BTN_X + BTN_WIDTH && y >= btnY && y <= btnY + BTN_HEIGHT) {
            handleWatchAdToContinue();
            return;
          }
          btnY += BTN_SPACING;
        }
        
        // Speed reduction button (level 10+)
        if (currentLevel >= 10) {
          if (!pendingSpeedReduction && x >= BTN_X && x <= BTN_X + BTN_WIDTH && y >= btnY && y <= btnY + BTN_HEIGHT) {
            handleWatchAdToReduceSpeed();
            return;
          }
          btnY += BTN_SPACING;
        }
        
        // Gravity button (level 31+)
        if (currentWorldConfig.mechanics.hasGravity) {
          if (!pendingGravityDisabled && x >= BTN_X && x <= BTN_X + BTN_WIDTH && y >= btnY && y <= btnY + BTN_HEIGHT) {
            handleWatchAdToDisableGravity();
            return;
          }
          btnY += BTN_SPACING;
        }
        
        // Skip pending effects message space (compact)
        if (pendingSpeedReduction || pendingGravityDisabled) {
          btnY += 18;
        }
        
        // Skip high scores space (compact inline format)
        const leaderboardData = localStorage.getItem("flappySnakeLeaderboard");
        const leaderboard: number[] = leaderboardData ? JSON.parse(leaderboardData) : [];
        if (leaderboard.length > 0) {
          btnY += 28;
        } else {
          btnY += 10;
        }
        
        // Try Again button
        const TRY_AGAIN_Y = Math.min(btnY, 450);
        if (x >= BTN_X && x <= BTN_X + BTN_WIDTH && y >= TRY_AGAIN_Y && y <= TRY_AGAIN_Y + BTN_HEIGHT) {
          const levelToRestart = currentLevel;
          const applySpeedReduction = pendingSpeedReduction;
          const applyGravityDisabled = pendingGravityDisabled;
          console.log("[CLICK] Try Again clicked, level:", levelToRestart, "speedReduction:", applySpeedReduction, "gravityDisabled:", applyGravityDisabled);
          
          // Clear pending flags now
          if (applySpeedReduction) setPendingSpeedReduction(false);
          if (applyGravityDisabled) setPendingGravityDisabled(false);
          
          // Reset and restart at same level
          setShowGameOver(false);
          isDyingRef.current = false;
          resetContinues();
          clearDeathCheckpoint();
          restart();
          // Use setTimeout to allow phase transition to complete
          setTimeout(() => {
            startFromSpecificLevel(levelToRestart);
            // Apply effects AFTER startFromSpecificLevel (which resets them)
            if (applySpeedReduction) {
              console.log("[EFFECT] Activating speed reduction for 60 seconds");
              activateSpeedReduction(60);
            }
            if (applyGravityDisabled) {
              console.log("[EFFECT] Activating gravity disabled for 60 seconds");
              activateGravityDisabled(60);
            }
            start();
          }, 0);
          return;
        }
        
        // Main Menu button - go back to main menu (phase="ready")
        const MAIN_MENU_Y = TRY_AGAIN_Y + BTN_HEIGHT + 6;
        if (x >= BTN_X && x <= BTN_X + BTN_WIDTH && y >= MAIN_MENU_Y && y <= MAIN_MENU_Y + BTN_HEIGHT) {
          console.log("[CLICK] Main Menu clicked - returning to main menu");
          setShowGameOver(false);
          isDyingRef.current = false;
          resetGameState();
          resetContinues();
          clearDeathCheckpoint();
          // Just go to ready phase - that shows the MainMenu component
          restart();
          return;
        }
      }
    };
    
    canvas.addEventListener("click", handleCanvasClick);
    return () => canvas.removeEventListener("click", handleCanvasClick);
  }, [phase, showGameOver, showingAd, watchingSpeedAd, watchingGravityAd, pendingSpeedReduction, pendingGravityDisabled, currentLevel, canUseContinue, startFromSpecificLevel, restart, start, activateSpeedReduction, activateGravityDisabled, resetGameState, openLevelSelect]);

  // State to track if we're in fullscreen mode
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Check fullscreen state on mount and listen for changes
  useEffect(() => {
    const checkFullscreen = () => {
      const isFS = !!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).msFullscreenElement);
      setIsFullscreen(isFS);
    };
    
    checkFullscreen();
    document.addEventListener('fullscreenchange', checkFullscreen);
    document.addEventListener('webkitfullscreenchange', checkFullscreen);
    document.addEventListener('msfullscreenchange', checkFullscreen);
    
    return () => {
      document.removeEventListener('fullscreenchange', checkFullscreen);
      document.removeEventListener('webkitfullscreenchange', checkFullscreen);
      document.removeEventListener('msfullscreenchange', checkFullscreen);
    };
  }, []);
  
  // Function to enter fullscreen - respects current orientation (no forced landscape)
  const enterFullscreen = async () => {
    try {
      const elem = document.documentElement;
      
      // Request fullscreen only - user keeps their current orientation
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        await (elem as any).msRequestFullscreen();
      }
      // No orientation lock - user can freely choose portrait or landscape fullscreen
    } catch (err) {
      console.log('[FULLSCREEN] Could not enter fullscreen:', err);
    }
  };
  
  // Function to exit fullscreen
  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
    } catch (err) {
      console.log('[FULLSCREEN] Could not exit fullscreen:', err);
    }
  };
  
  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  };
  
  return (
    <div 
      ref={containerRef}
      style={{ 
        width: "100vw", 
        height: "100vh", 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center",
        background: "linear-gradient(to bottom, #1a1a2e, #16213e)",
        overflow: "hidden",
        touchAction: "none",
        position: "relative",
      }}
    >
      {/* Fullscreen Toggle Button - always available, smaller during gameplay */}
      <button
        onClick={toggleFullscreen}
        style={{
          position: "fixed",
          top: "10px",
          right: "10px",
          zIndex: 10000,
          background: isFullscreen 
            ? "linear-gradient(135deg, #FF6B6B, #ee5253)" 
            : "linear-gradient(135deg, #4CAF50, #45a049)",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: phase === "playing" && !showGameOver ? "6px 8px" : "8px 12px",
          fontSize: phase === "playing" && !showGameOver ? "10px" : "12px",
          fontWeight: "bold",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          opacity: phase === "playing" && !showGameOver ? 0.7 : 1,
          transition: "opacity 0.2s, padding 0.2s",
        }}
      >
        <span style={{ fontSize: phase === "playing" && !showGameOver ? "12px" : "14px" }}>
          {isFullscreen ? "⤓" : "⤢"}
        </span>
        {(phase !== "playing" || showGameOver) && (isFullscreen ? "Exit Fullscreen" : "Fullscreen")}
      </button>
      
      <div style={{ 
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: `${canvasCssDimensions.width}px`,
        height: `${canvasCssDimensions.height}px`,
      }}>
        {/* Touch Controls Overlay - positioned relative to the game canvas */}
        {inputMode === "touch" && phase === "playing" && !showGameOver && (
          <TouchController
            onFlap={handleTouchFlap}
            onMoveUp={handleTouchMoveUp}
            onMoveDown={handleTouchMoveDown}
            onMoveLeft={handleTouchMoveLeft}
            onMoveRight={handleTouchMoveRight}
            canvasWidth={canvasCssDimensions.width}
            canvasHeight={canvasCssDimensions.height}
            enabled={!mazePaused}
            showControls={true}
          />
        )}
        
        <canvas
          ref={canvasRef}
          style={{
            imageRendering: "pixelated",
            display: "block",
            width: `${canvasCssDimensions.width}px`,
            height: `${canvasCssDimensions.height}px`,
            aspectRatio: "4 / 3",
          }}
        />
        
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
            onLevelSelect={handleLevelSelect}
          />
        )}
        
        {/* Mobile Tutorial - shows on first mobile visit */}
        {showTutorial && phase === "ready" && (
          <MobileTutorial onDismiss={dismissTutorial} />
        )}
        
        {phase === "levelSelect" && (
          <LevelSelect
            onSelectLevel={handleSelectLevel}
            onBack={handleBackFromLevelSelect}
          />
        )}
        
        {/* Speed Ad Watching Screen (from game over) */}
        {watchingSpeedAd && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "#000",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}>
            <div style={{
              width: "90%",
              maxWidth: "700px",
              height: "350px",
              background: "linear-gradient(45deg, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4)",
              backgroundSize: "400% 400%",
              animation: "gradient 3s ease infinite",
              borderRadius: "12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "30px",
            }}>
              <div style={{
                color: "#FFF",
                fontSize: "42px",
                fontWeight: "bold",
                textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                marginBottom: "15px",
              }}>
                🎮 SUPER GAME PRO 🎮
              </div>
              <div style={{
                color: "#FFD700",
                fontSize: "28px",
                fontWeight: "bold",
                textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
              }}>
                Download Now - FREE!
              </div>
              <div style={{
                color: "#FFF",
                fontSize: "20px",
                marginTop: "15px",
              }}>
                ★★★★★ 4.9 Rating
              </div>
            </div>
            
            <div style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              background: "rgba(255, 0, 0, 0.8)",
              color: "#FFF",
              padding: "8px 15px",
              borderRadius: "5px",
              fontFamily: "monospace",
              fontSize: "14px",
              fontWeight: "bold",
            }}>
              ⚠️ TEST AD
            </div>
            
            <div style={{
              color: "#44FF44",
              fontSize: "24px",
              fontFamily: "monospace",
              fontWeight: "bold",
              marginBottom: "20px",
            }}>
              🎁 REWARD: 50% Speed Reduction for 60 seconds!
            </div>
            
            <div style={{
              width: "80%",
              maxWidth: "500px",
              height: "15px",
              background: "#333",
              borderRadius: "10px",
              overflow: "hidden",
            }}>
              <div style={{
                width: `${((3 - speedAdCountdown) / 3) * 100}%`,
                height: "100%",
                background: "linear-gradient(90deg, #FF4444, #FF8844)",
                transition: "width 1s linear",
              }} />
            </div>
            
            <div style={{
              color: "#888",
              fontSize: "18px",
              fontFamily: "monospace",
              marginTop: "15px",
            }}>
              {speedAdCountdown}s remaining
            </div>
            
            <div style={{
              color: "#666",
              fontSize: "12px",
              fontFamily: "monospace",
              marginTop: "30px",
            }}>
              This is a simulated test ad. Real ads appear after mobile deployment.
            </div>
          </div>
        )}
      </div>
      
      {/* Web Ad Overlay for browser-based ads */}
      <WebAdOverlay />
      
      {/* Banner Ad Container - shown on ready screen for web */}
      {phase === "ready" && platform.isWeb && (
        <div 
          id="banner-ad-container"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: "90px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "rgba(0, 0, 0, 0.8)",
            zIndex: 100,
          }}
        >
          <div style={{
            color: "#666",
            fontSize: "12px",
            fontFamily: "monospace",
            textAlign: "center",
          }}>
            <div>Banner Ad Space</div>
            <div style={{ fontSize: "10px", color: "#444" }}>
              Configure AdSense to display real ads
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
