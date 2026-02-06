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
  fontFamily: "inherit",
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
    if (error) return setStatus(`Error: ${error.message}`);
    setStatus("Account created ✅ Now press Log in.");
  }

  async function logIn() {
    setStatus("Logging in...");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });
    if (error) return setStatus(`Error: ${error.message}`);
    window.location.href = "/discover";
  }

  return (
    <main className="app-container">
      {/* HERO (always visible, no external image) */}
      <div
        style={{
          height: 210,
          borderRadius: 22,
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
          background:
            "radial-gradient(circle at top left, rgba(255,77,121,0.55), transparent 55%), radial-gradient(circle at bottom right, rgba(255,154,60,0.55), transparent 55%), linear-gradient(135deg, #ff4d79 0%, #ff9a3c 100%)",
        }}
      >
        {/* subtle pattern dots */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)",
            backgroundSize: "14px 14px",
            opacity: 0.35,
          }}
        />
        {/* title overlay */}
        <div
          style={{
            position: "absolute",
            left: 18,
            bottom: 18,
            right: 18,
            color: "white",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 0.2 }}>
            Dating Prototype
          </div>
          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
            Match • Chat • Connect
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <h1 style={{ margin: "0 0 6px 0" }}>Welcome</h1>
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
              background: canSubmit ? "linear-gradient(135deg, #ff4d79, #ff9a3c)" : "#ddd",
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
