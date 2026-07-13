"use client";

import { useEffect, useRef, useState } from "react";
import { SlotRenderer } from "./SlotRenderer";

export function useSlotRenderer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<SlotRenderer | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const renderer = new SlotRenderer();
    rendererRef.current = renderer;
    let cancelled = false;

    renderer.mount(el).then(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
      renderer.destroy();
      rendererRef.current = null;
      setReady(false);
    };
  }, []);

  return { containerRef, rendererRef, ready };
}
