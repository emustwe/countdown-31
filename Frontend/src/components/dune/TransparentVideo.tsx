"use client";

import React, { useRef, useEffect } from "react";

interface TransparentVideoProps {
  src: string;
  className?: string;
}

export function TransparentVideo({
  src,
  className = "w-52 h-52 sm:w-64 sm:h-64",
}: TransparentVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // browser autoplay policy fallback
      });
    }
  }, [src]);

  return (
    <div className={`relative flex items-center justify-center select-none pointer-events-none ${className}`}>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-contain filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)]"
        style={{
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}
