import { useState, useEffect } from 'react';

export type Platform = 'web' | 'android' | 'ios';
export type AdPlatform = 'adsense' | 'admob' | 'none';

interface PlatformInfo {
  platform: Platform;
  adPlatform: AdPlatform;
  isNativeApp: boolean;
  isWeb: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
}

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      getPlatform: () => string;
    };
  }
}

const defaultPlatformInfo: PlatformInfo = {
  platform: 'web',
  adPlatform: 'adsense',
  isNativeApp: false,
  isWeb: true,
  isMobile: false,
  isDesktop: true,
  isLandscape: true,
  screenWidth: 800,
  screenHeight: 600,
  pixelRatio: 1,
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined';
}

export function usePlatform(): PlatformInfo {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>(() => 
    isBrowser() ? detectPlatform() : defaultPlatformInfo
  );

  useEffect(() => {
    if (!isBrowser()) return;
    
    const handleResize = () => {
      setPlatformInfo(detectPlatform());
    };

    const handleOrientationChange = () => {
      setTimeout(() => {
        setPlatformInfo(detectPlatform());
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', handleOrientationChange);
      }
    };
  }, []);

  return platformInfo;
}

function detectPlatform(): PlatformInfo {
  const isNativeApp = !!(window.Capacitor?.isNativePlatform?.());
  
  let platform: Platform = 'web';
  if (isNativeApp && window.Capacitor) {
    const nativePlatform = window.Capacitor.getPlatform();
    if (nativePlatform === 'android') platform = 'android';
    else if (nativePlatform === 'ios') platform = 'ios';
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 1024;
  const isMobile = isMobileUA || (isTouchDevice && isSmallScreen);
  const isDesktop = !isMobile;

  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const isLandscape = screenWidth > screenHeight;
  const pixelRatio = window.devicePixelRatio || 1;

  let adPlatform: AdPlatform = 'none';
  if (isNativeApp) {
    adPlatform = 'admob';
  } else {
    adPlatform = 'adsense';
  }

  return {
    platform,
    adPlatform,
    isNativeApp,
    isWeb: !isNativeApp,
    isMobile,
    isDesktop,
    isLandscape,
    screenWidth,
    screenHeight,
    pixelRatio,
  };
}

export function getPlatformSync(): PlatformInfo {
  return isBrowser() ? detectPlatform() : defaultPlatformInfo;
}
