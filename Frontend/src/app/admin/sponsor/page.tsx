"use client";

import React, { useState } from "react";
import {
  Building2,
  Copy,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Check,
  Lock,
  User,
  Sparkles,
} from "lucide-react";
import {
  useSponsors,
  useCreateSponsor,
  useUpdateSponsor,
  useDeleteSponsor,
  type SponsorRow,
} from "../../../lib/hooks/useSponsors";
import { soundManager } from "../../../lib/soundManager";

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
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    soundManager.playClick();
    setError("");
    if (!form.name.trim()) return;
    if (form.password.trim() && form.password.trim().length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    try {
      const res = await create.mutateAsync({
        name: form.name.trim(),
        username: form.username.trim() || undefined,
        password: form.password.trim() || undefined,
      });
      soundManager.playVictory();
      setReveal({ name: res.name, username: res.username, password: res.password });
      setForm({ name: "", username: "", password: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create sponsor");
    }
  }

  function copyPassword(id: string, text: string) {
    soundManager.playClick();
    navigator.clipboard?.writeText(text);
    setCopiedMap((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => setCopiedMap((prev) => ({ ...prev, [id]: false })), 1500);
  }

  return (
    <div className="flex flex-col gap-6 select-none font-sans">
      {/* Page Heading Marquee */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#18281e]/90 via-[#0e1a13]/95 to-[#060c08] border-2 border-amber-400/60 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-title font-black text-purple-400 tracking-widest uppercase">
            <Building2 size={13} />
            <span>PARTNER MANAGEMENT</span>
          </div>
          <h1 className="font-title font-black text-2xl sm:text-3xl text-white tracking-wide mt-0.5">
            Sponsor Accounts & Credentials
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create sponsor brand accounts, issue credentials, and manage sponsor status.
          </p>
        </div>

        <span className="px-3.5 py-1.5 rounded-xl bg-black/60 border border-purple-400/40 text-purple-300 font-title font-bold text-xs">
          {(sponsors ?? []).length} Registered Sponsor(s)
        </span>
      </div>

      {/* New Sponsor Account Creator Console */}
      <div className="rounded-3xl bg-gradient-to-b from-[#18281e]/98 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/70 p-6 sm:p-8 shadow-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
          <div>
            <span className="text-[10px] font-title font-bold text-amber-400 uppercase tracking-widest">
              ONBOARDING CONSOLE
            </span>
            <h2 className="font-title font-black text-xl text-white">
              Create New Sponsor Account
            </h2>
          </div>
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400 flex items-center justify-center text-purple-300">
            <Plus size={16} />
          </div>
        </div>

        <form onSubmit={onCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-title font-bold text-slate-300">Sponsor Brand Name</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Apex Energy"
              className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none transition-colors"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-title font-bold text-slate-300">Username (optional)</span>
            <input
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              placeholder="auto-generated if blank"
              className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none transition-colors"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-title font-bold text-slate-300">Password (optional)</span>
            <input
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="auto-generated if blank (min 6)"
              className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none transition-colors"
            />
          </label>

          {error && <p className="sm:col-span-3 text-xs text-rose-400 font-bold">{error}</p>}

          <div className="sm:col-span-3 pt-1">
            <button
              type="submit"
              disabled={create.isPending || !form.name.trim()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 text-white font-title font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(168,85,247,0.6)] hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              <span>{create.isPending ? "CREATING..." : "CREATE SPONSOR ACCOUNT"}</span>
            </button>
          </div>
        </form>

        <div className="flex items-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-900">
          <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
          <span>Passwords are encrypted at rest with secret-box AES, viewable and editable by administrators anytime.</span>
        </div>
      </div>

      {/* Sponsors Credentials Vault Table */}
      <div className="rounded-3xl bg-gradient-to-b from-[#18281e]/98 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/70 p-6 sm:p-8 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
          <div>
            <span className="text-[10px] font-title font-bold text-amber-400 uppercase tracking-widest">
              CREDENTIAL VAULT
            </span>
            <h2 className="font-title font-black text-xl text-white">
              Sponsor Accounts & Keys
            </h2>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300">
            <Building2 size={16} />
          </div>
        </div>

        {(sponsors ?? []).length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-title font-bold text-xs">
            No sponsors in database. Create one above!
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {(sponsors ?? []).map((s) => (
              <div
                key={s.id}
                className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-purple-400/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400 flex items-center justify-center text-purple-300 font-title font-black text-base shadow">
                    <Building2 size={20} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-title font-black text-base text-white truncate">
                      {s.name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 text-xs">
                      <span className="text-slate-400">Username:</span>
                      <code className="text-amber-300 font-mono bg-black/80 px-2 py-0.5 rounded border border-slate-800">
                        {s.username}
                      </code>
                    </div>
                  </div>
                </div>

                {/* Password Box */}
                <div className="flex items-center gap-2 bg-black/80 px-3 py-2 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-title font-bold text-slate-400">Password:</span>
                  {s.password ? (
                    <>
                      <code className="text-xs text-emerald-400 font-mono">
                        {shown[s.id] ? s.password : "••••••••••••"}
                      </code>
                      <button
                        onClick={() => {
                          soundManager.playClick();
                          setShown((m) => ({ ...m, [s.id]: !m[s.id] }));
                        }}
                        className="p-1 rounded text-slate-400 hover:text-white"
                        title={shown[s.id] ? "Hide password" : "Show password"}
                      >
                        {shown[s.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={() => copyPassword(s.id, s.password)}
                        className="p-1 rounded text-slate-400 hover:text-white"
                        title="Copy password"
                      >
                        {copiedMap[s.id] ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-slate-500 italic">Set via Edit</span>
                  )}
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-title font-black uppercase ${
                    s.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  }`}>
                    {s.status}
                  </span>

                  <button
                    onClick={() => {
                      soundManager.playClick();
                      setEditing(s);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-title font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Pencil size={13} />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => {
                      soundManager.playClick();
                      del.mutate(s.id);
                    }}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                    title="Delete sponsor"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reveal Credentials Modal */}
      {reveal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-gradient-to-b from-[#18281e] via-[#0d1811] to-[#050a07] border-2 border-amber-400 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300">
              <Check size={24} />
            </div>
            <div>
              <h2 className="font-title font-black text-xl text-white">Sponsor Account Created ✓</h2>
              <p className="text-xs text-slate-300 mt-1">
                Copy credentials to share with the sponsor representative:
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/80 border border-amber-500/40 flex flex-col gap-3">
              {reveal.username && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-title font-bold text-slate-400">USERNAME</span>
                  <code className="text-xs text-amber-300 font-mono">{reveal.username}</code>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-title font-bold text-slate-400">PASSWORD</span>
                <code className="text-xs text-emerald-400 font-mono">{reveal.password}</code>
              </div>
            </div>

            <button
              onClick={() => setReveal(null)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-title font-black text-sm uppercase shadow hover:brightness-110"
            >
              DONE
            </button>
          </div>
        </div>
      )}

      {/* Edit Sponsor Modal */}
      {editing && (
        <EditSponsorModal
          sponsor={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => update.mutateAsync({ id: editing.id, ...patch })}
          saving={update.isPending}
        />
      )}
    </div>
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
  onSave: (patch: { name?: string; username?: string; password?: string; status?: string }) => Promise<unknown>;
  saving: boolean;
}) {
  const [name, setName] = useState(sponsor.name);
  const [username, setUsername] = useState(sponsor.username);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(sponsor.status);
  const [error, setError] = useState("");

  async function submit() {
    soundManager.playClick();
    setError("");
    const pw = password.trim();
    if (pw && pw.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!name.trim()) {
      setError("Name cannot be empty.");
      return;
    }
    try {
      await onSave({ name: name.trim(), username: username.trim(), password: pw || undefined, status });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#18281e] via-[#0d1811] to-[#050a07] border-2 border-amber-400 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-4">
        <div>
          <h2 className="font-title font-black text-xl text-white">Edit Sponsor Details</h2>
          <p className="text-xs text-slate-400 mt-0.5">Update name, credentials, or ban/active status.</p>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-title font-bold text-slate-300">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2 px-3 text-sm text-white outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-title font-bold text-slate-300">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2 px-3 text-sm text-white outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-title font-bold text-slate-300">New Password (leave blank to keep)</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2 px-3 text-sm text-white outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-title font-bold text-slate-300">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2 px-3 text-xs text-white outline-none"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="BANNED">BANNED</option>
            </select>
          </label>
        </div>

        {error && <p className="text-xs text-rose-400 font-bold">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl bg-black/60 border border-slate-700 text-slate-300 font-title font-bold text-xs"
          >
            CANCEL
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-title font-black text-xs uppercase shadow hover:brightness-110"
          >
            {saving ? "SAVING..." : "SAVE CHANGES"}
          </button>
        </div>
      </div>
    </div>
  );
}
