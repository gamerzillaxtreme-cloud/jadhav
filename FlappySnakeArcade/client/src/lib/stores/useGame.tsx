import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type GamePhase = "ready" | "playing" | "levelComplete" | "ended" | "levelSelect";

interface WorldUnlockMessage {
  worldName: string;
  worldId: string;
  description: string;
  timestamp: number;
}

interface GameState {
  phase: GamePhase;
  worldUnlockMessage: WorldUnlockMessage | null;
  
  // Actions
  start: () => void;
  restart: () => void;
  continueGame: () => void;
  end: () => void;
  completeLevel: () => void;
  nextLevel: () => void;
  showWorldUnlock: (worldName: string, worldId: string, description: string) => void;
  clearWorldUnlock: () => void;
  openLevelSelect: () => void;
  closeLevelSelect: () => void;
  startFromLevel: () => void;
}

export const useGame = create<GameState>()(
  subscribeWithSelector((set) => ({
    phase: "ready",
    worldUnlockMessage: null,
    
    start: () => {
      set((state) => {
        // Only transition from ready to playing
        if (state.phase === "ready") {
          return { phase: "playing" };
        }
        return {};
      });
    },
    
    restart: () => {
      set(() => ({ phase: "ready" }));
    },
    
    continueGame: () => {
      set((state) => {
        if (state.phase === "ended") {
          return { phase: "playing" };
        }
        return {};
      });
    },
    
    end: () => {
      set((state) => {
        // Only transition from playing to ended
        if (state.phase === "playing") {
          return { phase: "ended" };
        }
        return {};
      });
    },
    
    completeLevel: () => {
      set((state) => {
        // Only transition from playing to levelComplete
        if (state.phase === "playing") {
          return { phase: "levelComplete" };
        }
        return {};
      });
    },
    
    nextLevel: () => {
      set((state) => {
        // Transition from levelComplete to playing
        if (state.phase === "levelComplete") {
          return { phase: "playing" };
        }
        return {};
      });
    },
    
    showWorldUnlock: (worldName: string, worldId: string, description: string) => {
      set(() => ({
        worldUnlockMessage: {
          worldName,
          worldId,
          description,
          timestamp: Date.now(),
        },
      }));
    },
    
    clearWorldUnlock: () => {
      set(() => ({ worldUnlockMessage: null }));
    },
    
    openLevelSelect: () => {
      set((state) => {
        if (state.phase === "ready") {
          return { phase: "levelSelect" };
        }
        return {};
      });
    },
    
    closeLevelSelect: () => {
      set((state) => {
        if (state.phase === "levelSelect") {
          return { phase: "ready" };
        }
        return {};
      });
    },
    
    startFromLevel: () => {
      set((state) => {
        if (state.phase === "levelSelect") {
          return { phase: "playing" };
        }
        return {};
      });
    },
  }))
);
