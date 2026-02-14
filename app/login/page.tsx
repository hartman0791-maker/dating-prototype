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
    <main className="romantic-bg">
      <style
        dangerouslySetInnerHTML={{
          __html: `

      /* ===== Elegant gradient background ===== */
      .romantic-bg{
        min-height: 100vh;
        padding: 20px;
        display:flex;
        align-items:center;
        justify-content:center;
        background: radial-gradient(circle at 20% 20%, #f8fafc 0%, #eef2f7 35%, #e5e7eb 65%, #f9fafb 100%);
        position: relative;
        overflow:hidden;
      }

      /* ===== Glow blobs ===== */
      .romantic-bg::before,
      .romantic-bg::after{
        content:"";
        position:absolute;
        width: 400px;
        height: 400px;
        border-radius:50%;
        filter: blur(90px);
        opacity:0.35;
      }

      .romantic-bg::before{
        background:#c4b5fd;
        top:-120px;
        left:-120px;
      }

      .romantic-bg::after{
        background:#fbcfe8;
        bottom:-120px;
        right:-120px;
      }

      /* ===== Glass card ===== */
      .card{
        width: 100%;
        max-width: 460px;
        border-radius: 28px;
        padding: 28px;
        background: rgba(255,255,255,0.65);
        backdrop-filter: blur(18px);
        border: 1px solid rgba(255,255,255,0.4);
        box-shadow: 0 20px 60px rgba(0,0,0,0.12);
        animation: fadeIn 0.6s ease-out;
      }

      @keyframes fadeIn{
        from{ opacity:0; transform: translateY(10px); }
        to{ opacity:1; transform: translateY(0); }
      }

      .brandRow{
        display:flex;
        align-items:center;
        gap: 12px;
        margin-bottom: 12px;
      }

      .logo{
        width: 44px;
        height: 44px;
        border-radius: 14px;
        display:grid;
        place-items:center;
        background: linear-gradient(135deg,#6366f1,#ec4899);
        color:white;
        font-weight:900;
      }

      .title{
        font-size: 24px;
        font-weight: 900;
        color:#111827;
        margin:0;
      }

      .subtitle{
        color:#6b7280;
        font-weight:600;
        margin:0;
        font-size:13px;
      }

      .label{
        font-size:13px;
        font-weight:700;
        margin-top:12px;
      }

      /* ===== Inputs ===== */
      .input{
        width: 100%;
        margin-top: 6px;
        padding: 12px 14px;
        border-radius: 14px;
        border: 1px solid rgba(0,0,0,0.08);
        background: rgba(255,255,255,0.8);
        outline:none;
        font-weight:600;
        transition: all .2s ease;
      }

      .input:focus{
        border-color:#6366f1;
        box-shadow: 0 0 0 4px rgba(99,102,241,0.15);
      }

      .btnRow{
        display:flex;
        gap:10px;
        margin-top:16px;
      }

      .btn{
        flex:1;
        border:none;
        border-radius: 14px;
        padding:12px;
        font-weight:800;
        cursor:pointer;
        transition:.2s ease;
      }

      .btnPrimary{
        color:white;
        background: linear-gradient(135deg,#6366f1,#ec4899);
        box-shadow: 0 10px 25px rgba(99,102,241,0.25);
      }

      .btnPrimary:hover{
        transform: translateY(-1px);
        box-shadow: 0 14px 30px rgba(99,102,241,0.35);
      }

      .btnSecondary{
        background: rgba(255,255,255,0.85);
        border:1px solid rgba(0,0,0,0.08);
      }

      .btnDisabled{
        opacity:.5;
        cursor:not-allowed;
      }

      .status{
        margin-top: 14px;
        padding: 12px;
        border-radius: 14px;
        background: rgba(255,255,255,0.8);
        border:1px solid rgba(0,0,0,0.05);
      }

      .finePrint{
        margin-top: 14px;
        font-size:12px;
        color:#6b7280;
        font-weight:600;
      }

      `,
        }}
      />

      <div className="card">
        <div className="brandRow">
          <div className="logo">❤</div>
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
        />

        <div className="label">Password</div>
        <input
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="••••••••"
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
          Be kind and respectful ❤️ You can block or report never rami.
        </div>
      </div>
    </main>
  );
}
