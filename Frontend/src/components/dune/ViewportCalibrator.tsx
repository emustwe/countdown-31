"use client";

import { useEffect, useState } from "react";

/**
 * TEMPORARY calibration readout for the iOS soft-fullscreen work.
 *
 * There is no API that reports whether Safari's bars are showing, and the offset needed to make the
 * page marginally scrollable (so Safari's collapse gesture has somewhere to go) depends on the iOS
 * version — the commonly-quoted 72px comes from a 44px bar collapsing to 20px and predates several
 * Safari redesigns. A headless browser has no dynamic toolbar at all: there vh, dvh, svh and lvh are
 * all equal, so none of this can be measured off-device.
 *
 * So instead of guessing a constant, this prints the numbers that actually matter, live, on the real
 * phone. Rotate, scroll to collapse the bars, screenshot, and read `lvh - svh` — that is the true
 * bar height for that device and iOS version, and the value the scroll affordance should use.
 *
 * Shown ONLY when the URL carries ?cal=1, so players never see it. Delete this file once the
 * affordance is calibrated.
 */
export function ViewportCalibrator() {
  const [on, setOn] = useState(false);
  const [m, setM] = useState<Record<string, number | string>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!new URLSearchParams(window.location.search).has("cal")) return;
    setOn(true);

    const probe = (unit: string) => {
      const el = document.createElement("div");
      el.style.cssText = `position:absolute;height:100${unit};visibility:hidden;pointer-events:none`;
      document.body.appendChild(el);
      const h = Math.round(el.getBoundingClientRect().height);
      el.remove();
      return h;
    };

    const read = () => {
      const vv = window.visualViewport;
      const svh = probe("svh");
      const lvh = probe("lvh");
      setM({
        orientation: window.innerWidth >= window.innerHeight ? "landscape" : "portrait",
        innerHeight: window.innerHeight,
        outerHeight: window.outerHeight,
        clientHeight: document.documentElement.clientHeight,
        bodyOffsetH: document.body.offsetHeight,
        scrollHeight: document.documentElement.scrollHeight,
        "visualViewport.h": vv ? Math.round(vv.height) : "n/a",
        "vv.offsetTop": vv ? Math.round(vv.offsetTop) : "n/a",
        dvh: probe("dvh"),
        svh,
        lvh,
        "→ BAR HEIGHT (lvh-svh)": lvh - svh,
        scrollY: Math.round(window.scrollY),
        standalone: window.matchMedia("(display-mode: standalone)").matches ? "yes" : "no",
      });
    };

    read();
    window.addEventListener("resize", read);
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("orientationchange", read);
    window.visualViewport?.addEventListener("resize", read);
    window.visualViewport?.addEventListener("scroll", read);
    return () => {
      window.removeEventListener("resize", read);
      window.removeEventListener("scroll", read);
      window.removeEventListener("orientationchange", read);
      window.visualViewport?.removeEventListener("resize", read);
      window.visualViewport?.removeEventListener("scroll", read);
    };
  }, []);

  if (!on) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 4,
        left: 4,
        zIndex: 2147483647,
        background: "rgba(0,0,0,0.88)",
        color: "#7CFFB2",
        font: "600 10px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace",
        padding: "6px 8px",
        borderRadius: 8,
        border: "1px solid #7CFFB2",
        pointerEvents: "none",
        whiteSpace: "pre",
        maxWidth: "48vw",
      }}
      aria-hidden="true"
    >
      {Object.entries(m)
        .map(([k, v]) => `${k.padEnd(22, " ")}${v}`)
        .join("\n")}
    </div>
  );
}
