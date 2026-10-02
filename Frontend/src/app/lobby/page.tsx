"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Play, Home, User, Trophy, ShoppingBag, Handshake, Settings as SettingsIcon, Users, Crown, History, BookOpen } from "lucide-react";
import { PastureAmbiance } from "../../components/dune/PastureAmbiance";
import { ViewportCalibrator } from "../../components/dune/ViewportCalibrator";
import { FullBleedPage } from "../../components/dune/FullBleedPage";
import { LandingRotateGate } from "../../components/dune/LandingRotateGate";
import { OfficialRulesModal } from "../../components/dune/OfficialRulesModal";
import { soundManager } from "../../lib/soundManager";
import { useGameConfig } from "../../lib/hooks/useGameConfig";
import { DEFAULT_GAME_CONFIG } from "../../lib/game-config";

/** Same icon set the header menu uses, so a button here looks like its menu entry did. */
const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  home: Home, cow: User, trophy: Trophy, shop: ShoppingBag,
  sponsor: Handshake, settings: SettingsIcon, users: Users, crown: Crown, history: History,
};

export default function RootLandingPage() {
  const router = useRouter();
  // The launcher's buttons ARE the admin menu — same source, so the admin panel still drives them.
  const { data: config } = useGameConfig();
  const menuItems = (config ?? DEFAULT_GAME_CONFIG).menuItems
    // /home is the Play tile, already hard-coded first. The wallet system was deleted from this
    // project, so its menu entry leads nowhere — filtered here rather than depending on someone
    // remembering to disable it in the admin panel.
    .filter((i) => i.enabled && i.path !== "/home" && !/wallet/i.test(i.path + i.id))
    .sort((a, b) => a.order - b.order);
  const [showRules, setShowRules] = useState(false);

  function play() {
    soundManager.playClick();
    // scroll:false — Next scrolls to the top on every route change by default, and returning to
    // scroll 0 is exactly what makes Safari put its bars back. Keeping the position carries the
    // collapsed bars from the lobby into the game.
    router.push("/home", { scroll: false });
  }

  return (
    <>
      <ViewportCalibrator />
      <FullBleedPage />
      <LandingRotateGate />
      <div className="landing-playground">
      <PastureAmbiance />
      <div className="landing-orb landing-orb-one" />
      <div className="landing-orb landing-orb-two" />

      <header className="landing-nav">
        <button className="landing-brand" onClick={() => router.push("/lobby")} aria-label="Vera 31 home">
          <span className="landing-brand-mark">31</span>
          <span><b>VERA 31</b><small>The cow counting game</small></span>
        </button>
      </header>

      {/* THE LOBBY IS A LAUNCHER. Every destination is a button on screen — no list, no menu to
          open. The entries come from the SAME admin-configured list the header menu uses, so what
          you set in the admin panel still drives them and the two cannot drift apart. */}
      <main className="lobby-launcher">
        <button className="lobby-btn is-play" onClick={play}>
          <span className="lobby-btn-ico"><Play size={26} fill="currentColor" /></span>
          <b>Play now</b>
          <small>No account needed</small>
        </button>

        {menuItems.map((item) => {
          const Icon = ICONS[item.icon] ?? Home;
          return (
            <button key={item.id} className="lobby-btn" onClick={() => router.push(item.path, { scroll: false })}>
              <span className="lobby-btn-ico"><Icon size={22} /></span>
              <b>{item.label}</b>
            </button>
          );
        })}

        <button className="lobby-btn" onClick={() => setShowRules(true)}>
          <span className="lobby-btn-ico"><BookOpen size={22} /></span>
          <b>How to play</b>
        </button>
      </main>

      <footer className="landing-footer"><span>WM Tournaments</span><span>18+ · Play responsibly</span></footer>
      <OfficialRulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      </div>
    </>
  );
}
