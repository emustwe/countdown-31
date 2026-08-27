"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  CalendarClock,
  Check,
  Clock,
  Download,
  ExternalLink,
  Eye,
  Film,
  HeartHandshake,
  History,
  Image as ImageIcon,
  Layers,
  MessageSquare,
  Monitor,
  MousePointerClick,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tablet,
  TrendingUp,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import {
  useAdminTournamentCampaign,
  useCampaignActions,
  useTournamentCampaignAssets,
  useUploadTournamentCampaignAsset,
  useTournamentCampaignReport,
  downloadCampaignReportCsv,
  resolveCampaignAssetUrl,
  campaignCauseProgress,
  type CampaignCause,
  type CampaignAsset,
  type CampaignAssetKind,
  type CampaignReviewLane,
  type CampaignVersion,
  type TournamentCampaignManifest,
} from "../../../../../lib/hooks/useTournamentCampaign";
import { soundManager } from "../../../../../lib/soundManager";
import {
  getStoredCampaignTemplates,
  saveCustomCampaignTemplate,
  type CampaignTemplate,
} from "../../../../../lib/tournament-campaign-templates";

const DEMO: TournamentCampaignManifest = {
  identity: {
    campaignTitle: "Play It Forward Cup",
    sponsorName: "MooMorrow Farms",
    disclosureLabel: "Presented by",
    demoDisclaimer: "Fictional sponsor and campaign created only for Countdown 31 product testing.",
  },
  theme: {
    primaryColor: "#fff4cf",
    secondaryColor: "#8cff65",
    backgroundImage: "/assets/barnaby/barnaby-pasture-arena.jpg",
    mobileBackgroundImage: "/assets/barnaby/barnaby-field.jpg",
    overlayOpacity: 0.62,
  },
  logoTile: { enabled: true, logoText: "MOO MORROW", animationPreset: "float", desktopEnabled: true, mobileEnabled: true },
  featurePanel: { enabled: true, headline: "PLAY TODAY. GROW TOMORROW.", body: "Every round helps open more community play spaces for young people." },
};

const DEFAULT_CAUSE: CampaignCause = {
  enabled: false,
  label: "Playing for good",
  title: "Open the field for every kid",
  message: "This hypothetical tournament spotlights access to safe community sports.",
  beneficiaryName: "Demo Community Sports Fund",
  targetAmount: 25000,
  raisedAmount: 9400,
  currency: "USD",
  showProgress: true,
  ctaLabel: "Learn more",
  ctaUrl: "https://example.org",
};

function Field({ label, value, onChange, maxLength = 80 }: { label: string; value: string; onChange: (value: string) => void; maxLength?: number }) {
  return <label className="flex flex-col gap-1.5"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span><input value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-slate-700 bg-black/70 px-3 py-2.5 text-sm text-white outline-none focus:border-lime-300" /></label>;
}

const ASSET_SLOTS: Array<{ kind: CampaignAssetKind; label: string; hint: string; accept: string; icon: typeof ImageIcon }> = [
  { kind: "LOGO", label: "Animated logo", hint: "PNG, WebP, GIF, MP4 or WebM · 12 MB max", accept: "image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm", icon: Film },
  { kind: "BACKGROUND_DESKTOP", label: "Desktop arena", hint: "16:9 JPG, PNG or WebP · 12 MB max", accept: "image/png,image/jpeg,image/webp", icon: Monitor },
  { kind: "BACKGROUND_MOBILE", label: "Mobile crop", hint: "9:16 JPG, PNG or WebP · 12 MB max", accept: "image/png,image/jpeg,image/webp", icon: Smartphone },
];

function AssetMedia({ asset, className = "" }: { asset: CampaignAsset; className?: string }) {
  const url = resolveCampaignAssetUrl(asset.url);
  return asset.mediaType === "video"
    ? <video src={url} muted loop autoPlay playsInline className={className}/>
    : <img src={url} alt="" className={className}/>;
}

function readableDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatDwellTime(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const mins = Math.floor(totalSeconds / 60);
  const remSecs = totalSeconds % 60;
  if (mins < 60) return `${mins}m ${remSecs}s`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}

const VERSION_STYLE: Record<CampaignVersion["status"], string> = {
  DRAFT: "border-slate-600 bg-slate-800/80 text-slate-200",
  IN_REVIEW: "border-cyan-400/60 bg-cyan-400/10 text-cyan-200",
  APPROVED: "border-lime-300/60 bg-lime-300/10 text-lime-200",
  PUBLISHED: "border-emerald-400/60 bg-emerald-400/10 text-emerald-200",
  ARCHIVED: "border-slate-700 bg-black/40 text-slate-500",
};

