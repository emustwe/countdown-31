"use client";

import { useEffect, useRef } from "react";

// A lightweight full-screen fireworks celebration drawn on a canvas. Bursts launch on a timer and
// fade out; the whole layer is non-interactive (pointer-events: none) and honours prefers-reduced-
// motion (then it shows nothing rather than animating).
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 1 -> 0
  color: string;
}

const CONFETTI = ["#f4b942", "#5aa8ff", "#ff6b7f", "#5be348", "#b48cff", "#38e0d0", "#ffffff"];

export function Fireworks({ color }: { color?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;
    const palette = [color ?? "#f4b942", ...CONFETTI];
    let particles: Particle[] = [];

    function resize() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function burst(cx: number, cy: number) {
      const n = 44;
      const hue = palette[Math.floor((cx + cy) % palette.length)]!;
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + Math.random() * 0.2;
        const speed = 1.8 + Math.random() * 3.2;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          life: 1,
          color: Math.random() < 0.5 ? hue : palette[Math.floor(Math.random() * palette.length)]!,
        });
      }
    }

    let last = 0;
    let sinceBurst = 0;
    function frame(t: number) {
      if (!running || !canvas) return;
      const dt = last ? Math.min((t - last) / 16.6, 3) : 1;
      last = t;
      sinceBurst += dt;
      // Launch a new burst roughly every ~28 frames, at a random upper-area point.
      if (sinceBurst > 28) {
        sinceBurst = 0;
        burst(canvas.clientWidth * (0.15 + Math.random() * 0.7), canvas.clientHeight * (0.15 + Math.random() * 0.45));
      }
      ctx!.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      particles = particles.filter((p) => p.life > 0);
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.06 * dt; // gravity
        p.vx *= 0.99;
        p.life -= 0.012 * dt;
        ctx!.globalAlpha = Math.max(0, p.life);
        ctx!.fillStyle = p.color;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    // A couple of immediate bursts for instant payoff.
    burst(canvas.clientWidth * 0.35, canvas.clientHeight * 0.3);
    burst(canvas.clientWidth * 0.65, canvas.clientHeight * 0.35);
    raf = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [color]);

  return <canvas ref={canvasRef} className="cd31-fireworks" aria-hidden="true" />;
}
