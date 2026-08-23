"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, Glasses, HatGlasses, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AVATAR_CHARACTERS,
  AVATAR_VARIANTS,
  getAvatarVariant,
  resolveAvatarVariant,
  type AvatarCharacterId,
} from "../../lib/avatar-catalog";
import {
  AVATAR_BACKGROUNDS,
  AVATAR_FRAMES,
  type AvatarBackgroundId,
  type AvatarFrameId,
} from "../../lib/avatar-decorations";
import { soundManager } from "../../lib/soundManager";
import { useAvatarStore } from "../../stores/avatar-customization-store";
import { MasterAvatar } from "./MasterAvatar";

export function AvatarCatalogStudio() {
  const variantId = useAvatarStore((state) => state.variantId);
  const backgroundId = useAvatarStore((state) => state.backgroundId);
  const frameId = useAvatarStore((state) => state.frameId);
  const setVariant = useAvatarStore((state) => state.setVariant);
  const setBackground = useAvatarStore((state) => state.setBackground);
  const setFrame = useAvatarStore((state) => state.setFrame);
  const current = getAvatarVariant(variantId);
  const [previewId, setPreviewId] = useState(current.id);
  const [previewBackgroundId, setPreviewBackgroundId] = useState<AvatarBackgroundId>(backgroundId);
  const [previewFrameId, setPreviewFrameId] = useState<AvatarFrameId>(frameId);
  const [finishTab, setFinishTab] = useState<"background" | "frame">("background");
  const preview = getAvatarVariant(previewId);
  const isEquipped = current.id === preview.id && backgroundId === previewBackgroundId && frameId === previewFrameId;

  useEffect(() => {
    setPreviewId(current.id);
    setPreviewBackgroundId(backgroundId);
    setPreviewFrameId(frameId);
  }, [backgroundId, current.id, frameId]);

  const selection = useMemo(
    () => ({ hasHat: preview.hasHat, hasGlasses: preview.hasGlasses }),
    [preview.hasHat, preview.hasGlasses],
  );
  const characterVariants = useMemo(
    () => AVATAR_VARIANTS.filter((variant) => variant.characterId === preview.characterId),
    [preview.characterId],
  );

  function changeCharacter(characterId: AvatarCharacterId) {
    const next = resolveAvatarVariant(characterId, selection.hasHat, selection.hasGlasses);
    setPreviewId(next.id);
    soundManager.playCardSelect();
  }

  function changeAccessory(kind: "hat" | "glasses") {
    const next = resolveAvatarVariant(
      preview.characterId,
      kind === "hat" ? !selection.hasHat : selection.hasHat,
      kind === "glasses" ? !selection.hasGlasses : selection.hasGlasses,
    );
    setPreviewId(next.id);
    soundManager.playToggle(kind === "hat" ? !selection.hasHat : !selection.hasGlasses);
  }

  function equip() {
    setVariant(preview.id);
    setBackground(previewBackgroundId);
    setFrame(previewFrameId);
    soundManager.playEquip();
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-1 py-3 text-white sm:px-5 sm:py-6">
      <div className="flex items-center justify-between gap-3 rounded-3xl border border-amber-300/30 bg-black/70 p-3 backdrop-blur-xl sm:p-4">
        <Link
          href="/home"
          onClick={() => soundManager.playNavigate()}
          className="flex min-h-12 items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 font-title text-sm font-black transition hover:bg-white/10 active:scale-95"
        >
          <ChevronLeft size={19} /> Back
        </Link>
        <div className="text-right">
          <h1 className="font-title text-lg font-black text-amber-300 sm:text-2xl">Pick your cow</h1>
          <p className="text-xs font-semibold text-white/65">Tap items. See it. Equip it.</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,.95fr)]">
        <section className="relative overflow-hidden rounded-[2rem] border-2 border-amber-400/40 bg-[radial-gradient(circle_at_50%_20%,rgba(245,158,11,.24),transparent_42%),linear-gradient(155deg,#14251a,#07100b_70%)] p-4 shadow-2xl sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 rounded-full bg-emerald-400 px-3 py-1 font-title text-xs font-black text-slate-950">
              <ShieldCheck size={14} /> 24 READY-MADE LOOKS
            </span>
            <span className="font-title text-xs font-black text-amber-300">{preview.characterLabel}</span>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-[440px] overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle,#173d27,#07110b_72%)] shadow-[inset_0_0_50px_rgba(0,0,0,.65)]">
            <AnimatePresence initial={false}>
              <motion.div
                key={`${preview.id}-${previewBackgroundId}-${previewFrameId}`}
                initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 1.04, rotate: 2 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="absolute inset-0"
              >
                <MasterAvatar
                  config={{ variantId: preview.id, backgroundId: previewBackgroundId, frameId: previewFrameId }}
                  className="h-full w-full rounded-[2rem]"
                />
              </motion.div>
            </AnimatePresence>
            <motion.div
              key={`${preview.id}-shine`}
              initial={{ x: "-160%" }}
              animate={{ x: "180%" }}
              transition={{ duration: 0.65, ease: "easeOut" }}
              className="pointer-events-none absolute inset-y-0 w-1/3 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/10 to-transparent"
            />
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-black/70 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
          <div>
            <h2 className="font-title text-xl font-black">1. Pick a cow</h2>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Cow characters">
            {AVATAR_CHARACTERS.map((character) => {
              const selected = preview.characterId === character.id;
              return (
                <button
                  key={character.id}
                  type="button"
                  onClick={() => changeCharacter(character.id)}
                  aria-pressed={selected}
                  className={`group relative overflow-hidden rounded-2xl border-2 p-1.5 transition hover:-translate-y-1 active:scale-95 ${
                    selected ? "border-amber-300 bg-amber-300/15 shadow-[0_0_18px_rgba(251,191,36,.35)]" : "border-white/10 bg-white/5"
                  }`}
                >
                  <img src={character.baseVariant.image} alt="" className="mx-auto aspect-square w-full rounded-xl object-cover" />
                  <span className={`mt-1 block truncate bg-gradient-to-r ${character.accent} bg-clip-text font-title text-[11px] font-black text-transparent sm:text-xs`}>
                    {character.name}
                  </span>
                  {selected && <span className="absolute right-1 top-1 rounded-full bg-amber-300 p-1 text-slate-950"><Check size={11} strokeWidth={4} /></span>}
                </button>
              );
            })}
          </div>

          <h2 className="font-title text-xl font-black">2. Pick a style</h2>

          <div className="grid grid-cols-2 gap-3">
            <AccessoryButton
              active={selection.hasGlasses}
              icon={<Glasses size={30} />}
              label="Glasses"
              onClick={() => changeAccessory("glasses")}
            />
            <AccessoryButton
              active={selection.hasHat}
              icon={<HatGlasses size={30} />}
              label="Cowboy hat"
              onClick={() => changeAccessory("hat")}
            />
          </div>

          <div className="grid grid-cols-4 gap-2" aria-label={`${preview.characterLabel} styles`}>
            {characterVariants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => {
                  setPreviewId(variant.id);
                  soundManager.playCardSelect();
                }}
                aria-label={`Preview ${variant.label}`}
                aria-pressed={preview.id === variant.id}
                className={`relative aspect-square overflow-hidden rounded-2xl border-2 bg-emerald-950/60 transition hover:-translate-y-1 active:scale-95 ${
                  preview.id === variant.id ? "border-amber-300 shadow-[0_0_18px_rgba(251,191,36,.45)]" : "border-white/10"
                }`}
              >
                <img src={variant.image} alt="" className="h-full w-full object-cover" />
                {preview.id === variant.id && (
                  <span className="absolute right-1 top-1 rounded-full bg-amber-300 p-1 text-slate-950"><Check size={12} strokeWidth={4} /></span>
                )}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={equip}
            disabled={isEquipped}
            className="mt-auto flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 px-5 font-title text-base font-black text-slate-950 shadow-[0_10px_30px_rgba(245,158,11,.3)] transition hover:brightness-110 active:scale-[.98] disabled:cursor-default disabled:from-emerald-400 disabled:to-green-500"
          >
            {isEquipped ? <><Check size={21} strokeWidth={4} /> Equipped!</> : <><Sparkles size={21} /> Equip this avatar</>}
          </button>

          <p className="text-center text-xs font-semibold text-white/45">Saved on this device · No dragging or resizing</p>
        </section>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-black/70 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="font-title text-xl font-black">3. Finish your avatar</h2>
          <div className="grid grid-cols-2 rounded-2xl bg-white/5 p-1">
            <FinishTabButton active={finishTab === "background"} onClick={() => setFinishTab("background")} label="Backgrounds" count="10 new" />
            <FinishTabButton active={finishTab === "frame"} onClick={() => setFinishTab("frame")} label="Frames" count="10 new" />
          </div>
        </div>

        {finishTab === "background" ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8" aria-label="Avatar backgrounds">
            {AVATAR_BACKGROUNDS.filter((item) => item.id !== "none").map((item) => (
              <DecorationButton
                key={item.id}
                active={previewBackgroundId === item.id}
                label={item.name}
                onClick={() => {
                  setPreviewBackgroundId(item.id);
                  soundManager.playCardSelect();
                }}
              >
                <span className={`h-10 w-10 rounded-full bg-gradient-to-br ${item.previewClass} shadow-inner`} />
              </DecorationButton>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8" aria-label="Avatar frames">
            {AVATAR_FRAMES.filter((item) => item.id !== "none").map((item) => (
              <DecorationButton
                key={item.id}
                active={previewFrameId === item.id}
                label={item.name}
                onClick={() => {
                  setPreviewFrameId(item.id);
                  soundManager.playCardSelect();
                }}
              >
                <span className={`h-10 w-10 rounded-xl border-4 bg-slate-900 ${item.previewClass}`} />
              </DecorationButton>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FinishTabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 whitespace-nowrap rounded-xl px-3 font-title text-xs font-black transition active:scale-95 sm:px-4 ${active ? "bg-amber-300 text-slate-950" : "text-white/60"}`}
    >
      {label} <span className="ml-1 text-[9px] opacity-70">{count}</span>
    </button>
  );
}

function DecorationButton({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 transition hover:-translate-y-1 active:scale-95 ${
        active ? "border-amber-300 bg-amber-300/15 shadow-[0_0_16px_rgba(251,191,36,.3)]" : "border-white/10 bg-white/5"
      }`}
    >
      {children}
      <span className="truncate font-title text-[10px] font-black text-white/80">{label}</span>
      {active && <span className="absolute right-1 top-1 rounded-full bg-emerald-400 p-0.5 text-slate-950"><Check size={10} strokeWidth={4} /></span>}
    </button>
  );
}

function AccessoryButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative flex min-h-28 flex-col items-center justify-center gap-2 rounded-3xl border-2 font-title font-black transition hover:-translate-y-1 active:scale-95 ${
        active
          ? "border-amber-300 bg-amber-300/15 text-amber-200 shadow-[0_0_22px_rgba(251,191,36,.24)]"
          : "border-white/10 bg-white/5 text-white/70 hover:border-white/25"
      }`}
    >
      {active && <span className="absolute right-2 top-2 rounded-full bg-emerald-400 p-1 text-slate-950"><Check size={13} strokeWidth={4} /></span>}
      {icon}
      <span>{label}</span>
      <span className="text-[10px] uppercase tracking-wide opacity-60">{active ? "On" : "Off"}</span>
    </button>
  );
}
