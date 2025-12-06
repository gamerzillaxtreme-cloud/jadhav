import { create } from "zustand";

interface AudioState {
  backgroundMusic: HTMLAudioElement | null;
  hitSound: HTMLAudioElement | null;
  successSound: HTMLAudioElement | null;
  deathSound: HTMLAudioElement | null;
  isMuted: boolean;
  isMusicMuted: boolean;
  isSoundEffectsMuted: boolean;
  
  // Setter functions
  setBackgroundMusic: (music: HTMLAudioElement) => void;
  setHitSound: (sound: HTMLAudioElement) => void;
  setSuccessSound: (sound: HTMLAudioElement) => void;
  setDeathSound: (sound: HTMLAudioElement) => void;
  
  // Control functions
  toggleMute: () => void;
  toggleMusicMute: () => void;
  toggleSoundEffectsMute: () => void;
  playHit: () => void;
  playSuccess: () => void;
  playDeath: () => void;
}

export const useAudio = create<AudioState>((set, get) => ({
  backgroundMusic: null,
  hitSound: null,
  successSound: null,
  deathSound: null,
  isMuted: false,
  isMusicMuted: false,
  isSoundEffectsMuted: false,
  
  setBackgroundMusic: (music) => set({ backgroundMusic: music }),
  setHitSound: (sound) => set({ hitSound: sound }),
  setSuccessSound: (sound) => set({ successSound: sound }),
  setDeathSound: (sound) => set({ deathSound: sound }),
  
  toggleMute: () => {
    const { isMuted } = get();
    const newMutedState = !isMuted;
    
    set({ 
      isMuted: newMutedState,
      isMusicMuted: newMutedState,
      isSoundEffectsMuted: newMutedState
    });
    
    console.log(`Sound ${newMutedState ? 'muted' : 'unmuted'}`);
  },
  
  toggleMusicMute: () => {
    const { isMusicMuted } = get();
    const newState = !isMusicMuted;
    set({ isMusicMuted: newState });
    console.log(`Music ${newState ? 'muted' : 'unmuted'}`);
  },
  
  toggleSoundEffectsMute: () => {
    const { isSoundEffectsMuted } = get();
    const newState = !isSoundEffectsMuted;
    set({ isSoundEffectsMuted: newState });
    console.log(`Sound effects ${newState ? 'muted' : 'unmuted'}`);
  },
  
  playHit: () => {
    const { hitSound, isSoundEffectsMuted } = get();
    if (hitSound) {
      if (isSoundEffectsMuted) {
        console.log("Hit sound skipped (muted)");
        return;
      }
      
      const soundClone = hitSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.3;
      soundClone.play().catch(error => {
        console.log("Hit sound play prevented:", error);
      });
    }
  },
  
  playSuccess: () => {
    const { successSound, isSoundEffectsMuted } = get();
    if (successSound) {
      if (isSoundEffectsMuted) {
        console.log("Success sound skipped (muted)");
        return;
      }
      
      successSound.currentTime = 0;
      successSound.play().catch(error => {
        console.log("Success sound play prevented:", error);
      });
    }
  },
  
  playDeath: () => {
    const { deathSound, isSoundEffectsMuted } = get();
    if (deathSound) {
      if (isSoundEffectsMuted) {
        console.log("Death sound skipped (muted)");
        return;
      }
      
      const soundClone = deathSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.5;
      soundClone.play().catch(error => {
        console.log("Death sound play prevented:", error);
      });
    }
  }
}));
