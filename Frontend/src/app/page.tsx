"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { BookOpen, ChevronRight, Play, ShieldCheck, Sparkles, Volume2, VolumeX } from "lucide-react";
import { PastureAmbiance } from "../components/dune/PastureAmbiance";
import { OfficialRulesModal } from "../components/dune/OfficialRulesModal";
import { soundManager } from "../lib/soundManager";
import { useSettingsStore } from "../stores/settings-store";

const steps = [
  { icon: "1", title: "Pick numbers", copy: "Choose 1, 2, or 3." },
  { icon: "2", title: "Take turns", copy: "Watch the count grow." },
  { icon: "3", title: "Avoid 31", copy: "Stay safe to win!" },
];

export default function RootLandingPage() {
  const router = useRouter();
  const [showRules, setShowRules] = useState(false);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const toggleSoundStore = useSettingsStore((s) => s.toggleSound);

  function play() {
    soundManager.playClick();
    router.push("/home");
  }

  function toggleSound() {
    toggleSoundStore();
    const next = !soundEnabled;
    soundManager.setMuted(!next);
    if (next) soundManager.playClick();
  }

  return (
    <div className="landing-playground">
      <PastureAmbiance />
      <div className="landing-orb landing-orb-one" />
      <div className="landing-orb landing-orb-two" />

      <header className="landing-nav">
        <button className="landing-brand" onClick={() => router.push("/")} aria-label="Count Down 31 home">
          <span className="landing-brand-mark">31</span>
          <span><b>COUNT DOWN</b><small>The cow counting game</small></span>
        </button>
        <div className="landing-nav-actions">
          <button className="landing-icon-button" onClick={toggleSound} aria-label={soundEnabled ? "Turn sound off" : "Turn sound on"} title={soundEnabled ? "Sound on" : "Sound off"}>
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button className="landing-rules-button" onClick={() => setShowRules(true)}>
            <BookOpen size={18} /><span>How to play</span>
          </button>
        </div>
      </header>

      <main className="landing-main">
        <motion.section className="landing-copy" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="landing-kicker"><Sparkles size={15} /> Easy to learn. Fun to master.</div>
          <h1>Count together.<br /><em>Don&apos;t land on 31!</em></h1>
          <p className="landing-lede">A quick turn-taking game for friends, families, and clever cows.</p>

          <div className="landing-actions">
            <button className="landing-play" onClick={play}>
              <span className="landing-play-icon"><Play size={25} fill="currentColor" /></span>
              <span><b>Play now</b><small>No account needed</small></span>
              <ChevronRight size={22} />
            </button>
            <button className="landing-how" onClick={() => setShowRules(true)}><BookOpen size={20} /> See the rules</button>
          </div>

          <div className="landing-steps" aria-label="How the game works">
            {steps.map((step, index) => (
              <motion.div key={step.icon} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 + index * 0.1 }}>
                <span>{step.icon}</span><div><b>{step.title}</b><small>{step.copy}</small></div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section className="landing-mascot-wrap" initial={{ opacity: 0, scale: 0.9, rotate: 2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 90, damping: 14, delay: 0.15 }}>
          <div className="landing-speech">Ready? Let&apos;s count! <span>🐮</span></div>
          <div className="landing-mascot-card">
            <Image src="/assets/barnaby/barnaby-field.jpg" alt="Barnaby the friendly cow champion" fill sizes="(max-width: 820px) 360px, 430px" priority />
            <div className="landing-mascot-name"><span>Meet Barnaby</span><b>Your counting buddy</b></div>
          </div>
          <div className="landing-safe"><ShieldCheck size={17} /> Clear controls · Calm sounds · Motion can be reduced</div>
        </motion.section>
      </main>

      <footer className="landing-footer"><span>WM Tournaments</span><span>18+ · Play responsibly</span></footer>
      <OfficialRulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}
