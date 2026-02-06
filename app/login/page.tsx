"use client";
export {};

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const softBtn: React.CSSProperties = {
  border: "none",
  borderRadius: 14,
  padding: "12px 14px",
  cursor: "pointer",
  fontWeight: 850,
  fontFamily: "inherit",
};

const HERO_ILLUSTRATION =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ff4d79"/>
        <stop offset="55%" stop-color="#ff7d54"/>
        <stop offset="100%" stop-color="#ff9a3c"/>
      </linearGradient>
      <radialGradient id="glow" cx="30%" cy="25%" r="65%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.55)"/>
        <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
      </radialGradient>
    </defs>
    <rect width="1600" height="900" fill="url(#bg)"/>
    <rect width="1600" height="900" fill="url(#glow)"/>
    <g opacity="0.20">
      <circle cx="1250" cy="260" r="160" fill="white"/>
      <circle cx="1320" cy="330" r="110" fill="white"/>
      <circle cx="1170" cy="340" r="120" fill="white"/>
    </g>
    <g opacity="0.18">
      <circle cx="420" cy="640" r="220" fill="white"/>
      <circle cx="560" cy="700" r="160" fill="white"/>
      <circle cx="300" cy="720" r="170" fill="white"/>
    </g>
    <g opacity="0.22">
      <path d="M780 365c-70-105-240-35-240 85 0 130 240 255 240 255s240-125 240-255c0-120-170-190-240-85z" fill="white"/>
    </g>
    <g opacity="0.28">
      <circle cx="200" cy="180" r="6" fill="white"/>
      <circle cx="260" cy="220" r="5" fill="white"/>
      <circle cx="320" cy="160" r="4" fill="white"/>
      <circle cx="380" cy="240" r="6" fill="white"/>
      <circle cx="460" cy="190" r="5" fill="white"/>
      <circle cx="520" cy="250" r="4" fill="white"/>
      <circle cx="600" cy="200" r="6" fill="white"/>
      <circle cx="680" cy="260" r="5" fill="white"/>
      <circle cx="740" cy="210" r="4" fill="white"/>
    </g>
  </svg>
`);

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
    <main style={{ padding: 20 }}>
      <style>{`
        .hero {
          animation: heroPop 700ms cubic-bezier(.2,.9,.2,1) both;
        }
        .heroTitle {
          animation: heroFade 900ms ease both;
          animation-delay: 120ms;
        }
        @keyframes heroPop {
          from { transform: translateY(10px) scale(0.98); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes heroFade {
          from { transform: translateY(6px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div className="app-container" style={{ maxWidth: 420 }}>
        {/* HERO with picture + logo */}
        <div
          className="hero"
          style={{
            height: 210,
            borderRadius: 22,
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 18px 40px rgba(0,0,0,0.14)",
            backgroundImage: `url(${HERO_ILLUSTRATION})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* overlay for readability */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.35) 100%)",
            }}
          />

          <div className="heroTitle" style={{ position: "absolute", left: 16, right: 16, bottom: 16, color: "white" }}>
            {/* Logo + title */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.22)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  display: "grid",
                  placeItems: "center",
                  backdropFilter: "blur(6px)",
                }}
                aria-label="Logo"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 21s-7-4.5-9.5-9C.2 8.6 2.3 5 6.4 5c2 0 3.4 1 4.6 2.4C12.2 6 13.6 5 15.6 5c4.1 0 6.2 3.6 3.9 7-2.5 4.5-9.5 9-9.5 9z"
                    fill="white"
                    opacity="0.95"
                  />
                </svg>
              </div>

              <div>
                <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: -0.3 }}>
                  Modern & Catchy Dating
                </div>
                <div style={{ marginTop: 4, fontSize: 13, opacity: 0.92 }}>
                  Match • Chat • Connect
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <h2 style={{ margin: "0 0 6px 0" }}>Welcome</h2>
          <p style={{ margin: 0, opacity: 0.85 }}>Log in or create an account to start swiping.</p>
        </div>

        {status && (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 14, background: "rgba(255, 244, 235, 0.85)" }}>
            {status}
          </div>
        )}

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 850, opacity: 0.9 }}>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />

          <label style={{ fontSize: 13, fontWeight: 850, opacity: 0.9, marginTop: 6 }}>Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" />

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button
              onClick={logIn}
              disabled={!canSubmit}
              className="btn btn-warm"
              style={{ ...softBtn, flex: 1, opacity: canSubmit ? 1 : 0.6 }}
            >
              Log in
            </button>

            <button
              onClick={signUp}
              disabled={!canSubmit}
              className="btn btn-soft"
              style={{ ...softBtn, flex: 1, opacity: canSubmit ? 1 : 0.6 }}
            >
              Sign up
            </button>
          </div>

          <p style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
            After logging in, you’ll be sent to <b>/discover</b>.
          </p>
        </div>
      </div>
    </main>
  );
}
