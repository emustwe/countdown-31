"use client";

import { useEffect, useState } from "react";
import { barsAreUp, canFullscreen, isIOS } from "../../lib/fullscreen";
import { isCollapsed } from "../../lib/collapse-latch";

/**
 * On-device viewport readout. Shown ONLY with ?cal=1 in the URL, so players never see it.
 *
 * This exists because iOS Safari's bar behaviour cannot be reproduced in any emulator: the page
 * measures as correct on a desktop browser pretending to be an iPhone while being visibly wrong on a
 * real one. Rather than keep guessing from screenshots, this prints the numbers that actually decide
 * the layout so they can be read straight off the device.
 *
 * It also prints the PLATFORM CLASSIFICATION, because the layout is only half the story: whether a
 * page gets the scroll gap or a fullscreen button is decided from these flags, and reading them off
 * the device is the only way to catch a browser being classified as something it is not.
 */
export function ViewportCalibrator() {
  const [on, setOn] = useState(false);
  const [m, setM] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("cal") !== "1") return;
    setOn(true);

    const px = (v: number | undefined) => (v == null ? "—" : `${Math.round(v)}`);
    const probe = (unit: string) => {
      const d = document.createElement("div");
      d.style.cssText = `position:fixed;top:0;left:0;width:1px;height:100${unit};visibility:hidden;pointer-events:none`;
      document.body.appendChild(d);
      const h = d.getBoundingClientRect().height;
      d.remove();
      return h;
    };

    const read = () => {
      const el = document.querySelector(".landing-playground") ?? document.querySelector(".arena-viewport");
      const r = el?.getBoundingClientRect();
      const cs = el ? getComputedStyle(el) : null;
      const d = document.documentElement;
      setM({
        "innerHeight": px(window.innerHeight),
        "visualViewport": px(window.visualViewport?.height),
        "100lvh": px(probe("lvh")),
        "100dvh": px(probe("dvh")),
        "100svh": px(probe("svh")),
        "--app-vh": (getComputedStyle(d).getPropertyValue("--app-vh") || "unset").trim(),
        "page height": cs?.height ?? "—",
        "page top→bottom": r ? `${px(r.top)} → ${px(r.bottom)}` : "—",
        "page position": cs?.position ?? "—",
        "scrollY": px(window.scrollY),
        "scrollH − clientH": `${d.scrollHeight - d.clientHeight}`,
        "UNCOVERED BELOW": r ? `${Math.max(0, Math.round((window.visualViewport?.height ?? window.innerHeight) - r.bottom))}px` : "—",
        // ── platform classification: which branch of the collapse logic this device lands on ──
        "browser": /CriOS/.test(navigator.userAgent) ? "Chrome iOS"
          : /FxiOS/.test(navigator.userAgent) ? "Firefox iOS"
          : /EdgiOS/.test(navigator.userAgent) ? "Edge iOS"
          : isIOS() ? "Safari iOS" : "other",
        "isIOS()": String(isIOS()),
        "raw FS api": String(
          typeof (d as HTMLElement & { webkitRequestFullscreen?: unknown }).requestFullscreen === "function" ||
            typeof (d as HTMLElement & { webkitRequestFullscreen?: unknown }).webkitRequestFullscreen === "function",
        ),
        "canFullscreen()": String(canFullscreen()),
        // The two readings that decide whether the swipe is possible at all.
        "chrome gap": `${Math.round(probe("lvh") - (window.visualViewport?.height ?? window.innerHeight))}`,
        // THE number for the black-panel bug, and it is the GAP — measured here rather than read
        // back off the style, because `calc(100% + Npx)` resolves against the CURRENT viewport, so
        // the gap stays fully scrollable whatever the bars are doing. A swipe spends its first
        // `chrome gap` pixels collapsing the bars and every pixel after that slides the fixed page
        // layer up, exposing empty document. So this is the WORST-CASE slide, and it wants to be as
        // close to `chrome gap` as possible: ~34 on Chrome iOS, ~113 on Safari. 112 here on Chrome
        // means the old constant gap is still deployed.
        "leftover scroll": `${Math.max(0, d.scrollHeight - d.clientHeight)}`,
        "barsAreUp()": String(barsAreUp()),
        "isCollapsed()": String(isCollapsed()),
        "GAP applied": d.style.minHeight || "none",
        "touch-action": cs?.touchAction ?? "—",
        "maxTouchPoints": String(navigator.maxTouchPoints ?? 0),
        "UA tail": navigator.userAgent.slice(-42),
      });
    };

    read();
    const t = setInterval(read, 400);
    window.addEventListener("scroll", read, { passive: true });
    window.visualViewport?.addEventListener("resize", read);
    window.visualViewport?.addEventListener("scroll", read);
    return () => {
      clearInterval(t);
      window.removeEventListener("scroll", read);
      window.visualViewport?.removeEventListener("resize", read);
      window.visualViewport?.removeEventListener("scroll", read);
    };
  }, []);

  if (!on) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 6,
        left: 6,
        zIndex: 2147483647,
        background: "rgba(0,0,0,.88)",
        color: "#7CFFB2",
        // Two columns at a small size, because the readout has to fit a 350px-tall landscape
        // viewport WITHOUT scrolling — the page it is diagnosing may well be locked, which is
        // exactly how the last few lines went unreadable on the device that needed them most.
        font: "600 10px/1.32 ui-monospace,Menlo,monospace",
        columns: 2,
        columnGap: "14px",
        padding: "8px 10px",
        borderRadius: 8,
        pointerEvents: "none",
        maxWidth: "78vw",
        maxHeight: "94vh",
        overflow: "hidden",
      }}
    >
      {Object.entries(m).map(([k, v]) => (
        <div
          key={k}
          style={{
            color:
              (k === "UNCOVERED BELOW" && v !== "0px") ||
              // An iOS device that believes it can go fullscreen is denied the scroll gap, and an
              // iOS device with no gap cannot clear its bars at all. Either one in red is the bug.
              (k === "canFullscreen()" && v === "true" && m["isIOS()"] === "true") ||
              (k === "GAP applied" && v === "none" && m["isIOS()"] === "true") ||
              // Bars down but a big scrollable remainder = the gap was sized for a browser with
              // more chrome than this one has, and the page is parked on dead space.
              (k === "leftover scroll" && m["barsAreUp()"] === "false" && Number(v) > 40)
                ? "#FF7A7A"
                : undefined,
          }}
        >
          {k}: <b>{v}</b>
        </div>
      ))}
    </div>
  );
}
