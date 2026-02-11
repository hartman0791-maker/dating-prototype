"use client";

import { useState } from "react";

type Props = {
  className?: string;
  onDeleted?: () => void; // optional callback after deletion
};

export default function DeleteAccountButton({ className, onDeleted }: Props) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    const ok = confirm("Are you sure you want to delete your account? This cannot be undone.");
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch("/api/delete-user", { method: "DELETE" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = json?.error || "Failed to delete account.";
        alert(msg);
        return;
      }

      // Optional: let parent handle redirect
      if (onDeleted) {
        onDeleted();
      } else {
        // Default: go home
        window.location.href = "/";
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className={className}
      onClick={handleDelete}
      disabled={loading}
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.08)",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.7 : 1,
      }}
      title="Delete account"
    >
      {loading ? "Deleting..." : "🗑 Delete Account"}
    </button>
  );
}
