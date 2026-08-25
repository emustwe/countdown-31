"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Eye, Film, History, Image as ImageIcon, Monitor, Pause, Play, RotateCcw, Save, ShieldCheck, Smartphone, Sparkles, Upload } from "lucide-react";
import {
  useAdminTournamentCampaign,
  useCampaignActions,
  useTournamentCampaignAssets,
  useUploadTournamentCampaignAsset,
  resolveCampaignAssetUrl,
  type CampaignAsset,
  type CampaignAssetKind,
  type TournamentCampaignManifest,
} from "../../../../../lib/hooks/useTournamentCampaign";
import { soundManager } from "../../../../../lib/soundManager";

const DEMO: TournamentCampaignManifest = {
  identity: {
    campaignTitle: "Future Champions Cup",
    sponsorName: "Nike Demo",
    disclosureLabel: "Sponsored by",
    demoDisclaimer: "Hypothetical concept only — not affiliated with or endorsed by Nike.",
  },
  theme: {
    primaryColor: "#f4f4f4",
    secondaryColor: "#c7ff2f",
    backgroundImage: "/assets/barnaby/barnaby-pasture-arena.jpg",
    overlayOpacity: 0.66,
  },
  logoTile: { enabled: true, logoText: "NIKE DEMO", animationPreset: "turntable", desktopEnabled: true, mobileEnabled: true },
  featurePanel: { enabled: true, headline: "FUTURE CHAMPIONS", body: "Every move builds the future. Play boldly and keep the countdown alive." },
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

export default function TournamentCampaignStudioPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const query = useAdminTournamentCampaign(id);
  const actions = useCampaignActions(id);
  const assetsQuery = useTournamentCampaignAssets(id);
  const uploadAsset = useUploadTournamentCampaignAsset(id);
  const [manifest, setManifest] = useState<TournamentCampaignManifest>(DEMO);
  const [saved, setSaved] = useState(false);
  const source = query.data?.campaign?.draft?.manifest ?? query.data?.campaign?.published?.manifest;
  useEffect(() => { if (source) setManifest(source); }, [source]);

  const status = useMemo(() => {
    if (!query.data?.campaign?.published) return "Draft only";
    return query.data.campaign.isPaused ? "Paused" : "Live";
  }, [query.data]);
  const setIdentity = (key: keyof TournamentCampaignManifest["identity"], value: string) => setManifest((old) => ({ ...old, identity: { ...old.identity, [key]: value } }));
  const setTheme = (key: keyof TournamentCampaignManifest["theme"], value: string | number) => setManifest((old) => ({ ...old, theme: { ...old.theme, [key]: value } }));
  const setLogo = <K extends keyof TournamentCampaignManifest["logoTile"]>(key: K, value: TournamentCampaignManifest["logoTile"][K]) => setManifest((old) => ({ ...old, logoTile: { ...old.logoTile, [key]: value } }));
  const setFeature = <K extends keyof TournamentCampaignManifest["featurePanel"]>(key: K, value: TournamentCampaignManifest["featurePanel"][K]) => setManifest((old) => ({ ...old, featurePanel: { ...old.featurePanel, [key]: value } }));

  async function upload(kind: CampaignAssetKind, file: File) {
    soundManager.playClick();
    const { asset } = await uploadAsset.mutateAsync({ kind, file });
    if (kind === "LOGO") {
      setManifest((old) => ({ ...old, logoTile: { ...old.logoTile, mediaUrl: asset.url, mediaType: asset.mediaType } }));
    } else if (kind === "BACKGROUND_MOBILE") {
      setTheme("mobileBackgroundImage", asset.url);
    } else {
      setTheme("backgroundImage", asset.url);
    }
  }

  async function saveDraft() { soundManager.playClick(); await actions.save.mutateAsync(manifest); setSaved(true); setTimeout(() => setSaved(false), 1500); }
  async function publish() { soundManager.playConfirm(); await actions.save.mutateAsync(manifest); await actions.publish.mutateAsync(); }
  const busy = actions.save.isPending || actions.publish.isPending || actions.pause.isPending || uploadAsset.isPending;

  return <div className="flex flex-col gap-5 pb-12">
    <header className="rounded-3xl border-2 border-lime-300/60 bg-gradient-to-br from-[#18241c] to-[#050807] p-5 shadow-2xl sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4"><Link href="/admin/tournament" className="grid h-11 w-11 place-items-center rounded-xl border border-slate-700 bg-black/50 text-white hover:border-lime-300"><ArrowLeft size={19}/></Link><div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-lime-300"><Sparkles size={13}/> Sponsor Studio · Campaign + Assets</div><h1 className="mt-1 font-title text-2xl font-black text-white sm:text-3xl">{query.data?.tournament.title ?? "Tournament campaign"}</h1></div></div>
        <div className={`rounded-full border px-4 py-2 text-xs font-black uppercase ${status === "Live" ? "border-emerald-400 bg-emerald-400/15 text-emerald-300" : status === "Paused" ? "border-amber-400 bg-amber-400/15 text-amber-300" : "border-slate-600 bg-slate-800 text-slate-300"}`}>{status}</div>
      </div>
    </header>

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

    <div className="grid gap-5 xl:grid-cols-[minmax(380px,.82fr)_minmax(520px,1.18fr)]">
      <section className="flex flex-col gap-5 rounded-3xl border border-amber-400/40 bg-[#09110d]/95 p-5 sm:p-6">
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/8 p-4 text-xs text-amber-100"><strong>Safe demo:</strong> this is a hypothetical visual concept. It uses no official Nike logo or supplied brand assets.</div>
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
          {manifest.featurePanel.enabled && <div className="absolute bottom-5 right-5 w-[34%] rounded-2xl border border-white/20 bg-black/85 p-4"><div className="text-sm font-black" style={{color:manifest.theme.secondaryColor}}>{manifest.featurePanel.headline}</div><p className="mb-0 mt-1 text-[9px] leading-relaxed text-slate-300">{manifest.featurePanel.body}</p></div>}
        </div>
        <p className="mt-3 text-[10px] text-slate-500"><ShieldCheck className="mr-1 inline text-emerald-400" size={12}/>{manifest.identity.demoDisclaimer}</p>
      </section>
    </div>

    <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/50 bg-black/90 p-3 shadow-2xl backdrop-blur-xl"><button onClick={()=>setManifest(DEMO)} className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-xs font-black text-slate-300"><RotateCcw size={15}/> Load demo</button><div className="flex flex-wrap gap-2"><button disabled={busy} onClick={saveDraft} className="flex items-center gap-2 rounded-xl border border-lime-300/50 bg-lime-300/10 px-4 py-2 text-xs font-black text-lime-200"><Save size={15}/>{saved ? "Saved" : "Save draft"}</button>{query.data?.campaign?.published && <button disabled={busy} onClick={()=>actions.pause.mutate(!query.data?.campaign?.isPaused)} className="flex items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-400/10 px-4 py-2 text-xs font-black text-amber-200">{query.data.campaign.isPaused ? <Play size={15}/> : <Pause size={15}/>} {query.data.campaign.isPaused ? "Resume" : "Pause"}</button>}<button disabled={busy} onClick={publish} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-lime-300 to-emerald-400 px-5 py-2 text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(190,242,100,.35)]"><Sparkles size={15}/> Publish to tournament</button></div></div>
    {actions.save.error || actions.publish.error || actions.pause.error ? <div className="text-sm font-bold text-rose-400">{String((actions.save.error ?? actions.publish.error ?? actions.pause.error) instanceof Error ? (actions.save.error ?? actions.publish.error ?? actions.pause.error)?.message : "Campaign action failed")}</div> : null}
  </div>;
}
