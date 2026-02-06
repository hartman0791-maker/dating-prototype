"use client";
export {};

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

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
  avatar_url: string | null;
};

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=80";

export default function MatchesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});
  const [status, setStatus] = useState("");

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

  async function loadMatches() {
    setStatus("Loading matches...");

    const { data: matchData, error: matchErr } = await supabase
      .from("matches")
      .select("id,user_low,user_high,created_at")
      .or(`user_low.eq.${userId},user_high.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (matchErr) {
      setStatus(`Error loading matches: ${matchErr.message}`);
      return;
    }

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
      .select("id,name,bio,location_text,avatar_url")
      .in("id", otherIds);

    if (profErr) {
      setStatus(`Matches loaded, but profiles failed: ${profErr.message}`);
      return;
    }

    const map: Record<string, Profile> = {};
    for (const p of (profData ?? []) as Profile[]) map[p.id] = p;
    setProfilesById(map);
    setStatus("");
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="app-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Matches</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-gray" onClick={() => (window.location.href = "/discover")}>
            🔥 Discover
          </button>
          <button className="btn btn-gray" onClick={logout}>
            🚪 Logout
          </button>
        </div>
      </div>

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
            const photo = p?.avatar_url || FALLBACK_AVATAR;

            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  borderRadius: 18,
                  padding: 14,
                  background: "linear-gradient(180deg, #ffffff, #eef2f7)",
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
                  }}
                />

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{p?.name ?? "Unknown user"}</div>
                  <div style={{ marginTop: 4, color: "#444" }}>{p?.bio ?? "No bio yet."}</div>
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
                    {p?.location_text ?? "No location"}
                  </div>

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

