"use client";

import { useEffect, useRef, useState } from "react";
import { SlotRenderer } from "./SlotRenderer";

/** `containerRef` should be attached to a plain full-width block (no aspect-ratio class
 * needed) — this hook creates its own inner element with an *explicit pixel* height
 * computed from the container's measured width, and mounts Pixi into that. CSS
 * aspect-ratio on a box whose only child is later taken out of flow (absolutely
 * positioned, which the canvas is) isn't reliably sized by every engine — an explicit
 * height sidesteps that entirely instead of fighting it. */
export function useSlotRenderer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<SlotRenderer | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const outer = containerRef.current;
    if (!outer) return;

    const inner = document.createElement("div");
    inner.style.width = "100%";
    inner.style.position = "relative";
    outer.appendChild(inner);

    function applySquareHeight() {
      inner.style.height = `${outer!.clientWidth}px`;
    }
    applySquareHeight();
    const resizeObserver = new ResizeObserver(applySquareHeight);
    resizeObserver.observe(outer);

    const renderer = new SlotRenderer();
    rendererRef.current = renderer;
    let cancelled = false;

    renderer.mount(inner).then(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      renderer.destroy();
      rendererRef.current = null;
      setReady(false);
      outer.removeChild(inner);
    };
  }, []);

  return { containerRef, rendererRef, ready };
}
