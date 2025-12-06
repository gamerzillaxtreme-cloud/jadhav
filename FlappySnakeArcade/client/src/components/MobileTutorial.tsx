import React, { useState, useEffect } from 'react';

interface MobileTutorialProps {
  onDismiss: () => void;
}

export function MobileTutorial({ onDismiss }: MobileTutorialProps) {
  const [step, setStep] = useState(0);
  
  const steps = [
    {
      title: "Welcome to Flappy Snake!",
      description: "Let's learn the touch controls",
      icon: "🐍",
    },
    {
      title: "Tap to Flap",
      description: "Tap anywhere on the right side of the screen to make your snake flap upward",
      icon: "👆",
      highlight: "right",
    },
    {
      title: "Move Up & Down",
      description: "Use the joystick on the left to steer your snake up or down",
      icon: "🕹️",
      highlight: "left",
    },
    {
      title: "Avoid Obstacles",
      description: "Navigate through pipes and avoid enemies to score points!",
      icon: "⚠️",
    },
    {
      title: "Collect Power-ups",
      description: "Grab power-ups to gain special abilities like shields and speed boosts",
      icon: "⭐",
    },
  ];
  
  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;
  
  const handleNext = () => {
    if (isLastStep) {
      localStorage.setItem('flappySnakeTutorialComplete', 'true');
      onDismiss();
    } else {
      setStep(s => s + 1);
    }
  };
  
  const handleSkip = () => {
    localStorage.setItem('flappySnakeTutorialComplete', 'true');
    onDismiss();
  };
  
  return (
    <div style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.85)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 3000,
      padding: "20px",
    }}>
      {currentStep.highlight === "left" && (
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "35%",
          border: "4px solid #4ECDC4",
          borderRadius: "8px",
          animation: "pulse 1.5s ease-in-out infinite",
        }} />
      )}
      
      {currentStep.highlight === "right" && (
        <div style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: "65%",
          border: "4px solid #FFD700",
          borderRadius: "8px",
          animation: "pulse 1.5s ease-in-out infinite",
        }} />
      )}
      
      <div style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        borderRadius: "16px",
        padding: "30px",
        maxWidth: "400px",
        textAlign: "center",
        border: "2px solid #FFD700",
        boxShadow: "0 0 30px rgba(255, 215, 0, 0.3)",
      }}>
        <div style={{
          fontSize: "60px",
          marginBottom: "16px",
        }}>
          {currentStep.icon}
        </div>
        
        <h2 style={{
          color: "#FFD700",
          fontSize: "24px",
          marginBottom: "12px",
          fontWeight: "bold",
        }}>
          {currentStep.title}
        </h2>
        
        <p style={{
          color: "#FFF",
          fontSize: "16px",
          lineHeight: "1.5",
          marginBottom: "24px",
        }}>
          {currentStep.description}
        </p>
        
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "8px",
          marginBottom: "20px",
        }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: i === step ? "#FFD700" : "#444",
              }}
            />
          ))}
        </div>
        
        <div style={{
          display: "flex",
          gap: "12px",
          justifyContent: "center",
        }}>
          <button
            onClick={handleSkip}
            style={{
              padding: "12px 24px",
              fontSize: "16px",
              fontWeight: "bold",
              background: "transparent",
              color: "#888",
              border: "2px solid #444",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Skip
          </button>
          
          <button
            onClick={handleNext}
            style={{
              padding: "12px 32px",
              fontSize: "16px",
              fontWeight: "bold",
              background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
              color: "#000",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(255, 215, 0, 0.4)",
            }}
          >
            {isLastStep ? "Let's Play!" : "Next"}
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export function useMobileTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);
  
  useEffect(() => {
    const checkTutorial = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      const isMobile = mobileRegex.test(userAgent.toLowerCase());
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      
      const shouldShowOnMobile = isMobile || (isTouchDevice && isSmallScreen);
      const tutorialComplete = localStorage.getItem('flappySnakeTutorialComplete') === 'true';
      
      if (shouldShowOnMobile && !tutorialComplete) {
        setShowTutorial(true);
      }
    };
    
    checkTutorial();
  }, []);
  
  const dismissTutorial = () => {
    setShowTutorial(false);
  };
  
  return { showTutorial, dismissTutorial };
}
