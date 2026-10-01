"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { CountrySelect } from "../../components/dune/CountrySelect";
import { normalizeCountry } from "../../lib/countries";
import { useGuestStore } from "../../stores/guest-store";
import { soundManager } from "../../lib/soundManager";

/**
 * Name + country as a PAGE, not a modal — the iOS path into a game.
 *
 * The modal version lagged badly: it sits on the arena, which carries 112px of scroll gap so Safari
 * can collapse its bars. Focusing a field makes iOS scroll the document to reveal it, that gap gives
 * it somewhere to scroll to, and the scroll brings the bars back mid-animation.
 *
 * This page deliberately has NO scroll gap and content that fits, so there is nothing for iOS to
 * scroll. The keyboard opens and nothing moves. Because it is a client-side route change on the same
 * document, the collapsed bars carry straight through — lobby to here to the game, still fullscreen.
 *
 * Nothing about the lobby or the arena is involved; this is a separate route.
 */
export default function JoinPage() {
  const router = useRouter();
  const storedName = useGuestStore((s) => s.username);
  const storedCountry = useGuestStore((s) => s.country);
  const setGuestName = useGuestStore((s) => s.setUsername);
  const setGuestCountry = useGuestStore((s) => s.setCountry);

  const [name, setName] = useState(storedName ?? "");
  const [country, setCountry] = useState(storedCountry ?? "");

  /**
   * Hold the page still.
   *
   * The scroll gap is inherited from the page you arrived from — it deliberately survives
   * navigation so the collapsed bars carry across — which means iOS still has somewhere to scroll
   * when the keyboard opens, and that scroll is what brings the bars back. Clearing the gap instead
   * would snap scrollY to 0, which also brings them back. So the gap stays and every scroll is
   * undone immediately: the same fix already proven on the modal, where the page held at 112
   * throughout the keyboard opening.
   */
  useEffect(() => {
    const y = window.scrollY;
    const hold = () => {
      if (window.scrollY !== y) window.scrollTo(0, y);
    };
    window.addEventListener("scroll", hold, { passive: true });
    window.visualViewport?.addEventListener("scroll", hold);
    window.visualViewport?.addEventListener("resize", hold);
    return () => {
      window.removeEventListener("scroll", hold);
      window.visualViewport?.removeEventListener("scroll", hold);
      window.visualViewport?.removeEventListener("resize", hold);
    };
  }, []);

  const enter = () => {
    soundManager.playClick();
    const clean = name.trim().slice(0, 20) || `Player ${Math.floor(1000 + Math.random() * 9000)}`;
    setGuestName(clean);
    const c = normalizeCountry(country);
    if (c) setGuestCountry(c);
    // scroll:false — the same reason the lobby uses it. Returning to the top is what makes Safari
    // put its bars back, and the point of this page is that they never come back.
    router.push("/home?autojoin=1", { scroll: false });
  };

  return (
    <div className="join-page">
      <div className="join-card">
        <span className="join-mark" aria-hidden="true">31</span>
        <h1>Choose your name</h1>
        <input
          value={name}
          maxLength={20}
          placeholder="Your cow name"
          autoComplete="nickname"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") enter();
          }}
        />
        <CountrySelect variant="gate" value={country} onChange={setCountry} />
        <button type="button" className="join-go" onClick={enter}>
          <LogIn size={18} /> Enter game
        </button>
      </div>
    </div>
  );
}
