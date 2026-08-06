"use client";

import { useState } from "react";
import { Building2, Copy, Eye, EyeOff, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import {
  useSponsors,
  useCreateSponsor,
  useUpdateSponsor,
  useDeleteSponsor,
  type SponsorRow,
} from "../../../lib/hooks/useSponsors";

// Sponsor management: create accounts (admin can set a custom username + password, or leave blank to
// auto-generate), and view/edit any sponsor's credentials — including the password — at any time.
export default function SponsorAdminPage() {
  const { data: sponsors } = useSponsors();
  const create = useCreateSponsor();
  const update = useUpdateSponsor();
  const del = useDeleteSponsor();

  const [form, setForm] = useState({ name: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [reveal, setReveal] = useState<{ name: string; username?: string; password: string } | null>(null);
  const [editing, setEditing] = useState<SponsorRow | null>(null);
  const [shown, setShown] = useState<Record<string, boolean>>({});

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return;
    try {
      const res = await create.mutateAsync({
        name: form.name.trim(),
        username: form.username.trim() || undefined,
        password: form.password.trim() || undefined,
      });
      setReveal({ name: res.name, username: res.username, password: res.password });
      setForm({ name: "", username: "", password: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create sponsor");
    }
  }

  return (
    <main className="admin-main">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">ADMIN</p>
          <h1>Sponsors</h1>
          <p>Create sponsor accounts and manage their sign-in credentials.</p>
        </div>
      </div>

      <div className="admin-card glass wide">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CREATE</p>
            <h2>New sponsor</h2>
          </div>
        </div>
        <form onSubmit={onCreate} className="promo-form-grid">
          <label className="pf-field">
            <span>Sponsor name</span>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Victory Ark" />
          </label>
          <label className="pf-field">
            <span>Username (optional)</span>
            <input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="auto-generated if blank" />
          </label>
          <label className="pf-field">
            <span>Password (optional)</span>
            <input value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="auto-generated if blank (min 6)" />
          </label>
          {error && <div className="pf-full sponsor-auth-err">{error}</div>}
          <div className="pf-full pf-actions">
            <button className="primary" type="submit" disabled={create.isPending || !form.name.trim()}>
              <Plus size={16} /> {create.isPending ? "Creating…" : "Create sponsor"}
            </button>
          </div>
        </form>
      </div>

      <p className="sponsor-note">
        <ShieldCheck size={15} /> Passwords are encrypted at rest but visible to you here, and you can change any credential anytime via Edit.
      </p>

      <div className="admin-card glass wide">
        <div className="admin-table sponsor-table">
          <div className="tr th">
            <span>Sponsor</span>
            <span>Username</span>
            <span>Password</span>
            <span>Status</span>
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
              <span className="pw-cell">
                {s.password ? (
                  <>
                    <code>{shown[s.id] ? s.password : "••••••••"}</code>
                    <button className="icon-button sm" onClick={() => setShown((m) => ({ ...m, [s.id]: !m[s.id] }))} aria-label={shown[s.id] ? "Hide" : "Show"}>
                      {shown[s.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button className="icon-button sm" onClick={() => navigator.clipboard?.writeText(s.password)} aria-label="Copy password"><Copy size={13} /></button>
                  </>
                ) : (
                  <small style={{ color: "var(--muted)" }}>— set via Edit</small>
                )}
              </span>
              <span><span className={`promo-status ${s.status === "ACTIVE" ? "approved" : "rejected"}`}>{s.status}</span></span>
              <span className="row-actions">
                <button className="mini secondary" onClick={() => { setEditing(s); setError(""); }}>
                  <Pencil size={12} /> Edit
                </button>
                <button className="icon-button" style={{ width: 32, height: 32 }} onClick={() => { if (confirm(`Delete sponsor "${s.name}"?`)) del.mutate(s.id); }} aria-label="Delete">
                  <Trash2 size={14} />
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

      {editing && (
        <EditSponsorModal
          sponsor={editing}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            setError("");
            try {
              await update.mutateAsync({ id: editing.id, ...patch });
              setEditing(null);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not save");
            }
          }}
          saving={update.isPending}
        />
      )}
    </main>
  );
}

function EditSponsorModal({
  sponsor,
  onClose,
  onSave,
  saving,
}: {
  sponsor: SponsorRow;
  onClose: () => void;
  onSave: (patch: { name?: string; username?: string; password?: string; status?: string }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState(sponsor.name);
  const [username, setUsername] = useState(sponsor.username);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(sponsor.status);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Edit sponsor</h2>
        <div className="promo-form-grid">
          <label className="pf-full">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="pf-full">
            <span>Username</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label className="pf-full">
            <span>New password (leave blank to keep)</span>
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </label>
          <label className="pf-field">
            <span>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="BANNED">BANNED</option>
            </select>
          </label>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button className="secondary" onClick={onClose}>Cancel</button>
          <button
            className="primary"
            disabled={saving}
            onClick={() =>
              onSave({
                name: name.trim(),
                username: username.trim(),
                password: password.trim() || undefined,
                status,
              })
            }
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
