"use client";

import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import {
  avataaars,
  personas,
  bigSmile,
  micah,
  openPeeps,
  notionists,
  adventurer,
  lorelei,
  miniavs,
  dylan,
  toonHead,
  funEmoji,
  bigEars,
  croodles,
} from "@dicebear/collection";

// TEMPORARY style-picker page. Open /avatar-styles, tell me which number/name you like, and I'll
// rebuild the avatar + shop on that style. Remove this page once chosen.
const STYLES: { name: string; style: Parameters<typeof createAvatar>[0] }[] = [
  { name: "1 · Personas", style: personas },
  { name: "2 · Big Smile", style: bigSmile },
  { name: "3 · Micah", style: micah },
  { name: "4 · Open Peeps", style: openPeeps },
  { name: "5 · Notionists", style: notionists },
  { name: "6 · Adventurer", style: adventurer },
  { name: "7 · Lorelei", style: lorelei },
  { name: "8 · Miniavs", style: miniavs },
  { name: "9 · Dylan", style: dylan },
  { name: "10 · Toon Head", style: toonHead },
  { name: "11 · Big Ears", style: bigEars },
  { name: "12 · Croodles", style: croodles },
  { name: "13 · Fun Emoji", style: funEmoji },
  { name: "14 · Avataaars (current)", style: avataaars },
];

const SEEDS = ["Talha", "Sara", "Max"];

export default function AvatarStylesPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#0b0712", color: "#fff", padding: "32px 24px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Pick an avatar style</h1>
      <p style={{ color: "#9a93b0", marginBottom: 24 }}>
        Each row is one style shown with 3 different people. Tell me the number you like best (or say &quot;none — I want real Bitmoji&quot;).
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {STYLES.map(({ name, style }) => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 18, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 14 }}>
            <div style={{ width: 190, fontWeight: 700, fontSize: 15 }}>{name}</div>
            <div style={{ display: "flex", gap: 14 }}>
              {SEEDS.map((seed) => (
                <StyleSample key={seed} style={style} seed={seed} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function StyleSample({ style, seed }: { style: Parameters<typeof createAvatar>[0]; seed: string }) {
  const uri = useMemo(() => createAvatar(style, { seed }).toDataUri(), [style, seed]);
  return (
    <div style={{ width: 130, height: 130, borderRadius: 14, overflow: "hidden", background: "radial-gradient(circle at 50% 35%, #241b3a, #0f0a1c)", display: "grid", placeItems: "center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={uri} alt={seed} width={130} height={130} />
    </div>
  );
}
