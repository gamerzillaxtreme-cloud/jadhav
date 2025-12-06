import { create } from "zustand";
import { adService } from "../services/adService";
import { getPlatformSync } from "../hooks/usePlatform";

export type AdType = "rewarded" | "interstitial" | "banner";

interface AdState {
  isInitialized: boolean;
  isAdLoaded: boolean;
  isShowingAd: boolean;
  adCooldown: number;
  deathsSinceLastAd: number;
  levelsCompletedSinceLastAd: number;
  continuesUsed: number;
  maxContinuesPerGame: number;
  showWebAdOverlay: boolean;
  webAdType: "interstitial" | "rewarded" | null;
  webAdCallback: (() => void) | null;
  
  initialize: () => Promise<void>;
  loadAd: (type: AdType) => void;
  showRewardedAd: (onReward: () => void, onClose: () => void) => void;
  showInterstitialAd: (onClose: () => void) => void;
  showBanner: (containerId: string) => void;
  hideBanner: () => void;
  incrementDeaths: () => void;
  incrementLevelsCompleted: () => void;
  shouldShowInterstitial: () => boolean;
  shouldShowLevelInterstitial: () => boolean;
  canUseContinue: () => boolean;
  useContinue: () => void;
  resetContinues: () => void;
  updateCooldown: (delta: number) => void;
  closeWebAdOverlay: () => void;
}

export const useAds = create<AdState>((set, get) => ({
  isInitialized: false,
  isAdLoaded: true,
  isShowingAd: false,
  adCooldown: 0,
  deathsSinceLastAd: 0,
  levelsCompletedSinceLastAd: 0,
  continuesUsed: 0,
  maxContinuesPerGame: 3,
  showWebAdOverlay: false,
  webAdType: null,
  webAdCallback: null,
  
  initialize: async () => {
    try {
      await adService.initialize({
        testMode: true,
      });
      set({ isInitialized: true });
      console.log('[useAds] Ad service initialized');
    } catch (error) {
      console.error('[useAds] Failed to initialize ad service:', error);
    }
  },
  
  loadAd: (type: AdType) => {
    if (type === 'interstitial') {
      adService.prepareInterstitial();
    } else if (type === 'rewarded') {
      adService.prepareRewarded();
    }
    setTimeout(() => {
      set({ isAdLoaded: true });
    }, 500);
  },
  
  showRewardedAd: (onReward: () => void, onClose: () => void) => {
    const state = get();
    if (!state.isAdLoaded || state.isShowingAd) {
      onClose();
      return;
    }
    
    const platform = getPlatformSync();
    
    set({ isShowingAd: true, isAdLoaded: false });
    
    if (platform.isNativeApp) {
      adService.showRewarded().then((result) => {
        if (result.success) {
          onReward();
        }
        set({ 
          isShowingAd: false, 
          adCooldown: 60,
          deathsSinceLastAd: 0 
        });
        onClose();
        get().loadAd("rewarded");
      });
    } else {
      set({ 
        showWebAdOverlay: true, 
        webAdType: "rewarded",
        webAdCallback: () => {
          onReward();
          set({ 
            isShowingAd: false, 
            adCooldown: 60,
            deathsSinceLastAd: 0,
            showWebAdOverlay: false,
            webAdType: null,
            webAdCallback: null
          });
          onClose();
          get().loadAd("rewarded");
        }
      });
    }
  },
  
  showInterstitialAd: (onClose: () => void) => {
    const state = get();
    if (!state.isAdLoaded || state.isShowingAd || state.adCooldown > 0) {
      set({ levelsCompletedSinceLastAd: 0 });
      onClose();
      return;
    }
    
    const platform = getPlatformSync();
    
    set({ isShowingAd: true, isAdLoaded: false });
    
    if (platform.isNativeApp) {
      adService.showInterstitial().then(() => {
        set({ 
          isShowingAd: false, 
          adCooldown: 120,
          deathsSinceLastAd: 0,
          levelsCompletedSinceLastAd: 0
        });
        onClose();
        get().loadAd("interstitial");
      });
    } else {
      set({ 
        showWebAdOverlay: true, 
        webAdType: "interstitial",
        webAdCallback: () => {
          set({ 
            isShowingAd: false, 
            adCooldown: 120,
            deathsSinceLastAd: 0,
            levelsCompletedSinceLastAd: 0,
            showWebAdOverlay: false,
            webAdType: null,
            webAdCallback: null
          });
          onClose();
          get().loadAd("interstitial");
        }
      });
      
      setTimeout(() => {
        const callback = get().webAdCallback;
        if (callback) callback();
      }, 3000);
    }
  },
  
  showBanner: (containerId: string) => {
    adService.showBanner(containerId);
  },
  
  hideBanner: () => {
    adService.hideBanner();
  },
  
  incrementDeaths: () => {
    set(state => ({ deathsSinceLastAd: state.deathsSinceLastAd + 1 }));
  },
  
  incrementLevelsCompleted: () => {
    set(state => ({ levelsCompletedSinceLastAd: state.levelsCompletedSinceLastAd + 1 }));
  },
  
  shouldShowInterstitial: () => {
    const state = get();
    return state.deathsSinceLastAd >= 3 && state.adCooldown <= 0;
  },
  
  shouldShowLevelInterstitial: () => {
    const state = get();
    return state.levelsCompletedSinceLastAd >= 3 && state.adCooldown <= 0;
  },
  
  canUseContinue: () => {
    const state = get();
    return state.continuesUsed < state.maxContinuesPerGame && state.isAdLoaded;
  },
  
  useContinue: () => {
    set(state => ({ continuesUsed: state.continuesUsed + 1 }));
  },
  
  resetContinues: () => {
    set({ continuesUsed: 0 });
  },
  
  updateCooldown: (delta: number) => {
    set(state => ({ 
      adCooldown: Math.max(0, state.adCooldown - delta) 
    }));
  },
  
  closeWebAdOverlay: () => {
    const callback = get().webAdCallback;
    if (callback) callback();
  },
}));
