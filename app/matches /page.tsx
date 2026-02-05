
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

    const ids = Array.from(
      new Set(list.map((m) => (m.user_low === userId ? m.user_high : m.user_low)))
    );

    const { data: profData, error: profErr } = await supabase
      .from("profiles")
      .select("id,name,bio,location_text")
      .in("id", ids);

    if (profErr) {
      setStatus(`Matches loaded, but profiles failed: ${profErr.message}`);
      return;
    }

    const map: Record<string, Profile> = {};
    for (const p of (profData ?? []) as Profile[]) map[p.id] = p;
    setProfilesById(map);
    setStatus("");
  }

  function goDiscover() {
    window.location.href = "/discover";
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main style={{ maxWidth: 520, margin: "40px auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Matches</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={goDiscover}>Discover</button>
          <button onClick={logout}>Logout</button>
        </div>
      </div>

      {status && (
        <div style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10, marginTop: 12 }}>
          {status}
        </div>
      )}

      {matches.length > 0 && (
        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {matches.map((m) => {
            const otherId = userId ? (m.user_low === userId ? m.user_high : m.user_low) : "";
            const p = profilesById[otherId];

            return (
              <div key={m.id} style={{ border: "1px solid #ddd", borderRadius: 14, padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{p?.name ?? "Unknown user"}</div>
                <div style={{ marginTop: 6 }}>{p?.bio ?? "No bio yet."}</div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                  {p?.location_text ?? "No location"} • match_id: {m.id}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

