"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
};

export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
  onOpenChange,
  onConfirm,
}: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
      onMouseDown={() => onOpenChange(false)}
    >
      {/* Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(6px)",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "relative",
          width: "min(92vw, 420px)",
          borderRadius: 18,
          background: "white",
          padding: 16,
          border: "1px solid rgba(0,0,0,0.10)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
        }}
        onMouseDown={(e) => e.stopPropagation()} // prevent closing when clicking inside
      >
        <div style={{ fontWeight: 950, fontSize: 16, marginBottom: 6 }}>{title}</div>
        <div style={{ opacity: 0.75, fontWeight: 700, fontSize: 13 }}>{description}</div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            type="button"
            className="btn btn-gray"
            style={{ flex: 1 }}
            onClick={() => onOpenChange(false)}
          >
            {cancelText}
          </button>

          <button
            type="button"
            className={danger ? "btn btn-warm" : "btn btn-warm"}
            style={{
              flex: 1,
              filter: danger ? "saturate(1.1)" : "none",
            }}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

