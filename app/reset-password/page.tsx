"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => password.trim().length >= 6, [password]);

  // Ensure we have a session (recovery session) before letting user set password
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setReady(Boolean(data.session));
    })();

    // Also listen for password recovery event (sometimes arrives async)
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function updatePassword() {
    if (!canSubmit || loading) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Password updated ✅ Please log in.");
      // Optional: sign them out so they log in fresh
      await supabase.auth.signOut();
      window.location.href = "/login";
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <main className="app-container" style={{ maxWidth: 520 }}>
        <h1>Reset password</h1>
        <p style={{ opacity: 0.75, fontWeight: 700 }}>
          Open the reset link from your email. If you already did, wait a moment and try again.
        </p>

        <button className="btn btn-gray btn-full" onClick={() => window.location.reload()}>
          Reload
        </button>
      </main>
    );
  }

  return (
    <main className="app-container" style={{ maxWidth: 520 }}>
      <h1>Choose a new password</h1>

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        <label style={{ fontSize: 13, fontWeight: 900, opacity: 0.85 }}>New password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          autoComplete="new-password"
          onKeyDown={(e) => {
            if (e.key === "Enter") void updatePassword();
          }}
        />

        <button
          className="btn btn-warm btn-full"
          type="button"
          disabled={!canSubmit || loading}
          onClick={updatePassword}
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </div>
    </main>
  );
}
