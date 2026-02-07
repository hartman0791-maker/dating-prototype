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
      <linearGradient id="veil" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(0,0,0,0.05)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.45)"/>
      </linearGradient>
    </defs>
    <rect width="1600" height="900" fill="url(#bg)"/>
    <rect width="1600" height="900" fill="url(#glow)"/>
    <rect width="1600" height="900" fill="url(#veil)"/>
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

/**
 * Replace this with your own image URL if you have one:
 * - Put an image in /public (e.g. /public/login.jpg)
 * - Then set: const PHOTO_URL = "/login.jpg";
 *
 * This default is an inline SVG "photo" placeholder so it always works.
 */
const PHOTO_URL =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="60%" stop-color="#111827"/>
        <stop offset="100%" stop-color="#0b1220"/>
      </linearGradient>
      <radialGradient id="r" cx="35%" cy="30%" r="60%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.18)"/>
        <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
      </radialGradient>
    </defs>
    <rect width="1200" height="900" fill="url(#g)"/>
    <rect width="1200" height="900" fill="url(#r)"/>
    <g opacity="0.20">
      <circle cx="920" cy="260" r="160" fill="white"/>
      <circle cx="1020" cy="340" r="120" fill="white"/>
      <circle cx="860" cy="360" r="120" fill="white"/>
    </g>
    <g opacity="0.22">
      <path d="M610 360c-58-88-200-30-200 72 0 110 200 216 200 216s200-106 200-216c0-102-142-160-200-72z" fill="white"/>
    </g>
    <text x="54" y="810" fill="rgba(255,255,255,0.70)" font-size="44" font-family="system-ui,Segoe UI,Roboto,Arial" font-weight="700">
      Find your match
    </text>
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
    <main className="bg">
      <style>{`
        :root{
          --card:#ffffff;
          --ink:#0b1220;
          --muted:#5b6475;
          --shadow: 0 22px 70px rgba(0,0,0,.28);
          --radius: 22px;

          --btn:#111827;
          --btnHover:#0b1220;
          --btnText:#ffffff;

          --stroke: rgba(17,24,39,.10);
          --fieldBg: rgba(15,23,42,.04);

          --ring: rgba(59,130,246,.22);
          --ringBorder: rgba(59,130,246,.55);
        }

        .bg{
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

        .wrap{ width:min(980px, 100%); }

        .topLine{
          text-align:center;
          color:rgba(255,255,255,.78);
          font-size:12px;
          margin:0 0 12px 0;
        }

        .shell{
          display:grid;
          grid-template-columns: 1fr;
          gap:16px;
        }

        .card{
          background:var(--card);
          border-radius:var(--radius);
          box-shadow:var(--shadow);
          overflow:hidden;
          border: 1px solid rgba(255,255,255,.12);
        }

        /* Elegant split layout on desktop */
        @media (min-width: 860px){
          .shell{
            grid-template-columns: 1.1fr 0.9fr;
            align-items:stretch;
          }
          .photo{
            min-height: 520px;
          }
        }

        .photo{
          position:relative;
          border-radius: var(--radius);
          overflow:hidden;
          box-shadow: 0 22px 70px rgba(0,0,0,.28);
          border: 1px solid rgba(255,255,255,.12);
          min-height: 260px;
          background: #0b1220;
        }
        .photoImg{
          position:absolute;
          inset:0;
          width:100%;
          height:100%;
          object-fit:cover;
          transform: scale(1.02);
          filter: saturate(1.05) contrast(1.02);
        }
        .photoVeil{
          position:absolute;
          inset:0;
          background:
            radial-gradient(900px 520px at 10% 10%, rgba(255,255,255,.12), transparent 60%),
            linear-gradient(180deg, rgba(0,0,0,.12), rgba(0,0,0,.55));
        }
        .photoText{
          position:absolute;
          left:18px;
          right:18px;
          bottom:16px;
          color:white;
          z-index:1;
        }
        .photoText .big{
          font-size:28px;
          font-weight:950;
          letter-spacing:-0.02em;
          margin:0;
        }
        .photoText .small{
          margin-top:6px;
          font-size:13px;
          opacity:.88;
        }

        .hero{
          position:relative;
          height:170px;
          background-image:url(${HERO_ILLUSTRATION});
          background-size:cover;
          background-position:center;
        }
        .hero::after{
          content:"";
          position:absolute;
          inset:0;
          background: linear-gradient(180deg, rgba(0,0,0,.06), rgba(0,0,0,.42));
        }
        .heroInner{
          position:absolute;
          left:18px;
          right:18px;
          bottom:14px;
          z-index:1;
          color:white;
          display:flex;
          align-items:center;
          gap:10px;
        }
        .logo{
          width:40px;height:40px;border-radius:14px;
          background:rgba(255,255,255,.20);
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

        .body{ padding:22px; }

        h1{
          margin:0 0 8px 0;
          font-size:30px;
          letter-spacing:-0.02em;
        }
        .sub{
          margin:0 0 14px 0;
          color:var(--muted);
          font-size:14px;
          line-height:1.5;
        }

        .status{
          margin-top:12px;
          padding:12px;
          border-radius:14px;
          background:rgba(255,244,235,.92);
          border:1px solid rgba(255,170,120,.35);
          font-size:13px;
        }

        .grid{ display:grid; gap:10px; margin-top:14px; }

        .label{
          font-size:12px;
          font-weight:800;
          color:var(--muted);
          margin-left:2px;
        }

        .input{
          width:100%;
          padding:13px 14px;
          border-radius:14px;
          border:1px solid var(--stroke);
          background:var(--fieldBg);
          font-size:15px;
          outline:none;
          font-family:inherit;
          transition: box-shadow .15s ease, border-color .15s ease, background .15s ease;
        }
        .input:focus{
          border-color: var(--ringBorder);
          box-shadow: 0 0 0 4px var(--ring);
          background:white;
        }

        .btnRow{
          display:flex;
          gap:10px;
          margin-top:12px;
        }

        .btn{
          width:100%;
          border:0;
          border-radius:14px;
          padding:12px 14px;
          cursor:pointer;
          font-weight:900;
          font-family:inherit;
          transition: transform .06s ease, background .15s ease, opacity .15s ease;
        }
        .btn:active{ transform: translateY(1px); }

        .btnPrimary{
          background: var(--btn);
          color: var(--btnText);
        }
        .btnPrimary:hover{ background: var(--btnHover); }

        .btnSoft{
          background: rgba(17,24,39,.06);
          border: 1px solid var(--stroke);
          color: #111827;
        }
        .btnSoft:hover{ background: rgba(17,24,39,.09); }

        .footer{
          margin-top:14px;
          text-align:center;
          color:rgba(255,255,255,.68);
          font-size:12px;
        }
      `}</style>

      <div className="wrap">
        <p className="topLine">A simple prototype login for your dating app.</p>

        <div className="shell">
          {/* LEFT: Photo panel (elegant + premium feel) */}
          <section className="photo" aria-label="Photo panel">
            <img className="photoImg" src={PHOTO_URL} alt="Dating app hero" />
            <div className="photoVeil" />
            <div className="photoText">
              <p className="big">Meet people who match your vibe</p>
              <div className="small">Swipe. Match. Chat. It starts here.</div>
            </div>
          </section>

          {/* RIGHT: Login card */}
          <section className="card" aria-label="Login card">
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

            <div className="body">
              <h1>Welcome</h1>
              <p className="sub">Log in or create an account to start swiping.</p>

              {status && <div className="status">{status}</div>}

              <div className="grid">
                <div className="label">Email</div>
                <input
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  autoComplete="email"
                />

                <div className="label" style={{ marginTop: 6 }}>
                  Password
                </div>
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
              </div>
            </div>
          </section>
        </div>

        <div className="footer">© 2026 YourSite</div>
      </div>
    </main>
  );
}
