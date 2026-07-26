import React, { useState } from "react";
import VIDEO_SRC from "../Slash.MP4";

const SLOGAN = "Know before you buy.";

export function SketchIntro({ onDone }) {
  const [leaving, setLeaving] = useState(false);

  const handleGetStarted = () => {
    setLeaving(true);
    setTimeout(() => onDone && onDone(), 400);
  };

  return (
    <div style={{
      flex: 1,
      width: "100%",
      height: "100%",
      background: "#161412",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 22,
      padding: "32px 24px",
      boxSizing: "border-box",
      position: "relative",
      overflow: "hidden",
      opacity: leaving ? 0 : 1,
      transform: leaving ? "scale(0.97) translateY(-8px)" : "scale(1) translateY(0)",
      filter: leaving ? "blur(8px)" : "blur(0px)",
      transition: "all 0.45s cubic-bezier(0.19, 1, 0.22, 1)",
    }}>
      <style>{`
        @keyframes vagueToClear {
          0% {
            opacity: 0;
            filter: blur(12px);
            transform: translateY(14px) scale(0.97);
          }
          60% {
            opacity: 0.85;
            filter: blur(2px);
          }
          100% {
            opacity: 1;
            filter: blur(0px);
            transform: translateY(0) scale(1);
          }
        }
        @keyframes drawPath {
          0% { stroke-dashoffset: 175; opacity: 0; }
          20% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes drawButtonSketch {
          0% { stroke-dashoffset: 700; opacity: 0; }
          20% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0.95; }
        }
        .anim-header {
          animation: vagueToClear 1.1s cubic-bezier(0.19, 1, 0.22, 1) 0.6s both;
        }
        .anim-underline {
          stroke-dasharray: 175;
          stroke-dashoffset: 175;
          animation: drawPath 0.9s cubic-bezier(0.19, 1, 0.22, 1) 1.1s forwards;
        }
        .anim-slogan {
          animation: vagueToClear 1.1s cubic-bezier(0.19, 1, 0.22, 1) 1.0s both;
        }
        .anim-button {
          animation: vagueToClear 1.1s cubic-bezier(0.19, 1, 0.22, 1) 1.5s both;
        }
        .anim-button-sketch {
          stroke-dasharray: 700;
          stroke-dashoffset: 700;
          animation: drawButtonSketch 1.0s cubic-bezier(0.19, 1, 0.22, 1) 1.7s forwards;
        }
      `}</style>

      {/* Background ambient lighting */}
      <div style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 340, height: 340,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(216, 179, 106, 0.15) 0%, rgba(22, 20, 18, 0) 70%)",
        pointerEvents: "none",
      }} />

      {/* Step 2 Header: "Poise" + Underline (vague to clear) */}
      <div className="anim-header" style={{ textAlign: "center", zIndex: 2 }}>
        <h1 style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: 38,
          fontWeight: 400,
          color: "#F3F1EC",
          margin: 0,
          letterSpacing: "-0.01em",
        }}>
          Poise
        </h1>
        <svg width="108" height="15" viewBox="0 0 130 18" style={{ margin: "4px auto 0", display: "block" }} aria-hidden="true">
          <path
            className="anim-underline"
            d="M5 9 C 22 2, 38 15, 56 7 S 92 3, 110 10 S 122 13, 126 8"
            fill="none"
            stroke="#D8B36A"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Step 1: Video Plays Immediately */}
      <div style={{
        width: "100%",
        maxWidth: 280,
        aspectRatio: "1 / 1",
        borderRadius: 24,
        overflow: "hidden",
        position: "relative",
        background: "#FFFFFF",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.65), 0 0 24px rgba(216, 179, 106, 0.4), 0 0 0 1px rgba(216, 179, 106, 0.35)",
        zIndex: 2,
      }}>
        <video
          src={VIDEO_SRC}
          autoPlay
          muted
          loop
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>

      {/* Step 2 & 3: Slogan + Button with Sketchy Outline */}
      <div style={{ textAlign: "center", width: "100%", maxWidth: 280, zIndex: 2 }}>
        <p className="anim-slogan" style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: 21,
          fontWeight: 400,
          color: "#EFE9DC",
          margin: "0 0 18px",
          lineHeight: 1.35,
          letterSpacing: "0.01em",
          opacity: 0.92,
        }}>
          {SLOGAN}
        </p>

        <div className="anim-button" style={{ position: "relative", width: "100%" }}>
          {/* Animated sketchy gold SVG outline */}
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 280 54"
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              top: "-3px",
              left: "-3px",
              width: "calc(100% + 6px)",
              height: "calc(100% + 6px)",
              pointerEvents: "none",
              zIndex: 3,
            }}
            aria-hidden="true"
          >
            <path
              className="anim-button-sketch"
              d="M 14,4 C 80,2 190,5 266,3 C 274,3 276,10 275,22 C 277,36 274,48 265,51 C 190,53 80,51 14,52 C 6,52 4,44 5,28 C 3,16 5,5 14,4 Z"
              fill="none"
              stroke="#D8B36A"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <button
            onClick={handleGetStarted}
            style={{
              width: "100%",
              border: "none",
              background: "#F3F1EC",
              color: "#161412",
              borderRadius: 14,
              padding: "16px 24px",
              fontSize: 16,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "'Josefin Sans', -apple-system, system-ui, sans-serif",
              boxShadow: "0 8px 28px rgba(0, 0, 0, 0.45)",
              transition: "transform 0.15s ease",
              letterSpacing: "0.01em",
            }}
          >
            Get started
          </button>
        </div>
      </div>
    </div>
  );
}
