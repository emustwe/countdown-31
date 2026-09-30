"use client";

import { useEffect, useState } from "react";

/**
 * On-device viewport readout. Shown ONLY with ?cal=1 in the URL, so players never see it.
 *
 * This exists because iOS Safari's bar behaviour cannot be reproduced in any emulator: the page
 * measures as correct on a desktop browser pretending to be an iPhone while being visibly wrong on a
 * real one. Rather than keep guessing from screenshots, this prints the numbers that actually decide
 * the layout so they can be read straight off the device.
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
        font: "600 11px/1.45 ui-monospace,Menlo,monospace",
        padding: "8px 10px",
        borderRadius: 8,
        pointerEvents: "none",
        maxWidth: "62vw",
      }}
    >
      {Object.entries(m).map(([k, v]) => (
        <div key={k} style={{ color: k === "UNCOVERED BELOW" && v !== "0px" ? "#FF7A7A" : undefined }}>
          {k}: <b>{v}</b>
        </div>
      ))}
    </div>
  );
}
