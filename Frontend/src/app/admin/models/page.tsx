"use client";

import { useState } from "react";
import { AdminGuard } from "../../../components/AdminGuard";
import { AdminNav } from "../../../components/dune/AdminNav";
import { useAdminModels, useSetActiveModel } from "../../../lib/hooks/useAdmin";
import { ApiError } from "../../../lib/api-client";
import type { AdminMathModel } from "../../../lib/api-types";

export default function AdminModelsPage() {
  return (
    <AdminGuard>
      <div className="admin-shell">
        <AdminNav />
        <ModelsContent />
      </div>
    </AdminGuard>
  );
}

function pct(value: number | undefined): string {
  return value === undefined ? "—" : `${(value * 100).toFixed(2)}%`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

function ModelCard({ model }: { model: AdminMathModel }) {
  const [confirming, setConfirming] = useState(false);
  const setActiveModel = useSetActiveModel();
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    try {
      await setActiveModel.mutateAsync(model.id);
      setConfirming(false);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : "Failed");
    }
  }

  return (
    <div className="admin-card glass" style={{ border: model.active ? "1px solid var(--gold)" : "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 17 }}>{model.displayName}</h2>
        {model.active && <span className="a-tag ok">ACTIVE</span>}
      </div>
      <div style={{ marginBottom: 16 }}>
        <Row label="Target RTP" value={pct(model.targetRtp)} />
        <Row label="Empirical RTP" value={pct(model.computed?.empiricalRtpTotal)} />
        <Row label="Hit frequency" value={pct(model.computed?.hitFrequency)} />
        <Row label="Volatility index" value={model.computed?.volatilityIndex?.toFixed(2) ?? "—"} />
        <Row label="Simulated spins" value={model.computed?.simSpins?.toLocaleString() ?? "—"} />
      </div>

      {!model.active && !confirming && (
        <button onClick={() => setConfirming(true)} className="secondary full">
          Set as active model
        </button>
      )}
      {!model.active && confirming && (
        <div style={{ display: "grid", gap: 8 }}>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
            This is audited and takes effect immediately for new spins. Rounds already in progress keep the model they were created with.
          </p>
          {error && <p style={{ fontSize: 12, color: "var(--danger)", margin: 0 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleConfirm} disabled={setActiveModel.isPending} className="primary" style={{ flex: 1 }}>
              Confirm
            </button>
            <button onClick={() => setConfirming(false)} className="secondary" style={{ flex: 1 }}>
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
    <main className="admin-main">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">GAME MATH</p>
          <h1>Math models</h1>
          <p>
            Select which certified model is active. RTP is never typed in directly — it&apos;s a property of the model&apos;s
            strips + paytable, verified by the simulator.
          </p>
        </div>
      </div>

      {isLoading || !data ? (
        <p className="muted" style={{ padding: 8 }}>Loading…</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {data.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
      )}
    </main>
  );
}
