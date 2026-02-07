"use client";
export {};

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

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
    <main className="moneyBg">
      <style>{`
        :root{
          --bgA:#ff4d79;
          --bgB:#ff7d54;
          --bgC:#ff9a3c;
          --card:#ffffff;
          --ink:#0b1220;
          --muted:#5b6475;
          --shadow: 0 18px 60px rgba(0,0,0,.25);
          --radius: 20px;
          --btn:#111827;
          --btnHover:#0b1220;
          --btnText:#ffffff;
          --stroke: rgba(17,24,39,.10);
          --fieldBg: rgba(15,23,42,.04);
          --link:#334155;
        }

        .moneyBg{
          min-height:100vh;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:24px;
          background:
            radial-gradient(1200px 800px at 20% 10%, rgba(255,255,255,.14), transparent 55%),
            linear-gradient(160deg, #0f172a, #111827);
          color:var(--ink);
        }

        .wrap{
          width:min(720px, 100%);
        }

        .topDisclosure{
          text-align:center;
          color:rgba(255,255,255,.78);
          font-size:12px;
          line-height:1.4;
          margin:0 0 12px 0;
        }
        .topDisclosure a{
          color:rgba(255,255,255,.9);
          text-decoration:underline;
        }

        .card{
          background:var(--card);
          border-radius:var(--radius);
          box-shadow:var(--shadow);
          overflow:hidden;
        }

        .hero{
          position:relative;
          height:190px;
          background-image: url(${HERO_ILLUSTRATION});
          background-size: cover;
          background-position:center;
        }
        .hero::after{
          content:"";
          position:absolute;
          inset:0;
          background: linear-gradient(180deg, rgba(0,0,0,.08) 0%, rgba(0,0,0,.36) 100%);
        }
        .heroInner{
          position:absolute;
          left:18px;
          right:18px;
          bottom:16px;
          z-index:1;
          color:white;
          display:flex;
          align-items:center;
          gap:10px;
        }
        .logo{
          width:40px;height:40px;border-radius:14px;
          background: rgba(255,255,255,.20);
          border:1px solid rgba(255,255,255,.28);
          display:grid;place-items:center;
          backdrop-filter: blur(6px);
        }
        .brandTitle{
          font-size:20px;
          font-weight:950;
          letter-spacing:-0.02em;
          margin:0;
        }
        .brandSub{
          margin-top:4px;
          font-size:13px;
          opacity:.92;
        }

        .body{
          padding:22px;
        }

        h1{
          margin:0 0 8px 0;
          font-size:30px;
          letter-spacing:-0.02em;
        }
        .sub{
          margin:0 0 16px 0;
          color:var(--muted);
          font-size:14px;
          line-height:1.5;
        }

        .status{
          margin: 12px 0 0 0;
          padding: 12px;
          border-radius: 14px;
          background: rgba(255, 244, 235, 0.9);
          border: 1px solid rgba(255, 170, 120, 0.35);
          font-size: 13px;
        }

        .grid{
          display:grid;
          gap:10px;
          margin-top:14px;
        }

        .label{
          font-size:12px;
          font-weight:800;
          color: var(--muted);
          margin: 2px 0 -2px 2px;
        }

        .input{
          width:100%;
          padding: 13px 14px;
          border-radius: 14px;
          border: 1px solid var(--stroke);
          background: var(--fieldBg);
          font-size: 15px;
          outline: none;
          font-family: inherit;
        }
        .input:focus{
          border-color: rgba(59,130,246,.55);
          box-shadow: 0 0 0 4px rgba(59,130,246,.15);
          background: white;
        }

        .btnRow{
          display:flex;
          gap:10px;
          margin-top: 12px;
        }

        .btn{
          border:0;
          border-radius:14px;
          padding: 12px 14px;
          cursor:pointer;
          font-weight: 900;
          font-family: inherit;
          transition: transform .06s ease, background .15s ease, opacity .15s ease;
          width:100%;
        }
        .btn:active{ transform: translateY(1px); }

        /* Money-like: big dark primary buttons */
        .btnPrimary{
          background: var(--btn);
          color: var(--btnText);
        }
        .btnPrimary:hover{ background: var(--btnHover); }

        /* Soft secondary button */
        .btnSoft{
          background: rgba(17,24,39,.06);
          color: #111827;
          border: 1px solid var(--stroke);
        }
        .btnSoft:hover{ background: rgba(17,24,39,.09); }

        .consent{
          margin-top: 12px;
          font-size: 12px;
          color: var(--muted);
          line-height: 1.4;
        }
        .consent a{
          color: var(--link);
          text-decoration: underline;
        }

        .secondaryLink{
          margin-top: 10px;
          font-size: 13px;
          color: var(--muted);
        }
        .secondaryLink a{
          color: var(--link);
          text-decoration:none;
          font-weight:700;
        }
        .secondaryLink a:hover{ text-decoration: underline; }

        .footer{
          margin-top: 14px;
          text-align:center;
          color: rgba(255,255,255,.68);
          font-size: 12px;
          line-height: 1.4;
        }

        @media (min-width: 640px){
          .btnRow{ gap:12px; }
          h1{ font-size: 34px; }
          .hero{ height: 210px; }
        }
      `}</style>

      <div className="wrap">
       
        <p className="topDisclosure">
      
          <a href="#" aria-label="Learn more">Learn more</a>
        </p>

        <div className="card">
          {/* Hero header */}
          <div className="hero">
            <div className="heroInner">
              <div className="logo" aria-label="Logo">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 21s-7-4.5-9.5-9C.2 8.6 2.3 5 6.4 5c2 0 3.4 1 4.6 2.4C12.2 6 13.6 5 15.6 5c4.1 0 6.2 3.6 3.9 7-2.5 4.5-9.5 9-9.5 9z"
                    fill="white"
                    opacity="0.95"
                  />
                </svg>
              </div>
              <div>
                <div className="brandTitle">Modern &amp; Catchy Dating</div>
                <div className="brandSub">Match • Chat • Connect</div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="body">
            <h1>Find your perfect match</h1>
            <p className="sub">
              Log in or create an account to start swiping.
            </p>

            {status ? <div className="status">{status}</div> : null}

            <div className="grid">
              <div className="label">Email</div>
              <input
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
              />

              <div className="label" style={{ marginTop: 6 }}>Password</div>
              <input
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
              />

              <div className="btnRow">
                <button
                  onClick={logIn}
                  disabled={!canSubmit}
                  className="btn btnPrimary"
                  style={{ opacity: canSubmit ? 1 : 0.6 }}
                >
                  Log in
                </button>

                <button
                  onClick={signUp}
                  disabled={!canSubmit}
                  className="btn btnSoft"
                  style={{ opacity: canSubmit ? 1 : 0.6 }}
                >
                  Sign up
                </button>
              </div>

              <div className="consent">
                By continuing, you agree to our <a href="#">Privacy Notice</a> and{" "}
                <a href="#">Terms of Use</a>.
              </div>

              <div className="secondaryLink">
                <a href="/discover" onClick={(e) => { e.preventDefault(); window.location.href = "/discover"; }}>
                  No thanks, continue
                </a>
              </div>
            </div>
          </div>
        </div>

      
    </main>
  );
}
