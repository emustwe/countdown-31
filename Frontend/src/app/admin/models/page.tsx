"use client";

import { useState } from "react";
import { AdminGuard } from "../../../components/AdminGuard";
import { AdminShell } from "../../../components/AdminShell";
import { useAdminModels, useSetActiveModel } from "../../../lib/hooks/useAdmin";
import { ApiError } from "../../../lib/api-client";
import type { AdminMathModel } from "../../../lib/api-types";

export default function AdminModelsPage() {
  return (
    <AdminGuard>
      <AdminShell>
        <ModelsContent />
      </AdminShell>
    </AdminGuard>
  );
}

function pct(value: number | undefined): string {
  return value === undefined ? "—" : `${(value * 100).toFixed(2)}%`;
}

function ModelCard({ model, onActivate }: { model: AdminMathModel; onActivate: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const setActiveModel = useSetActiveModel();
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    try {
      await setActiveModel.mutateAsync(model.id);
      onActivate(model.id);
      setConfirming(false);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : "Failed");
    }
  }

  return (
    <div className={`surface rounded-lg p-6 ${model.active ? "border-[var(--color-accent)]" : ""}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{model.displayName}</h2>
        {model.active && (
          <span className="rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-xs font-semibold text-black">
            ACTIVE
          </span>
        )}
      </div>
      <dl className="mb-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-[var(--color-text-dim)]">Target RTP</dt>
          <dd>{pct(model.targetRtp)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[var(--color-text-dim)]">Empirical RTP</dt>
          <dd>{pct(model.computed?.empiricalRtpTotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[var(--color-text-dim)]">Hit frequency</dt>
          <dd>{pct(model.computed?.hitFrequency)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[var(--color-text-dim)]">Volatility index</dt>
          <dd>{model.computed?.volatilityIndex?.toFixed(2) ?? "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[var(--color-text-dim)]">Simulated spins</dt>
          <dd>{model.computed?.simSpins?.toLocaleString() ?? "—"}</dd>
        </div>
      </dl>

      {!model.active && !confirming && (
        <button
          onClick={() => setConfirming(true)}
          className="w-full rounded-md border border-[var(--color-border)] py-2 text-sm font-semibold"
        >
          Set as active model
        </button>
      )}
      {!model.active && confirming && (
        <div className="space-y-2">
          <p className="text-xs text-[var(--color-danger)]">
            This is audited and takes effect immediately for new spins. Rounds already in
            progress keep the model they were created with.
          </p>
          {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={setActiveModel.isPending}
              className="flex-1 rounded-md bg-[var(--color-accent)] py-2 text-sm font-semibold text-black disabled:opacity-60"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-md border border-[var(--color-border)] py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ModelsContent() {
  const { data, isLoading } = useAdminModels();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Math models</h1>
      <p className="mb-6 text-[var(--color-text-dim)]">
        Select which certified model is active. RTP is never typed in directly — it's a
        property of the model's strips + paytable, verified by the simulator.
      </p>

      {isLoading || !data ? (
        <p className="text-[var(--color-text-dim)]">Loading…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((model) => (
            <ModelCard key={model.id} model={model} onActivate={() => {}} />
          ))}
        </div>
      )}
    </div>
  );
}
