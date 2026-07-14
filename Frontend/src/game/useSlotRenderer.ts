"use client";

import { useEffect, useRef, useState } from "react";
import { SlotRenderer } from "./SlotRenderer";

const MIN_BOARD_SIZE = 220;

/** `containerRef` should be attached to a plain full-width block (no aspect-ratio class
 * needed) — this hook creates its own inner element with an *explicit pixel* height,
 * sized to fit whichever is smaller: the container's own width, or the vertical space
 * actually left in the viewport once everything below it (the control bar, page padding)
 * is accounted for. A pure width-driven square (or CSS aspect-ratio) can render a board
 * that's individually well-formed but taller than the viewport has room for, pushing the
 * controls below the fold — this keeps the whole game on screen without scrolling.
 * `reservedBelowPx` is how much vertical space to leave for whatever renders below the
 * board (pass the control bar's approximate height + margins). */
export function useSlotRenderer(reservedBelowPx = 170) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<SlotRenderer | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const outer = containerRef.current;
    if (!outer) return;

    const inner = document.createElement("div");
    inner.style.width = "100%";
    inner.style.position = "relative";
    inner.style.marginInline = "auto";
    outer.appendChild(inner);

    function applySize() {
      const width = outer!.clientWidth;
      const availableHeight = window.innerHeight - outer!.getBoundingClientRect().top - reservedBelowPx;
      const size = Math.max(MIN_BOARD_SIZE, Math.min(width, availableHeight));
      inner.style.width = `${size}px`;
      inner.style.height = `${size}px`;
    }
    applySize();

    const resizeObserver = new ResizeObserver(applySize);
    resizeObserver.observe(outer);
    window.addEventListener("resize", applySize);

    const renderer = new SlotRenderer();
    rendererRef.current = renderer;
    let cancelled = false;

    renderer.mount(inner).then(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
      window.removeEventListener("resize", applySize);
      resizeObserver.disconnect();
      renderer.destroy();
      rendererRef.current = null;
      setReady(false);
      outer.removeChild(inner);
    };
  }, [reservedBelowPx]);

  return { containerRef, rendererRef, ready };
}
