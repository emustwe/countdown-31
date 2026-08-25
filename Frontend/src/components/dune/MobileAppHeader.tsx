"use client";

import { BookOpen, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSettingsStore } from "../../stores/settings-store";
import { soundManager } from "../../lib/soundManager";
import { useGameConfig } from "../../lib/hooks/useGameConfig";

export function MobileAppHeader({
  showRules = false,
  onOpenRules,
}: {
  showRules?: boolean;
  onOpenRules?: () => void;
}) {
  const router = useRouter();
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const toggleSoundSetting = useSettingsStore((state) => state.toggleSound);
  const { data: config } = useGameConfig();

  function toggleSound() {
    const next = !soundEnabled;
    toggleSoundSetting();
    soundManager.setMuted(!next);
    if (next) soundManager.playClick();
  }

  return (
    <header className="mobile-app-header" aria-label="Mobile game header">
      <button
        type="button"
        className="mobile-header-brand"
        onClick={() => router.push("/home")}
        aria-label="Count Down 31 home"
      >
        <span>{config?.branding.gameTitle ?? "COUNT DOWN"}</span>
        <b>31</b>
      </button>

      <div className={`mobile-header-actions ${showRules && onOpenRules ? "" : "is-single"}`}>
        {showRules && onOpenRules && (
          <button type="button" onClick={onOpenRules} aria-label="Game rules">
            <BookOpen size={18} />
          </button>
        )}
        <button
          type="button"
          onClick={toggleSound}
          aria-label={soundEnabled ? "Mute sound" : "Enable sound"}
        >
          {soundEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}
        </button>
      </div>
    </header>
  );
}
