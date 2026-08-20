"use client";

import React, { useEffect, useRef } from "react";

interface TransparentVideoProps {
  src: string;
  className?: string;
  width?: number;
  height?: number;
  keyColor?: "black" | "green" | "auto";
  threshold?: number;
}

export function TransparentVideo({
  src,
  className = "w-48 h-48 object-contain",
  width = 360,
  height = 360,
  keyColor = "auto",
  threshold = 30,
}: TransparentVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let animationFrameId: number;
    let isRunning = true;

    function renderLoop() {
      if (!isRunning || !ctx || !video) return;

      if (!video.paused && !video.ended && video.readyState >= 2) {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(video, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const len = data.length;

        // Auto-detect corner background color or use explicit mode
        let mode = keyColor;
        if (mode === "auto") {
          const r0 = data[0] ?? 0;
          const g0 = data[1] ?? 0;
          const b0 = data[2] ?? 0;
          if (g0 > 80 && g0 > r0 * 1.3 && g0 > b0 * 1.3) {
            mode = "green";
          } else {
            mode = "black";
          }
        }

        if (mode === "green") {
          // Green-screen removal with feathering
          for (let i = 0; i < len; i += 4) {
            const r = data[i] ?? 0;
            const g = data[i + 1] ?? 0;
            const b = data[i + 2] ?? 0;

            if (g > 70 && g > r * 1.25 && g > b * 1.25) {
              const diff = g - Math.max(r, b);
              if (diff > 45) {
                data[i + 3] = 0; // 100% transparent
              } else {
                data[i + 3] = Math.max(0, 255 - diff * 5.6); // Soft anti-aliased edge
              }
            }
          }
        } else {
          // Black background removal with smooth edge feathering
          for (let i = 0; i < len; i += 4) {
            const r = data[i] ?? 0;
            const g = data[i + 1] ?? 0;
            const b = data[i + 2] ?? 0;

            // If pixel is deep black / dark background
            if (r < threshold && g < threshold && b < threshold) {
              const maxVal = Math.max(r, g, b);
              if (maxVal < threshold * 0.6) {
                data[i + 3] = 0; // 100% transparent
              } else {
                data[i + 3] = Math.max(0, Math.floor(((maxVal - threshold * 0.6) / (threshold * 0.4)) * 255));
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    }

    renderLoop();

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
    };
  }, [src, width, height, keyColor, threshold]);

  return (
    <div className={`relative inline-block ${className} select-none pointer-events-none`}>
      {/* Hidden Video Source */}
      <video
        ref={videoRef}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        crossOrigin="anonymous"
        className="hidden"
      />

      {/* Transparent Canvas Renderer */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-full object-contain filter drop-shadow-[0_12px_28px_rgba(0,0,0,0.85)]"
      />
    </div>
  );
}
