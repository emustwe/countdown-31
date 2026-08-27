"use client";

import { Check, CircleDollarSign, LockKeyhole, Palette, ShoppingBag, Sparkles } from "lucide-react";
import { useState } from "react";
import { ArcadeHeader } from "../../components/dune/ArcadeHeader";
import { AuthGateModal } from "../../components/dune/AuthGateModal";
import { OfficialRulesModal } from "../../components/dune/OfficialRulesModal";
import { ApiError } from "../../lib/api-client";
import { usePurchaseShopItem, useShopAccount } from "../../lib/hooks/useShop";
import { formatUsdt } from "../../lib/money";
import {
  SHOP_CATALOG,
  isStarterItem,
  type ShopCatalogItem,
  type ShopCategory,
} from "../../lib/shop-catalog";
import { soundManager } from "../../lib/soundManager";
import { useAuthStore } from "../../stores/auth-store";
import { useAvatarStore } from "../../stores/avatar-customization-store";

const TABS: readonly { key: ShopCategory; label: string }[] = [
  { key: "avatars", label: "Avatars" },
  { key: "backgrounds", label: "Backgrounds" },
  { key: "frames", label: "Frames" },
  { key: "skills", label: "Skill Packs" },
];

const RARITY_STYLES: Record<ShopCatalogItem["rarity"], string> = {
  Starter: "bg-emerald-300 text-emerald-950",
  Rare: "bg-cyan-300 text-cyan-950",
  Epic: "bg-violet-300 text-violet-950",
  Legendary: "bg-amber-300 text-amber-950",
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const message = error.envelope.message;
    if (typeof message === "string") return message;
    return (
      message.message ??
      message.issues?.map((issue) => issue.message).join(" ") ??
      "Purchase failed."
    );
  }
  return "That purchase did not go through. Please try again.";
}

