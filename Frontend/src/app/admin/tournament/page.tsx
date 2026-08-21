"use client";

import { useMemo, useState } from "react";
import { Building2, CheckCircle2, Copy, Clock, Crown, Lock, Pencil, Plus, Trash2, Trophy, Unlock, Users, X, XCircle } from "lucide-react";
import {
  useAdminPromoTournaments,
  useCreatePromo,
  useUpdatePromo,
  useDeletePromo,
  useSetPromoStatus,
  useSponsors,
  type PromoTournament,
  type PromoType,
  type Visibility,
} from "../../../lib/hooks/useSponsors";
import { ConfirmDialog } from "../../../components/dune/ConfirmDialog";

// Distinct team colours — mirrors the backend palette (blue, red, green, gold, purple, teal).
const TEAM_COLORS = ["#5aa8ff", "#ff6b7f", "#5be348", "#f4b942", "#b48cff", "#38e0d0"];
const MAX_GROUPS = TEAM_COLORS.length;
const QUICK_SLOTS = ["12:00", "15:00", "18:00", "20:00", "22:00"];

interface TeamForm {
  name: string;
  captainName: string;
}
interface FormState {
  title: string;
  description: string;
  visibility: Visibility;
  startDate: string; // GMT calendar date "YYYY-MM-DD"
  timeOptions: string[]; // GMT "HH:MM" slots users vote among
  prizePool: string;
  winnerCount: string;
  minPlayers: string;
  maxPlayers: string;
  sponsorMode: "WITH" | "WITHOUT"; // with a sponsor, or a house (no-sponsor) tournament
  sponsorId: string; // when WITH: a chosen sponsor, or "" = assign later (needs a sponsor)
  // Whether named influencer-captains are featured. Available in both types (like the sponsor toggle).
  hasInfluencers: boolean;
  // Group setup (and influencer setup for Regular+influencers)
  groupCount: number;
  teams: TeamForm[];
  minGroupPlayers: string;
  maxGroupPlayers: string;
}
const EMPTY: FormState = {
  title: "",
  description: "",
  visibility: "PUBLIC",
  startDate: "",
  timeOptions: [],
  prizePool: "",
  winnerCount: "1",
  minPlayers: "",
  maxPlayers: "",
  sponsorMode: "WITHOUT",
  sponsorId: "",
  hasInfluencers: false,
  groupCount: 2,
  teams: [
    { name: "", captainName: "" },
    { name: "", captainName: "" },
  ],
  minGroupPlayers: "",
  maxGroupPlayers: "",
};

// ISO -> value for <input type="date"> (GMT calendar date stored as midnight UTC).
function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}
function fmtGmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString([], { dateStyle: "medium", timeZone: "UTC" }) + " (GMT)";
}
function resizeTeams(teams: TeamForm[], n: number): TeamForm[] {
  const out = teams.slice(0, n);
  while (out.length < n) out.push({ name: "", captainName: "" });
  return out;
}

