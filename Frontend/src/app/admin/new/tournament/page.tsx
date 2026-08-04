"use client";

import { useState } from "react";
import { CheckCircle2, Plus, Trophy, XCircle } from "lucide-react";
import { useAdminPromoTournaments, useCreatePromo, useSetPromoStatus, useSponsors } from "../../../../lib/hooks/useSponsors";

// Admin tournament management for the new (sponsor/promo) tournaments shown on the user Tournaments
// page. Admin can create one (auto-approved, optionally attributed to a sponsor) and see every
// tournament grouped by sponsor, with approve/reject controls.
export default function TournamentAdminPage() {
  const { data: promos } = useAdminPromoTournaments();
  const { data: sponsors } = useSponsors();
  const create = useCreatePromo();
  const setStatus = useSetPromoStatus();
  const [form, setForm] = useState({ title: "", description: "", sponsorId: "" });

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await create.mutateAsync({ title: form.title.trim(), description: form.description.trim(), sponsorId: form.sponsorId || undefined });
    setForm({ title: "", description: "", sponsorId: "" });
  }

  // Group by sponsor (house = admin-created, no sponsor).
  const groups = new Map<string, { label: string; items: NonNullable<typeof promos> }>();
  for (const t of promos ?? []) {
    const key = t.sponsor?.id ?? "house";
    const label = t.sponsor?.name ?? "House (admin)";
    if (!groups.has(key)) groups.set(key, { label, items: [] });
    groups.get(key)!.items.push(t);
  }

  return (
    <main className="admin-main">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">NEW DASHBOARD</p>
          <h1>Tournaments</h1>
          <p>Create tournaments for the user Tournaments page, and manage sponsor submissions.</p>
        </div>
      </div>

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
          <select value={form.sponsorId} onChange={(e) => setForm((f) => ({ ...f, sponsorId: e.target.value }))}>
            <option value="">House (no sponsor)</option>
            {(sponsors ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button className="primary" type="submit" disabled={create.isPending || !form.title.trim()}>
            <Plus size={16} /> Create
          </button>
        </form>
      </div>

      {[...groups.entries()].map(([key, g]) => (
        <div className="admin-card glass wide" key={key} style={{ marginTop: 18 }}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">SPONSOR</p>
              <h2>{g.label}</h2>
            </div>
            <Trophy size={18} />
          </div>
          {g.items.map((t) => (
            <div className="pending-row" key={t.id}>
              <div>
                <b>{t.title}</b>
                <small>
                  <span className={`promo-status ${t.status.toLowerCase()}`}>{t.status}</span> · {t.description || "no description"}
                </small>
              </div>
              {t.status === "PENDING" && (
                <div className="pending-actions">
                  <button className="primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setStatus.mutate({ id: t.id, action: "approve" })}>
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button className="secondary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setStatus.mutate({ id: t.id, action: "reject" })}>
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
      {(promos ?? []).length === 0 && <p style={{ color: "var(--muted)", marginTop: 20 }}>No tournaments yet — create one above.</p>}
    </main>
  );
}
