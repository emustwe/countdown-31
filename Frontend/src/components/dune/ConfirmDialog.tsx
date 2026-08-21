"use client";

import { AlertTriangle, X } from "lucide-react";

// A styled in-app confirmation dialog used for destructive actions (replaces the native
// window.confirm, which some embedded browsers suppress). Render it always and toggle `open`.
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  danger = true,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card confirm-card" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <span className={`confirm-ico ${danger ? "danger" : ""}`}>
          <AlertTriangle size={22} />
        </span>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        {message && <p className="muted">{message}</p>}
        <div className="confirm-actions">
          <button className="secondary" onClick={onClose} disabled={busy}>{cancelLabel}</button>
          <button className={danger ? "danger-btn" : "primary"} onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
