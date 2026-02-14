"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  // Theme: "dark" | "light"
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const canSubmit = useMemo(
    () => email.trim().length > 3 && password.trim().length >= 6,
    [email, password]
  );

  // Magnetic hover refs
  const primaryBtnRef = useRef<HTMLButtonElement | null>(null);
  const secondaryBtnRef = useRef<HTMLButtonElement | null>(null);

  // Sparkle layer ref
  const sparkleLayerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Load theme from localStorage
    const saved = (typeof window !== "undefined" && localStorage.getItem("theme")) as
      | "dark"
      | "light"
      | null;
    if (saved === "dark" || saved === "light") setTheme(saved);
  }, []);

  useEffect(() => {
    // Persist + set data attr
    if (typeof window === "undefined") return;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) window.location.href = "/discover";
    })();
  }, []);

  // ===== Magnetic button hover =====
  function attachMagnetic(btn: HTMLButtonElement | null) {
    if (!btn) return () => {};

    const strength = 18; // px
    const onMove = (e: MouseEvent) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      const rx = Math.max(-strength, Math.min(strength, x * 0.12));
      const ry = Math.max(-strength, Math.min(strength, y * 0.12));
      btn.style.transform = `translate(${rx}px, ${ry}px)`;
    };

    const onLeave = () => {
      btn.style.transform = "translate(0px, 0px)";
    };

    btn.addEventListener("mousemove", onMove);
    btn.addEventListener("mouseleave", onLeave);

    return () => {
      btn.removeEventListener("mousemove", onMove);
      btn.removeEventListener("mouseleave", onLeave);
    };
  }

  useEffect(() => {
    const clean1 = attachMagnetic(primaryBtnRef.current);
    const clean2 = attachMagnetic(secondaryBtnRef.current);
    return () => {
      clean1();
      clean2();
    };
  }, [theme]);

  // ===== Sparkle cursor trail =====
  useEffect(() => {
    const layer = sparkleLayerRef.current;
    if (!layer) return;

    let last = 0;

    const spawn = (x: number, y: number) => {
      const el = document.createElement("div");
      el.className = "spark";
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.setProperty("--dx", `${(Math.random() * 2 - 1) * 18}px`);
      el.style.setProperty("--dy", `${-18 - Math.random() * 22}px`);
      el.style.setProperty("--r", `${Math.random() * 120}deg`);
      el.style.setProperty("--s", `${0.75 + Math.random() * 0.7}`);
      layer.appendChild(el);

      // Remove after animation
      window.setTimeout(() => el.remove(), 900);
    };

    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      // throttle
      if (now - last < 18) return;
      last = now;

      const r = layer.getBoundingClientRect();
      spawn(e.clientX - r.left, e.clientY - r.top);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
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

  const isDark = theme === "dark";

  return (
    <main className={`ultra-bg ${isDark ? "t-dark" : "t-light"}`}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* =========================
               THEME VARIABLES
               ========================= */
            :root{
              --bg1: #050816;
              --bg2: #0b1224;
              --bg3: #030712;

              --glowA: rgba(99,102,241,0.35);
              --glowB: rgba(236,72,153,0.30);
              --glowC: rgba(34,197,94,0.12);

              --card: rgba(255,255,255,0.08);
              --card2: rgba(255,255,255,0.05);
              --border: rgba(255,255,255,0.18);
              --text: rgba(255,255,255,0.92);
              --muted: rgba(255,255,255,0.70);
              --hint: rgba(255,255,255,0.45);

              --accent1: #6366f1;
              --accent2: #ec4899;

              --ring: rgba(99,102,241,0.18);
              --shadow: rgba(0,0,0,0.60);
            }

            /* Light theme overrides */
            html[data-theme="light"]{
              --bg1: #fff7fb;
              --bg2: #f5f6ff;
              --bg3: #fff1e8;

              --glowA: rgba(99,102,241,0.20);
              --glowB: rgba(236,72,153,0.18);
              --glowC: rgba(34,197,94,0.10);

              --card: rgba(255,255,255,0.70);
              --card2: rgba(255,255,255,0.55);
              --border: rgba(31,41,55,0.14);
              --text: rgba(17,24,39,0.90);
              --muted: rgba(17,24,39,0.65);
              --hint: rgba(17,24,39,0.45);

              --ring: rgba(99,102,241,0.16);
              --shadow: rgba(17,24,39,0.14);
            }

            /* =========================
               ULTRA PREMIUM BACKGROUND
               ========================= */
            .ultra-bg{
              min-height:100vh;
              padding:20px;
              display:flex;
              align-items:center;
              justify-content:center;
              position:relative;
              overflow:hidden;

              background:
                radial-gradient(circle at 10% 15%, var(--glowA), transparent 52%),
                radial-gradient(circle at 90% 18%, var(--glowB), transparent 58%),
                radial-gradient(circle at 78% 88%, var(--glowC), transparent 58%),
                linear-gradient(135deg, var(--bg1) 0%, var(--bg2) 45%, var(--bg3) 100%);
              animation: bgMove 10s ease-in-out infinite alternate;
            }
            @keyframes bgMove{
              from { filter: hue-rotate(0deg) saturate(1.05); }
              to { filter: hue-rotate(-10deg) saturate(1.15); }
            }

            /* Smooth page transition */
            .pageIn{
              animation: pageIn 700ms cubic-bezier(.2,.9,.2,1) both;
              transform-origin: 50% 55%;
            }
            @keyframes pageIn{
              from{ opacity:0; transform: translateY(14px) scale(0.985); filter: blur(2px); }
              to{ opacity:1; transform: translateY(0) scale(1); filter: blur(0); }
            }

            /* =========================
               FLOATING HEARTS
               ========================= */
            .hearts{
              position:absolute;
              inset:0;
              pointer-events:none;
              opacity:0.55;
              filter: blur(0.2px);
            }
            .heart{
              position:absolute;
              width: 18px;
              height: 18px;
              transform: rotate(45deg);
              background: rgba(236,72,153,0.18);
              box-shadow: 0 10px 35px rgba(236,72,153,0.25);
              border-radius: 4px;
              animation: floatUp linear infinite;
            }
            .heart:before,
            .heart:after{
              content:"";
              position:absolute;
              width: 18px;
              height: 18px;
              background: rgba(236,72,153,0.18);
              border-radius: 50%;
            }
            .heart:before{ left:-9px; top:0; }
            .heart:after{ top:-9px; left:0; }
            @keyframes floatUp{
              0%{
                transform: translateY(120vh) rotate(45deg) scale(0.85);
                opacity: 0;
              }
              15%{ opacity: 0.9; }
              100%{
                transform: translateY(-140vh) rotate(45deg) scale(1.25);
                opacity: 0;
              }
            }

            /* =========================
               SPARKLE CURSOR TRAIL
               ========================= */
            .sparkleLayer{
              position:absolute;
              inset:0;
              pointer-events:none;
              overflow:hidden;
            }
            .spark{
              position:absolute;
              width: 10px;
              height: 10px;
              border-radius: 999px;
              background: radial-gradient(circle, rgba(255,255,255,0.9), rgba(255,255,255,0) 70%);
              transform: translate(-50%,-50%);
              filter: drop-shadow(0 10px 14px rgba(99,102,241,0.20));
              animation: spark 850ms ease-out forwards;
              opacity: 0.95;
            }
            .spark::after{
              content:"";
              position:absolute;
              inset:-6px;
              border-radius:999px;
              background: radial-gradient(circle, rgba(236,72,153,0.22), rgba(236,72,153,0) 70%);
              filter: blur(1px);
              opacity: 0.9;
            }
            @keyframes spark{
              from{
                transform: translate(-50%,-50%) rotate(0deg) scale(0.7);
                opacity: 1;
              }
              to{
                transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy)))
                           rotate(var(--r))
                           scale(var(--s));
                opacity: 0;
              }
            }

            /* =========================
               LIQUID GLASS CARD
               ========================= */
            .card{
              width:100%;
              max-width:460px;
              padding:28px;
              border-radius:30px;
              background: color-mix(in srgb, var(--card) 92%, transparent);
              backdrop-filter: blur(26px) saturate(1.25);
              border: 1px solid var(--border);
              box-shadow: 0 26px 90px var(--shadow);
              position:relative;
              overflow:hidden;
            }

            /* Liquid-ish sheen */
            .card::before{
              content:"";
              position:absolute;
              inset:-1px;
              border-radius:30px;
              background:
                radial-gradient(1200px 420px at 20% 0%, rgba(255,255,255,0.18), transparent 60%),
                radial-gradient(900px 360px at 95% 15%, rgba(99,102,241,0.16), transparent 55%),
                radial-gradient(900px 380px at 75% 100%, rgba(236,72,153,0.12), transparent 60%);
              opacity:0.85;
              pointer-events:none;
            }

            /* Premium glow behind card */
            .cardGlow{
              content:"";
              position:absolute;
              inset:-2px;
              border-radius:32px;
              background: linear-gradient(135deg, rgba(99,102,241,0.65), rgba(236,72,153,0.55), rgba(255,255,255,0.08));
              filter: blur(18px);
              opacity:0.8;
              z-index:-1;
              animation: glow 4s ease-in-out infinite alternate;
            }
            @keyframes glow{
              from{ opacity:0.50; transform: scale(0.98); }
              to{ opacity:0.90; transform: scale(1.02); }
            }

            /* Premium shimmer border on hover */
            .card::after{
              content:"";
              position:absolute;
              inset:-2px;
              border-radius:32px;
              background: linear-gradient(
                120deg,
                rgba(255,255,255,0) 0%,
                rgba(255,255,255,0.10) 35%,
                rgba(255,255,255,0.35) 50%,
                rgba(255,255,255,0.10) 65%,
                rgba(255,255,255,0) 100%
              );
              transform: translateX(-140%);
              opacity:0;
              pointer-events:none;
            }
            .card:hover::after{
              opacity:1;
              animation: shimmer 1.1s ease-out;
            }
            @keyframes shimmer{
              from{ transform: translateX(-140%); }
              to{ transform: translateX(140%); }
            }

            /* =========================
               HEADER + TYPOGRAPHY
               ========================= */
            .brand{
              display:flex;
              align-items:center;
              justify-content:space-between;
              gap: 12px;
              margin-bottom: 14px;
              position:relative;
              z-index: 1;
            }
            .brandLeft{
              display:flex;
              align-items:center;
              gap:12px;
              min-width: 0;
            }
            .logo{
              width:46px;
              height:46px;
              border-radius:16px;
              display:grid;
              place-items:center;
              background: linear-gradient(135deg, var(--accent1), var(--accent2));
              box-shadow: 0 14px 35px rgba(236,72,153,0.22);
              flex: 0 0 auto;
            }
            .title{
              margin:0;
              font-size:24px;
              font-weight:950;
              color: var(--text);
              letter-spacing:-0.35px;
              line-height: 1.05;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .subtitle{
              margin:4px 0 0 0;
              font-size:13px;
              color: var(--muted);
              font-weight:700;
            }

            /* Theme toggle */
            .toggle{
              border:none;
              border-radius: 999px;
              padding: 10px 12px;
              background: rgba(255,255,255,0.10);
              border: 1px solid rgba(255,255,255,0.14);
              color: var(--text);
              cursor:pointer;
              font-weight: 900;
              display:flex;
              align-items:center;
              gap:8px;
              transition: transform 140ms ease, opacity 140ms ease;
              flex: 0 0 auto;
            }
            html[data-theme="light"] .toggle{
              background: rgba(17,24,39,0.06);
              border: 1px solid rgba(17,24,39,0.10);
            }
            .toggle:active{ transform: translateY(1px); }
            .toggleDot{
              width: 10px;
              height: 10px;
              border-radius: 999px;
              background: linear-gradient(135deg, var(--accent1), var(--accent2));
              box-shadow: 0 10px 22px rgba(99,102,241,0.25);
            }

            /* =========================
               FORM
               ========================= */
            .lead{
              margin: 0 0 14px 0;
              font-weight: 850;
              color: color-mix(in srgb, var(--text) 82%, transparent);
              position:relative;
              z-index: 1;
            }

            .label{
              margin-top:12px;
              font-size:13px;
              font-weight:850;
              color: color-mix(in srgb, var(--text) 86%, transparent);
              position:relative;
              z-index: 1;
            }
            .input{
              width:100%;
              margin-top:8px;
              padding:13px 14px;
              border-radius:16px;
              border: 1px solid color-mix(in srgb, var(--border) 90%, transparent);
              background: color-mix(in srgb, var(--card2) 92%, transparent);
              color: var(--text);
              outline:none;
              font-weight:750;
              transition: box-shadow 140ms ease, transform 140ms ease, border-color 140ms ease;
              position:relative;
              z-index: 1;
            }
            .input::placeholder{ color: var(--hint); }
            .input:focus{
              border-color: color-mix(in srgb, var(--accent1) 72%, transparent);
              box-shadow: 0 0 0 6px var(--ring);
              transform: translateY(-1px);
            }

            /* Buttons */
            .btnRow{
              display:flex;
              gap:10px;
              margin-top:18px;
              position:relative;
              z-index: 1;
            }
            .btn{
              flex:1;
              border:none;
              border-radius:16px;
              padding:13px 14px;
              font-weight:950;
              cursor:pointer;
              transition: opacity 140ms ease, box-shadow 140ms ease;
              will-change: transform;
            }
            .btn:active{ transform: translateY(1px); }

            .btnPrimary{
              color:white;
              background: linear-gradient(135deg, var(--accent1), var(--accent2));
              box-shadow: 0 16px 36px rgba(99,102,241,0.22);
            }
            .btnPrimary:hover{
              box-shadow: 0 22px 48px rgba(236,72,153,0.26);
            }

            .btnSecondary{
              color: var(--text);
              background: rgba(255,255,255,0.10);
              border: 1px solid rgba(255,255,255,0.14);
            }
            html[data-theme="light"] .btnSecondary{
              background: rgba(17,24,39,0.06);
              border: 1px solid rgba(17,24,39,0.10);
            }

            .btnDisabled{
              opacity:0.45;
              cursor:not-allowed;
            }

            /* Status */
            .status{
              margin-top:14px;
              padding:12px;
              border-radius:16px;
              background: rgba(255,255,255,0.08);
              border:1px solid rgba(255,255,255,0.14);
              color: var(--text);
              font-weight:850;
              position:relative;
              z-index: 1;
            }
            html[data-theme="light"] .status{
              background: rgba(17,24,39,0.05);
              border:1px solid rgba(17,24,39,0.10);
            }

            .finePrint{
              margin-top:14px;
              font-size:12px;
              color: color-mix(in srgb, var(--text) 70%, transparent);
              font-weight:700;
              line-height:1.35;
              position:relative;
              z-index: 1;
            }
          `,
        }}
      />

      {/* Sparkle cursor layer */}
      <div className="sparkleLayer" ref={sparkleLayerRef} aria-hidden="true" />

      {/* Floating hearts */}
      <div className="hearts" aria-hidden="true">
        <div className="heart" style={{ left: "10%", animationDuration: "11s", animationDelay: "0s" }} />
        <div
          className="heart"
          style={{ left: "22%", animationDuration: "14s", animationDelay: "-2s", transform: "rotate(45deg) scale(1.15)" }}
        />
        <div className="heart" style={{ left: "36%", animationDuration: "12s", animationDelay: "-6s" }} />
        <div
          className="heart"
          style={{ left: "52%", animationDuration: "16s", animationDelay: "-4s", transform: "rotate(45deg) scale(1.28)" }}
        />
        <div className="heart" style={{ left: "68%", animationDuration: "13s", animationDelay: "-7s" }} />
        <div
          className="heart"
          style={{ left: "82%", animationDuration: "15s", animationDelay: "-1s", transform: "rotate(45deg) scale(0.95)" }}
        />
      </div>

      <div className="pageIn" style={{ position: "relative" }}>
        <div className="cardGlow" aria-hidden="true" />
        <div className="card">
          <div className="brand">
            <div className="brandLeft">
              <div className="logo" aria-label="Logo">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 21s-7-4.5-9.5-9C.2 8.6 2.3 5 6.4 5c2 0 3.4 1 4.6 2.4C12.2 6 13.6 5 15.6 5c4.1 0 6.2 3.6 3.9 7-2.5 4.5-9.5 9-9.5 9z"
                    fill="white"
                    opacity="0.95"
                  />
                </svg>
              </div>

              <div style={{ minWidth: 0 }}>
                <h1 className="title">Modern Dating</h1>
                <p className="subtitle">Match • Chat • Connect</p>
              </div>
            </div>

            <button
              type="button"
              className="toggle"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              <span className="toggleDot" />
              {theme === "dark" ? "Dark" : "Light"}
            </button>
          </div>

          <p className="lead">Welcome back 💫 Log in or create an account to start swiping.</p>

          {status && <div className="status">{status}</div>}

          <div className="label">Email</div>
          <input
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            autoComplete="email"
          />

          <div className="label">Password</div>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit) logIn();
            }}
          />

          <div className="btnRow">
            <button
              ref={primaryBtnRef}
              onClick={logIn}
              disabled={!canSubmit}
              className={`btn btnPrimary ${!canSubmit ? "btnDisabled" : ""}`}
            >
              Log in
            </button>

            <button
              ref={secondaryBtnRef}
              onClick={signUp}
              disabled={!canSubmit}
              className={`btn btnSecondary ${!canSubmit ? "btnDisabled" : ""}`}
            >
              Sign up
            </button>
          </div>

          <div className="finePrint">
            By continuing, you agree to be kind and respectful ❤️ You can block or report anytime.
          </div>
        </div>
      </div>
    </main>
  );
}
