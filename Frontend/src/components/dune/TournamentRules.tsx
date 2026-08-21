"use client";

import { useRef, useState } from "react";
import { Award, Check, FileCheck2, Gamepad2, Shield, Sparkles, X } from "lucide-react";

// The official Count Down 31 rules, shown as a gate the player must read + accept before entering a
// tournament game. Grouped into sections; the Accept control unlocks only after the player scrolls
// through to the end.
interface Rule {
  n: number;
  title: string;
  body: string;
}
interface Section {
  key: string;
  label: string;
  icon: typeof Gamepad2;
  rules: Rule[];
}

const SECTIONS: Section[] = [
  {
    key: "gameplay",
    label: "Gameplay",
    icon: Gamepad2,
    rules: [
      { n: 1, title: "Stay Alive", body: "Your objective is simple — be the last player remaining." },
      { n: 2, title: "Follow the Turn Order", body: "Play only when it is your turn. The server controls the player order throughout the tournament." },
      { n: 3, title: "Every Round Starts at 1", body: "Every new round always begins with number 1." },
      { n: 4, title: "Continue the Count", body: "You must always begin with the next available number." },
      { n: 5, title: "Choose Your Count", body: "On your turn you may announce 1, 2, or 3 numbers. No more." },
      { n: 6, title: "Don’t Repeat the Previous Count", body: "You cannot use the same digit count as the player immediately before you. Repeating it results in immediate elimination." },
      { n: 7, title: "Keep Numbers Consecutive", body: "Numbers must always be consecutive. Skipping numbers is not allowed." },
      { n: 8, title: "Think Fast", body: "You have 5 seconds to complete your turn. Time runs out — you’re out." },
      { n: 9, title: "Never Say 31", body: "If you announce 31, you’re eliminated." },
      { n: 10, title: "New Round", body: "After someone is eliminated by saying 31, the round immediately restarts from 1." },
      { n: 11, title: "Stay in the Tournament", body: "Only surviving players continue into the next round." },
      { n: 12, title: "Last Player Wins", body: "When only one player remains, the tournament ends. Champion." },
    ],
  },
  {
    key: "skills",
    label: "Skills",
    icon: Sparkles,
    rules: [
      { n: 13, title: "Pick Your Skills", body: "Choose 2 skills before the tournament starts. Choose wisely — you can purchase skills in the shop." },
      { n: 14, title: "One Use Only", body: "Each skill may only be used once per tournament. Once it’s gone, it’s gone." },
      { n: 15, title: "Skills Work Only Until 21", body: "Skills can only be activated while the current number is between 1 and 21." },
      { n: 16, title: "Skill Lock", body: "Once the count reaches 22, all skills become locked. No exceptions." },
      { n: 17, title: "New Round Unlock", body: "When the count returns to 1, unused skills become available again. Used skills never return." },
      { n: 18, title: "Your Turn, Your Skill", body: "Skills may only be activated during your own turn." },
    ],
  },
  {
    key: "fairplay",
    label: "Fair Play",
    icon: Shield,
    rules: [
      { n: 19, title: "Play Fair", body: "No bots. No scripts. No macros. No exploits. No cheating." },
      { n: 20, title: "One Account Only", body: "One player, one account. Multiple accounts are prohibited." },
      { n: 21, title: "Disconnects", body: "If you fail to reconnect before the reconnect timer expires, you are eliminated." },
      { n: 22, title: "Spectator Mode", body: "Once eliminated, you become a spectator. Watch, cheer, enjoy." },
      { n: 23, title: "Server Is Always Right", body: "All gameplay is validated by the official game server. Server decisions are final." },
      { n: 24, title: "Respect Everyone", body: "Treat every player with respect. Harassment, abuse, or toxic behavior will not be tolerated." },
      { n: 25, title: "No Match Fixing", body: "Collusion, intentional losing, or manipulating results is strictly prohibited." },
    ],
  },
  {
    key: "tournament",
    label: "Tournament",
    icon: Award,
    rules: [
      { n: 26, title: "Tournament Rankings", body: "Final rankings are determined by elimination order." },
      { n: 27, title: "Prize Distribution", body: "Prizes are awarded according to the official tournament announcement." },
      { n: 28, title: "Rule Updates", body: "Rules may be updated before future tournaments to improve fairness and gameplay." },
      { n: 29, title: "Official Decisions", body: "The Organizer has the final authority on all tournament decisions." },
      { n: 30, title: "Have Fun", body: "Compete hard. Play fair. Respect others. Enjoy every round." },
    ],
  },
  {
    key: "agreement",
    label: "Player Agreement",
    icon: FileCheck2,
    rules: [
      {
        n: 31,
        title: "Player Agreement",
        body: "By entering this tournament, you confirm that you have read, understood, and accepted all Official Rules. You agree to compete fairly, respect every participant, and help create a competitive, friendly, and enjoyable experience for everyone.",
      },
    ],
  },
];

export function TournamentRules({
  open,
  tournamentTitle,
  onAccept,
  onClose,
}: {
  open: boolean;
  tournamentTitle?: string;
  onAccept: () => void;
  onClose: () => void;
}) {
  const [reachedEnd, setReachedEnd] = useState(false);
  const [checked, setChecked] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  if (!open) return null;

  function onScroll() {
    const el = bodyRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setReachedEnd(true);
  }

  return (
    <div className="modal-overlay rules-overlay" onClick={onClose}>
      <div className="rules-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <header className="rules-head">
          <span className="rules-badge">31</span>
          <div>
            <p className="eyebrow">OFFICIAL RULES</p>
            <h2>Count Down 31</h2>
            <p className="rules-sub">{tournamentTitle ? `${tournamentTitle} — ` : ""}read the rules, then enter the arena.</p>
          </div>
        </header>

        <div className="rules-body" ref={bodyRef} onScroll={onScroll}>
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            return (
              <section className="rules-section" key={sec.key}>
                <div className="rules-section-head">
                  <span className="rules-section-ico"><Icon size={15} /></span>
                  <span className="eyebrow">{sec.label}</span>
                  <span className="rules-section-rule" />
                </div>
                <ul className="rules-list">
                  {sec.rules.map((r) => (
                    <li className="rule-item" key={r.n}>
                      <span className="rule-num">{r.n}</span>
                      <div>
                        <b>{r.title}</b>
                        <p>{r.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          <p className="rules-signoff">Good luck. Have fun. See you in the Arena.</p>
        </div>

        <div className="rules-foot">
          {!reachedEnd ? (
            <p className="rules-scrollhint">Scroll to the end to accept the rules ↓</p>
          ) : (
            <label className="rules-accept">
              <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
              <span>I have read, understood, and accept all Official Rules.</span>
            </label>
          )}
          <button className="primary xl rules-enter" disabled={!checked} onClick={onAccept}>
            <Check size={18} /> Accept &amp; enter the arena
          </button>
        </div>
      </div>
    </div>
  );
}
