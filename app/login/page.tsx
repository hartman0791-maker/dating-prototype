"use client";
export {};

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const softBtn: React.CSSProperties = {
  border: "none",
  borderRadius: 14,
  padding: "12px 14px",
  cursor: "pointer",
  fontWeight: 800,
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  const canSubmit = useMemo(
    () => email.trim().length > 3 && password.trim().length >= 6,
    [email, password]
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) window.location.href = "/discover";
    })();
  }, []);

  async function signUp() {
    setStatus("Creating account...");

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) {
      setStatus(`Error: ${error.message}`);
      return;
    }

    setStatus("Account created ✅ Now press Log in.");
  }

  async function logIn() {
    setStatus("Logging in...");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) {
      setStatus(`Error: ${error.message}`);
      return;
    }

    window.location.href = "/discover";
  }

  return (
    <main className="app-container">
      {/* HERO IMAGE */}
      <div
        style={{
          height: 210,
          borderRadius: 22,
          backgroundImage:
            "linear-gradient(135deg, rgba(255, 77, 121, 0.22), rgba(255, 196, 99, 0.18)), url(https://images.unsplash.com/photo-1520975958225-0cf8f6d617da?auto=format&fit=crop&w=1200&q=80)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
        }}
      />

      <div style={{ marginTop: 18 }}>
        <h1 style={{ margin: "0 0 6px 0" }}>Welcome back</h1>
        <p style={{ margin: 0, opacity: 0.85 }}>
          Log in or create an account to start swiping.
        </p>
      </div>

      {status && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.06)",
            background: "rgba(255, 244, 235, 0.85)",
          }}
        >
          {status}
        </div>
      )}

      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          style={{
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.12)",
            outline: "none",
          }}
        />

        <label style={{ fontSize: 13, fontWeight: 700, color: "#333", marginTop: 6 }}>
          Password
        </label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="••••••••"
          style={{
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.12)",
            outline: "none",
          }}
        />

        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button
            onClick={logIn}
            disabled={!canSubmit}
            style={{
              ...softBtn,
              flex: 1,
              background: canSubmit
                ? "linear-gradient(135deg, #ff4d79, #ff9a3c)"
                : "#ddd",
              color: "white",
            }}
          >
            Log in
          </button>

          <button
            onClick={signUp}
            disabled={!canSubmit}
            style={{
              ...softBtn,
              flex: 1,
              background: canSubmit ? "#fff0f6" : "#eee",
              color: "#c2185b",
              border: "1px solid rgba(194, 24, 91, 0.25)",
            }}
          >
            Sign up
          </button>
        </div>

        <p style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
          After logging in, you’ll be sent to <b>/discover</b>.
        </p>
      </div>
    </main>
  );
}
