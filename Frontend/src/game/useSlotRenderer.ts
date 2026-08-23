"use client";

import { useEffect, useRef, useState } from "react";
import { SlotRenderer } from "./SlotRenderer";

const MIN_BOARD_SIZE = 220;

/** Attach `wrapperRef` to the flex area the board should fill and `boardRef` to the element
 * the page renders at the returned `boardW`×`boardH` — the Pixi canvas mounts into
 * `boardRef`, and the page can absolutely-position HUD controls over it (they line up with
 * the frame art because the board box matches the frame's `aspect`, so the frame fills it
 * with no letterboxing). The box is the largest one of that aspect fitting inside the
 * wrapper (its own box, so there's no layout feedback), minus `padPx` of breathing room. */
export function useSlotRenderer(aspect = 1, padPx = 12, themeFamily: "desert" | "monster" = "desert") {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<SlotRenderer | null>(null);
  const [ready, setReady] = useState(false);
  const [dims, setDims] = useState({ w: MIN_BOARD_SIZE * aspect, h: MIN_BOARD_SIZE });

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const board = boardRef.current;
    if (!wrapper || !board) return;

    function applySize() {
      const availW = wrapper!.clientWidth - padPx;
      const availH = wrapper!.clientHeight - padPx;
      const h = Math.max(MIN_BOARD_SIZE, Math.min(availH, availW / aspect));
      setDims({ w: h * aspect, h });
    }
    applySize();

    const resizeObserver = new ResizeObserver(applySize);
    resizeObserver.observe(wrapper);
    window.addEventListener("resize", applySize);

    const renderer = new SlotRenderer(themeFamily);
    rendererRef.current = renderer;
    let cancelled = false;

    renderer.mount(board).then(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
      window.removeEventListener("resize", applySize);
      resizeObserver.disconnect();
      renderer.destroy();
      rendererRef.current = null;
      setReady(false);
    };
  }, [aspect, padPx, themeFamily]);

  return { wrapperRef, boardRef, rendererRef, ready, boardW: dims.w, boardH: dims.h };
}
