"use client";
export {};

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import AppHeader from "../../components/AppHeader";

type MatchRow = {
  id: string;
  user_low: string;
  user_high: string;
  created_at: string;
};

type Profile = {
  id: string;
  name: string | null;
  bio: string | null;
  location_text: string | null;
  avatar_path: string | null;
};

type ProfileView = Profile & { avatar_signed_url: string | null };

const FALLBACK_AVATAR =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#ff4d79"/>
        <stop offset="100%" stop-color="#ff9a3c"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="300" cy="240" r="90" fill="rgba(255,255,255,0.35)"/>
    <rect x="150" y="340" width="300" height="170" rx="85" fill="rgba(255,255,255,0.35)"/>
  </svg>
`);

export default function MatchesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileView>>({});
  const [status, setStatus] = useState("");

  const signedUrlCache = useRef<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        window.location.href = "/login";
        return;
      }
      setUserId(data.session.user.id);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    loadMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function getSignedAvatarUrl(path: string) {
    if (signedUrlCache.current[path]) return signedUrlCache.current[path];
    const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
    if (error) return null;
    signedUrlCache.current[path] = data.signedUrl;
    return data.signedUrl;
  }

  async function loadMatches() {
    setStatus("Loading matches...");

    const { data: matchData, error: matchErr } = await supabase
      .from("matches")
      .select("id,user_low,user_high,created_at")
      .or(`user_low.eq.${userId},user_high.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (matchErr) return setStatus(`Error loading matches: ${matchErr.message}`);

    const list = (matchData ?? []) as MatchRow[];
    setMatches(list);

    if (list.length === 0) {
      setStatus("No matches yet. Go swipe!");
      setProfilesById({});
      return;
    }

    const otherIds = Array.from(new Set(list.map((m) => (m.user_low === userId ? m.user_high : m.user_low))));

    const { data: profData, error: profErr } = await supabase
      .from("profiles")
      .select("id,name,bio,location_text,avatar_path")
      .in("id", otherIds);

    if (profErr) return setStatus(`Matches loaded, but profiles failed: ${profErr.message}`);

    const map: Record<string, ProfileView> = {};
    for (const p of (profData ?? []) as Profile[]) {
      let signed: string | null = null;
      if (p.avatar_path) signed = await getSignedAvatarUrl(p.avatar_path);
      map[p.id] = { ...p, avatar_signed_url: signed };
    }

    setProfilesById(map);
    setStatus("");
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="app-container">
      <AppHeader
        title="Matches"
        right={
          <>
            <button className="btn btn-gray" onClick={() => (window.location.href = "/discover")}>🔥 Discover</button>
            <button className="btn btn-gray" onClick={() => (window.location.href = "/profile")}>👤 Profile</button>
            <button className="btn btn-gray" onClick={logout}>🚪 Logout</button>
          </>
        }
      />

      {status && (
        <div style={{ padding: 12, borderRadius: 14, background: "rgba(255, 244, 235, 0.85)", marginBottom: 12 }}>
          {status}
        </div>
      )}

      {matches.length > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {matches.map((m) => {
            const otherId = userId ? (m.user_low === userId ? m.user_high : m.user_low) : "";
            const p = profilesById[otherId];
            const photo = p?.avatar_signed_url || FALLBACK_AVATAR;

            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  borderRadius: 18,
                  padding: 14,
                  background: "linear-gradient(180deg, var(--card-solid), rgba(238,242,247,0.8))",
                  border: "1px solid var(--border)",
                  boxShadow: "0 10px 18px rgba(0,0,0,0.08)",
                }}
              >
                <div
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: 18,
                    backgroundImage: `url(${photo})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    flex: "0 0 auto",
                    boxShadow: "0 10px 18px rgba(0,0,0,0.10)",
                  }}
                />

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 950, fontSize: 18 }}>{p?.name ?? "Unknown user"}</div>
                  <div style={{ marginTop: 4, color: "var(--muted)" }}>{p?.bio ?? "No bio yet."}</div>
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>{p?.location_text ?? "No location"}</div>

                  <button
                    className="btn btn-warm btn-full"
                    style={{ marginTop: 10 }}
                    onClick={() => (window.location.href = `/chat/${m.id}`)}
                  >
                    💬 Open chat
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
