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
          background: rgba(255,25
