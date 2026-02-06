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
};

const topBtn: React.CSSProperties = {
  border: "none",
  background: "#f1f1f1",
  padding: "8px 12px",
  borderRadius: 12,
  cursor: "pointer",
};

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
      .select("id,name,bio,location_text")
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
          <button style={topBtn} onClick={() => (window.location.href = "/discover")}>
            🔥 Discover
          </button>
          <button style={topBtn} onClick={logout}>
            🚪 Logout
          </button>
        </div>
      </div>

      {status && (
        <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 14, marginBottom: 12, background: "#fff7f2" }}>
          {status}
        </div>
      )}

      {matches.length > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {matches.map((m) => {
            const otherId = userId ? (m.user_low === userId ? m.user_high : m.user_low) : "";
            const p = profilesById[otherId];

            return (
              <div
                key={m.id}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 18,
                  padding: 16,
                  background: "linear-gradient(180deg, #ffffff, #eef2f7)",
                  boxShadow: "0 10px 18px rgba(0,0,0,0.08)",
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 18, color: "#111" }}>{p?.name ?? "Unknown user"}</div>
                <div style={{ marginTop: 6, color: "#444" }}>{p?.bio ?? "No bio yet."}</div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75, color: "#444" }}>
                  {p?.location_text ?? "No location"} • match_id: {m.id}
                </div>

                <button
                  onClick={() => (window.location.href = `/chat/${m.id}`)}
                  style={{
                    marginTop: 12,
                    width: "100%",
                    border: "none",
                    borderRadius: 14,
                    padding: "10px 12px",
                    cursor: "pointer",
                    background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                    color: "white",
                    fontWeight: 700,
                  }}
                >
                  💬 Open chat
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
