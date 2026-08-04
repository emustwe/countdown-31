"use client";

import { Building2, CheckCircle2, Clock, Users, XCircle } from "lucide-react";
import { usePromoOverview, useSponsors, useAdminPromoTournaments, useSetPromoStatus } from "../../lib/hooks/useSponsors";

// New admin dashboard: at-a-glance counts, the sponsor roster, and pending sponsor tournaments the
// admin can approve or reject.
export default function NewAdminDashboardPage() {
  const { data: ov } = usePromoOverview();
  const { data: sponsors } = useSponsors();
  const { data: promos } = useAdminPromoTournaments();
  const setStatus = useSetPromoStatus();
  const pending = (promos ?? []).filter((t) => t.status === "PENDING");

  const stats: [string, string | number][] = [
    ["Total users", ov?.totalUsers ?? "—"],
    ["Active (7d)", ov?.activeUsers7d ?? "—"],
    ["New today", ov?.newUsersToday ?? "—"],
    ["Sponsors", ov?.sponsorCount ?? "—"],
    ["Pending approvals", ov?.pendingTournaments ?? "—"],
  ];

  return (
    <main className="admin-main">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">NEW DASHBOARD</p>
          <h1>Overview</h1>
          <p>Users, sponsors, and tournaments awaiting approval.</p>
        </div>
      </div>

      <div className="admin-stats">
        {stats.map(([label, value]) => (
          <div className="admin-stat glass" key={label}>
            <span>
              <small>{label}</small>
              <b>{value}</b>
            </span>
          </div>
        ))}
      </div>

      <div className="admin-grid">
        <div className="admin-card glass wide">
          <div className="section-heading">
            <div>
              <p className="eyebrow">APPROVALS</p>
              <h2>Pending sponsor tournaments</h2>
            </div>
            <Clock size={18} />
          </div>
          {pending.length === 0 && <div style={{ padding: 18, color: "var(--muted)" }}>Nothing pending — all caught up.</div>}
          {pending.map((t) => (
            <div className="pending-row" key={t.id}>
              <div>
                <b>{t.title}</b>
                <small>{t.sponsor ? `by ${t.sponsor.name}` : "house"} · {t.description || "no description"}</small>
              </div>
              <div className="pending-actions">
                <button className="primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setStatus.mutate({ id: t.id, action: "approve" })}>
                  <CheckCircle2 size={14} /> Approve
                </button>
                <button className="secondary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setStatus.mutate({ id: t.id, action: "reject" })}>
                  <XCircle size={14} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="admin-card glass">
          <div className="section-heading">
            <div>
              <p className="eyebrow">PARTNERS</p>
              <h2>Sponsors</h2>
            </div>
            <Building2 size={18} />
          </div>
          {(sponsors ?? []).length === 0 && <div style={{ padding: 14, color: "var(--muted)" }}>No sponsors yet.</div>}
          {(sponsors ?? []).map((s) => (
            <div className="sponsor-mini" key={s.id}>
              <span className="sponsor-ava"><Building2 size={15} /></span>
              <span>
                <b>{s.name}</b>
                <small>@{s.username} · {s.tournamentCount} tournaments</small>
              </span>
            </div>
          ))}
          <div className="system-status" style={{ marginTop: 14 }}>
            <p><Users size={14} /> {ov?.totalUsers ?? "—"} total users · <b>{ov?.activeUsers7d ?? "—"} active</b></p>
          </div>
        </div>
      </div>
    </main>
  );
}