export default function TournamentAdminPage() {
  const { data: promos } = useAdminPromoTournaments();
  const { data: sponsors } = useSponsors();
  const create = useCreatePromo();
  const update = useUpdatePromo();
  const del = useDeletePromo();
  const setStatus = useSetPromoStatus();

  // The active section IS the tournament type being created/edited.
  const [section, setSection] = useState<PromoType>("REGULAR");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [slotDraft, setSlotDraft] = useState("");
  const [slotHint, setSlotHint] = useState("");
  const [confirmDel, setConfirmDel] = useState<PromoTournament | null>(null);
  const [createdCodes, setCreatedCodes] = useState<{ title: string; hasInfluencers: boolean; teams: { name: string; captainName: string; captainCode: string; memberCode: string }[] } | null>(null);

  // The INFLUENCER type is now surfaced as the "Group" tournament. `hasInfluencers` is an
  // independent toggle (available in both types) for whether named influencer-captains are featured.
  const isGroup = section === "INFLUENCER";
  const showCaptains = form.hasInfluencers; // captain/influencer name fields + captain codes
  const wantsTeams = isGroup || form.hasInfluencers; // group setup, or featured influencers on a Regular

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function setTeam(i: number, patch: Partial<TeamForm>) {
    setForm((f) => {
      const teams = f.teams.map((t, idx) => (idx === i ? { ...t, ...patch } : t));
      return { ...f, teams };
    });
  }
  function setGroupCount(n: number) {
    // A Group tournament needs at least 2 groups; a Regular tournament that merely features
    // influencers can have as few as 1 (it stays a plain, group-less knockout).
    const minTeams = section === "INFLUENCER" ? 2 : 1;
    const clamped = Math.max(minTeams, Math.min(MAX_GROUPS, n));
    setForm((f) => ({ ...f, groupCount: clamped, teams: resizeTeams(f.teams, clamped) }));
  }
  function setHasInfluencers(v: boolean) {
    // Turning influencers ON for a Regular tournament defaults to a single influencer (no groups).
    setForm((f) => (v && section === "REGULAR" ? { ...f, hasInfluencers: true, groupCount: 1, teams: resizeTeams(f.teams, 1) } : { ...f, hasInfluencers: v }));
  }
  function addSlot(value?: string) {
    const v = (value ?? slotDraft).trim();
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(v)) {
      setSlotHint("Pick a valid time (HH:MM) first.");
      return;
    }
    setForm((f) => (f.timeOptions.includes(v) ? f : { ...f, timeOptions: [...f.timeOptions, v].sort() }));
    setSlotDraft("");
    setSlotHint("");
  }
  function removeSlot(s: string) {
    set("timeOptions", form.timeOptions.filter((x) => x !== s));
  }

  // Switching sections while creating resets the form to that section's defaults.
  function switchSection(next: PromoType) {
    if (next === section) return;
    setSection(next);
    if (!editingId) {
      setForm(EMPTY);
      setSlotDraft("");
      setSlotHint("");
    }
  }

  function startEdit(t: PromoTournament) {
    setSection(t.type);
    setEditingId(t.id);
    const gc = Math.max(2, Math.min(MAX_GROUPS, t.groupCount || 2));
    setForm({
      title: t.title,
      description: t.description,
      visibility: t.visibility,
      startDate: toDateInput(t.startDate),
      timeOptions: [...(t.timeOptions ?? [])],
      prizePool: t.prizePool,
      winnerCount: String(t.winnerCount),
      minPlayers: t.minPlayers != null ? String(t.minPlayers) : "",
      maxPlayers: t.maxPlayers != null ? String(t.maxPlayers) : "",
      sponsorMode: t.sponsor || t.seekingSponsor ? "WITH" : "WITHOUT",
      sponsorId: t.sponsor?.id ?? "",
      hasInfluencers: t.hasInfluencers,
      groupCount: gc,
      teams: resizeTeams(
        (t.teams ?? []).map((tm) => ({ name: tm.name, captainName: tm.captainName })),
        gc,
      ),
      minGroupPlayers: t.minGroupPlayers != null ? String(t.minGroupPlayers) : "",
      maxGroupPlayers: t.maxGroupPlayers != null ? String(t.maxGroupPlayers) : "",
    });
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setSlotDraft("");
    setSlotHint("");
    setError("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) return;
    // When influencers are featured, every entry needs a captain/influencer name. Group names are
    // required for a Group tournament; for a Regular+influencers tournament the "team name" is optional.
    if (showCaptains && form.teams.some((t) => !t.captainName.trim())) {
      setError("Every influencer needs a name.");
      return;
    }
    if (isGroup && form.teams.some((t) => !t.name.trim())) {
      setError("Every group needs a name.");
      return;
    }
    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      visibility: form.visibility,
      type: section,
      hasInfluencers: form.hasInfluencers,
      startDate: form.startDate || null,
      timeOptions: form.timeOptions,
      prizePool: form.prizePool.trim(),
      winnerCount: isGroup ? 1 : Number(form.winnerCount) || 1,
      minPlayers: form.minPlayers === "" ? null : Number(form.minPlayers),
      maxPlayers: form.maxPlayers === "" ? null : Number(form.maxPlayers),
      // With sponsor + a chosen sponsor → attach it. With sponsor + none chosen → seeking (needs a
      // sponsor, shown with an indicator). Without sponsor → house.
      sponsorId: form.sponsorMode === "WITH" ? form.sponsorId || null : null,
      seekingSponsor: form.sponsorMode === "WITH" && !form.sponsorId,
      // Teams exist for any Group tournament, and for a Regular one that features influencers.
      ...(wantsTeams
        ? {
            groupCount: form.groupCount,
            teams: form.teams.map((t) => ({ name: t.name.trim(), captainName: t.captainName.trim() })),
            ...(isGroup
              ? {
                  minGroupPlayers: form.minGroupPlayers === "" ? null : Number(form.minGroupPlayers),
                  maxGroupPlayers: form.maxGroupPlayers === "" ? null : Number(form.maxGroupPlayers),
                }
              : {}),
          }
        : {}),
    };
    try {
      if (editingId) await update.mutateAsync({ id: editingId, ...body });
      else {
        const createdTitle = form.title.trim();
        const created = await create.mutateAsync(body);
        if (wantsTeams && created.teams?.length) {
          setCreatedCodes({
            title: createdTitle,
            hasInfluencers: form.hasInfluencers,
            teams: created.teams.map((t) => ({ name: t.name, captainName: t.captainName, captainCode: t.captainCode ?? "", memberCode: t.memberCode ?? "" })),
          });
        }
      }
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
  // Each section lists only its own tournaments.
  const sectionList = useMemo(() => (promos ?? []).filter((t) => t.type === section), [promos, section]);

  return (
    <main className="admin-main">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">ADMIN</p>
          <h1>Tournaments</h1>
          <p>Pick a section below. Each has its own creator and its own list.</p>
        </div>
      </div>

      {/* Section switcher: Regular vs Influencer */}
      <div className="tourn-sections">
        <button className={`tourn-section-tab ${section === "REGULAR" ? "on" : ""}`} onClick={() => switchSection("REGULAR")}>
          <span className="tst-ico"><Trophy size={20} /></span>
          <span className="tst-body">
            <b>Regular tournament</b>
            <small>A standard knockout — last player standing wins.</small>
          </span>
        </button>
        <button className={`tourn-section-tab ${section === "INFLUENCER" ? "on" : ""}`} onClick={() => switchSection("INFLUENCER")}>
          <span className="tst-ico"><Users size={20} /></span>
          <span className="tst-body">
            <b>Group tournament</b>
            <small>Players split into groups; the last one standing wins for their group. Optionally led by influencer-captains.</small>
          </span>
        </button>
      </div>

      {/* Invite-code reveal after creating a tournament that has teams/influencers */}
      {createdCodes && (
        <div className="admin-card glass wide code-reveal" style={{ marginBottom: 18 }}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">SHARE THESE</p>
              <h2>{createdCodes.hasInfluencers ? "Invite codes" : "Group codes"} — {createdCodes.title}</h2>
            </div>
            <button className="text-button" onClick={() => setCreatedCodes(null)}>
              <X size={15} /> Done
            </button>
          </div>
          <p className="pf-note">
            {createdCodes.hasInfluencers ? (
              <>Give the <b>influencer code</b> to each influencer — they enter with it and play with a special card. They share the <b>player code</b> with their followers to join.</>
            ) : (
              <>Share each group&apos;s <b>player code</b> with the players who should join that group.</>
            )}
          </p>
          <div className="reveal-teams">
            {createdCodes.teams.map((t, i) => (
              <div key={i} className="reveal-team-block">
                <div className="reveal-team-head">
                  <span className="team-dot sm" style={{ background: TEAM_COLORS[i % TEAM_COLORS.length] }} />
                  <b>{t.name}</b> {createdCodes.hasInfluencers && t.captainName && <span>· influencer {t.captainName}</span>}
                </div>
                {createdCodes.hasInfluencers && (
                  <button className="reveal-team code-chip" onClick={() => copy(t.captainCode, `cc-${i}`)} title="Copy influencer code">
                    <Crown size={12} /> Influencer: <code>{t.captainCode}</code> <Copy size={12} /> {copied === `cc-${i}` && <em>copied</em>}
                  </button>
                )}
                <button className="reveal-team code-chip" onClick={() => copy(t.memberCode, `mc-${i}`)} title="Copy player code">
                  <Users size={12} /> Player: <code>{t.memberCode}</code> <Copy size={12} /> {copied === `mc-${i}` && <em>copied</em>}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create / edit form */}
      <div className="admin-card glass wide">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{editingId ? "EDIT" : "CREATE"}</p>
            <h2>{editingId ? "Edit" : "New"} {isGroup ? "group tournament" : "regular tournament"}</h2>
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
            <span>Visibility</span>
            <div className="seg">
              <button type="button" className={form.visibility === "PUBLIC" ? "on" : ""} onClick={() => set("visibility", "PUBLIC")}>
                <Unlock size={14} /> Public
              </button>
              <button type="button" className={form.visibility === "PRIVATE" ? "on" : ""} onClick={() => set("visibility", "PRIVATE")}>
                <Lock size={14} /> Private
              </button>
            </div>
          </div>

          {/* Sponsorship: with a sponsor, or a house (no-sponsor) tournament — for both formats. */}
          <div className="pf-field">
            <span>Sponsorship</span>
            <div className="seg">
              <button type="button" className={form.sponsorMode === "WITH" ? "on" : ""} onClick={() => set("sponsorMode", "WITH")}>
                <Building2 size={14} /> With sponsor
              </button>
              <button type="button" className={form.sponsorMode === "WITHOUT" ? "on" : ""} onClick={() => set("sponsorMode", "WITHOUT")}>
                <Trophy size={14} /> Without sponsor
              </button>
            </div>
          </div>
          {form.sponsorMode === "WITH" ? (
            <label className="pf-field">
              <span>Sponsor</span>
              <select value={form.sponsorId} onChange={(e) => set("sponsorId", e.target.value)}>
                <option value="">Assign later — needs a sponsor</option>
                {(sponsors ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
          ) : (
            <div className="pf-field">
              <span>Sponsor</span>
              <p className="pf-note">House tournament — run by the platform with no sponsor.</p>
            </div>
          )}

          {/* Influencers: featured influencer-captains or not — available in BOTH types. */}
          <div className="pf-field">
            <span>Influencers</span>
            <div className="seg">
              <button type="button" className={form.hasInfluencers ? "on" : ""} onClick={() => setHasInfluencers(true)}>
                <Crown size={14} /> Included
              </button>
              <button type="button" className={!form.hasInfluencers ? "on" : ""} onClick={() => setHasInfluencers(false)}>
                <X size={14} /> Not included
              </button>
            </div>
          </div>
          <div className="pf-field">
            <span>&nbsp;</span>
            <p className="pf-note">
              {isGroup
                ? form.hasInfluencers
                  ? "Each group is led by a named influencer-captain (special card + captain code)."
                  : "Groups have no named captains — players join a group with its code."
                : form.hasInfluencers
                  ? "A solo knockout that also features named influencers (each gets an invite code to share)."
                  : "A plain solo knockout — no influencers."}
            </p>
          </div>

          {/* Group setup (number of groups + per-group sizes) — for Group tournaments. */}
          {isGroup && (
            <>
              <label className="pf-field">
                <span>Number of groups</span>
                <select value={form.groupCount} onChange={(e) => setGroupCount(Number(e.target.value))}>
                  {Array.from({ length: MAX_GROUPS - 1 }, (_, i) => i + 2).map((n) => (
                    <option key={n} value={n}>{n} groups</option>
                  ))}
                </select>
              </label>
              <div className="pf-field" />

              <label className="pf-field">
                <span>Min players per group</span>
                <input type="number" min={0} value={form.minGroupPlayers} onChange={(e) => set("minGroupPlayers", e.target.value)} placeholder="e.g. 5" />
              </label>
              <label className="pf-field">
                <span>Max players per group</span>
                <input type="number" min={0} value={form.maxGroupPlayers} onChange={(e) => set("maxGroupPlayers", e.target.value)} placeholder="e.g. 20" />
              </label>
            </>
          )}

          {/* For a Regular tournament WITH influencers: pick how many featured influencers (1..6).
              It stays a plain knockout — there are no groups. */}
          {!isGroup && form.hasInfluencers && (
            <>
              <label className="pf-field">
                <span>Number of influencers</span>
                <select value={form.groupCount} onChange={(e) => setGroupCount(Number(e.target.value))}>
                  {Array.from({ length: MAX_GROUPS }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n} influencer{n > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </label>
              <div className="pf-field" />
            </>
          )}

          {/* Team/influencer name inputs — shown whenever the tournament has teams. */}
          {wantsTeams && (
            <div className="pf-full team-inputs">
              <p className="pf-note">
                {isGroup
                  ? showCaptains
                    ? `${form.groupCount} groups, each led by a captain (the influencer). On save you'll get a unique captain code + player code per group to hand out.`
                    : `${form.groupCount} groups. On save you'll get a code per group that players use to join it.`
                  : `${form.groupCount} featured influencer${form.groupCount > 1 ? "s" : ""} — this stays a plain knockout with no groups. On save each influencer gets a unique invite code to share with their followers.`}
              </p>
              <div className="team-input-grid">
                {form.teams.map((tm, i) => (
                  <div className="team-block" key={i}>
                    <div className="team-dot" style={{ background: TEAM_COLORS[i % TEAM_COLORS.length] }} />
                    {isGroup && (
                      <label>
                        <span>Group {i + 1} name</span>
                        <input value={tm.name} onChange={(e) => setTeam(i, { name: e.target.value })} placeholder={`e.g. Group ${i + 1}`} />
                      </label>
                    )}
                    {showCaptains && (
                      <label>
                        <span>{isGroup ? "Captain / influencer" : `Influencer ${i + 1}`}</span>
                        <input value={tm.captainName} onChange={(e) => setTeam(i, { captainName: e.target.value })} placeholder="Influencer name" />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <label className="pf-field">
            <span>Start date (GMT — entry closes at start)</span>
            <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </label>
          <label className="pf-field">
            <span>Prize {form.visibility === "PRIVATE" ? "(optional — set later)" : ""}</span>
            <input value={form.prizePool} onChange={(e) => set("prizePool", e.target.value)} placeholder="e.g. 5,000 USDT" />
          </label>

          {/* Votable GMT time slots */}
          <div className="pf-full">
            <span className="pf-label">Start-time options (GMT — players vote the time)</span>
            <div className="slot-editor">
              <input
                type="time"
                value={slotDraft}
                onChange={(e) => { setSlotDraft(e.target.value); setSlotHint(""); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSlot();
                  }
                }}
              />
              <button type="button" className="mini secondary" onClick={() => addSlot()}>
                <Plus size={13} /> Add slot
              </button>
              <div className="slot-quick">
                {QUICK_SLOTS.map((s) => (
                  <button type="button" key={s} className="slot-quick-btn" onClick={() => addSlot(s)} disabled={form.timeOptions.includes(s)}>
                    +{s}
                  </button>
                ))}
              </div>
            </div>
            {slotHint && <p className="pf-note" style={{ color: "var(--danger)" }}>{slotHint}</p>}
            <div className="slot-chips">
              {form.timeOptions.length === 0 && <em className="pf-note">No slots yet — players can&apos;t vote a time until you add at least one.</em>}
              {form.timeOptions.map((s) => (
                <span className="slot-chip" key={s}>
                  <Clock size={11} /> {s}
                  <button type="button" onClick={() => removeSlot(s)} aria-label={`Remove ${s}`}>
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Regular: winners + whole-field player range */}
          {!isGroup && (
            <>
              <label className="pf-field">
                <span>Number of winners</span>
                <input type="number" min={1} value={form.winnerCount} onChange={(e) => set("winnerCount", e.target.value)} />
              </label>
              <div className="pf-field" />
              <label className="pf-field">
                <span>Min players</span>
                <input type="number" min={0} value={form.minPlayers} onChange={(e) => set("minPlayers", e.target.value)} placeholder="e.g. 50" />
              </label>
              <label className="pf-field">
                <span>Max players</span>
                <input type="number" min={0} value={form.maxPlayers} onChange={(e) => set("maxPlayers", e.target.value)} placeholder="e.g. 200" />
              </label>
            </>
          )}

          {form.sponsorMode === "WITH" && !form.sponsorId && (
            <p className="pf-full pf-note">
              No sponsor selected — this tournament will be listed as <b>needing a sponsor</b> until one is assigned.
            </p>
          )}

          {error && <div className="pf-full sponsor-auth-err">{error}</div>}

          <div className="pf-full pf-actions">
            <button className="primary" type="submit" disabled={busy || !form.title.trim()}>
              {editingId ? <><Pencil size={15} /> Save changes</> : <><Plus size={16} /> Create {isGroup ? "group" : "regular"} tournament</>}
            </button>
          </div>
        </form>
      </div>

      {/* Existing tournaments (this section only) */}
      <div className="admin-card glass wide" style={{ marginTop: 18 }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">{isGroup ? "GROUP" : "REGULAR"} TOURNAMENTS</p>
            <h2>{sectionList.length} total</h2>
          </div>
          {isGroup ? <Users size={18} /> : <Trophy size={18} />}
        </div>

        {sectionList.length === 0 && <div className="empty-line">No {isGroup ? "group" : "regular"} tournaments yet — create one above.</div>}

        {sectionList.map((t) => (
          <div className="tourn-row" key={t.id}>
            <div className="tourn-main">
              <div className="tourn-title">
                <b>{t.title}</b>
                <span className={`vis-pill ${t.visibility.toLowerCase()}`}>
                  {t.visibility === "PRIVATE" ? <Lock size={11} /> : <Unlock size={11} />} {t.visibility}
                </span>
                {t.seekingSponsor && !t.sponsor && <span className="vis-pill seeking"><Building2 size={11} /> NEEDS SPONSOR</span>}
                <span className={`promo-status ${t.status.toLowerCase()}`}>{t.status}</span>
              </div>
              <div className="tourn-meta">
                <span>{t.sponsor ? `Sponsor: ${t.sponsor.name}` : t.seekingSponsor ? "Needs sponsor" : "House"}</span>
                <span>Prize: {t.prizePool || "—"}</span>
                {t.type === "INFLUENCER" ? (
                  <>
                    <span>{t.groupCount} groups</span>
                    <span>{t.hasInfluencers ? "With influencers" : "No influencers"}</span>
                    {(t.minGroupPlayers != null || t.maxGroupPlayers != null) && (
                      <span>Per group: {t.minGroupPlayers ?? "?"}–{t.maxGroupPlayers ?? "?"}</span>
                    )}
                  </>
                ) : (
                  <>
                    <span>Winners: {t.winnerCount}</span>
                    {t.hasInfluencers && <span>{t.groupCount} influencers</span>}
                    {(t.minPlayers != null || t.maxPlayers != null) && (
                      <span>Players: {t.minPlayers ?? "?"}–{t.maxPlayers ?? "?"}</span>
                    )}
                  </>
                )}
                <span>Date: {fmtGmtDate(t.startDate)}</span>
                <span>Resolved start: {fmtDate(t.startAt)}</span>
                {t.timeOptions?.length > 0 && <span>Time votes: {t.timeOptions.join(", ")} GMT</span>}
                <span>{t.entryCount} joined</span>
              </div>
              {t.teams?.length > 0 && (
                <div className="code-chips">
                  {t.teams.map((tm) => (
                    <span key={tm.id} className="team-code-group">
                      <span className="team-code-label"><span className="team-dot sm" style={{ background: tm.color }} /> {tm.name} ({tm.memberCount})</span>
                      {t.hasInfluencers && (
                        <button className="code-chip" onClick={() => copy(tm.captainCode ?? "", `cc-${tm.id}`)} title="Copy influencer/captain code">
                          <Crown size={11} /> <code>{tm.captainCode ?? "—"}</code> <Copy size={11} /> {copied === `cc-${tm.id}` && <em>copied</em>}
                        </button>
                      )}
                      <button className="code-chip" onClick={() => copy(tm.memberCode ?? "", `mc-${tm.id}`)} title="Copy player code">
                        <Users size={11} /> <code>{tm.memberCode ?? "—"}</code> <Copy size={11} /> {copied === `mc-${tm.id}` && <em>copied</em>}
                      </button>
                    </span>
                  ))}
                </div>
              )}
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
              <button className="mini danger" onClick={() => setConfirmDel(t)}>
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmDel}
        title="Delete tournament?"
        message={confirmDel ? `“${confirmDel.title}” will be permanently deleted, along with its entries. This cannot be undone.` : ""}
        confirmLabel="Delete tournament"
        busy={del.isPending}
        onConfirm={async () => {
          if (!confirmDel) return;
          await del.mutateAsync(confirmDel.id);
          setConfirmDel(null);
        }}
        onClose={() => setConfirmDel(null)}
      />
    </main>
  );
}
