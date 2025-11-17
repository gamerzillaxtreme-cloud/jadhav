import { useEffect } from "react";
import { useAudio } from "@/lib/stores/useAudio";
import { useFlappySnake } from "@/lib/stores/useFlappySnake";
import { useGame } from "@/lib/stores/useGame";

export default function SoundManager() {
  const { setHitSound, setSuccessSound, setBackgroundMusic, isMusicMuted, backgroundMusic } = useAudio();
  const { phase } = useGame();
  const { isBeingChased } = useFlappySnake();

  useEffect(() => {
    const hitSound = new Audio("/sounds/hit.mp3");
    const successSound = new Audio("/sounds/success.mp3");
    const bgMusic = new Audio("/sounds/background.mp3");
    
    hitSound.preload = "auto";
    successSound.preload = "auto";
    bgMusic.preload = "auto";
    bgMusic.loop = true;
    bgMusic.volume = 0.5;
    bgMusic.playbackRate = 1.1;
    
    setHitSound(hitSound);
    setSuccessSound(successSound);
    setBackgroundMusic(bgMusic);
  }, [setHitSound, setSuccessSound, setBackgroundMusic]);

  useEffect(() => {
    if (!backgroundMusic) return;
    
    if (phase === "playing" && !isMusicMuted) {
      backgroundMusic.play().catch(e => console.log("Background music play prevented:", e));
    } else {
      backgroundMusic.pause();
      backgroundMusic.currentTime = 0;
    }
  }, [phase, isMusicMuted, backgroundMusic]);
  
  useEffect(() => {
    if (!backgroundMusic) return;
    
    if (isBeingChased) {
      backgroundMusic.playbackRate = 1.2;
      backgroundMusic.volume = 0.6;
    } else {
      backgroundMusic.playbackRate = 1.1;
      backgroundMusic.volume = 0.5;
    }
  }, [isBeingChased, backgroundMusic]);

  return null;
}
