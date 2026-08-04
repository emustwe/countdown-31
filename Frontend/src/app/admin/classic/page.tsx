"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, ChevronLeft, Gamepad2, Plus, Trophy, Users, WalletCards, X } from "lucide-react";
import { AdminGuard } from "../../../components/AdminGuard";
import { AdminNav } from "../../../components/dune/AdminNav";
import { OrbIcon, Pill } from "../../../components/dune/Shell";
import { useAnalytics, useAdminModels } from "../../../lib/hooks/useAdmin";
import {
  useAdminTournaments,
  useCreateTournament,
  useCancelTournament,
  useSettleTournament,
  type TournamentSummary,
} from "../../../lib/hooks/useTournaments";
import { parseUsdt } from "../../../lib/money";
import { usdtLabel, coinsToMinor, skinFor, shortCountdown, roundName } from "../../../lib/dune-skins";
import { BRANDS, BRAND_KEYS, type BrandKey } from "../../../lib/brands";
import { ApiError } from "../../../lib/api-client";

export default function AdminDashboardPage() {
  return (
    <AdminGuard>
      <div className="admin-shell">
        <AdminNav />
        <Dashboard />
      </div>
    </AdminGuard>
  );
}

const M = (minor: string) => usdtLabel(minor);

function Dashboard() {
  const router = useRouter();
  const { data: a } = useAnalytics(7);
  const { data: list } = useAdminTournaments();
  const settle = useSettleTournament();
  const cancel = useCancelTournament();
  const tournaments = list?.tournaments ?? [];
  const [showCreate, setShowCreate] = useState(false);
  const liveCount = tournaments.filter((t) => t.state === "RUNNING").length;

  return (
    <main className="admin-main">
      <div className="admin-heading">
        <div>
          <button className="text-button" style={{ marginBottom: 8 }} onClick={() => router.push("/admin")}>
            <ChevronLeft size={16} /> Dashboards
          </button>
          <p className="eyebrow">COMMAND CENTER · CLASSIC</p>
          <h1>Command center</h1>
          <p>Here&apos;s what&apos;s happening across WM Tournaments today.</p>
        </div>
        <button className="primary" onClick={() => setShowCreate(true)}>
          <Plus size={18} />
          Create tournament
        </button>
      </div>
      <div className="admin-stats">
        {(
          [
            [WalletCards, a ? M(a.totalStaked) : "—", "Staked (7d)", "cyan"],
            [Users, a ? a.activeUsers.toLocaleString() : "—", "Active players", "violet"],
            [Trophy, a ? M(a.ggr) : "—", "GGR (7d)", "gold"],
            [Gamepad2, String(liveCount), "Live tournaments", "pink"],
          ] as [typeof Users, string, string, string][]
        ).map(([Icon, v, l, tone]) => (
          <div className="admin-stat glass" key={l}>
            <OrbIcon tone={tone}>
              <Icon size={21} />
            </OrbIcon>
            <span>
              <small>{l}</small>
              <b>{v}</b>
              <i>Last 7 days</i>
            </span>
            <BarChart3 size={34} />
          </div>
        ))}
      </div>
      <div className="admin-grid">
        <div className="admin-card glass wide">
          <div className="section-heading">
            <div>
              <p className="eyebrow">TOURNAMENT CONTROL</p>
              <h2>All tournaments</h2>
            </div>
            <button className="secondary" onClick={() => setShowCreate(true)}>
              + New
            </button>
          </div>
          <div className="admin-table">
            <div className="tr th">
              <span>Tournament</span>
              <span>Status</span>
              <span>Players</span>
              <span>Prize pool</span>
              <span>Ends</span>
              <span>Actions</span>
            </div>
            {tournaments.length === 0 && (
              <div style={{ padding: 24, color: "var(--muted)" }}>No tournaments yet — create one.</div>
            )}
            {tournaments.map((t) => (
              <AdminRow key={t.id} t={t} onSettle={() => settle.mutate(t.id)} onCancel={() => cancel.mutate(t.id)} />
            ))}
          </div>
        </div>
        <div className="admin-card glass">
          <p className="eyebrow">PLATFORM THEME</p>
          <h2>World atmosphere</h2>
          <div className="family-card monster">
            <div>
              <span>☠</span>
              <p>
                <b>Monster Mayhem</b>
                <small>Active platform-wide</small>
              </p>
            </div>
            <button onClick={() => router.push("/admin/settings")}>Change</button>
          </div>
          <div className="system-status">
            <p>
              <i className="ok" />
              Payments <b>Test mode</b>
            </p>
            <p>
              <i className="ok" />
              Game servers <b>Operational</b>
            </p>
            <p>
              <i className="warn" />
              Settlement <b>Manual</b>
            </p>
          </div>
        </div>
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
    </main>
  );
}

