"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Copy, Handshake, Link2, Ticket, XCircle } from "lucide-react";
import {
  usePromoOverview,
  useAdminPromoTournaments,
  useSetPromoStatus,
  useAdminInquiries,
  useSetInquiryStatus,
  useAssignSponsorToInquiry,
  type Inquiry,
} from "../../lib/hooks/useSponsors";

// New admin dashboard: at-a-glance counts, pending sponsor tournaments to approve/reject, and the
// two kinds of incoming requests (sponsorship offers and entry requests) in their own sections.
export default function NewAdminDashboardPage() {
  const { data: ov } = usePromoOverview();
  const { data: promos } = useAdminPromoTournaments();
  const { data: inquiries } = useAdminInquiries();
  const setStatus = useSetPromoStatus();
  const setInquiry = useSetInquiryStatus();
  const [assignFor, setAssignFor] = useState<Inquiry | null>(null);
  const pending = (promos ?? []).filter((t) => t.status === "PENDING");
  const openInquiries = (inquiries ?? []).filter((i) => i.status !== "CLOSED");
  const sponsorshipReqs = openInquiries.filter((i) => i.type === "SPONSORSHIP");
  const entryReqs = openInquiries.filter((i) => i.type === "ENTRY");

  const stats: [string, string | number][] = [
    ["Total users", ov?.totalUsers ?? "—"],
    ["Active (7d)", ov?.activeUsers7d ?? "—"],
    ["New today", ov?.newUsersToday ?? "—"],
    ["Sponsors", ov?.sponsorCount ?? "—"],
    ["Pending approvals", ov?.pendingTournaments ?? "—"],
  ];

  function InquiryRow({ i }: { i: Inquiry }) {
    const sponsorSpecific = i.type === "SPONSORSHIP" && !!i.tournament;
    const desc =
      i.type === "ENTRY"
        ? `Wants to join: ${i.tournament?.title ?? i.tournamentRef ?? "a tournament"}`
        : sponsorSpecific
          ? `Wants to sponsor: ${i.tournament?.title}`
          : "General sponsorship request";
    return (
      <div className="pending-row">
        <div>
          <b>{i.name || i.email}</b>
          <small><b style={{ color: "var(--text)" }}>{desc}</b>{i.tournamentRef ? ` · Ref ${i.tournamentRef}` : ""}</small>
          <small>
            <a href={`mailto:${i.email}`} style={{ color: "var(--gold2)" }}>{i.email}</a>
            {i.sponsor ? ` · sponsor: ${i.sponsor.name}` : ""}
            {" · "}<span className={`promo-status ${i.status === "NEW" ? "pending" : "approved"}`}>{i.status}</span>
          </small>
          {i.message && <small style={{ color: "var(--muted)" }}>“{i.message}”</small>}
        </div>
        <div className="pending-actions">
          {sponsorSpecific && !i.sponsor && (
            <button className="mini primary" onClick={() => setAssignFor(i)}>
              <Link2 size={13} /> Assign sponsor
            </button>
          )}
          {i.status === "NEW" && (
            <button className="mini secondary" onClick={() => setInquiry.mutate({ id: i.id, status: "CONTACTED" })}>
              <CheckCircle2 size={13} /> Mark contacted
            </button>
          )}
          <button className="mini secondary" onClick={() => setInquiry.mutate({ id: i.id, status: "CLOSED" })}>
            <XCircle size={13} /> Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="admin-main">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">NEW DASHBOARD</p>
          <h1>Overview</h1>
          <p>Tournaments awaiting approval, plus sponsorship and entry requests.</p>
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

      {/* Sponsorship requests — people offering to sponsor a tournament. */}
      <div className="admin-card glass wide" style={{ marginTop: 18 }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">REQUESTS</p>
            <h2>Sponsorship requests</h2>
          </div>
          <Handshake size={18} />
        </div>
        {sponsorshipReqs.length === 0 && <div className="empty-line">No open sponsorship requests.</div>}
        {sponsorshipReqs.map((i) => <InquiryRow key={i.id} i={i} />)}
      </div>

      {/* Entry requests — players asking to join a tournament. */}
      <div className="admin-card glass wide" style={{ marginTop: 18 }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">REQUESTS</p>
            <h2>Entry requests</h2>
          </div>
          <Ticket size={18} />
        </div>
        {entryReqs.length === 0 && <div className="empty-line">No open entry requests.</div>}
        {entryReqs.map((i) => <InquiryRow key={i.id} i={i} />)}
      </div>

      {assignFor && <AssignSponsorModal inquiry={assignFor} onClose={() => setAssignFor(null)} />}
    </main>
  );
}

// Create a sponsor account and attach this request's tournament to it (auto-appears in that
// sponsor's dashboard). Reveals the login once so the admin can hand it over.
function AssignSponsorModal({ inquiry, onClose }: { inquiry: Inquiry; onClose: () => void }) {
  const assign = useAssignSponsorToInquiry();
  const [form, setForm] = useState({ name: inquiry.name ?? "", username: "", password: "" });
  const [creds, setCreds] = useState<{ username: string; password: string } | null>(null);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    try {
      const res = await assign.mutateAsync({
        id: inquiry.id,
        name: form.name.trim() || undefined,
        username: form.username.trim() || undefined,
        password: form.password.trim() || undefined,
      });
      if (res.credentials) setCreds(res.credentials);
      else onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign");
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        {creds ? (
          <>
            <h2 style={{ marginTop: 0 }}>Sponsor assigned ✓</h2>
            <p className="muted">“{inquiry.tournament?.title}” is now attached to the new sponsor and will appear in their dashboard. Share this login with them — the password won&apos;t be shown again.</p>
            <div className="cred-box">
              <div className="cred-row"><small>USERNAME</small><span><code>{creds.username}</code><button className="icon-button" onClick={() => navigator.clipboard?.writeText(creds.username)} aria-label="Copy"><Copy size={14} /></button></span></div>
              <div className="cred-row"><small>PASSWORD</small><span><code>{creds.password}</code><button className="icon-button" onClick={() => navigator.clipboard?.writeText(creds.password)} aria-label="Copy"><Copy size={14} /></button></span></div>
            </div>
            <button className="primary full" style={{ marginTop: 16 }} onClick={onClose}>Done</button>
          </>
        ) : (
          <>
            <h2 style={{ marginTop: 0 }}>Assign a sponsor</h2>
            <p className="muted">For: <b>{inquiry.tournament?.title}</b> — requested by {inquiry.name || inquiry.email}. Create the sponsor account; the tournament attaches to it automatically.</p>
            <div className="promo-form-grid">
              <label className="pf-full"><span>Sponsor name</span><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Neon Corp" /></label>
              <label className="pf-field"><span>Username (optional)</span><input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="auto if blank" /></label>
              <label className="pf-field"><span>Password (optional)</span><input value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="auto if blank" /></label>
            </div>
            {error && <div className="sponsor-auth-err" style={{ marginTop: 8 }}>{error}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="secondary" onClick={onClose}>Cancel</button>
              <button className="primary" onClick={submit} disabled={assign.isPending}>{assign.isPending ? "Assigning…" : "Create & attach"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
