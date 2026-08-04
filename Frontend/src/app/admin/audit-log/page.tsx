"use client";

import { useState } from "react";
import { AdminGuard } from "../../../components/AdminGuard";
import { AdminNav } from "../../../components/dune/AdminNav";
import { useAuditLog } from "../../../lib/hooks/useAdmin";

export default function AdminAuditLogPage() {
  return (
    <AdminGuard>
      <div className="admin-shell">
        <AdminNav />
        <AuditLogContent />
      </div>
    </AdminGuard>
  );
}

function AuditLogContent() {
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const currentCursor = cursors[cursors.length - 1];
  const { data, isLoading } = useAuditLog(currentCursor);

  return (
    <main className="admin-main">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">COMPLIANCE</p>
          <h1>Audit log</h1>
          <p>Read-only trail of every admin action that touches money or config.</p>
        </div>
      </div>

      <div className="admin-card glass" style={{ overflowX: "auto" }}>
        <table className="admin-data">
          <thead>
            <tr>
              <th>Date</th>
              <th>Action</th>
              <th>Target</th>
              <th>Actor</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="admin-empty">Loading…</td>
              </tr>
            )}
            {!isLoading && (data?.entries.length ?? 0) === 0 && (
              <tr>
                <td colSpan={5} className="admin-empty">No audit entries yet.</td>
              </tr>
            )}
            {data?.entries.map((entry) => (
              <tr key={entry.id} style={{ verticalAlign: "top" }}>
                <td style={{ whiteSpace: "nowrap", color: "var(--muted)" }}>{new Date(entry.createdAt).toLocaleString()}</td>
                <td style={{ fontWeight: 600 }}>{entry.action}</td>
                <td style={{ color: "var(--muted)" }}>
                  {entry.targetType}:{entry.targetId.slice(0, 8)}
                </td>
                <td style={{ color: "var(--muted)" }}>{entry.actorUserId.slice(0, 8)}</td>
                <td>
                  <pre style={{ maxWidth: 320, overflowX: "auto", fontSize: 11, color: "var(--muted)", margin: 0 }}>
                    {JSON.stringify(entry.dataJson, null, 0)}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <button className="secondary" disabled={cursors.length <= 1} onClick={() => setCursors((c) => c.slice(0, -1))} style={{ padding: "7px 14px", fontSize: 13 }}>
          Previous
        </button>
        <button className="secondary" disabled={!data?.nextCursor} onClick={() => setCursors((c) => [...c, data?.nextCursor ?? undefined])} style={{ padding: "7px 14px", fontSize: 13 }}>
          Next
        </button>
      </div>
    </main>
  );
}
