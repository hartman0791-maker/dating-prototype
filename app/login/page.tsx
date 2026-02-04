"use client";
export {};

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    // If already logged in, go to discover
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = "/discover";
    });
  }, []);

  async function signUp() {
    setMsg("Signing up...");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return setMsg(`Error: ${error.message}`);
    setMsg("Signup successful. If email confirmation is enabled, check your email. Otherwise you can log in now.");
  }

  async function signIn() {
    setMsg("Signing in...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setMsg(`Error: ${error.message}`);
    window.location.href = "/discover";
  }

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>Login</h1>

      <label style={{ display: "block", marginTop: 12 }}>
        Email
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          style={{ width: "100%", padding: 10, marginTop: 6 }}
        />
      </label>

      <label style={{ display: "block", marginTop: 12 }}>
        Password
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          style={{ width: "100%", padding: 10, marginTop: 6 }}
        />
      </label>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={signIn} style={{ flex: 1, padding: "10px 12px" }}>
          Log in
        </button>
        <button onClick={signUp} style={{ flex: 1, padding: "10px 12px" }}>
          Sign up
        </button>
      </div>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}

      <p style={{ marginTop: 16 }}>
        After logging in, go to <b>/discover</b>.
      </p>
    </main>
  );
}
