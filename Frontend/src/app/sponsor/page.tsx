"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Copy, Link2, Lock, LogOut, Plus, ShieldCheck, Trophy, Unlock } from "lucide-react";
import { useSponsorAuthStore } from "../../stores/sponsor-auth-store";
import {
  useSponsorTournaments,
  useCreateSponsorTournament,
  useClaimTournament,
  useSponsorInquiries,
} from "../../lib/hooks/useSponsorPortal";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

// The sponsor's own dashboard: create public tournaments (admin-approved before going live), claim
// a private tournament with an admin-issued sponsor code, and see all their tournaments + codes.
export default function SponsorDashboardPage() {
  const router = useRouter();
  const token = useSponsorAuthStore((s) => s.token);
  const sponsor = useSponsorAuthStore((s) => s.sponsor);
  const clear = useSponsorAuthStore((s) => s.clear);
  const { data: tournaments } = useSponsorTournaments();
  const { data: inquiries } = useSponsorInquiries();
  const create = useCreateSponsorTournament();
  const claim = useClaimTournament();

  const [form, setForm] = useState({ title: "", description: "", prizePool: "", winnerCount: "1", startAt: "", minPlayers: "", maxPlayers: "" });
  const [claimCode, setClaimCode] = useState("");
  const [error, setError] = useState("");
  const [claimError, setClaimError] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (!token) router.replace("/sponsor/login");
  }, [token, router]);
  if (!token) return null;

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) return;
    try {
      await create.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim(),
        prizePool: form.prizePool.trim(),
        winnerCount: Number(form.winnerCount) || 1,
        startAt: form.startAt || null,
        minPlayers: form.minPlayers === "" ? null : Number(form.minPlayers),
        maxPlayers: form.maxPlayers === "" ? null : Number(form.maxPlayers),
      });
      setForm({ title: "", description: "", prizePool: "", winnerCount: "1", startAt: "", minPlayers: "", maxPlayers: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create tournament");
    }
  }

  async function onClaim(e: React.FormEvent) {
    e.preventDefault();
    setClaimError("");
    if (!claimCode.trim()) return;
    try {
      await claim.mutateAsync(claimCode.trim());
      setClaimCode("");
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : "Could not claim");
    }
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      /* ignore */
    }
  }

  function logout() {
    clear();
    router.replace("/sponsor/login");
  }

  return (
    <div className="admin-shell">
      <header className="admin-nav new-nav">
        <span className="sponsor-ava"><Building2 size={16} /></span>
        <nav>
          <button className="active"><Trophy /> Tournaments</button>
        </nav>
        <div>
          <span className="sponsor-badge">{sponsor?.name}</span>
          <button className="icon-button" onClick={logout} aria-label="Log out"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-heading">
          <div>
            <p className="eyebrow">SPONSOR DASHBOARD</p>
            <h1>{sponsor?.name}</h1>
            <p>Create tournaments for your players and claim any private tournament an admin set up for you.</p>
          </div>
        </div>

        <p className="sponsor-note">
          <ShieldCheck size={15} /> Tournaments you create start as <b>Pending</b> and go live only after an admin approves them.
        </p>

        <div className="dash-two-col">
          {/* Create public tournament */}
          <div className="admin-card glass">
            <div className="section-heading">
              <div>
                <p className="eyebrow">CREATE</p>
                <h2>New tournament</h2>
              </div>
              <Unlock size={16} />
            </div>
            <form onSubmit={onCreate} className="promo-form-grid">
              <label className="pf-full">
                <span>Tournament name</span>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Neon Weekend Cup" />
              </label>
              <label className="pf-full">
                <span>Description</span>
                <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional" />
              </label>
              <label className="pf-field">
                <span>Prize</span>
                <input value={form.prizePool} onChange={(e) => setForm((f) => ({ ...f, prizePool: e.target.value }))} placeholder="e.g. 1,000 USDT" />
              </label>
              <label className="pf-field">
                <span>Winners</span>
                <input type="number" min={1} value={form.winnerCount} onChange={(e) => setForm((f) => ({ ...f, winnerCount: e.target.value }))} />
              </label>
              <label className="pf-field">
                <span>Min players</span>
                <input type="number" min={0} value={form.minPlayers} onChange={(e) => setForm((f) => ({ ...f, minPlayers: e.target.value }))} placeholder="optional" />
              </label>
              <label className="pf-field">
                <span>Max players</span>
                <input type="number" min={0} value={form.maxPlayers} onChange={(e) => setForm((f) => ({ ...f, maxPlayers: e.target.value }))} placeholder="optional" />
              </label>
              <label className="pf-full">
                <span>Starts at (optional)</span>
                <input type="datetime-local" value={form.startAt} onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))} />
              </label>
              {error && <div className="pf-full sponsor-auth-err">{error}</div>}
              <div className="pf-full pf-actions">
                <button className="primary" type="submit" disabled={create.isPending || !form.title.trim()}>
                  <Plus size={16} /> Submit for approval
                </button>
              </div>
            </form>
          </div>

          {/* Claim a private tournament */}
          <div className="admin-card glass">
            <div className="section-heading">
              <div>
                <p className="eyebrow">CLAIM</p>
                <h2>Private tournament</h2>
              </div>
              <Lock size={16} />
            </div>
            <p className="pf-note" style={{ marginTop: 0 }}>
              An admin set up a private tournament for you? Enter the sponsor code they gave you to link it to your account.
            </p>
            <form onSubmit={onClaim} className="promo-form">
              <input value={claimCode} onChange={(e) => setClaimCode(e.target.value)} placeholder="e.g. SPN-1A2B3C4D" style={{ textTransform: "uppercase" }} />
              <button className="secondary" type="submit" disabled={claim.isPending || !claimCode.trim()}>
                <Link2 size={15} /> Claim
              </button>
            </form>
            {claimError && <div className="sponsor-auth-err" style={{ marginTop: 8 }}>{claimError}</div>}
          </div>
        </div>

        {/* All my tournaments */}
        <div className="admin-card glass wide" style={{ marginTop: 18 }}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR TOURNAMENTS</p>
              <h2>{(tournaments ?? []).length} total</h2>
            </div>
            <Trophy size={18} />
          </div>
          {(tournaments ?? []).length === 0 && <div className="empty-line">No tournaments yet.</div>}
          {(tournaments ?? []).map((t) => (
            <div className="tourn-row" key={t.id}>
              <div className="tourn-main">
                <div className="tourn-title">
                  <b>{t.title}</b>
                  <span className={`vis-pill ${t.visibility.toLowerCase()}`}>
                    {t.visibility === "PRIVATE" ? <Lock size={11} /> : <Unlock size={11} />} {t.visibility}
                  </span>
                  <span className={`promo-status ${t.status.toLowerCase()}`}>{t.status}</span>
                </div>
                <div className="tourn-meta">
                  <span>Prize: {t.prizePool || "—"}</span>
                  <span>Winners: {t.winnerCount}</span>
                  <span>Starts: {fmtDate(t.startAt)}</span>
                  <span>{t.entryCount} joined</span>
                </div>
                {t.visibility === "PRIVATE" && t.joinCode && (
                  <div className="code-chips">
                    <button className="code-chip" onClick={() => copy(t.joinCode ?? "", `j-${t.id}`)} title="Share this code with your players">
                      Share join code: <code>{t.joinCode}</code> <Copy size={12} /> {copied === `j-${t.id}` && <em>copied</em>}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Entry requests routed to this sponsor */}
        <div className="admin-card glass wide" style={{ marginTop: 18 }}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">PLAYER REQUESTS</p>
              <h2>Entry requests</h2>
            </div>
          </div>
          <p className="pf-note" style={{ marginTop: 0 }}>Players asking to join your tournaments. Reach out to them by email.</p>
          {(inquiries ?? []).length === 0 && <div className="empty-line">No requests yet.</div>}
          {(inquiries ?? []).map((i) => (
            <div className="pending-row" key={i.id}>
              <div>
                <b>{i.name || i.email}</b>
                <small>
                  <span className={`promo-status ${i.status === "NEW" ? "pending" : i.status === "CONTACTED" ? "approved" : "rejected"}`}>{i.status}</span>
                  {i.tournament ? ` · ${i.tournament.title}` : ""} · {i.email}
                </small>
                {i.message && <small style={{ color: "var(--muted)" }}>“{i.message}”</small>}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
