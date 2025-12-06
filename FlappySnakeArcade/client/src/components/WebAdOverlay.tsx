import { useEffect, useState } from "react";
import { useAds } from "../lib/stores/useAds";

export function WebAdOverlay() {
  const { showWebAdOverlay, webAdType, closeWebAdOverlay } = useAds();
  const [countdown, setCountdown] = useState(5);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    if (!showWebAdOverlay) {
      setCountdown(webAdType === "rewarded" ? 5 : 3);
      setCanSkip(false);
      return;
    }

    const initialCountdown = webAdType === "rewarded" ? 5 : 3;
    setCountdown(initialCountdown);
    setCanSkip(false);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanSkip(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showWebAdOverlay, webAdType]);

  if (!showWebAdOverlay) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0, 0, 0, 0.95)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 100000,
        fontFamily: "monospace",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
          borderRadius: "20px",
          padding: "40px 60px",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          border: "2px solid #333",
          maxWidth: "90%",
          width: "400px",
        }}
      >
        <div
          style={{
            fontSize: "48px",
            marginBottom: "20px",
          }}
        >
          {webAdType === "rewarded" ? "🎁" : "📺"}
        </div>

        <div
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            color: "#FFD700",
            marginBottom: "15px",
          }}
        >
          {webAdType === "rewarded" ? "Watch Ad for Reward" : "Advertisement"}
        </div>

        <div
          style={{
            fontSize: "16px",
            color: "#AAA",
            marginBottom: "30px",
            lineHeight: "1.5",
          }}
        >
          {webAdType === "rewarded"
            ? "Watch this ad to continue playing!"
            : "Brief intermission..."}
        </div>

        <div
          style={{
            width: "100%",
            height: "8px",
            background: "#333",
            borderRadius: "4px",
            marginBottom: "25px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${((webAdType === "rewarded" ? 5 : 3) - countdown) / (webAdType === "rewarded" ? 5 : 3) * 100}%`,
              height: "100%",
              background: "linear-gradient(90deg, #4CAF50, #8BC34A)",
              borderRadius: "4px",
              transition: "width 1s linear",
            }}
          />
        </div>

        {canSkip ? (
          <button
            onClick={closeWebAdOverlay}
            style={{
              padding: "15px 40px",
              fontSize: "18px",
              fontWeight: "bold",
              background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
              color: "#FFF",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(76, 175, 80, 0.4)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(76, 175, 80, 0.6)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 4px 15px rgba(76, 175, 80, 0.4)";
            }}
          >
            {webAdType === "rewarded" ? "Claim Reward!" : "Continue"}
          </button>
        ) : (
          <div
            style={{
              fontSize: "20px",
              color: "#888",
            }}
          >
            Skip in {countdown}s
          </div>
        )}

        <div
          style={{
            marginTop: "30px",
            padding: "15px",
            background: "#0a0a15",
            borderRadius: "10px",
            border: "1px dashed #333",
          }}
        >
          <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>
            AD PLACEHOLDER
          </div>
          <div style={{ fontSize: "14px", color: "#888" }}>
            Your ad would appear here
          </div>
          <div style={{ fontSize: "11px", color: "#555", marginTop: "10px" }}>
            Configure AdSense in settings to show real ads
          </div>
        </div>
      </div>
    </div>
  );
}
