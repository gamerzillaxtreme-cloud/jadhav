import { useState, useEffect } from 'react';

export type InputMode = 'keyboard' | 'touch';

export function useMobileDetect() {
  const [isMobile, setIsMobile] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('keyboard');

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      const isMobileUA = mobileRegex.test(userAgent.toLowerCase());
      
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      const isSmallScreen = window.innerWidth <= 768;
      
      const mobile = isMobileUA || (isTouchDevice && isSmallScreen);
      
      setIsMobile(mobile);
      
      const savedMode = localStorage.getItem('flappySnakeInputMode') as InputMode | null;
      if (savedMode) {
        setInputMode(savedMode);
      } else {
        setInputMode(mobile ? 'touch' : 'keyboard');
      }
    };

    checkMobile();
    
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleInputMode = () => {
    const newMode = inputMode === 'keyboard' ? 'touch' : 'keyboard';
    setInputMode(newMode);
    localStorage.setItem('flappySnakeInputMode', newMode);
  };

  const setInputModeManually = (mode: InputMode) => {
    setInputMode(mode);
    localStorage.setItem('flappySnakeInputMode', mode);
  };

  return {
    isMobile,
    inputMode,
    toggleInputMode,
    setInputModeManually,
  };
}
