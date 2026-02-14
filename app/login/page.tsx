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
    <main className="glass-bg">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* ===== Background gradient ===== */
            .glass-bg {
              min-height: 100vh;
              display:flex;
              align-items:center;
              justify-content:center;
              padding: 20px;
              background: linear-gradient(135deg, #0f172a, #1e293b, #020617);
            }

            /* ===== Glass card ===== */
            .card {
              width:100%;
              max-width:420px;
              padding:30px;
              border-radius:28px;
              background: rgba(255,255,255,0.08);
              backdrop-filter: blur(18px);
              border:1px solid rgba(255,255,255,0.18);
              box-shadow: 0 20px 50px rgba(0,0,0,0.5);
              animation: fadeIn 0.6s ease;
            }

            @keyframes fadeIn {
              from { opacity:0; transform: translateY(10px);}
              to { opacity:1; transform: translateY(0);}
            }

            .title {
              font-size:26px;
              font-weight:900;
              color:white;
              margin-bottom:4px;
            }

            .subtitle {
              font-size:14px;
              color:rgba(255,255,255,0.7);
              margin-bottom:20px;
            }

            .label {
              font-size:13px;
              font-weight:800;
              color:rgba(255,255,255,0.85);
              margin-top:10px;
            }

            .input {
              width:100%;
              padding:12px 14px;
              margin-top:6px;
              border-radius:14px;
              border:1px solid rgba(255,255,255,0.2);
              background: rgba(255,255,255,0.05);
              color:white;
              outline:none;
            }

            .input:focus {
              border-color: rgba(99,102,241,0.8);
              box-shadow: 0 0 0 4px rgba(99,102,241,0.2);
            }

            .btnRow {
              display:flex;
              gap:10px;
              margin-top:18px;
            }

            .btn {
              flex:1;
              padding:12px;
              border-radius:14px;
              border:none;
              font-weight:900;
              cursor:pointer;
              transition: all .15s ease;
            }

            .btnPrimary {
              background: linear-gradient(135deg,#6366f1,#8b5cf6);
              color:white;
            }

            .btnSecondary {
              background: rgba(255,255,255,0.12);
              color:white;
            }

            .btn:hover {
              transform: translateY(-1px);
              opacity:0.95;
            }

            .btnDisabled {
              opacity:0.4;
              cursor:not-allowed;
            }

            .status {
              margin-top:14px;
              padding:12px;
              border-radius:14px;
              background: rgba(255,255,255,0.08);
              border:1px solid rgba(255,255,255,0.15);
              color:white;
              font-weight:700;
            }
          `,
        }}
      />

      <div className="card">
        <div className="title">Welcome Back</div>
        <div className="subtitle">Log in or create an account</div>

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
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
      </div>
    </main>
  );
}