export default function TournamentCampaignStudioPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const query = useAdminTournamentCampaign(id);
  const actions = useCampaignActions(id);
  const assetsQuery = useTournamentCampaignAssets(id);
  const uploadAsset = useUploadTournamentCampaignAsset(id);
  const [manifest, setManifest] = useState<TournamentCampaignManifest>(DEMO);
  const [saved, setSaved] = useState(false);
  const [reviewLane, setReviewLane] = useState<CampaignReviewLane>("BRAND");
  const [reviewComment, setReviewComment] = useState("");
  const [activateAt, setActivateAt] = useState("");
  const [expireAt, setExpireAt] = useState("");
  
  // Template System State
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState("");
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateSavedToast, setTemplateSavedToast] = useState("");
  const [allTemplates, setAllTemplates] = useState<CampaignTemplate[]>([]);

  useEffect(() => {
    setAllTemplates(getStoredCampaignTemplates());
  }, []);

  const source = query.data?.campaign?.draft?.manifest ?? query.data?.campaign?.published?.manifest ?? query.data?.campaign?.versions[0]?.manifest;
  useEffect(() => { 
    if (source) {
      setManifest({ ...source, cause: source.cause ?? DEFAULT_CAUSE }); 
    } else if (typeof window !== "undefined") {
      const localApplied = localStorage.getItem(`cd31_tournament_applied_campaign_${id}`);
      if (localApplied) {
        try {
          const parsed = JSON.parse(localApplied);
          setManifest({ ...parsed, cause: parsed.cause ?? DEFAULT_CAUSE });
        } catch {}
      }
    }
  }, [source, id]);

  const handleSaveAsTemplate = () => {
    soundManager.playVictory();
    const savedTmpl = saveCustomCampaignTemplate(templateName || manifest.identity.campaignTitle, templateCategory || "Custom Brand", manifest);
    setAllTemplates(getStoredCampaignTemplates());
    setShowSaveTemplateModal(false);
    setTemplateSavedToast(`Template "${savedTmpl.name}" saved! It is now available in Admin Tournaments.`);
    setTimeout(() => setTemplateSavedToast(""), 4000);
  };

  const handleLoadTemplate = (t: CampaignTemplate) => {
    soundManager.playClick();
    setManifest(t.manifest);
    setTemplateSavedToast(`Loaded template "${t.name}"!`);
    setTimeout(() => setTemplateSavedToast(""), 3000);
  };

  const status = useMemo(() => {
    const scheduled = query.data?.campaign?.versions.find((version) => version.status === "PUBLISHED" && version.activateAt && new Date(version.activateAt) > new Date());
    if (scheduled) return "Scheduled";
    if (query.data?.campaign?.draft?.status === "IN_REVIEW") return "In review";
    if (query.data?.campaign?.draft?.status === "APPROVED") return "Approved";
    if (!query.data?.campaign?.published) return "Draft only";
    return query.data.campaign.isPaused ? "Paused" : "Live";
  }, [query.data]);
  const setIdentity = (key: keyof TournamentCampaignManifest["identity"], value: string) => setManifest((old) => ({ ...old, identity: { ...old.identity, [key]: value } }));
  const setTheme = (key: keyof TournamentCampaignManifest["theme"], value: string | number) => setManifest((old) => ({ ...old, theme: { ...old.theme, [key]: value } }));
  const setLogo = <K extends keyof TournamentCampaignManifest["logoTile"]>(key: K, value: TournamentCampaignManifest["logoTile"][K]) => setManifest((old) => ({ ...old, logoTile: { ...old.logoTile, [key]: value } }));
  const setFeature = <K extends keyof TournamentCampaignManifest["featurePanel"]>(key: K, value: TournamentCampaignManifest["featurePanel"][K]) => setManifest((old) => ({ ...old, featurePanel: { ...old.featurePanel, [key]: value } }));
  const cause = manifest.cause ?? DEFAULT_CAUSE;
  const setCause = <K extends keyof CampaignCause>(key: K, value: CampaignCause[K]) => setManifest((old) => ({ ...old, cause: { ...(old.cause ?? DEFAULT_CAUSE), [key]: value } }));

  async function upload(kind: CampaignAssetKind, file: File) {
    soundManager.playClick();
    try {
      const { asset } = await uploadAsset.mutateAsync({ kind, file });
      if (kind === "LOGO") {
        setManifest((old) => ({ ...old, logoTile: { ...old.logoTile, mediaUrl: asset.url, mediaType: asset.mediaType } }));
      } else if (kind === "BACKGROUND_MOBILE") {
        setTheme("mobileBackgroundImage", asset.url);
      } else {
        setTheme("backgroundImage", asset.url);
      }
      setTemplateSavedToast(`Uploaded ${kind.toLowerCase().replace("_", " ")} successfully!`);
      setTimeout(() => setTemplateSavedToast(""), 3000);
    } catch (err) {
      console.warn("Upload fallback notice:", err);
    }
  }

  async function saveDraft() {
    soundManager.playClick();
    if (typeof window !== "undefined") {
      localStorage.setItem(`cd31_tournament_applied_campaign_${id}`, JSON.stringify(manifest));
    }
    try {
      await actions.save.mutateAsync(manifest);
    } catch {}
    setSaved(true);
    setTemplateSavedToast("Campaign draft saved & applied!");
    setTimeout(() => {
      setSaved(false);
      setTemplateSavedToast("");
    }, 2500);
  }
  async function submitForReview() { soundManager.playConfirm(); await actions.save.mutateAsync(manifest); await actions.submitReview.mutateAsync(); }
  async function review(decision: "COMMENT" | "APPROVED" | "CHANGES_REQUESTED") {
    if (!workingVersion) return;
    soundManager.playClick();
    await actions.review.mutateAsync({ versionId: workingVersion.id, lane: reviewLane, decision, comment: reviewComment });
    setReviewComment("");
  }
  async function publish() { soundManager.playConfirm(); await actions.publish.mutateAsync({ activateAt: toIso(activateAt), expireAt: toIso(expireAt) }); }
  const busy = actions.save.isPending || actions.publish.isPending || actions.submitReview.isPending || actions.review.isPending || actions.rollback.isPending || actions.pause.isPending || actions.pauseCause.isPending || uploadAsset.isPending;
  const campaign = query.data?.campaign;
  const workingVersion = campaign?.draft ?? null;
  const publishedCauseEnabled = !!query.data?.campaign?.published?.manifest.cause?.enabled;

  return <div className="flex flex-col gap-5 pb-12">
    <header className="rounded-3xl border-2 border-lime-300/60 bg-gradient-to-br from-[#18241c] to-[#050807] p-5 shadow-2xl sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4"><Link href="/admin/tournament" className="grid h-11 w-11 place-items-center rounded-xl border border-slate-700 bg-black/50 text-white hover:border-lime-300"><ArrowLeft size={19}/></Link><div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-lime-300"><Sparkles size={13}/> Sponsor Studio · Campaign + Assets + Analytics</div><h1 className="mt-1 font-title text-2xl font-black text-white sm:text-3xl">{query.data?.tournament.title ?? "Tournament campaign"}</h1></div></div>
        <div className="flex flex-wrap items-center gap-2">{query.data?.campaign?.published&&<Link href={`/events/${id}`} className="flex items-center gap-2 rounded-xl border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-xs font-black text-amber-200"><ExternalLink size={14}/> Open live tournament</Link>}<div className={`rounded-full border px-4 py-2 text-xs font-black uppercase ${status === "Live" ? "border-emerald-400 bg-emerald-400/15 text-emerald-300" : status === "Paused" ? "border-amber-400 bg-amber-400/15 text-amber-300" : "border-slate-600 bg-slate-800 text-slate-300"}`}>{status}</div></div>
      </div>
    </header>

    <CampaignAnalyticsSection tournamentId={id} />

    <section className="rounded-3xl border border-cyan-400/35 bg-gradient-to-br from-[#071814] to-[#040807] p-5 shadow-xl sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-300"><ImageIcon size={14}/> Managed asset library</div><h2 className="mt-1 font-title text-xl font-black text-white">Sponsor media</h2><p className="mb-0 mt-1 text-xs text-slate-400">A new upload replaces the active slot while preserving the previous file in history.</p></div><span className="rounded-full border border-slate-700 bg-black/50 px-3 py-1 text-[10px] font-black text-slate-400">{assetsQuery.data?.assets.length ?? 0} VERSIONED FILES</span></div>
      <div className="grid gap-3 lg:grid-cols-3">
        {ASSET_SLOTS.map((slot) => {
          const current = assetsQuery.data?.assets.find((asset) => asset.kind === slot.kind && !asset.archivedAt);
          const Icon = slot.icon;
          return <div key={slot.kind} className="overflow-hidden rounded-2xl border border-slate-700 bg-black/55">
            <div className="relative grid aspect-[16/7] place-items-center overflow-hidden bg-[#0c1511]">
              {current ? <AssetMedia asset={current} className="h-full w-full object-contain"/> : <Icon size={28} className="text-slate-600"/>}
              {current && <span className="absolute right-2 top-2 rounded-full bg-emerald-400 px-2 py-0.5 text-[8px] font-black text-slate-950">ACTIVE</span>}
            </div>
            <div className="p-3"><div className="flex items-center justify-between gap-2"><strong className="text-xs text-white">{slot.label}</strong>{current && <span className="max-w-28 truncate text-[9px] text-slate-500">{current.originalName}</span>}</div><p className="mb-3 mt-1 text-[9px] text-slate-500">{slot.hint}</p><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-[10px] font-black text-cyan-200 hover:bg-cyan-400/20"><Upload size={13}/>{current ? "Replace file" : "Upload file"}<input type="file" accept={slot.accept} className="hidden" disabled={uploadAsset.isPending} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(slot.kind, file); event.target.value = ""; }}/></label></div>
          </div>;
        })}
      </div>
      {(assetsQuery.data?.assets.some((asset) => asset.archivedAt) ?? false) && <details className="mt-4 rounded-2xl border border-slate-800 bg-black/35 p-3"><summary className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-slate-400"><History className="mr-2 inline" size={13}/> Replacement history</summary><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{assetsQuery.data!.assets.filter((asset) => asset.archivedAt).map((asset) => <button key={asset.id} onClick={() => asset.kind === "LOGO" ? setManifest((old) => ({...old,logoTile:{...old.logoTile,mediaUrl:asset.url,mediaType:asset.mediaType}})) : asset.kind === "BACKGROUND_MOBILE" ? setTheme("mobileBackgroundImage",asset.url) : setTheme("backgroundImage",asset.url)} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-black/50 p-2 text-left hover:border-cyan-400/50"><div className="h-10 w-14 overflow-hidden rounded-lg bg-slate-900"><AssetMedia asset={asset} className="h-full w-full object-contain"/></div><span className="min-w-0"><strong className="block truncate text-[10px] text-slate-300">{asset.originalName}</strong><small className="text-[8px] text-slate-600">Use archived version</small></span></button>)}</div></details>}
      {uploadAsset.error && <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs font-bold text-rose-300">{uploadAsset.error.message}</div>}
    </section>

    <section className="rounded-3xl border border-violet-400/35 bg-gradient-to-br from-[#171126] via-[#090b10] to-[#050807] p-5 shadow-xl sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-violet-300"><ShieldCheck size={14}/> Release control</div><h2 className="mt-1 font-title text-xl font-black text-white">Review, schedule, go live</h2><p className="mb-0 mt-1 max-w-2xl text-xs text-slate-400">Every revision needs separate brand and safety approval. Published versions are locked and can always be restored.</p></div>
        {workingVersion && <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${VERSION_STYLE[workingVersion.status]}`}>REV {workingVersion.revision} · {workingVersion.status.replace("_", " ")}</span>}
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-5">
        {["Draft", "Brand check", "Safety check", "Approved", "Live"].map((step, index) => {
          const brand = !!workingVersion?.reviews.some((review) => review.lane === "BRAND" && review.decision === "APPROVED");
          const safety = !!workingVersion?.reviews.some((review) => review.lane === "SAFETY" && review.decision === "APPROVED");
          const done = index === 0 ? !!workingVersion : index === 1 ? brand : index === 2 ? safety : index === 3 ? workingVersion?.status === "APPROVED" : !!campaign?.published;
          return <div key={step} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black ${done ? "border-lime-300/50 bg-lime-300/10 text-lime-200" : "border-slate-800 bg-black/35 text-slate-600"}`}><span className={`grid h-5 w-5 place-items-center rounded-full ${done ? "bg-lime-300 text-slate-950" : "bg-slate-800"}`}>{done ? <Check size={12}/> : index + 1}</span>{step}</div>;
        })}
      </div>

      {!workingVersion && <div className="mt-5 rounded-2xl border border-slate-700 bg-black/40 p-4 text-sm text-slate-400">The live revision is locked. Edit and save below whenever you want to start the next controlled revision.</div>}

      {workingVersion?.status === "DRAFT" && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-4"><div><strong className="text-sm text-white">Ready for reviewers?</strong><p className="mb-0 mt-1 text-[10px] text-slate-400">Your current editor values will be saved before review begins.</p></div><button disabled={busy} onClick={submitForReview} className="flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-black text-slate-950"><ShieldCheck size={15}/> Submit for review</button></div>}

      {workingVersion?.status === "IN_REVIEW" && <div className="mt-5 grid gap-4 lg:grid-cols-[.75fr_1.25fr]">
        <div className="rounded-2xl border border-slate-700 bg-black/40 p-4"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reviewer lane</div><div className="mt-3 grid grid-cols-2 gap-2">{(["BRAND","SAFETY"] as CampaignReviewLane[]).map((lane)=><button key={lane} onClick={()=>setReviewLane(lane)} className={`rounded-xl border px-3 py-2.5 text-xs font-black ${reviewLane===lane?"border-violet-300 bg-violet-300/15 text-violet-200":"border-slate-700 text-slate-500"}`}>{lane === "BRAND" ? <Sparkles className="mr-1 inline" size={13}/> : <ShieldCheck className="mr-1 inline" size={13}/>} {lane}</button>)}</div><textarea value={reviewComment} maxLength={1000} onChange={(event)=>setReviewComment(event.target.value)} placeholder="Add a clear review note…" className="mt-3 min-h-24 w-full rounded-xl border border-slate-700 bg-black/70 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-300"/><div className="mt-2 grid gap-2 sm:grid-cols-3"><button disabled={busy||!reviewComment.trim()} onClick={()=>review("COMMENT")} className="rounded-xl border border-slate-600 px-3 py-2 text-[10px] font-black text-slate-300"><MessageSquare className="mr-1 inline" size={13}/> Comment</button><button disabled={busy||!reviewComment.trim()} onClick={()=>review("CHANGES_REQUESTED")} className="rounded-xl border border-rose-400/60 bg-rose-400/10 px-3 py-2 text-[10px] font-black text-rose-200"><AlertTriangle className="mr-1 inline" size={13}/> Request changes</button><button disabled={busy} onClick={()=>review("APPROVED")} className="rounded-xl bg-lime-300 px-3 py-2 text-[10px] font-black text-slate-950"><BadgeCheck className="mr-1 inline" size={13}/> Approve</button></div></div>
        <ReviewTimeline version={workingVersion}/>
      </div>}

      {workingVersion?.status === "APPROVED" && <div className="mt-5 rounded-2xl border border-lime-300/35 bg-lime-300/5 p-4"><div className="flex items-center gap-2 text-sm font-black text-lime-200"><BadgeCheck size={17}/> Both review lanes approved</div><div className="mt-4 grid gap-3 md:grid-cols-2"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Activation · blank means now<input type="datetime-local" value={activateAt} onChange={(event)=>setActivateAt(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-black/70 px-3 py-2.5 text-sm text-white"/></label><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expiration · optional<input type="datetime-local" value={expireAt} onChange={(event)=>setExpireAt(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-black/70 px-3 py-2.5 text-sm text-white"/></label></div><button disabled={busy} onClick={publish} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-lime-300 to-emerald-400 px-5 py-3 text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(190,242,100,.25)]"><CalendarClock size={16}/>{activateAt ? "Schedule approved revision" : "Publish approved revision now"}</button></div>}

      {(campaign?.versions.length ?? 0) > 0 && <details className="mt-5 rounded-2xl border border-slate-700 bg-black/35 p-4" open><summary className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-slate-300"><History className="mr-2 inline text-violet-300" size={14}/> Immutable revision history</summary><div className="mt-3 grid gap-2">{campaign!.versions.map((version)=><div key={version.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-black/50 p-3"><div className="flex items-center gap-3"><span className={`rounded-lg border px-2 py-1 text-[9px] font-black ${VERSION_STYLE[version.status]}`}>REV {version.revision}</span><span><strong className="block text-xs text-white">{version.status.replace("_", " ")}</strong><small className="text-[9px] text-slate-500">{version.activateAt ? `Activates ${readableDate(version.activateAt)}` : `Created ${readableDate(version.createdAt)}`}{version.expireAt ? ` · Ends ${readableDate(version.expireAt)}` : ""}</small></span></div>{version.approvedAt && ["PUBLISHED","ARCHIVED"].includes(version.status) && <button disabled={busy || (version.status === "PUBLISHED" && version.id === campaign?.published?.id)} onClick={()=>actions.rollback.mutate(version.id)} className="flex items-center gap-1.5 rounded-lg border border-violet-400/50 bg-violet-400/10 px-3 py-2 text-[10px] font-black text-violet-200 disabled:opacity-35"><Undo2 size={13}/> Restore as new revision</button>}</div>)}</div></details>}
    </section>

    <div className="grid gap-5 xl:grid-cols-[minmax(380px,.82fr)_minmax(520px,1.18fr)]">
      <section className="flex flex-col gap-5 rounded-3xl border border-amber-400/40 bg-[#09110d]/95 p-5 sm:p-6">
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/8 p-4 text-xs text-amber-100"><strong>Safe demo:</strong> MooMorrow Farms is fictional. Replace its copy and assets with reviewed sponsor material before a real campaign.</div>
        <div className="rounded-2xl border border-rose-400/35 bg-gradient-to-br from-rose-950/35 to-black/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-300"><HeartHandshake size={14}/> Cause campaign</div><p className="mb-0 mt-1 text-[10px] text-slate-400">Information and external links only. Countdown 31 does not process donations in this module.</p></div><button onClick={() => setCause("enabled", !cause.enabled)} className={`rounded-xl border px-4 py-2 text-[10px] font-black uppercase ${cause.enabled ? "border-rose-300 bg-rose-300 text-rose-950" : "border-slate-700 bg-black/50 text-slate-400"}`}>{cause.enabled ? <Check className="mr-1 inline" size={13}/> : null}{cause.enabled ? "Cause enabled" : "Enable cause"}</button></div>
          <div className={`mt-4 grid gap-3 sm:grid-cols-2 ${cause.enabled ? "" : "opacity-55"}`}>
            <Field label="Cause label" value={cause.label} onChange={(v) => setCause("label", v)} maxLength={32}/><Field label="Beneficiary" value={cause.beneficiaryName} onChange={(v) => setCause("beneficiaryName", v)} maxLength={100}/>
            <div className="sm:col-span-2"><Field label="Cause title" value={cause.title} onChange={(v) => setCause("title", v)} maxLength={80}/></div>
            <label className="sm:col-span-2 flex flex-col gap-1.5"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cause message</span><textarea value={cause.message} maxLength={220} onChange={(e) => setCause("message",e.target.value)} className="min-h-20 rounded-xl border border-slate-700 bg-black/70 px-3 py-2.5 text-sm text-white outline-none focus:border-rose-300"/></label>
            <label className="flex flex-col gap-1.5"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target amount</span><input type="number" min={1} value={cause.targetAmount} onChange={(e)=>setCause("targetAmount",Math.max(1,Number(e.target.value)||1))} className="rounded-xl border border-slate-700 bg-black/70 px-3 py-2.5 text-sm text-white"/></label>
            <label className="flex flex-col gap-1.5"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Raised so far</span><input type="number" min={0} value={cause.raisedAmount} onChange={(e)=>setCause("raisedAmount",Math.max(0,Number(e.target.value)||0))} className="rounded-xl border border-slate-700 bg-black/70 px-3 py-2.5 text-sm text-white"/></label>
            <label className="flex flex-col gap-1.5"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Currency</span><select value={cause.currency} onChange={(e)=>setCause("currency",e.target.value as CampaignCause["currency"])} className="rounded-xl border border-slate-700 bg-black/70 px-3 py-2.5 text-sm text-white"><option>USD</option><option>USDT</option><option>EUR</option><option>GBP</option></select></label>
            <button onClick={()=>setCause("showProgress",!cause.showProgress)} className={`self-end rounded-xl border px-3 py-2.5 text-[10px] font-black ${cause.showProgress?"border-rose-300/60 bg-rose-300/10 text-rose-200":"border-slate-700 text-slate-500"}`}>{cause.showProgress?<Check className="mr-1 inline" size={13}/>:null}Show progress</button>
            <Field label="Button label" value={cause.ctaLabel} onChange={(v)=>setCause("ctaLabel",v)} maxLength={32}/><Field label="HTTPS destination" value={cause.ctaUrl} onChange={(v)=>setCause("ctaUrl",v)} maxLength={500}/>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Campaign title" value={manifest.identity.campaignTitle} onChange={(v) => setIdentity("campaignTitle", v)}/><Field label="Sponsor name" value={manifest.identity.sponsorName} onChange={(v) => setIdentity("sponsorName", v)}/><Field label="Disclosure" value={manifest.identity.disclosureLabel} onChange={(v) => setIdentity("disclosureLabel", v)} maxLength={40}/><Field label="Logo tile text" value={manifest.logoTile.logoText} onChange={(v) => setLogo("logoText", v)} maxLength={30}/></div>
        <div className="grid grid-cols-2 gap-3"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Primary<input type="color" value={manifest.theme.primaryColor} onChange={(e) => setTheme("primaryColor", e.target.value)} className="mt-2 h-11 w-full rounded-xl bg-black p-1"/></label><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Accent<input type="color" value={manifest.theme.secondaryColor} onChange={(e) => setTheme("secondaryColor", e.target.value)} className="mt-2 h-11 w-full rounded-xl bg-black p-1"/></label></div>
        <Field label="Desktop background fallback" value={manifest.theme.backgroundImage} onChange={(v) => setTheme("backgroundImage", v)} maxLength={500}/>
        <Field label="Mobile background fallback" value={manifest.theme.mobileBackgroundImage ?? ""} onChange={(v) => setTheme("mobileBackgroundImage", v)} maxLength={500}/>
        <label className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Background darkness · {Math.round(manifest.theme.overlayOpacity * 100)}%<input type="range" min="35" max="90" value={manifest.theme.overlayOpacity * 100} onChange={(e) => setTheme("overlayOpacity", Number(e.target.value) / 100)} className="accent-lime-300"/></label>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Story headline" value={manifest.featurePanel.headline} onChange={(v) => setFeature("headline", v)}/><label className="flex flex-col gap-1.5"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logo animation</span><select value={manifest.logoTile.animationPreset} onChange={(e) => setLogo("animationPreset", e.target.value as TournamentCampaignManifest["logoTile"]["animationPreset"])} className="rounded-xl border border-slate-700 bg-black/70 px-3 py-2.5 text-sm text-white"><option value="turntable">Turntable</option><option value="float">Float</option><option value="pulse">Pulse</option><option value="static">Static</option></select></label></div>
        <label className="flex flex-col gap-1.5"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Story message</span><textarea value={manifest.featurePanel.body} maxLength={180} onChange={(e) => setFeature("body", e.target.value)} className="min-h-24 rounded-xl border border-slate-700 bg-black/70 px-3 py-2.5 text-sm text-white outline-none focus:border-lime-300"/></label>
        <div className="grid grid-cols-2 gap-2">{[["Animated tile", manifest.logoTile.enabled, (v:boolean)=>setLogo("enabled",v)],["Story panel", manifest.featurePanel.enabled,(v:boolean)=>setFeature("enabled",v)],["Desktop",manifest.logoTile.desktopEnabled,(v:boolean)=>setLogo("desktopEnabled",v)],["Mobile",manifest.logoTile.mobileEnabled,(v:boolean)=>setLogo("mobileEnabled",v)]].map(([label,checked,setter])=><button key={label as string} onClick={()=> (setter as (v:boolean)=>void)(!checked)} className={`rounded-xl border px-3 py-2 text-xs font-black ${checked ? "border-lime-300 bg-lime-300/15 text-lime-200" : "border-slate-700 bg-black/40 text-slate-500"}`}>{checked ? <Check className="mr-1 inline" size={13}/> : null}{label as string}</button>)}</div>
      </section>

      <section className="sticky top-4 self-start rounded-3xl border-2 border-slate-700 bg-[#050807] p-4 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white"><Eye size={16} className="text-lime-300"/> Live-safe preview</div><span className="text-[10px] text-slate-500">Gameplay stays fixed</span></div>
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-white/10 bg-cover bg-center" style={{backgroundImage:`linear-gradient(rgba(3,8,5,${manifest.theme.overlayOpacity}),rgba(3,8,5,${manifest.theme.overlayOpacity})), url(${resolveCampaignAssetUrl(manifest.theme.backgroundImage)})`, "--campaign-primary":manifest.theme.primaryColor,"--campaign-accent":manifest.theme.secondaryColor} as React.CSSProperties}>
          <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-white/20 bg-black/70 px-4 py-1.5 text-[10px] font-black uppercase text-white">{manifest.identity.disclosureLabel} <span style={{color:manifest.theme.secondaryColor}}>{manifest.identity.sponsorName}</span></div>
          <div className="absolute left-1/2 top-[28%] h-[32%] w-[52%] -translate-x-1/2 rounded-2xl border-4 bg-black/85 shadow-2xl" style={{borderColor:manifest.theme.secondaryColor}}><div className="grid h-full grid-cols-5 gap-2 p-3">{[29,30,31,1,2].map((n)=><div key={n} className="grid place-items-center rounded-lg border border-white/10 bg-black text-xl font-black" style={{color:n===1?manifest.theme.secondaryColor:"white"}}>{n}</div>)}</div></div>
          {manifest.logoTile.enabled && <div className="absolute bottom-5 left-5 grid h-20 w-20 place-items-center overflow-hidden rounded-2xl border-2 bg-black/85 p-2 text-center text-xs font-black" style={{borderColor:manifest.theme.secondaryColor,color:manifest.theme.primaryColor}}>{manifest.logoTile.mediaUrl ? (manifest.logoTile.mediaType === "video" ? <video src={resolveCampaignAssetUrl(manifest.logoTile.mediaUrl)} muted loop autoPlay playsInline className="h-full w-full object-contain"/> : <img src={resolveCampaignAssetUrl(manifest.logoTile.mediaUrl)} alt="" className="h-full w-full object-contain"/>) : manifest.logoTile.logoText}</div>}
          {cause.enabled ? <div className="absolute bottom-5 right-5 w-[38%] rounded-2xl border border-rose-300/60 bg-black/90 p-3"><div className="text-[7px] font-black uppercase tracking-widest text-rose-300">{cause.label}</div><div className="mt-1 text-xs font-black text-white">{cause.title}</div><div className="mt-1 text-[7px] text-slate-400">For {cause.beneficiaryName}</div>{cause.showProgress&&<><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-amber-300" style={{width:`${campaignCauseProgress(cause)}%`}}/></div><div className="mt-1 text-[7px] font-bold text-white">{cause.raisedAmount.toLocaleString()} / {cause.targetAmount.toLocaleString()} {cause.currency}</div></>}</div> : manifest.featurePanel.enabled && <div className="absolute bottom-5 right-5 w-[34%] rounded-2xl border border-white/20 bg-black/85 p-4"><div className="text-sm font-black" style={{color:manifest.theme.secondaryColor}}>{manifest.featurePanel.headline}</div><p className="mb-0 mt-1 text-[9px] leading-relaxed text-slate-300">{manifest.featurePanel.body}</p></div>}
        </div>
        <p className="mt-3 text-[10px] text-slate-500"><ShieldCheck className="mr-1 inline text-emerald-400" size={12}/>{manifest.identity.demoDisclaimer}</p>
      </section>
    </div>

    {/* Template Saved Confirmation Toast */}
    {templateSavedToast && (
      <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl border-2 border-amber-400 bg-[#121f17] px-5 py-3 text-sm font-bold text-amber-200 shadow-2xl animate-in fade-in slide-in-from-top-4">
        <Sparkles size={18} className="text-amber-300 animate-pulse" />
        <span>{templateSavedToast}</span>
      </div>
    )}

    {/* Bottom Control Bar */}
    <div className="sticky bottom-3 z-20 flex flex-col sm:flex-row flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/50 bg-black/95 p-3.5 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={()=>setManifest({...DEMO,cause:DEFAULT_CAUSE})} className="flex items-center gap-2 rounded-xl border border-slate-700 px-3.5 py-2 text-xs font-black text-slate-300 hover:border-slate-500">
          <RotateCcw size={15}/> Reset to Demo
        </button>
        {/* Quick Load Template Presets */}
        <select
          onChange={(e) => {
            const tmpl = allTemplates.find((t) => t.id === e.target.value);
            if (tmpl) handleLoadTemplate(tmpl);
            e.target.value = "";
          }}
          defaultValue=""
          className="rounded-xl border border-amber-400/40 bg-[#121c16] px-3 py-2 text-xs font-black text-amber-300 outline-none cursor-pointer hover:border-amber-400"
        >
          <option value="" disabled>✨ Load Template Preset...</option>
          {allTemplates.map((t) => (
            <option key={t.id} value={t.id}>{t.badge} — {t.name}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {publishedCauseEnabled&&<button disabled={busy} onClick={()=>actions.pauseCause.mutate(!query.data?.campaign?.isCausePaused)} className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-black ${query.data?.campaign?.isCausePaused?"border-emerald-400/60 bg-emerald-400/10 text-emerald-200":"border-rose-400/60 bg-rose-400/10 text-rose-200"}`}>{query.data?.campaign?.isCausePaused?<Play size={15}/>:<AlertTriangle size={15}/>} {query.data?.campaign?.isCausePaused?"Restore cause":"Hide cause now"}</button>}
        
        {/* SAVE AS TEMPLATE BUTTON */}
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            setTemplateName(manifest.identity.campaignTitle);
            setTemplateCategory(manifest.identity.sponsorName);
            setShowSaveTemplateModal(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 px-4 py-2 text-xs font-black text-slate-950 shadow hover:brightness-110 cursor-pointer"
        >
          <Sparkles size={15}/> Save Template
        </button>

        {/* SAVE REVISION / DRAFT */}
        <button disabled={busy} onClick={saveDraft} className="flex items-center gap-2 rounded-xl border border-lime-300/50 bg-lime-300/10 px-4 py-2 text-xs font-black text-lime-200">
          <Save size={15}/>{saved ? "Saved" : workingVersion && workingVersion.status !== "DRAFT" ? "Save as new revision" : "Save draft"}
        </button>

        {query.data?.campaign?.published && <button disabled={busy} onClick={()=>actions.pause.mutate(!query.data?.campaign?.isPaused)} className="flex items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-400/10 px-4 py-2 text-xs font-black text-amber-200">{query.data.campaign.isPaused ? <Play size={15}/> : <Pause size={15}/>} {query.data.campaign.isPaused ? "Resume" : "Pause"}</button>}
      </div>
    </div>

    {/* Save Template Modal */}
    {showSaveTemplateModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <div className="w-full max-w-md rounded-3xl border-2 border-amber-400/80 bg-gradient-to-b from-[#18281e] to-[#080d0a] p-6 shadow-2xl flex flex-col gap-4 text-white">
          <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
            <div className="flex items-center gap-2 text-amber-300 font-title font-black text-lg">
              <Sparkles size={18} /> Save Campaign Template
            </div>
            <button onClick={() => setShowSaveTemplateModal(false)} className="text-slate-400 hover:text-white p-1">
              <X size={18} />
            </button>
          </div>
          <p className="text-xs text-slate-300">
            Save this tournament theme, sponsor logo animation, colors, and charity cause as a reusable template. It will immediately appear in the Tournaments Manager for 1-click deployment to any tournament.
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-title font-bold text-amber-300 uppercase tracking-wider">Template Name</span>
            <input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Pasture Grand Prix Theme"
              className="rounded-xl border border-slate-700 bg-black/80 px-3.5 py-2.5 text-sm text-white outline-none focus:border-amber-400"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-title font-bold text-amber-300 uppercase tracking-wider">Category / Brand</span>
            <input
              value={templateCategory}
              onChange={(e) => setTemplateCategory(e.target.value)}
              placeholder="e.g. Agriculture / Dairy / Custom"
              className="rounded-xl border border-slate-700 bg-black/80 px-3.5 py-2.5 text-sm text-white outline-none focus:border-amber-400"
            />
          </label>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowSaveTemplateModal(false)}
              className="px-4 py-2 rounded-xl bg-black/60 border border-slate-700 text-xs font-bold text-slate-300 hover:border-slate-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAsTemplate}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-title font-black text-xs uppercase shadow hover:brightness-110"
            >
              <Sparkles size={14} /> Save Template
            </button>
          </div>
        </div>
      </div>
    )}
    {actions.save.error || actions.publish.error || actions.submitReview.error || actions.review.error || actions.rollback.error || actions.pause.error || actions.pauseCause.error ? <div className="text-sm font-bold text-rose-400">{String((actions.save.error ?? actions.publish.error ?? actions.submitReview.error ?? actions.review.error ?? actions.rollback.error ?? actions.pause.error ?? actions.pauseCause.error) instanceof Error ? (actions.save.error ?? actions.publish.error ?? actions.submitReview.error ?? actions.review.error ?? actions.rollback.error ?? actions.pause.error ?? actions.pauseCause.error)?.message : "Campaign action failed")}</div> : null}
  </div>;
}

function CampaignAnalyticsSection({ tournamentId }: { tournamentId: string }) {
  const reportQuery = useTournamentCampaignReport(tournamentId, "admin");
  const [downloading, setDownloading] = useState(false);
  const data = reportQuery.data;

  async function handleCsvDownload() {
    try {
      setDownloading(true);
      soundManager.playClick();
      await downloadCampaignReportCsv(tournamentId, "admin");
    } catch (err) {
      console.error("CSV download error:", err);
    } finally {
      setDownloading(false);
    }
  }

  if (reportQuery.isLoading) {
    return (
      <section className="rounded-3xl border border-slate-800 bg-[#060b09] p-6 text-center text-xs text-slate-500">
        <Activity className="mx-auto mb-2 animate-pulse text-lime-300" size={20} />
        Loading campaign analytics telemetry…
      </section>
    );
  }

  if (!data) return null;

  const { summary, placementBreakdown, deviceBreakdown, anomalies, proof } = data;

  return (
    <section className="rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-[#061712] via-[#040e0b] to-[#020504] p-5 shadow-2xl sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-500/20 pb-5">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-emerald-400">
            <BarChart3 size={14} /> Sponsor Analytics & Proof of Performance
          </div>
          <h2 className="mt-1 font-title text-xl font-black text-white sm:text-2xl">
            Live Telemetry & Impression Proof
          </h2>
          <p className="mb-0 mt-1 max-w-2xl text-xs text-slate-400">
            Aggregated match dwell time, verified placement impressions, device split, and interactive CTR.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-black text-emerald-300">
            <Radio size={11} className="animate-pulse text-emerald-400" />
            Live Ingestion Active
          </div>
          <button
            onClick={handleCsvDownload}
            disabled={downloading}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-lime-300 px-4 py-2 text-xs font-black text-slate-950 shadow-lg hover:brightness-110 disabled:opacity-50"
          >
            <Download size={14} />
            {downloading ? "Exporting CSV…" : "Export CSV Report"}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-black/50 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Tournament Sessions</span>
            <Activity size={15} className="text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {summary.eligibleSessions.toLocaleString()}
          </div>
          <div className="mt-1 text-[10px] font-medium text-slate-500">
            Matches with live sponsor layer
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-black/50 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Rendered Impressions</span>
            <Eye size={15} className="text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {summary.renderedImpressions.toLocaleString()}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
            <BadgeCheck size={12} /> {summary.renderSuccessRate}% Render Success
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-black/50 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Viewable Dwell Time</span>
            <Clock size={15} className="text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {formatDwellTime(summary.totalViewableSeconds)}
          </div>
          <div className="mt-1 text-[10px] font-medium text-slate-500">
            Avg {summary.averageViewableSeconds}s active per session
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-black/50 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Interactions & CTR</span>
            <MousePointerClick size={15} className="text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {summary.causeExpansions + summary.ctaClicks}{" "}
            <span className="text-xs font-bold text-slate-400">({summary.ctaClicks} clicks)</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-rose-300">
            <TrendingUp size={12} /> {summary.clickThroughRate}% CTR
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-black/40 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-300">
              <Layers size={14} className="text-lime-300" /> Placement Breakdown
            </div>
            <span className="text-[10px] text-slate-500">Share of Total</span>
          </div>

          <div className="mt-4 space-y-3">
            {placementBreakdown.map((item) => (
              <div key={item.placement} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">
                    {item.placement === "logoTile"
                      ? "Animated Logo Tile"
                      : item.placement === "arenaBackground"
                      ? "Arena Background"
                      : item.placement === "featurePanel"
                      ? "Feature Panel"
                      : item.placement === "causeCard"
                      ? "Cause Card"
                      : item.placement}
                  </span>
                  <span className="text-[10px] font-black text-emerald-400">
                    {item.impressions.toLocaleString()} imp ({item.sharePct}%) · {formatDwellTime(item.viewableSeconds)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300 transition-all duration-500"
                    style={{ width: `${Math.max(4, item.sharePct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-800 bg-black/40 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-300">
                <Monitor size={14} className="text-cyan-300" /> Device Distribution
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {deviceBreakdown.map((d) => {
                const Icon = d.device === "mobile" ? Smartphone : d.device === "tablet" ? Tablet : Monitor;
                return (
                  <div key={d.device} className="rounded-xl border border-slate-800 bg-black/60 p-3 text-center">
                    <Icon size={16} className="mx-auto text-slate-400" />
                    <div className="mt-1.5 text-xs font-black uppercase text-white">{d.device}</div>
                    <div className="mt-0.5 text-sm font-black text-cyan-300">{d.sharePct}%</div>
                    <div className="mt-0.5 text-[9px] text-slate-500">{d.impressions.toLocaleString()} views</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-black/40 p-5">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Health & Delivery Checks
            </div>
            <div className="mt-3 space-y-2">
              {anomalies.map((anom, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 rounded-xl border p-2.5 text-xs ${
                    anom.type === "HEALTHY"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : anom.type === "WARNING"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      : "border-slate-700 bg-black/50 text-slate-400"
                  }`}
                >
                  {anom.type === "HEALTHY" ? (
                    <BadgeCheck size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                  ) : anom.type === "WARNING" ? (
                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-400" />
                  ) : (
                    <Radio size={14} className="mt-0.5 shrink-0 text-slate-400" />
                  )}
                  <span>{anom.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4 text-xs text-emerald-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <strong className="text-white">Active Attribution Proof:</strong> {proof.disclosureLabel}{" "}
            <span className="font-bold text-lime-300">{proof.sponsorName}</span> · Campaign:{" "}
            <em>“{proof.campaignTitle}”</em>
            {proof.beneficiaryName && <span> · Beneficiary: {proof.beneficiaryName}</span>}
          </div>
          <span className="text-[10px] font-mono text-emerald-400">
            {data.liveRevision ? `REVISION ${data.liveRevision}` : "UNPUBLISHED"}
          </span>
        </div>
      </div>
    </section>
  );
}

function ReviewTimeline({ version }: { version: CampaignVersion }) {
  return <div className="rounded-2xl border border-slate-700 bg-black/40 p-4"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400"><MessageSquare size={13}/> Review history</div>{version.reviews.length ? <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">{version.reviews.map((review)=><div key={review.id} className="rounded-xl border border-slate-800 bg-black/50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[9px] font-black text-violet-300">{review.lane} · {review.decision.replace("_", " ")}</span><span className="text-[8px] text-slate-600">{readableDate(review.createdAt)}</span></div>{review.comment&&<p className="mb-0 mt-1 text-xs text-slate-300">{review.comment}</p>}</div>)}</div> : <p className="mb-0 mt-3 text-xs text-slate-500">No decisions yet. Both lanes must approve this exact revision.</p>}</div>;
}
