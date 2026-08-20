"use client";

import { useState } from "react";
import { CheckCircle2, Copy, Lock, Pencil, Plus, Trash2, Trophy, Unlock, X, XCircle } from "lucide-react";
import {
  useAdminPromoTournaments,
  useCreatePromo,
  useUpdatePromo,
  useDeletePromo,
  useSetPromoStatus,
  useSponsors,
  type PromoTournament,
  type Visibility,
} from "../../../lib/hooks/useSponsors";

interface FormState {
  title: string;
  description: string;
  visibility: Visibility;
  startAt: string;
  endAt: string;
  prizePool: string;
  winnerCount: string;
  minPlayers: string;
  maxPlayers: string;
  seekingSponsor: boolean;
  sponsorId: string;
}
const EMPTY: FormState = {
  title: "",
  description: "",
  visibility: "PUBLIC",
  startAt: "",
  endAt: "",
  prizePool: "",
  winnerCount: "1",
  minPlayers: "",
  maxPlayers: "",
  seekingSponsor: false,
  sponsorId: "",
};

// ISO -> value for <input type="datetime-local"> (local time, minutes precision).
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function TournamentAdminPage() {
  const { data: promos } = useAdminPromoTournaments();
  const { data: sponsors } = useSponsors();
  const create = useCreatePromo();
  const update = useUpdatePromo();
  const del = useDeletePromo();
  const setStatus = useSetPromoStatus();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function startEdit(t: PromoTournament) {
    setEditingId(t.id);
    setForm({
      title: t.title,
      description: t.description,
      visibility: t.visibility,
      startAt: toLocalInput(t.startAt),
      endAt: toLocalInput(t.endAt),
      prizePool: t.prizePool,
      winnerCount: String(t.winnerCount),
      minPlayers: t.minPlayers != null ? String(t.minPlayers) : "",
      maxPlayers: t.maxPlayers != null ? String(t.maxPlayers) : "",
      seekingSponsor: t.seekingSponsor,
      sponsorId: t.sponsor?.id ?? "",
    });
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setError("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) return;
    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      visibility: form.visibility,
      startAt: form.startAt || null,
      endAt: form.endAt || null,
      prizePool: form.prizePool.trim(),
      winnerCount: Number(form.winnerCount) || 1,
      minPlayers: form.minPlayers === "" ? null : Number(form.minPlayers),
      maxPlayers: form.maxPlayers === "" ? null : Number(form.maxPlayers),
      seekingSponsor: form.visibility === "PRIVATE" ? form.seekingSponsor : false,
      // Private tournaments are claimed by a sponsor via code, so no direct assignment there.
      sponsorId: form.visibility === "PRIVATE" ? null : form.sponsorId || null,
    };
    try {
      if (editingId) await update.mutateAsync({ id: editingId, ...body });
      else await create.mutateAsync(body);
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  const busy = create.isPending || update.isPending;

  return (
    <main className="admin-main">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">ADMIN</p>
          <h1>Tournaments</h1>
          <p>Create public or private tournaments, set prizes and start times, and manage sponsor submissions.</p>
        </div>
      </div>

      {/* Create / edit form */}
      <div className="admin-card glass wide">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{editingId ? "EDIT" : "CREATE"}</p>
            <h2>{editingId ? "Edit tournament" : "New tournament"}</h2>
          </div>
          {editingId && (
            <button className="text-button" onClick={cancelEdit}>
              <X size={15} /> Cancel edit
            </button>
          )}
        </div>

        <form onSubmit={onSubmit} className="promo-form-grid">
          <label className="pf-full">
            <span>Tournament name</span>
            <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Summer Grand Slam" />
          </label>

          <label className="pf-full">
            <span>Description</span>
            <input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Short description (optional)" />
          </label>

          <div className="pf-field">
            <span>Type</span>
            <div className="seg">
              <button type="button" className={form.visibility === "PUBLIC" ? "on" : ""} onClick={() => set("visibility", "PUBLIC")}>
                <Unlock size={14} /> Public
              </button>
              <button type="button" className={form.visibility === "PRIVATE" ? "on" : ""} onClick={() => set("visibility", "PRIVATE")}>
                <Lock size={14} /> Private
              </button>
            </div>
          </div>

          {form.visibility === "PUBLIC" ? (
            <label className="pf-field">
              <span>Sponsor (optional)</span>
              <select value={form.sponsorId} onChange={(e) => set("sponsorId", e.target.value)}>
                <option value="">House (no sponsor)</option>
                {(sponsors ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
          ) : (
            <div className="pf-field">
              <span>Sponsor</span>
              <p className="pf-note">A sponsor claims this privately with the sponsor code generated on save.</p>
            </div>
          )}

          <label className="pf-field">
            <span>Starts at (entry closes at start)</span>
            <input type="datetime-local" value={form.startAt} onChange={(e) => set("startAt", e.target.value)} />
          </label>
          <label className="pf-field">
            <span>Ends at (optional)</span>
            <input type="datetime-local" value={form.endAt} onChange={(e) => set("endAt", e.target.value)} />
          </label>

          <label className="pf-field">
            <span>Prize {form.visibility === "PRIVATE" ? "(optional — set later)" : ""}</span>
            <input value={form.prizePool} onChange={(e) => set("prizePool", e.target.value)} placeholder="e.g. 5,000 USDT" />
          </label>
          <label className="pf-field">
            <span>Number of winners</span>
            <input type="number" min={1} value={form.winnerCount} onChange={(e) => set("winnerCount", e.target.value)} />
          </label>

          <label className="pf-field">
            <span>Min players</span>
            <input type="number" min={0} value={form.minPlayers} onChange={(e) => set("minPlayers", e.target.value)} placeholder="e.g. 50" />
          </label>
          <label className="pf-field">
            <span>Max players</span>
            <input type="number" min={0} value={form.maxPlayers} onChange={(e) => set("maxPlayers", e.target.value)} placeholder="e.g. 200" />
          </label>

          {form.visibility === "PRIVATE" && (
            <label className="pf-full pf-check">
              <input type="checkbox" checked={form.seekingSponsor} onChange={(e) => set("seekingSponsor", e.target.checked)} />
              <span>List on the public Sponsorship page as an opportunity (until a sponsor is assigned)</span>
            </label>
          )}

          {error && <div className="pf-full sponsor-auth-err">{error}</div>}

          <div className="pf-full pf-actions">
            <button className="primary" type="submit" disabled={busy || !form.title.trim()}>
              {editingId ? <><Pencil size={15} /> Save changes</> : <><Plus size={16} /> Create tournament</>}
            </button>
          </div>
        </form>
      </div>

      {/* Existing tournaments */}
      <div className="admin-card glass wide" style={{ marginTop: 18 }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">ALL TOURNAMENTS</p>
            <h2>{(promos ?? []).length} total</h2>
          </div>
          <Trophy size={18} />
        </div>

        {(promos ?? []).length === 0 && <div className="empty-line">No tournaments yet — create one above.</div>}

        {(promos ?? []).map((t) => (
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
                <span>{t.sponsor ? `Sponsor: ${t.sponsor.name}` : t.seekingSponsor ? "Seeking sponsor" : "House"}</span>
                <span>Prize: {t.prizePool || "—"}</span>
                <span>Winners: {t.winnerCount}</span>
                {(t.minPlayers != null || t.maxPlayers != null) && (
                  <span>Players: {t.minPlayers ?? "?"}–{t.maxPlayers ?? "?"}</span>
                )}
                <span>Starts: {fmtDate(t.startAt)}</span>
                <span>{t.entryCount} joined</span>
              </div>
              {t.visibility === "PRIVATE" && (
                <div className="code-chips">
                  <button className="code-chip" onClick={() => copy(t.sponsorCode ?? "", `s-${t.id}`)} title="Copy sponsor code">
                    Sponsor: <code>{t.sponsorCode}</code> <Copy size={12} /> {copied === `s-${t.id}` && <em>copied</em>}
                  </button>
                  <button className="code-chip" onClick={() => copy(t.joinCode ?? "", `j-${t.id}`)} title="Copy user join code">
                    Join: <code>{t.joinCode}</code> <Copy size={12} /> {copied === `j-${t.id}` && <em>copied</em>}
                  </button>
                </div>
              )}
            </div>
            <div className="tourn-actions">
              {t.status === "PENDING" && (
                <>
                  <button className="mini primary" onClick={() => setStatus.mutate({ id: t.id, action: "approve" })}>
                    <CheckCircle2 size={13} /> Approve
                  </button>
                  <button className="mini secondary" onClick={() => setStatus.mutate({ id: t.id, action: "reject" })}>
                    <XCircle size={13} /> Reject
                  </button>
                </>
              )}
              <button className="mini secondary" onClick={() => startEdit(t)}>
                <Pencil size={13} /> Edit
              </button>
              <button
                className="mini danger"
                onClick={() => {
                  if (confirm(`Delete "${t.title}"? This cannot be undone.`)) del.mutate(t.id);
                }}
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
