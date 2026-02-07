'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Mode = 'login' | 'signup';

export default function HomeLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const title = useMemo(
    () => (mode === 'login' ? 'Welcome back' : 'Create your account'),
    [mode]
  );

  useEffect(() => {
    // If already logged in, go straight to discover
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace('/discover');
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);

    try {
      if (!email || !password) {
        setMsg('Please enter email and password.');
        return;
      }

      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/discover');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        // Depending on your Supabase settings, user may need email confirmation
        setMsg('Account created. If email confirmation is enabled, check your inbox.');
        // If confirmation is OFF, you’ll already have a session and can redirect:
        const { data } = await supabase.auth.getSession();
        if (data.session) router.push('/discover');
      }
    } catch (err: any) {
      setMsg(err?.message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="authBg">
      <div className="authWrap">
        <div className="brand">
          <div className="brandTitle">Modern &amp; Catchy Dating</div>
          <div className="brandSub">Match • Chat • Connect</div>
        </div>

        <div className="card">
          <h1 className="h1">{title}</h1>
          <p className="sub">
            {mode === 'login'
              ? 'Log in to start swiping.'
              : 'Sign up to start matching and chatting.'}
          </p>

          <form onSubmit={onSubmit} className="form">
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              required
            />

            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              required
            />

            {msg ? <div className="msg">{msg}</div> : null}

            <div className="btnRow">
              <button className="btnPrimary" type="submit" disabled={busy}>
                {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
              </button>

              <button
                className="btnSecondary"
                type="button"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                disabled={busy}
              >
                {mode === 'login' ? 'Create account' : 'I already have an account'}
              </button>
            </div>
          </form>

          <div className="fineprint">
            By continuing, you agree to our <a href="#">Terms</a> and <a href="#">Privacy</a>.
          </div>
        </div>

        <div className="footer">© 2026 YourSite</div>
      </div>
    </main>
  );
}
