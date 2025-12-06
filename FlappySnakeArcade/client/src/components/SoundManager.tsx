import { useEffect, useRef, useCallback } from "react";
import { useAudio } from "@/lib/stores/useAudio";
import { useFlappySnake } from "@/lib/stores/useFlappySnake";
import { useGame } from "@/lib/stores/useGame";

interface WorldMusicConfig {
  file: string;
  baseRate: number;
  volume: number;
  chaseRate: number;
  chaseVolume: number;
}

const WORLD_MUSIC_CONFIG: Record<string, WorldMusicConfig> = {
  forest: { file: "/sounds/world_forest.mp3", baseRate: 1.0, volume: 0.55, chaseRate: 1.2, chaseVolume: 0.7 },
  rocky: { file: "/sounds/world_mountains.mp3", baseRate: 1.05, volume: 0.55, chaseRate: 1.25, chaseVolume: 0.7 },
  desert: { file: "/sounds/world_desert.mp3", baseRate: 1.1, volume: 0.55, chaseRate: 1.3, chaseVolume: 0.7 },
  ice: { file: "/sounds/world_ice.mp3", baseRate: 0.95, volume: 0.5, chaseRate: 1.15, chaseVolume: 0.65 },
  neon: { file: "/sounds/world_neon.mp3", baseRate: 1.0, volume: 0.5, chaseRate: 1.2, chaseVolume: 0.65 },
};

const WORLD_IDS = ['forest', 'rocky', 'desert', 'ice', 'neon'];

export default function SoundManager() {
  const { setHitSound, setSuccessSound, setBackgroundMusic, setDeathSound, isMusicMuted } = useAudio();
  const { phase } = useGame();
  const { isBeingChased, currentWorldId } = useFlappySnake();
  
  const worldMusicRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const currentMusicRef = useRef<HTMLAudioElement | null>(null);
  const currentWorldRef = useRef<string>('forest');

  useEffect(() => {
    const hitSound = new Audio("/sounds/hit.mp3");
    const successSound = new Audio("/sounds/success.mp3");
    const deathSound = new Audio("/sounds/death.mp3");
    
    hitSound.preload = "auto";
    successSound.preload = "auto";
    deathSound.preload = "auto";
    
    setHitSound(hitSound);
    setSuccessSound(successSound);
    setDeathSound(deathSound);

    for (const worldId of WORLD_IDS) {
      const config = WORLD_MUSIC_CONFIG[worldId];
      const music = new Audio(config.file);
      music.preload = "auto";
      music.loop = true;
      music.playbackRate = config.baseRate;
      music.volume = config.volume;
      worldMusicRef.current.set(worldId, music);
      console.log(`[MUSIC] Loaded world ${worldId} music: ${config.file}`);
    }

    const defaultMusic = worldMusicRef.current.get('forest')!;
    setBackgroundMusic(defaultMusic);
    currentMusicRef.current = defaultMusic;
    currentWorldRef.current = 'forest';
    
    return () => {
      worldMusicRef.current.forEach(music => {
        music.pause();
        music.currentTime = 0;
      });
    };
  }, [setHitSound, setSuccessSound, setBackgroundMusic, setDeathSound]);

  useEffect(() => {
    const worldId = currentWorldId || 'forest';
    const newMusic = worldMusicRef.current.get(worldId);
    
    if (!newMusic) {
      console.log(`[MUSIC] No music found for world: ${worldId}`);
      return;
    }
    
    if (worldId === currentWorldRef.current) {
      return;
    }
    
    console.log(`[MUSIC] Switching from ${currentWorldRef.current} to ${worldId}`);
    
    const wasPlaying = currentMusicRef.current && !currentMusicRef.current.paused;
    
    if (currentMusicRef.current) {
      currentMusicRef.current.pause();
      currentMusicRef.current.currentTime = 0;
    }
    
    const config = WORLD_MUSIC_CONFIG[worldId];
    newMusic.playbackRate = isBeingChased ? config.chaseRate : config.baseRate;
    newMusic.volume = isBeingChased ? config.chaseVolume : config.volume;
    
    currentMusicRef.current = newMusic;
    currentWorldRef.current = worldId;
    setBackgroundMusic(newMusic);
    
    if (wasPlaying && phase === "playing" && !isMusicMuted) {
      newMusic.play().catch(e => console.log("World music play prevented:", e));
    }
  }, [currentWorldId, phase, isMusicMuted, isBeingChased, setBackgroundMusic]);

  useEffect(() => {
    const music = currentMusicRef.current;
    if (!music) return;
    
    if (phase === "playing" && !isMusicMuted) {
      music.play().catch(e => console.log("Background music play prevented:", e));
    } else {
      music.pause();
      music.currentTime = 0;
    }
  }, [phase, isMusicMuted]);
  
  useEffect(() => {
    const music = currentMusicRef.current;
    if (!music) return;
    
    const worldId = currentWorldId || 'forest';
    const config = WORLD_MUSIC_CONFIG[worldId];
    
    if (!config) return;
    
    if (isBeingChased) {
      music.playbackRate = config.chaseRate;
      music.volume = config.chaseVolume;
    } else {
      music.playbackRate = config.baseRate;
      music.volume = config.volume;
    }
  }, [isBeingChased, currentWorldId]);

  return null;
}
