"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => password.trim().length >= 6, [password]);

  // Ensure we have a recovery session before letting the user set a new password
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setReady(Boolean(data.session));
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      // Depending on Supabase version, you may see PASSWORD_RECOVERY or SIGNED_IN
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function updatePassword() {
    if (!canSubmit || loading) return;

    setLoading(true);
    setStatus("Updating password...");

    try {
      const { error } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (error) {
        setStatus(`Error: ${error.message}`);
        return;
      }

      setStatus("Password updated ✅ Redirecting to login...");

      // Optional: sign out so they log in fresh
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

        {status && (
          <div style={{ padding: 12, borderRadius: 14, background: "rgba(255, 244, 235, 0.85)", marginTop: 12 }}>
            {status}
          </div>
        )}

        <button className="btn btn-gray btn-full" type="button" onClick={() => window.location.reload()}>
          Reload
        </button>

        <button
          className="btn btn-gray btn-full"
          type="button"
          style={{ marginTop: 10 }}
          onClick={() => (window.location.href = "/login")}
        >
          Back to login
        </button>
      </main>
    );
  }

  return (
    <main className="app-container" style={{ maxWidth: 520 }}>
      <h1>Choose a new password</h1>

      {status && (
        <div style={{ padding: 12, borderRadius: 14, background: "rgba(255, 244, 235, 0.85)", marginTop: 12 }}>
          {status}
        </div>
      )}

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
