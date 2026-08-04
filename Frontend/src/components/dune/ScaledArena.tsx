"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Wraps the board + scoreboard and scales the whole pair down uniformly to fit the available
 * space, so the exact desktop side-by-side layout is preserved on every screen (including
 * landscape phones) with no overflow and no per-element reflow. The inner keeps its natural
 * (desktop) size; only a CSS transform shrinks it — so nothing glitches or shifts.
 */
export function ScaledArena({ children }: { children: ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const inner = innerRef.current;
    if (!box || !inner) return;
    let raf = 0;
    const fit = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // offset* = untransformed layout size, so measuring is unaffected by our own scale.
        const natW = inner.offsetWidth;
        const natH = inner.offsetHeight;
        if (!natW || !natH) return;
        const availW = box.clientWidth - 12;
        const availH = box.clientHeight - 8;
        const s = Math.min(1, availW / natW, availH / natH);
        inner.style.transform = `translate(-50%, -50%) scale(${s})`;
      });
    };
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    ro.observe(inner);
    window.addEventListener("resize", fit);
    fit();
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="match-arena" ref={boxRef}>
      <div className="match-arena-inner" ref={innerRef}>
        {children}
      </div>
    </div>
  );
}
