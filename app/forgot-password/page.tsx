"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => email.trim().length > 3, [email]);

  async function sendReset() {
    if (!canSubmit || loading) return;
    setLoading(true);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Password reset email sent ✅ Check your inbox.");
      setEmail("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-container" style={{ maxWidth: 520 }}>
      <h1 style={{ marginTop: 10 }}>Reset your password</h1>
      <p style={{ opacity: 0.75, fontWeight: 700 }}>
        Enter your email and we’ll send you a reset link.
      </p>

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        <label style={{ fontSize: 13, fontWeight: 900, opacity: 0.85 }}>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          autoComplete="email"
        />

        <button
          className="btn btn-warm btn-full"
          type="button"
          disabled={!canSubmit || loading}
          onClick={sendReset}
        >
          {loading ? "Sending…" : "Send reset link"}
        </button>

        <button className="btn btn-gray btn-full" type="button" onClick={() => (window.location.href = "/login")}>
          Back to login
        </button>
      </div>
    </main>
  );
}
