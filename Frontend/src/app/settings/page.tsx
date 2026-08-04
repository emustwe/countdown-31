"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, IdCard, LogOut, Moon, Sparkles, Sun, UserRound, Volume2, WandSparkles, Zap } from "lucide-react";
import { AuthGuard } from "../../components/AuthGuard";
import { PageShell, ToggleRow } from "../../components/dune/Shell";
import { FlipText, useFlipIndex } from "../../components/dune/FlipText";
import { useRouter } from "next/navigation";
import { useProfile, useLogout, useUpdateProfile } from "../../lib/hooks/useAuth";
import { useCosmetics } from "../../lib/hooks/useSponsors";
import { CardPreview } from "../../components/dune/CardPreview";
import { useSettingsStore } from "../../stores/settings-store";
import { fileToAvatarDataUrl } from "../../lib/avatar";

export default function SettingsPage() {
  return (
    <AuthGuard>
      <PageShell>
        <SettingsContent />
      </PageShell>
    </AuthGuard>
  );
}

function SettingsContent() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: cosmetics } = useCosmetics();
  const logout = useLogout();
  const updateProfile = useUpdateProfile();
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const animationsEnabled = useSettingsStore((s) => s.animationsEnabled);
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const toggleAnimations = useSettingsStore((s) => s.toggleAnimations);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const [tab, setTab] = useState("appearance");
  const [saved, setSaved] = useState(false);
  const ko = useFlipIndex(5000) === 1;

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync the editable fields once the profile loads (defaultValue wouldn't update).
  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName ?? "");
      setAvatarUrl(profile.avatarUrl ?? null);
    }
  }, [profile]);

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

  function saveProfile() {
    setSaved(false);
    updateProfile.mutate(
      { fullName: fullName.trim() || undefined, avatarUrl },
      { onSuccess: () => setSaved(true) },
    );
  }

  const initials = (profile?.fullName || profile?.email || "DD").slice(0, 2).toUpperCase();

  return (
    <main className="page-main settings-page">
      <section className="settings-heading">
        <p className="eyebrow">
          <FlipText intervalMs={5000} items={[<>MAKE IT YOURS</>, <>당신만의 설정</>]} />
        </p>
        <h1>
          <FlipText intervalMs={5300} items={[<>Settings</>, <>설정</>]} />
        </h1>
        <p>
          <FlipText intervalMs={5600} items={[<>Shape your experience across every arena.</>, <>모든 아레나에서 당신만의 경험을 만드세요.</>]} />
        </p>
      </section>
      <section className="content settings-layout">
        <div className="settings-nav glass">
          <button className={tab === "appearance" ? "active" : ""} onClick={() => setTab("appearance")}>
            <WandSparkles />
            <FlipText intervalMs={5000} items={[<>Appearance</>, <>화면</>]} />
          </button>
          <button className={tab === "sound" ? "active" : ""} onClick={() => setTab("sound")}>
            <Volume2 />
            <FlipText intervalMs={5200} items={[<>Sound &amp; motion</>, <>사운드 &amp; 모션</>]} />
          </button>
          <button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}>
            <UserRound />
            <FlipText intervalMs={5400} items={[<>Profile</>, <>프로필</>]} />
          </button>
          <button className={tab === "card" ? "active" : ""} onClick={() => setTab("card")}>
            <IdCard />
            <FlipText intervalMs={5500} items={[<>Card</>, <>카드</>]} />
          </button>
          <button className="danger" onClick={() => logout.mutate()}>
            <LogOut />
            <FlipText intervalMs={5800} items={[<>Log out</>, <>로그아웃</>]} />
          </button>
        </div>

        <div className="settings-panels">
          {tab === "appearance" && (
            <div className="settings-card glass">
              <p className="eyebrow">
                <FlipText intervalMs={5000} items={[<>APPEARANCE</>, <>화면</>]} />
              </p>
              <h2>
                <FlipText intervalMs={5300} items={[<>Choose your atmosphere</>, <>분위기를 선택하세요</>]} />
              </h2>
              <p className="muted">
                <FlipText
                  intervalMs={5600}
                  items={[<>Switch between a dark and a light theme anytime.</>, <>다크 테마와 라이트 테마를 언제든 전환하세요.</>]}
                />
              </p>
              <div className="theme-options">
                <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}>
                  <div className="theme-preview dark">
                    <Moon />
                    <span />
                    <span />
                    <span />
                  </div>
                  <b>{ko ? "문라이트" : "Moonlight"}</b>
                  <small>{ko ? "풍부하고 몰입감 있으며 눈이 편안합니다" : "Rich, immersive and easy on the eyes"}</small>
                  {theme === "dark" && <i>✓</i>}
                </button>
                <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}>
                  <div className="theme-preview light">
                    <Sun />
                    <span />
                    <span />
                    <span />
                  </div>
                  <b>{ko ? "선라이즈" : "Sunrise"}</b>
                  <small>{ko ? "밝고 깨끗하며 낮에 좋습니다" : "Bright, clean and easy in daylight"}</small>
                  {theme === "light" && <i>✓</i>}
                </button>
              </div>
            </div>
          )}

          {tab === "sound" && (
            <div className="settings-card glass">
              <p className="eyebrow">
                <FlipText intervalMs={5000} items={[<>SOUND &amp; MOTION</>, <>사운드 &amp; 모션</>]} />
              </p>
              <h2>
                <FlipText intervalMs={5300} items={[<>Game experience</>, <>게임 경험</>]} />
              </h2>
              <ToggleRow
                icon={Volume2}
                title={<FlipText intervalMs={5000} items={[<>Game sounds</>, <>게임 사운드</>]} />}
                copy={<FlipText intervalMs={5200} items={[<>Reels, wins and interface effects</>, <>릴, 당첨, 인터페이스 효과</>]} />}
                active={soundEnabled}
                onChange={toggleSound}
              />
              <ToggleRow
                icon={Sparkles}
                title={<FlipText intervalMs={5400} items={[<>Ambient animation</>, <>환경 애니메이션</>]} />}
                copy={<FlipText intervalMs={5600} items={[<>Drifting particles and environmental motion</>, <>떠다니는 파티클과 배경 모션</>]} />}
                active={animationsEnabled}
                onChange={toggleAnimations}
              />
              <ToggleRow
                icon={Zap}
                title={<FlipText intervalMs={5100} items={[<>Win celebrations</>, <>당첨 연출</>]} />}
                copy={<FlipText intervalMs={5300} items={[<>Full-screen effects for big moments</>, <>큰 순간을 위한 전체 화면 효과</>]} />}
                active={animationsEnabled}
                onChange={toggleAnimations}
              />
            </div>
          )}

          {tab === "profile" && (
            <div className="settings-card glass">
              <p className="eyebrow">
                <FlipText intervalMs={5000} items={[<>PLAYER PROFILE</>, <>플레이어 프로필</>]} />
              </p>
              <h2>
                <FlipText intervalMs={5300} items={[<>Your identity</>, <>내 정보</>]} />
              </h2>
              <div style={{ display: "grid", gap: "16px", marginTop: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                  <div
                    style={{
                      width: "84px",
                      height: "84px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(255,255,255,0.06)",
                      border: "2px solid var(--gold)",
                      fontFamily: "var(--serif)",
                      fontSize: "26px",
                      color: "var(--gold)",
                      flexShrink: 0,
                    }}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      initials
                    )}
                  </div>
                  <div style={{ display: "grid", gap: "8px" }}>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickImage} style={{ display: "none" }} />
                    <button className="ghost" onClick={() => fileInputRef.current?.click()} style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                      <Camera size={16} />
                      {avatarUrl ? (ko ? "사진 변경" : "Change photo") : ko ? "사진 업로드" : "Upload photo"}
                    </button>
                    {avatarUrl && (
                      <button
                        className="ghost"
                        onClick={() => {
                          setAvatarUrl(null);
                          setSaved(false);
                        }}
                        style={{ opacity: 0.75 }}
                      >
                        {ko ? "사진 삭제" : "Remove photo"}
                      </button>
                    )}
                    {avatarError && <small style={{ color: "var(--danger, #ff6b6b)" }}>{avatarError}</small>}
                  </div>
                </div>
                <label style={{ display: "block" }}>
                  {ko ? "표시 이름" : "Display Name"}
                  <input
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setSaved(false);
                    }}
                    style={{ width: "100%", padding: "12px", marginTop: "6px", borderRadius: "12px", border: "1px solid var(--border)", background: "rgba(255,255,255,0.05)", color: "var(--text)" }}
                  />
                </label>
                <label style={{ display: "block" }}>
                  {ko ? "이메일 주소" : "Email Address"}
                  <input
                    defaultValue={profile?.email ?? ""}
                    readOnly
                    style={{ width: "100%", padding: "12px", marginTop: "6px", borderRadius: "12px", border: "1px solid var(--border)", background: "rgba(255,255,255,0.05)", color: "var(--text)" }}
                  />
                </label>
                {updateProfile.isError && (
                  <small style={{ color: "var(--danger, #ff6b6b)" }}>
                    {ko ? "저장할 수 없습니다. 다시 시도해 주세요." : "Could not save. Please try again."}
                  </small>
                )}
                <button className="primary" onClick={saveProfile} disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? (ko ? "저장 중…" : "Saving…") : saved ? (ko ? "저장됨 ✓" : "Saved ✓") : ko ? "변경 사항 저장" : "Save Changes"}
                </button>
              </div>
            </div>
          )}

          {tab === "card" && (
            <div className="settings-card glass">
              <p className="eyebrow">
                <FlipText intervalMs={5000} items={[<>YOUR CARD</>, <>내 카드</>]} />
              </p>
              <h2>
                <FlipText intervalMs={5300} items={[<>Player card</>, <>플레이어 카드</>]} />
              </h2>
              <p className="muted">
                <FlipText
                  intervalMs={5600}
                  items={[
                    <>This is the card other players see in games. More details will be added here later.</>,
                    <>다른 플레이어가 게임에서 보게 되는 카드입니다. 자세한 정보는 나중에 추가됩니다.</>,
                  ]}
                />
              </p>
              <div className="settings-card-preview">
                <CardPreview card={cosmetics?.card} name={profile?.fullName || profile?.email?.split("@")[0] || "Player"} size="lg" />
              </div>
              <button className="secondary" style={{ marginTop: 16 }} onClick={() => router.push("/shop")}>
                <Sparkles size={15} /> {ko ? "상점에서 카드 꾸미기" : "Design your card in the Shop"}
              </button>
            </div>
          )}

        </div>
      </section>
    </main>
  );
}
