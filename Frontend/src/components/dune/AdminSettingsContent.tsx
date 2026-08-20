"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera } from "lucide-react";
import { Pill } from "./Shell";
import { usePlatformTheme, useSetThemeFamily } from "../../lib/hooks/useTheme";
import { useProfile, useUpdateProfile } from "../../lib/hooks/useAuth";
import { fileToAvatarDataUrl } from "../../lib/avatar";

// Shared admin settings UI — used by both the classic dashboard and the new dashboard so they stay
// identical. Manages the admin profile + the platform-wide theme family.
export function AdminSettingsContent() {
  const router = useRouter();
  const { data } = usePlatformTheme();
  const setFamily = useSetThemeFamily();
  const family = data?.themeFamily ?? "monster";

  return (
    <main className="admin-main">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">ADMIN SETTINGS</p>
          <h1>Settings</h1>
          <p>Manage your admin profile and the platform-wide theme world.</p>
        </div>
        <button className="secondary" onClick={() => router.push("/admin")}>
          <ArrowLeft size={17} />
          Back to dashboards
        </button>
      </div>

      <AdminProfileCard />

      <p className="eyebrow" style={{ marginTop: 28 }}>PLATFORM THEME</p>
      <h2 style={{ margin: "4px 0 6px" }}>Theme family</h2>
      <p className="muted" style={{ marginBottom: 8 }}>Switch the visual world for every player. Their light or dark preference stays intact.</p>
      <div className="family-grid">
        <button className={`family-option monster ${family === "monster" ? "active" : ""}`} onClick={() => setFamily.mutate("monster")}>
          <div className="family-art">
            <span className="monster-face">☠</span>
            <i />
            <i />
          </div>
          <span>
            <Pill tone="live">DEFAULT FAMILY</Pill>
            <h2>Monster Mayhem</h2>
            <p>Toxic slime, playful fangs, cracked stone and creatures hiding in the dark.</p>
            <div className="swatches">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </span>
          <b>✓</b>
        </button>
        <button className={`family-option desert ${family === "desert" ? "active" : ""}`} onClick={() => setFamily.mutate("desert")}>
          <div className="family-art">
            <span>✦</span>
            <i />
            <i />
          </div>
          <span>
            <Pill tone="soon">DESERT FAMILY</Pill>
            <h2>Moonlit Bazaar</h2>
            <p>Enchanted brass, jewel tones, velvet canopies and a crystalline oasis.</p>
            <div className="swatches">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </span>
          <b>✓</b>
        </button>
      </div>
    </main>
  );
}

function AdminProfileCard() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState("");
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName ?? "");
      setAvatarUrl(profile.avatarUrl ?? null);
    }
  }, [profile]);

  const initials = (profile?.fullName || profile?.email || "AD").slice(0, 2).toUpperCase();

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarError("");
    try {
      setAvatarUrl(await fileToAvatarDataUrl(file));
      setSaved(false);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Could not read that image.");
    }
  }

  function save() {
    setSaved(false);
    updateProfile.mutate({ fullName: fullName.trim() || undefined, avatarUrl }, { onSuccess: () => setSaved(true) });
  }

  return (
    <div className="admin-card glass" style={{ marginBottom: 8 }}>
      <p className="eyebrow">MY PROFILE</p>
      <h2 style={{ marginTop: 4, marginBottom: 16 }}>Admin identity</h2>
      <div style={{ display: "grid", gap: 16, maxWidth: 460 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: "50%",
              overflow: "hidden",
              display: "grid",
              placeItems: "center",
              background: "rgba(255,255,255,0.06)",
              border: "2px solid var(--gold)",
              fontFamily: "var(--serif)",
              fontSize: 26,
              color: "var(--gold)",
              flexShrink: 0,
            }}
          >
            {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickImage} style={{ display: "none" }} />
            <button className="secondary" onClick={() => fileInputRef.current?.click()} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Camera size={16} />
              {avatarUrl ? "Change photo" : "Upload photo"}
            </button>
            {avatarUrl && (
              <button className="link-btn" onClick={() => { setAvatarUrl(null); setSaved(false); }} style={{ color: "var(--muted)", fontSize: 13, textAlign: "left" }}>
                Remove photo
              </button>
            )}
            {avatarError && <small style={{ color: "var(--danger)" }}>{avatarError}</small>}
          </div>
        </div>
        <label style={{ display: "block", fontSize: 13 }}>
          Display Name
          <input value={fullName} onChange={(e) => { setFullName(e.target.value); setSaved(false); }} className="admin-input" style={{ marginTop: 6 }} />
        </label>
        <label style={{ display: "block", fontSize: 13 }}>
          Email Address
          <input value={profile?.email ?? ""} readOnly className="admin-input" style={{ marginTop: 6 }} />
        </label>
        {updateProfile.isError && <small style={{ color: "var(--danger)" }}>Could not save. Please try again.</small>}
        <div>
          <button className="primary" onClick={save} disabled={updateProfile.isPending}>
            {updateProfile.isPending ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
