"use client";

import { useState } from "react";
import { Building2, Copy, KeyRound, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useSponsors, useCreateSponsor, useRegenerateSponsor, useDeleteSponsor } from "../../../../lib/hooks/useSponsors";

// Sponsor management: create sponsor accounts (generated username + password shown once), and
// regenerate a sponsor's password anytime. Passwords are stored hashed — the plaintext is only ever
// shown here at generation/regeneration, never stored in the clear.
export default function SponsorAdminPage() {
  const { data: sponsors } = useSponsors();
  const create = useCreateSponsor();
  const regen = useRegenerateSponsor();
  const del = useDeleteSponsor();
  const [name, setName] = useState("");
  // The one-time credential reveal after create/regenerate: { name, username, password }.
  const [reveal, setReveal] = useState<{ name: string; username?: string; password: string } | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const res = await create.mutateAsync(n);
    setReveal({ name: res.name, username: res.username, password: res.password });
    setName("");
  }
  async function onRegen(id: string, sponsorName: string) {
    const res = await regen.mutateAsync(id);
    setReveal({ name: sponsorName, password: res.password });
  }

  return (
    <main className="admin-main">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">NEW DASHBOARD</p>
          <h1>Sponsors</h1>
          <p>Create sponsor accounts and manage their sign-in credentials.</p>
        </div>
        <form onSubmit={onCreate} className="sponsor-create">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sponsor name (e.g. Victory Ark)" />
          <button className="primary" type="submit" disabled={create.isPending || !name.trim()}>
            <Plus size={17} /> {create.isPending ? "Creating…" : "Create sponsor"}
          </button>
        </form>
      </div>

      <p className="sponsor-note">
        <ShieldCheck size={15} /> Passwords are stored securely (hashed). The plaintext is shown only once here — copy it now. You can regenerate a new password anytime.
      </p>

      <div className="admin-card glass wide">
        <div className="admin-table sponsor-table">
          <div className="tr th">
            <span>Sponsor</span>
            <span>Username</span>
            <span>Tournaments</span>
            <span>Actions</span>
          </div>
          {(sponsors ?? []).length === 0 && <div style={{ padding: 24, color: "var(--muted)" }}>No sponsors yet — create one above.</div>}
          {(sponsors ?? []).map((s) => (
            <div className="tr" key={s.id}>
              <span>
                <span className="sponsor-ava"><Building2 size={16} /></span>
                <b>{s.name}</b>
              </span>
              <span><code className="sponsor-user">{s.username}</code></span>
              <span>{s.tournamentCount}</span>
              <span style={{ display: "flex", gap: 8 }}>
                <button className="secondary" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => onRegen(s.id, s.name)} disabled={regen.isPending}>
                  <KeyRound size={13} /> Regenerate
                </button>
                <button className="icon-button" style={{ width: 34, height: 34 }} onClick={() => { if (confirm(`Delete sponsor "${s.name}"?`)) del.mutate(s.id); }} aria-label="Delete">
                  <Trash2 size={15} />
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {reveal && (
        <div className="modal-overlay" onClick={() => setReveal(null)}>
          <div className="modal-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Sponsor credentials</h2>
            <p className="muted">Copy these now — the password won&apos;t be shown again.</p>
            <div className="cred-box">
              {reveal.username && (
                <div className="cred-row">
                  <small>USERNAME</small>
                  <span><code>{reveal.username}</code><button className="icon-button" onClick={() => navigator.clipboard?.writeText(reveal.username!)} aria-label="Copy username"><Copy size={14} /></button></span>
                </div>
              )}
              <div className="cred-row">
                <small>PASSWORD</small>
                <span><code>{reveal.password}</code><button className="icon-button" onClick={() => navigator.clipboard?.writeText(reveal.password)} aria-label="Copy password"><Copy size={14} /></button></span>
              </div>
            </div>
            <button className="primary full" style={{ marginTop: 18 }} onClick={() => setReveal(null)}>Done</button>
          </div>
        </div>
      )}
    </main>
  );
}
