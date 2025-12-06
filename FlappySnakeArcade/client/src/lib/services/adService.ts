import { getPlatformSync } from '../hooks/usePlatform';

export interface AdConfig {
  adsensePublisherId?: string;
  adsenseBannerSlot?: string;
  adsenseInterstitialSlot?: string;
  admobAppId?: string;
  admobBannerUnitId?: string;
  admobInterstitialUnitId?: string;
  admobRewardedUnitId?: string;
  testMode: boolean;
}

declare global {
  interface Window {
    adsbygoogle?: any[];
    AdMob?: {
      initialize: (options: any) => Promise<void>;
      showBanner: (options: any) => Promise<void>;
      hideBanner: () => Promise<void>;
      prepareInterstitial: (options: any) => Promise<void>;
      showInterstitial: () => Promise<void>;
      prepareRewardVideoAd: (options: any) => Promise<void>;
      showRewardVideoAd: () => Promise<{ type: string; amount: number }>;
    };
  }
}

class AdService {
  private config: AdConfig = {
    testMode: true,
  };
  private initialized = false;
  private interstitialReady = false;
  private rewardedReady = false;
  private bannerVisible = false;

  async initialize(config: Partial<AdConfig> = {}): Promise<void> {
    this.config = { ...this.config, ...config };
    const platform = getPlatformSync();

    if (platform.isNativeApp && platform.adPlatform === 'admob') {
      await this.initializeAdMob();
    } else if (platform.isWeb && platform.adPlatform === 'adsense') {
      await this.initializeAdSense();
    }

    this.initialized = true;
    console.log('[AdService] Initialized for platform:', platform.adPlatform);
  }

  private async initializeAdMob(): Promise<void> {
    if (!window.AdMob) {
      console.log('[AdService] AdMob not available - native plugin not installed');
      return;
    }

    try {
      await window.AdMob.initialize({
        requestTrackingAuthorization: true,
        testingDevices: this.config.testMode ? ['YOUR_TEST_DEVICE_ID'] : [],
        initializeForTesting: this.config.testMode,
      });
      console.log('[AdService] AdMob initialized');
    } catch (error) {
      console.error('[AdService] AdMob initialization failed:', error);
    }
  }

  private async initializeAdSense(): Promise<void> {
    if (!this.config.adsensePublisherId) {
      console.log('[AdService] AdSense publisher ID not configured');
      return;
    }

    if (document.querySelector('script[src*="pagead2.googlesyndication.com"]')) {
      console.log('[AdService] AdSense script already loaded');
      return;
    }

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${this.config.adsensePublisherId}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        console.log('[AdService] AdSense script loaded');
        resolve();
      };
      script.onerror = () => {
        console.error('[AdService] AdSense script failed to load');
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  async showBanner(containerId: string): Promise<void> {
    const platform = getPlatformSync();

    if (platform.isNativeApp && window.AdMob) {
      try {
        await window.AdMob.showBanner({
          adId: this.config.admobBannerUnitId || 'ca-app-pub-3940256099942544/6300978111',
          adSize: 'ADAPTIVE_BANNER',
          position: 'BOTTOM_CENTER',
        });
        this.bannerVisible = true;
      } catch (error) {
        console.error('[AdService] Failed to show AdMob banner:', error);
      }
    } else if (platform.isWeb && this.config.adsensePublisherId) {
      const container = document.getElementById(containerId);
      if (container && !container.querySelector('ins.adsbygoogle')) {
        const adElement = document.createElement('ins');
        adElement.className = 'adsbygoogle';
        adElement.style.display = 'block';
        adElement.style.width = '100%';
        adElement.style.height = '90px';
        adElement.setAttribute('data-ad-client', this.config.adsensePublisherId);
        adElement.setAttribute('data-ad-slot', this.config.adsenseBannerSlot || '');
        adElement.setAttribute('data-ad-format', 'horizontal');
        adElement.setAttribute('data-full-width-responsive', 'true');
        container.appendChild(adElement);
        
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          this.bannerVisible = true;
        } catch (error) {
          console.error('[AdService] Failed to show AdSense banner:', error);
        }
      }
    }
  }

  async hideBanner(): Promise<void> {
    const platform = getPlatformSync();

    if (platform.isNativeApp && window.AdMob) {
      try {
        await window.AdMob.hideBanner();
        this.bannerVisible = false;
      } catch (error) {
        console.error('[AdService] Failed to hide AdMob banner:', error);
      }
    }
  }

  async prepareInterstitial(): Promise<boolean> {
    const platform = getPlatformSync();

    if (platform.isNativeApp && window.AdMob) {
      try {
        await window.AdMob.prepareInterstitial({
          adId: this.config.admobInterstitialUnitId || 'ca-app-pub-3940256099942544/1033173712',
        });
        this.interstitialReady = true;
        return true;
      } catch (error) {
        console.error('[AdService] Failed to prepare interstitial:', error);
        return false;
      }
    }

    this.interstitialReady = true;
    return true;
  }

  async showInterstitial(): Promise<boolean> {
    const platform = getPlatformSync();

    if (platform.isNativeApp && window.AdMob) {
      if (!this.interstitialReady) {
        await this.prepareInterstitial();
      }

      try {
        await window.AdMob.showInterstitial();
        this.interstitialReady = false;
        this.prepareInterstitial();
        return true;
      } catch (error) {
        console.error('[AdService] Failed to show interstitial:', error);
        return false;
      }
    } else if (platform.isWeb) {
      console.log('[AdService] Web interstitial - showing simulated ad');
      return true;
    }

    return false;
  }

  async prepareRewarded(): Promise<boolean> {
    const platform = getPlatformSync();

    if (platform.isNativeApp && window.AdMob) {
      try {
        await window.AdMob.prepareRewardVideoAd({
          adId: this.config.admobRewardedUnitId || 'ca-app-pub-3940256099942544/5224354917',
        });
        this.rewardedReady = true;
        return true;
      } catch (error) {
        console.error('[AdService] Failed to prepare rewarded ad:', error);
        return false;
      }
    }

    this.rewardedReady = true;
    return true;
  }

  async showRewarded(): Promise<{ success: boolean; reward?: { type: string; amount: number } }> {
    const platform = getPlatformSync();

    if (platform.isNativeApp && window.AdMob) {
      if (!this.rewardedReady) {
        await this.prepareRewarded();
      }

      try {
        const result = await window.AdMob.showRewardVideoAd();
        this.rewardedReady = false;
        this.prepareRewarded();
        return { success: true, reward: result };
      } catch (error) {
        console.error('[AdService] Failed to show rewarded ad:', error);
        return { success: false };
      }
    } else if (platform.isWeb) {
      console.log('[AdService] Web rewarded ad - showing simulated ad');
      return { success: true, reward: { type: 'coins', amount: 1 } };
    }

    return { success: false };
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isBannerVisible(): boolean {
    return this.bannerVisible;
  }

  isInterstitialReady(): boolean {
    return this.interstitialReady;
  }

  isRewardedReady(): boolean {
    return this.rewardedReady;
  }
}

export const adService = new AdService();
