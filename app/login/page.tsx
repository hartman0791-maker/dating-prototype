"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
    <main className="ultra-bg">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* ===== Ultra premium animated background ===== */
            .ultra-bg{
              min-height:100vh;
              padding:20px;
              display:flex;
              align-items:center;
              justify-content:center;
              position:relative;
              overflow:hidden;
              background: radial-gradient(circle at 10% 15%, rgba(99,102,241,0.35), transparent 50%),
                          radial-gradient(circle at 90% 20%, rgba(236,72,153,0.30), transparent 55%),
                          radial-gradient(circle at 80% 85%, rgba(34,197,94,0.12), transparent 55%),
                          linear-gradient(135deg, #050816 0%, #0b1224 45%, #030712 100%);
              animation: bgMove 10s ease-in-out infinite alternate;
            }
            @keyframes bgMove{
              from { filter: hue-rotate(0deg) saturate(1.05); }
              to { filter: hue-rotate(-10deg) saturate(1.15); }
            }

            /* ===== Floating particles ===== */
            .particles{
              position:absolute;
              inset:0;
              pointer-events:none;
              opacity:0.55;
            }
            .p{
              position:absolute;
              width:10px;
              height:10px;
              border-radius:999px;
              background: rgba(255,255,255,0.10);
              box-shadow: 0 0 22px rgba(255,255,255,0.18);
              animation: floatUp linear infinite;
            }
            @keyframes floatUp{
              0%{ transform: translateY(120vh) scale(0.6); opacity:0; }
              15%{ opacity:1; }
              100%{ transform: translateY(-140vh) scale(1.1); opacity:0; }
            }

            /* ===== Premium glass card with animated border glow ===== */
            .card{
              width:100%;
              max-width:450px;
              padding:30px;
              border-radius:30px;
              background: rgba(255,255,255,0.08);
              backdrop-filter: blur(22px);
              border: 1px solid rgba(255,255,255,0.18);
              box-shadow: 0 24px 80px rgba(0,0,0,0.6);
              position:relative;
              animation: entrance 750ms cubic-bezier(.2,.9,.2,1) both;
            }
            @keyframes entrance{
              from{ opacity:0; transform: translateY(14px) scale(0.98); }
              to{ opacity:1; transform: translateY(0) scale(1); }
            }

            .card::before{
              content:"";
              position:absolute;
              inset:-2px;
              border-radius:32px;
              background: linear-gradient(135deg, rgba(99,102,241,0.7), rgba(236,72,153,0.55), rgba(255,255,255,0.08));
              filter: blur(18px);
              opacity:0.8;
              z-index:-1;
              animation: glow 4s ease-in-out infinite alternate;
            }
            @keyframes glow{
              from{ opacity:0.5; transform: scale(0.98); }
              to{ opacity:0.9; transform: scale(1.02); }
            }

            /* ===== Header ===== */
            .brand{
              display:flex;
              align-items:center;
              gap:12px;
              margin-bottom:16px;
            }
            .logo{
              width:46px;
              height:46px;
              border-radius:16px;
              display:grid;
              place-items:center;
              background: linear-gradient(135deg,#6366f1,#ec4899);
              box-shadow: 0 14px 35px rgba(236,72,153,0.25);
            }
            .title{
              margin:0;
              font-size:24px;
              font-weight:950;
              color:white;
              letter-spacing:-0.3px;
            }
            .subtitle{
              margin:4px 0 0 0;
              font-size:13px;
              color: rgba(255,255,255,0.70);
              font-weight:700;
            }

            /* ===== Inputs ===== */
            .label{
              margin-top:12px;
              font-size:13px;
              font-weight:850;
              color: rgba(255,255,255,0.82);
            }
            .input{
              width:100%;
              margin-top:8px;
              padding:13px 14px;
              border-radius:16px;
              border: 1px solid rgba(255,255,255,0.16);
              background: rgba(255,255,255,0.06);
              color:white;
              outline:none;
              font-weight:700;
              transition: box-shadow 140ms ease, transform 140ms ease, border-color 140ms ease;
            }
            .input::placeholder{ color: rgba(255,255,255,0.45); }
            .input:focus{
              border-color: rgba(99,102,241,0.8);
              box-shadow: 0 0 0 5px rgba(99,102,241,0.18);
              transform: translateY(-1px);
            }

            /* ===== Buttons ===== */
            .btnRow{
              display:flex;
              gap:10px;
              margin-top:18px;
            }
            .btn{
              flex:1;
              border:none;
              border-radius:16px;
              padding:13px 14px;
              font-weight:950;
              cursor:pointer;
              transition: transform 140ms ease, opacity 140ms ease, box-shadow 140ms ease;
            }
            .btn:active{ transform: translateY(1px); }

            .btnPrimary{
              color:white;
              background: linear-gradient(135deg,#6366f1,#ec4899);
              box-shadow: 0 16px 36px rgba(99,102,241,0.25);
            }
            .btnPrimary:hover{
              transform: translateY(-1px);
              box-shadow: 0 20px 44px rgba(236,72,153,0.28);
            }

            .btnSecondary{
              color:white;
              background: rgba(255,255,255,0.10);
              border:1px solid rgba(255,255,255,0.14);
            }
            .btnDisabled{
              opacity:0.45;
              cursor:not-allowed;
            }

            /* ===== Status ===== */
            .status{
              margin-top:14px;
              padding:12px;
              border-radius:16px;
              background: rgba(255,255,255,0.08);
              border:1px solid rgba(255,255,255,0.14);
              color:white;
              font-weight:800;
            }

            .finePrint{
              margin-top:14px;
              font-size:12px;
              color: rgba(255,255,255,0.65);
              font-weight:700;
              line-height:1.35;
            }
          `,
        }}
      />

      {/* Floating hearts */}
<div className="hearts" aria-hidden="true">
  <div className="heart" style={{ left: "10%", animationDuration: "11s", animationDelay: "0s" }} />
  <div className="heart" style={{ left: "22%", animationDuration: "14s", animationDelay: "-2s", transform: "rotate(45deg) scale(1.15)" }} />
  <div className="heart" style={{ left: "36%", animationDuration: "12s", animationDelay: "-6s" }} />
  <div className="heart" style={{ left: "52%", animationDuration: "16s", animationDelay: "-4s", transform: "rotate(45deg) scale(1.28)" }} />
  <div className="heart" style={{ left: "68%", animationDuration: "13s", animationDelay: "-7s" }} />
  <div className="heart" style={{ left: "82%", animationDuration: "15s", animationDelay: "-1s", transform: "rotate(45deg) scale(0.95)" }} />
</div>


      <div className="card">
        <div className="brand">
          <div className="logo" aria-label="Logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 21s-7-4.5-9.5-9C.2 8.6 2.3 5 6.4 5c2 0 3.4 1 4.6 2.4C12.2 6 13.6 5 15.6 5c4.1 0 6.2 3.6 3.9 7-2.5 4.5-9.5 9-9.5 9z"
                fill="white"
                opacity="0.95"
              />
            </svg>
          </div>
          <div>
            <h1 className="title">Modern Dating</h1>
            <p className="subtitle">Match • Chat • Connect</p>
          </div>
        </div>

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
            onClick={logIn}
            disabled={!canSubmit}
            className={`btn btnPrimary ${!canSubmit ? "btnDisabled" : ""}`}
          >
            Log in
          </button>

          <button
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
    </main>
  );
}
