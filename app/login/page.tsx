"use client";
export {};

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 3 && password.trim().length >= 6 && !loading,
    [email, password, loading]
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) window.location.href = "/discover";
    })();
  }, []);

  async function signUp() {
    if (!canSubmit) return;
    setLoading(true);
    setStatus("Creating account...");

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
    });

    setLoading(false);

    if (error) return setStatus(`Error: ${error.message}`);

    // If email confirmation is enabled, session may be null
    if (!data.session) {
      setStatus("Account created ✅ Check your email to confirm, then log in.");
      return;
    }

    setStatus("Account created ✅ Redirecting...");
    window.location.href = "/discover";
  }

  async function logIn() {
    if (!canSubmit) return;
    setLoading(true);
    setStatus("Logging in...");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });

    setLoading(false);

    if (error) return setStatus(`Error: ${error.message}`);
    window.location.href = "/discover";
  }

  return (
    <main className="romantic-bg">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .romantic-bg{
              min-height: 100vh;
              padding: 20px;
              display:flex;
              align-items:center;
              justify-content:center;
              background: radial-gradient(circle at 30% 20%, #ffd6e7 0%, #ffe9f2 28%, #fff1e6 55%, #fff8fb 100%);
              position: relative;
              overflow:hidden;
              animation: bgShift 10s ease-in-out infinite alternate;
            }
            @keyframes bgShift{
              0%   { filter: hue-rotate(0deg) saturate(1.02); transform: translateZ(0); }
              100% { filter: hue-rotate(-8deg) saturate(1.06); transform: translateZ(0); }
            }

            .hearts{
              position:absolute;
              inset:0;
              pointer-events:none;
              opacity: 0.55;
              filter: blur(0.2px);
            }
            .heart{
              position:absolute;
              width: 18px;
              height: 18px;
              transform: rotate(45deg);
              background: rgba(255, 77, 121, 0.18);
              box-shadow: 0 10px 35px rgba(255, 77, 121, 0.25);
              border-radius: 4px;
              animation: floatUp linear infinite;
            }
            .heart:before,
            .heart:after{
              content:"";
              position:absolute;
              width: 18px;
              height: 18px;
              background: rgba(255, 77, 121, 0.18);
              border-radius: 50%;
            }
            .heart:before{ left:-9px; top:0; }
            .heart:after{ top:-9px; left:0; }

            @keyframes floatUp{
              0%{
                transform: translateY(20vh) rotate(45deg) scale(0.95);
                opacity: 0;
              }
              15%{ opacity: 0.9; }
              100%{
                transform: translateY(-120vh) rotate(45deg) scale(1.25);
                opacity: 0;
              }
            }

            .card{
              width: 100%;
              max-width: 460px;
              border-radius: 28px;
              padding: 26px;
              background: rgba(255,255,255,0.84);
              backdrop-filter: blur(14px);
              border: 1px solid rgba(255,255,255,0.65);
              box-shadow: 0 22px 60px rgba(255, 77, 121, 0.18);
              animation: romanticIn 800ms cubic-bezier(.2,.9,.2,1) both;
            }
            @keyframes romanticIn{
              from{ transform: translateY(14px) scale(0.98); opacity: 0; }
              to  { transform: translateY(0) scale(1); opacity: 1; }
            }

            .brandRow{ display:flex; align-items:center; gap: 12px; margin-bottom: 12px; }
            .logo{
              width: 44px; height: 44px; border-radius: 16px;
              display:grid; place-items:center;
              background: linear-gradient(135deg, #ff4d79, #ff9a3c);
              box-shadow: 0 14px 26px rgba(255, 77, 121, 0.22);
            }
            .title{ font-size: 22px; font-weight: 950; letter-spacing: -0.3px; margin: 0; color: #1f2937; }
            .subtitle{ margin: 4px 0 0 0; font-size: 13px; color: rgba(31,41,55,0.70); font-weight: 700; }

            .label{ font-size: 13px; font-weight: 900; color: rgba(31,41,55,0.82); margin-top: 10px; }
            .input{
              width: 100%;
              margin-top: 8px;
              padding: 12px 14px;
              border-radius: 16px;
              border: 1px solid rgba(0,0,0,0.10);
              background: rgba(255,255,255,0.92);
              outline: none;
              font-weight: 800;
              transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
            }
            .input:focus{
              border-color: rgba(255, 77, 121, 0.45);
              box-shadow: 0 0 0 5px rgba(255, 77, 121, 0.12);
              transform: translateY(-1px);
            }

            .btnRow{ display:flex; gap: 10px; margin-top: 16px; }
            .btn{
              flex: 1;
              border: none;
              border-radius: 16px;
              padding: 12px 14px;
              cursor: pointer;
              font-weight: 950;
              letter-spacing: -0.2px;
              transition: transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease;
            }
            .btn:active{ transform: translateY(1px); }
            .btnPrimary{
              color: white;
              background: linear-gradient(135deg, #ff4d79, #ff9a3c);
              box-shadow: 0 16px 30px rgba(255, 77, 121, 0.22);
            }
            .btnSecondary{
              color: rgba(31,41,55,0.88);
              background: rgba(255,255,255,0.95);
              border: 1px solid rgba(0,0,0,0.08);
              box-shadow: 0 10px 22px rgba(0,0,0,0.06);
            }
            .btnDisabled{ opacity: 0.55; cursor: not-allowed; }

            .status{
              margin-top: 14px;
              padding: 12px;
              border-radius: 16px;
              background: rgba(255, 244, 235, 0.92);
              border: 1px solid rgba(255, 77, 121, 0.18);
              font-weight: 800;
              color: rgba(31,41,55,0.84);
            }

            .finePrint{
              margin-top: 14px;
              font-size: 12px;
              color: rgba(31,41,55,0.62);
              font-weight: 700;
              line-height: 1.35;
            }
          `,
        }}
      />

      <div className="hearts" aria-hidden="true">
        <div className="heart" style={{ left: "10%", animationDuration: "9s", animationDelay: "0s" }} />
        <div className="heart" style={{ left: "22%", animationDuration: "11s", animationDelay: "-2s" }} />
        <div className="heart" style={{ left: "36%", animationDuration: "10s", animationDelay: "-5s" }} />
        <div className="heart" style={{ left: "52%", animationDuration: "12s", animationDelay: "-3s" }} />
        <div className="heart" style={{ left: "68%", animationDuration: "9.5s", animationDelay: "-6s" }} />
        <div className="heart" style={{ left: "82%", animationDuration: "11.5s", animationDelay: "-1s" }} />
      </div>

      <div className="card">
        <div className="brandRow">
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
            <h1 className="title">Modern & Catchy Dating</h1>
            <p className="subtitle">Match • Chat • Connect</p>
          </div>
        </div>

        <p style={{ margin: "6px 0 0 0", fontWeight: 850, color: "rgba(31,41,55,0.78)" }}>
          Welcome back 💕 Log in or create an account to start swiping.
        </p>

        {status && <div className="status">{status}</div>}

        <div style={{ marginTop: 14 }}>
          <div className="label">Email</div>
          <input
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            autoComplete="email"
            aria-label="Email"
          />

          <div className="label">Password</div>
          <input
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            aria-label="Password"
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
              {loading ? "Logging in..." : "Log in"}
            </button>

            <button
              onClick={signUp}
              disabled={!canSubmit}
              className={`btn btnSecondary ${!canSubmit ? "btnDisabled" : ""}`}
            >
              {loading ? "Creating..." : "Sign up"}
            </button>
          </div>

          <div className="finePrint">
            By continuing, you agree to be respectful and kind. You can block/report anyone at any time.
          </div>
        </div>
      </div>
    </main>
  );
}
