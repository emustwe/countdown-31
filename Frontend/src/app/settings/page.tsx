"use client";

import { AuthGuard } from "../../components/AuthGuard";
import { AppShell } from "../../components/AppShell";
import { useSettingsStore } from "../../stores/settings-store";

export default function SettingsPage() {
  return (
    <AuthGuard>
      <AppShell>
        <SettingsContent />
      </AppShell>
    </AuthGuard>
  );
}

function ToggleRow({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-[var(--color-text-dim)]">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        className={`h-6 w-11 rounded-full transition ${
          enabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-surface-2)]"
        }`}
      >
        <span
          className={`block h-5 w-5 translate-y-0.5 rounded-full bg-black transition ${
            enabled ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function SettingsContent() {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const animationsEnabled = useSettingsStore((s) => s.animationsEnabled);
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const toggleAnimations = useSettingsStore((s) => s.toggleAnimations);

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold">Settings</h1>
      <div className="surface divide-y divide-[var(--color-border)] rounded-lg">
        <ToggleRow
          label="Sound effects"
          description="Reel stops, wins, and bonus sounds."
          enabled={soundEnabled}
          onToggle={toggleSound}
        />
        <ToggleRow
          label="Animations"
          description="Reel spin and win-celebration animations."
          enabled={animationsEnabled}
          onToggle={toggleAnimations}
        />
      </div>
    </div>
  );
}
