"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, LogOut, Plus, ShieldCheck, Trophy } from "lucide-react";
import { useSponsorAuthStore } from "../../stores/sponsor-auth-store";
import { useSponsorTournaments, useCreateSponsorTournament } from "../../lib/hooks/useSponsorPortal";

// The sponsor's own dashboard: create tournaments (which go to the admin for approval before they
// show to users) and track their status.
export default function SponsorDashboardPage() {
  const router = useRouter();
  const token = useSponsorAuthStore((s) => s.token);
  const sponsor = useSponsorAuthStore((s) => s.sponsor);
  const clear = useSponsorAuthStore((s) => s.clear);
  const { data: tournaments } = useSponsorTournaments();
  const create = useCreateSponsorTournament();
  const [form, setForm] = useState({ title: "", description: "" });

  useEffect(() => {
    if (!token) router.replace("/sponsor/login");
  }, [token, router]);
  if (!token) return null;

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await create.mutateAsync({ title: form.title.trim(), description: form.description.trim() });
    setForm({ title: "", description: "" });
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
            <p>Create tournaments for your players. Each one is reviewed by an admin before it goes live.</p>
          </div>
        </div>

        <p className="sponsor-note">
          <ShieldCheck size={15} /> New tournaments start as <b>Pending</b> and appear to users only after an admin approves them.
        </p>

        <div className="admin-card glass wide">
          <div className="section-heading">
            <div>
              <p className="eyebrow">CREATE</p>
              <h2>New tournament</h2>
            </div>
          </div>
          <form onSubmit={onCreate} className="promo-form">
            <input placeholder="Tournament title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <input placeholder="Short description (optional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <button className="primary" type="submit" disabled={create.isPending || !form.title.trim()}>
              <Plus size={16} /> Submit for approval
            </button>
          </form>
        </div>

        <div className="admin-card glass wide" style={{ marginTop: 18 }}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR TOURNAMENTS</p>
              <h2>Submissions</h2>
            </div>
            <Trophy size={18} />
          </div>
          {(tournaments ?? []).length === 0 && <div style={{ padding: 16, color: "var(--muted)" }}>No tournaments yet — create one above.</div>}
          {(tournaments ?? []).map((t) => (
            <div className="pending-row" key={t.id}>
              <div>
                <b>{t.title}</b>
                <small>{t.description || "no description"}</small>
              </div>
              <span className={`promo-status ${t.status.toLowerCase()}`}>{t.status}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