function AdminRow({ t, onSettle, onCancel }: { t: TournamentSummary; onSettle: () => void; onCancel: () => void }) {
  const router = useRouter();
  const skin = skinFor(t.id);
  const live = t.state === "RUNNING";
  const prize = usdtLabel(t.prizes.reduce((s, p) => s + BigInt(p.amount), 0n).toString());
  return (
    <div className="tr">
      <span>
        <span className={`history-icon ${skin.tone}`}>◈</span>
        <button
          onClick={() => router.push(`/admin/tournaments/${t.id}`)}
          style={{ background: "none", border: "none", padding: 0, color: "inherit", font: "inherit", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
        >
          <b>{t.name}</b>
        </button>
        {t.format !== "LEADERBOARD" && (
          <span className="pill soon" style={{ marginLeft: 6, fontSize: 10 }}>{t.format}</span>
        )}
      </span>
      <span>
        <Pill tone={live ? "live" : "soon"}>{t.state}</Pill>
      </span>
      <span>
        {t.entryCount}
        {t.maxEntries ? ` / ${t.maxEntries}` : ""}
      </span>
      <span>
        <b>{prize}</b>
      </span>
      <span>{shortCountdown(t.endAt)}</span>
      <span>
        {t.format !== "LEADERBOARD" ? (
          <button className="primary" style={{ padding: "4px 10px", fontSize: "11px" }} onClick={() => router.push(`/admin/tournaments/${t.id}`)}>
            Manage
          </button>
        ) : t.state === "ENDED" ? (
          <button className="primary" style={{ padding: "4px 10px", fontSize: "11px" }} onClick={onSettle}>
            Settle &amp; Pay
          </button>
        ) : t.state === "SCHEDULED" || t.state === "RUNNING" ? (
          <button className="secondary" style={{ padding: "4px 10px", fontSize: "11px" }} onClick={onCancel}>
            Cancel
          </button>
        ) : (
          <span style={{ color: "var(--muted)" }}>—</span>
        )}
      </span>
    </div>
  );
}

/** datetime-local value (local time, no zone) → ISO string. */
function localToIso(local: string): string {
  return new Date(local).toISOString();
}

/** A datetime-local string N minutes from now, in the browser's local zone. */
function localInMinutes(min: number): string {
  const d = new Date(Date.now() + min * 60_000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const TEMPLATES = {
  WEEKLY: { players: 100, rounds: 3, blurb: "3 rounds over 3 days · up to 100 players · Top 10 win" },
  MONTHLY: { players: 500, rounds: 4, blurb: "4 rounds over 4 days · up to 500 players · Top 10 win" },
} as const;

function CreateModal({ onClose }: { onClose: () => void }) {
  const { data: models } = useAdminModels();
  const create = useCreateTournament();
  const [brand, setBrand] = useState<BrandKey>("WM");
  const [format, setFormat] = useState<"WEEKLY" | "MONTHLY">("WEEKLY");
  const [form, setForm] = useState({ name: "", fee: "25000", prize: "10000000", coins: "50000" });
  // One start time per round (day). Default: round 1 in 5 min, each later round +1 day.
  const [roundStarts, setRoundStarts] = useState<string[]>([
    localInMinutes(5),
    localInMinutes(5 + 1440),
    localInMinutes(5 + 2880),
    localInMinutes(5 + 4320),
  ]);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const inputStyle = { width: "100%", padding: "12px", marginTop: "6px", borderRadius: "12px", border: "1px solid var(--border)", background: "rgba(255,255,255,0.05)", color: "var(--text)" } as const;

  const tmpl = TEMPLATES[format];
  const rounds = tmpl.rounds;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const starts = roundStarts.slice(0, rounds);
      const lastStart = new Date(starts[starts.length - 1]!).getTime();
      await create.mutateAsync({
        name: form.name,
        modelId: models?.[0]?.id ?? "aurora-ways-tournament",
        format,
        brand,
        entryFee: parseUsdt(form.fee || "0"),
        startingCredits: coinsToMinor(form.coins || "1"),
        startAt: localToIso(starts[0]!),
        // Backend recomputes the real end (last round + 5 min); this just satisfies validation.
        endAt: new Date(lastStart + 10 * 60_000).toISOString(),
        roundStartAts: starts.map(localToIso),
        prizePool: parseUsdt(form.prize || "0"),
        prizes: [],
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : "Failed to create tournament");
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>
        <Pill>ADMIN CONTROL</Pill>
        <h2 style={{ marginTop: "12px" }}>Create New Tournament</h2>
        <form onSubmit={submit} style={{ display: "grid", gap: "14px", marginTop: "16px" }}>
          <div>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Brand</span>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${BRAND_KEYS.length}, 1fr)`, gap: "10px", marginTop: "6px" }}>
              {BRAND_KEYS.map((b) => (
                <button
                  type="button"
                  key={b}
                  onClick={() => setBrand(b)}
                  className={brand === b ? "primary" : "secondary"}
                  style={{ padding: "10px", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: BRANDS[b].accent, display: "inline-block" }} />
                  {b === "WM" ? "WM Tournament" : `${BRANDS[b].label} Tournament`}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "var(--cyan)", margin: "8px 0 0" }}>{BRANDS[brand].blurb}</p>
          </div>
          <div>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Format</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "6px" }}>
              {(["WEEKLY", "MONTHLY"] as const).map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setFormat(f)}
                  className={format === f ? "primary" : "secondary"}
                  style={{ padding: "10px", fontSize: 12 }}
                >
                  {f === "WEEKLY" ? "Weekly Tournament" : "Monthly Tournament"}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "var(--cyan)", margin: "8px 0 0" }}>{tmpl.blurb}</p>
          </div>
          <label>
            Tournament Name
            <input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Phoenix Rising" style={inputStyle} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <label>
              Entry Fee (USDT)
              <input value={form.fee} onChange={(e) => set("fee", e.target.value)} style={inputStyle} />
            </label>
            <label>
              Prize Pool (USDT)
              <input value={form.prize} onChange={(e) => set("prize", e.target.value)} style={inputStyle} />
            </label>
            <label>
              Starting Coins (per match)
              <input value={form.coins} onChange={(e) => set("coins", e.target.value)} style={inputStyle} />
            </label>
          </div>
          <div style={{ display: "grid", gap: "8px" }}>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Round start times (one per day)</span>
            {Array.from({ length: rounds }).map((_, i) => (
              <label key={i} style={{ fontSize: 12 }}>
                {roundName(i + 1, rounds)} starts
                <input
                  type="datetime-local"
                  value={roundStarts[i] ?? localInMinutes(5 + i * 1440)}
                  onChange={(e) => setRoundStarts((prev) => { const n = [...prev]; n[i] = e.target.value; return n; })}
                  style={inputStyle}
                />
              </label>
            ))}
          </div>

          {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
          <button className="primary full xl" type="submit" disabled={create.isPending}>
            {create.isPending ? "Publishing…" : "Publish Tournament"}
          </button>
        </form>
      </div>
    </div>
  );
}