export default function ShopPage() {
  const [tab, setTab] = useState<ShopCategory>("avatars");
  const [showRules, setShowRules] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const accessToken = useAuthStore((state) => state.accessToken);
  const variantId = useAvatarStore((state) => state.variantId);
  const backgroundId = useAvatarStore((state) => state.backgroundId);
  const frameId = useAvatarStore((state) => state.frameId);
  const setVariant = useAvatarStore((state) => state.setVariant);
  const setBackground = useAvatarStore((state) => state.setBackground);
  const setFrame = useAvatarStore((state) => state.setFrame);
  const shop = useShopAccount(Boolean(accessToken));
  const purchase = usePurchaseShopItem();
  const owned = new Set(shop.data?.owned ?? []);
  const items = SHOP_CATALOG.filter((item) => item.category === tab);

  function isOwned(item: ShopCatalogItem) {
    return isStarterItem(item.key) || owned.has(item.key);
  }

  function isEquipped(item: ShopCatalogItem) {
    return (
      (item.category === "avatars" && variantId === item.id) ||
      (item.category === "backgrounds" && backgroundId === item.id) ||
      (item.category === "frames" && frameId === item.id)
    );
  }

  function equip(item: ShopCatalogItem, announce = true) {
    if (item.category === "avatars") setVariant(item.id as Parameters<typeof setVariant>[0]);
    if (item.category === "backgrounds")
      setBackground(item.id as Parameters<typeof setBackground>[0]);
    if (item.category === "frames") setFrame(item.id as Parameters<typeof setFrame>[0]);
    soundManager.playEquip();
    if (announce) setNotice(`${item.name} equipped.`);
  }

  async function handleItem(item: ShopCatalogItem) {
    setNotice(null);
    if (!accessToken) {
      soundManager.playOpen();
      setShowAuthGate(true);
      return;
    }
    if (isOwned(item)) {
      if (!isEquipped(item) && item.category !== "skills") equip(item);
      return;
    }
    try {
      const result = await purchase.mutateAsync(item.key);
      soundManager.playCoin();
      if (item.category !== "skills") equip(item, false);
      setNotice(`${item.name} unlocked for ${formatUsdt(result.charged)}.`);
    } catch (error) {
      soundManager.playError();
      setNotice(errorMessage(error));
    }
  }

  return (
    <div className="friendly-page relative flex min-h-screen w-full select-none flex-col overflow-x-hidden bg-[#070e0a] p-2 text-white sm:p-6">
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
        style={{ backgroundImage: "url('/assets/barnaby/barnaby-field.jpg')" }}
      />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,.25)_0%,#040906_90%)]" />
      <div className="relative z-20">
        <ArcadeHeader onOpenRules={() => setShowRules(true)} />
      </div>

      <main className="relative z-10 mx-auto mb-6 mt-8 flex w-full max-w-6xl flex-1 flex-col gap-5 sm:mt-12">
        <section className="flex flex-col items-center justify-between gap-4 rounded-3xl border-2 border-amber-400/80 bg-gradient-to-r from-amber-950/95 via-[#132019]/95 to-amber-950/95 p-5 shadow-[0_20px_50px_rgba(0,0,0,.8)] sm:flex-row sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-amber-400 bg-amber-500/20 text-amber-300">
              <ShoppingBag size={24} />
            </div>
            <div>
              <h1 className="font-title text-2xl font-black tracking-wide text-amber-300 sm:text-3xl">
                PASTURE SHOP
              </h1>
              <p className="text-xs text-slate-300">
                One price. One wallet. Unlock your favorites with USDT.
              </p>
            </div>
          </div>
          <div className="flex min-w-52 items-center gap-3 rounded-2xl border border-emerald-400/60 bg-black/70 px-4 py-3 shadow">
            <CircleDollarSign className="text-emerald-300" size={22} />
            <div>
              <div className="font-title text-base font-black text-emerald-200">
                {shop.isLoading
                  ? "Loading…"
                  : accessToken
                    ? formatUsdt(shop.data?.balance ?? "0")
                    : "Sign in"}
              </div>
              <div className="text-[10px] font-black uppercase tracking-wider text-white/45">
                USDT wallet balance
              </div>
            </div>
          </div>
        </section>

        <nav
          className="grid grid-cols-2 gap-2 sm:flex sm:justify-center"
          aria-label="Shop categories"
        >
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                soundManager.playClick();
                setTab(item.key);
              }}
              className={`min-h-11 rounded-2xl border px-4 font-title text-xs font-black tracking-wide transition active:scale-95 sm:px-6 ${tab === item.key ? "border-amber-300 bg-gradient-to-r from-amber-300 to-yellow-500 text-slate-950 shadow-[0_0_18px_rgba(245,158,11,.5)]" : "border-white/10 bg-black/60 text-white/70 hover:border-amber-400/50"}`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {notice && (
          <div
            role="status"
            className="rounded-2xl border border-amber-300/35 bg-black/75 px-4 py-3 text-center text-sm font-bold text-amber-100"
          >
            {notice}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const itemOwned = isOwned(item);
            const equipped = isEquipped(item);
            const price = shop.data?.prices[item.key] ?? shop.data?.price ?? "500000";
            return (
              <article
                key={item.key}
                className="relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-amber-400/45 bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] p-5 shadow-xl transition hover:border-amber-300"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 font-title text-[10px] font-black uppercase ${RARITY_STYLES[item.rarity]}`}
                  >
                    {item.rarity}
                  </span>
                  <span
                    className={`flex items-center gap-1 rounded-lg border px-2 py-1 font-title text-[10px] font-black ${equipped ? "border-emerald-300 bg-emerald-950 text-emerald-200" : itemOwned ? "border-cyan-300/50 bg-cyan-950 text-cyan-200" : "border-white/15 bg-black/60 text-white/65"}`}
                  >
                    {equipped ? (
                      <>
                        <Check size={12} /> EQUIPPED
                      </>
                    ) : itemOwned ? (
                      <>
                        <Check size={12} /> OWNED
                      </>
                    ) : (
                      <>
                        <LockKeyhole size={12} /> LOCKED
                      </>
                    )}
                  </span>
                </div>
                <div className="relative my-2 flex h-36 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-inner">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-contain drop-shadow-xl"
                    />
                  ) : item.previewClass ? (
                    <div
                      className={`flex h-24 w-24 items-center justify-center rounded-3xl border-4 bg-gradient-to-br ${item.previewClass}`}
                    >
                      <Palette className="text-white" size={28} />
                    </div>
                  ) : (
                    <span className="font-title text-2xl font-black tracking-wider text-amber-300">
                      {item.previewText}
                    </span>
                  )}
                  {!itemOwned && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/55 backdrop-blur-[2px]">
                      <span className="rounded-2xl border border-amber-300/60 bg-black/75 p-3 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,.25)]">
                        <LockKeyhole size={26} />
                      </span>
                      <span className="font-title text-xs font-black text-white">
                        Unlock to use
                      </span>
                    </div>
                  )}
                </div>
                <div className="my-2">
                  <h2 className="font-title text-base font-black text-white">{item.name}</h2>
                  <p className="mt-1 text-xs leading-snug text-slate-400">{item.description}</p>
                </div>
                <button
                  type="button"
                  disabled={equipped || purchase.isPending}
                  onClick={() => void handleItem(item)}
                  className={`mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl px-3 font-title text-xs font-black uppercase tracking-wide transition active:scale-[.98] disabled:cursor-default ${equipped ? "border border-white/10 bg-slate-900 text-white/40" : itemOwned ? "bg-gradient-to-r from-cyan-300 to-blue-500 text-slate-950" : "bg-gradient-to-r from-amber-300 to-orange-400 text-slate-950 shadow-[0_8px_22px_rgba(245,158,11,.2)]"}`}
                >
                  {equipped ? (
                    <>
                      <Check size={15} /> Equipped
                    </>
                  ) : itemOwned ? (
                    item.category === "skills" ? (
                      <>
                        <Check size={15} /> Owned
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} /> Equip
                      </>
                    )
                  ) : (
                    <>
                      <LockKeyhole size={15} /> {formatUsdt(price)}
                    </>
                  )}
                </button>
              </article>
            );
          })}
        </section>
      </main>

      <OfficialRulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      <AuthGateModal
        isOpen={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        title="Sign in to unlock items"
        description="Your purchases and avatar collection belong to your account. Sign in, then use your USDT wallet here."
        featureName="the Pasture Shop"
        redirectTo="/shop"
      />
    </div>
  );
}
