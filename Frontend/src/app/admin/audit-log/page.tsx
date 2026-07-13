"use client";

import { useState } from "react";
import { AdminGuard } from "../../../components/AdminGuard";
import { AdminShell } from "../../../components/AdminShell";
import { useAuditLog } from "../../../lib/hooks/useAdmin";

export default function AdminAuditLogPage() {
  return (
    <AdminGuard>
      <AdminShell>
        <AuditLogContent />
      </AdminShell>
    </AdminGuard>
  );
}

function AuditLogContent() {
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const currentCursor = cursors[cursors.length - 1];
  const { data, isLoading } = useAuditLog(currentCursor);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Audit log</h1>
      <p className="mb-6 text-[var(--color-text-dim)]">
        Read-only trail of every admin action that touches money or config.
      </p>

      <div className="surface overflow-hidden rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-text-dim)]">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Data</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[var(--color-text-dim)]">
                  Loading…
                </td>
              </tr>
            )}
            {data?.entries.map((entry) => (
              <tr key={entry.id} className="border-b border-[var(--color-border)] last:border-0 align-top">
                <td className="whitespace-nowrap px-4 py-3 text-[var(--color-text-dim)]">
                  {new Date(entry.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-medium">{entry.action}</td>
                <td className="px-4 py-3 text-[var(--color-text-dim)]">
                  {entry.targetType}:{entry.targetId.slice(0, 8)}
                </td>
                <td className="px-4 py-3 text-[var(--color-text-dim)]">{entry.actorUserId.slice(0, 8)}</td>
                <td className="px-4 py-3">
                  <pre className="max-w-xs overflow-x-auto text-xs text-[var(--color-text-dim)]">
                    {JSON.stringify(entry.dataJson, null, 0)}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          disabled={cursors.length <= 1}
          onClick={() => setCursors((c) => c.slice(0, -1))}
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Previous
        </button>
        <button
          disabled={!data?.nextCursor}
          onClick={() => setCursors((c) => [...c, data?.nextCursor ?? undefined])}
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
