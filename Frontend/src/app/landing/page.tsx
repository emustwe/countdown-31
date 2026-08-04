"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Volume2, VolumeX } from "lucide-react";
import { FlipText, useFlipIndex } from "../../components/dune/FlipText";

export default function LandingPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  // "Enter to the game" flips like a home-page card (whole-button flip) between EN and KO.
  const fContinue = useFlipIndex(5200);

  // Browsers require muted for autoplay, so we start muted, then unmute on the visitor's
  // first interaction anywhere on the page (a real user gesture, which browsers allow).
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = true;
    const unmute = () => {
      const v = videoRef.current;
      if (v && v.muted) {
        v.muted = false;
        void v.play().catch(() => {});
        setMuted(false);
      }
    };
    window.addEventListener("pointerdown", unmute, { once: true });
    window.addEventListener("keydown", unmute, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unmute);
      window.removeEventListener("keydown", unmute);
    };
  }, []);

  function toggleSound() {
    const v = videoRef.current;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    if (!next) void v.play().catch(() => {});
    setMuted(next);
  }

  return (
    <div className="landing">
      <video
        ref={videoRef}
        className="landing-video"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster="/assets/monster-carnival-home.png"
      >
        <source src="/landing-bg.mp4" type="video/mp4" />
      </video>
      <div className="landing-overlay" />

      <button className="landing-sound" onClick={toggleSound} aria-label={muted ? "Turn sound on" : "Mute"}>
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      <div className="landing-center">
        <span className="landing-mark" aria-hidden="true">
          ✦
        </span>
        <h1 className="landing-name">
          <FlipText intervalMs={5000} items={[<>WM Tournaments</>, <>WM 토너먼트</>]} />
        </h1>
        <button
          className="primary xl landing-continue flip-card"
          key={`continue-${fContinue}`}
          onClick={() => router.push("/home")}
        >
          <span>{fContinue === 1 ? "게임 시작하기" : "Enter to the game"}</span>
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
