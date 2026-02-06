"use client";
export {};

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import AppHeader from "../../components/AppHeader";

type DiscoveryRow = {
  id: string;
  name: string | null;
  bio: string | null;
  location_text: string | null;
  avatar_path: string | null;
};

type ViewProfile = DiscoveryRow & { avatar_signed_url: string | null };

const FALLBACK_AVATAR =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="900">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#ff4d79"/>
        <stop offset="100%" stop-color="#ff9a3c"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="450" cy="360" r="140" fill="rgba(255,255,255,0.35)"/>
    <rect x="210" y="520" width="480" height="280" rx="140" fill="rgba(255,255,255,0.35)"/>
  </svg>
`);

export default function DiscoverPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ViewProfile[]>([]);
  const [current, setCurrent] = useState<ViewProfile | null>(null);
  const [status, setStatus] = useState("");
  const [anim, setAnim] = useState<"in" | "out">("in");

  const signedUrlCache = useRef<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        window.location.href = "/login";
        return;
      }
      setUserId(data.session.user.id);
      await loadProfiles();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function getSignedAvatarUrl(path: string) {
    if (signedUrlCache.current[path]) return signedUrlCache.current[path];
    const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
    if (error) return null;
    signedUrlCache.current[path] = data.signedUrl;
    return data.signedUrl;
  }

  async function attachSignedUrls(list: DiscoveryRow[]): Promise<ViewProfile[]> {
    const out: ViewProfile[] = [];
    for (const p of list) {
      let signed: string | null = null;
      if (p.avatar_path) signed = await getSignedAvatarUrl(p.avatar_path);
      out.push({ ...p, avatar_signed_url: signed });
    }
    return out;
  }

  async function loadProfiles() {
    setStatus("Loading...");
    const { data, error } = await supabase.rpc("get_discovery_profiles", { limit_count: 10 });
    if (error) return setStatus(`Error: ${error.message}`);

    const raw = (data ?? []) as DiscoveryRow[];
    const list = await attachSignedUrls(raw);

    setProfiles(list);
    setCurrent(list[0] ?? null);
    setStatus(list.length ? "" : "No more profiles.");
  }

  async function swipe(direction: "like" | "pass") {
    if (!current) return;

    setAnim("out");
    setTimeout(async () => {
      const targetId = current.id;
      const remaining = profiles.slice(1);
      setProfiles(remaining);
      setCurrent(remaining[0] ?? null);
      setAnim("in");

      const { data, error } = await supabase.rpc("swipe_and_maybe_match", {
        target_user_id: targetId,
        swipe_dir: direction,
      });

      if (error) return setStatus(`Error: ${error.message}`);

      const result = Array.isArray(data) ? data[0] : data;
      if (result?.matched) setStatus(`It's a match! match_id: ${result.match_id}`);
      else setStatus("");

      if (remaining.length < 3) loadProfiles();
    }, 180);
  }

  async function resetMySwipes() {
    if (!userId) return;
    const ok = window.confirm("Reset your swipes? You'll see profiles again.");
    if (!ok) return;

    setStatus("Resetting swipes...");
    const { error } = await supabase.from("swipes").delete().eq("swiper_id", userId);
    if (error) return setStatus(`Reset failed: ${error.message}`);

    setStatus("Swipes reset ✅ Reloading...");
    await loadProfiles();
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const photoUrl = current?.avatar_signed_url || FALLBACK_AVATAR;

  return (
    <main className="app-container">
      <style>{`
        .card { transition: transform 180ms ease, opacity 180ms ease; will-change: transform, opacity; }
        .card.in { opacity: 1; transform: translateY(0) scale(1); }
        .card.out { opacity: 0; transform: translateY(10px) scale(0.98); }
      `}</style>

      <AppHeader
        right={
          <>
            <button className="btn btn-gray" onClick={() => (window.location.href = "/matches")}>💬 Matches</button>
            <button className="btn btn-gray" onClick={() => (window.location.href = "/profile")}>👤 Profile</button>
            <button className="btn btn-soft" onClick={resetMySwipes}>🔄 Reset</button>
            <button className="btn btn-gray" onClick={logout}>🚪 Logout</button>
          </>
        }
      />

      {userId && <p style={{ fontSize: 12, opacity: 0.75, margin: "0 0 12px 0" }}>Logged in as: {userId}</p>}

      {status && (
        <div style={{ padding: 12, borderRadius: 14, background: "rgba(255, 244, 235, 0.85)", marginBottom: 12 }}>
          {status}
        </div>
      )}

      {!current ? (
        <button className="btn btn-gray btn-full" onClick={loadProfiles}>Reload</button>
      ) : (
        <div
          className={`card ${anim}`}
          style={{
            padding: 20,
            borderRadius: 22,
            background: "linear-gradient(180deg, var(--card-solid), rgba(238,242,247,0.8))",
            border: "1px solid var(--border)",
            boxShadow: "0 14px 28px rgba(0,0,0,0.10)",
          }}
        >
          <div
            style={{
              height: 260,
              borderRadius: 18,
              backgroundImage: `url(${photoUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              marginBottom: 16,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.35) 100%)" }} />
            <div style={{ position: "absolute", left: 14, bottom: 12, color: "white" }}>
              <div style={{ fontWeight: 950, fontSize: 20 }}>{current.name ?? "Unnamed"}</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>{current.location_text ?? "No location"}</div>
            </div>
          </div>

          <p style={{ margin: "0 0 10px 0", color: "var(--muted)" }}>{current.bio ?? "No bio yet."}</p>

          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn btn-gray" style={{ flex: 1, borderRadius: 30, padding: 14 }} onClick={() => swipe("pass")}>
              ❌ Pass
            </button>
            <button className="btn btn-warm" style={{ flex: 1, borderRadius: 30, padding: 14 }} onClick={() => swipe("like")}>
              ❤️ Like
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
