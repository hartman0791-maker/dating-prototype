"use client";
export {};

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Profile = {
  id: string;
  name: string | null;
  bio: string | null;
  location_text: string | null;
  avatar_url: string | null;
};

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=1200&q=80";

export default function DiscoverPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [current, setCurrent] = useState<Profile | null>(null);
  const [status, setStatus] = useState("");

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

  async function loadProfiles() {
    setStatus("Loading...");
    const { data, error } = await supabase.rpc("get_discovery_profiles", {
      limit_count: 10,
    });

    if (error) {
      setStatus(`Error: ${error.message}`);
      return;
    }

    const list = (data ?? []) as Profile[];
    setProfiles(list);
    setCurrent(list[0] ?? null);
    setStatus(list.length ? "" : "No more profiles.");
  }

  async function swipe(direction: "like" | "pass") {
    if (!current) return;

    const targetId = current.id;

    const remaining = profiles.slice(1);
    setProfiles(remaining);
    setCurrent(remaining[0] ?? null);

    const { data, error } = await supabase.rpc("swipe_and_maybe_match", {
      target_user_id: targetId,
      swipe_dir: direction,
    });

    if (error) {
      setStatus(`Error: ${error.message}`);
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;
    if (result?.matched) setStatus(`It's a match! match_id: ${result.match_id}`);
    else setStatus("");

    if (remaining.length < 3) loadProfiles();
  }

  async function resetMySwipes() {
    if (!userId) return;

    const ok = window.confirm("Reset your swipes? You'll see profiles again.");
    if (!ok) return;

    setStatus("Resetting swipes...");

    const { error } = await supabase.from("swipes").delete().eq("swiper_id", userId);

    if (error) {
      setStatus(`Reset failed: ${error.message}`);
      return;
    }

    setStatus("Swipes reset ✅ Reloading...");
    await loadProfiles();
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const photoUrl = current?.avatar_url || FALLBACK_AVATAR;

  return (
    <main className="app-container">
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Discover</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-gray" onClick={() => (window.location.href = "/matches")}>
            💬 Matches
          </button>
          <button className="btn btn-soft" onClick={resetMySwipes}>
            🔄 Reset
          </button>
          <button className="btn btn-gray" onClick={logout}>
            🚪 Logout
          </button>
        </div>
      </div>

      {userId && <p style={{ fontSize: 12, opacity: 0.75, margin: "0 0 12px 0" }}>Logged in as: {userId}</p>}

      {status && (
        <div style={{ padding: 12, borderRadius: 14, background: "rgba(255, 244, 235, 0.85)", marginBottom: 12 }}>
          {status}
        </div>
      )}

      {!current ? (
        <button className="btn btn-gray btn-full" onClick={loadProfiles}>
          Reload
        </button>
      ) : (
        <div
          style={{
            padding: 20,
            borderRadius: 20,
            background: "linear-gradient(180deg, #ffffff, #eef2f7)",
            boxShadow: "0 12px 24px rgba(0,0,0,0.1)",
            color: "#111",
          }}
        >
          <div
            style={{
              height: 240,
              borderRadius: 18,
              backgroundImage: `url(${photoUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              marginBottom: 16,
            }}
          />

          <h2 style={{ margin: "0 0 6px 0" }}>{current.name ?? "Unnamed"}</h2>
          <p style={{ margin: "0 0 8px 0", color: "#444" }}>{current.bio ?? "No bio yet."}</p>
          <small style={{ color: "#666" }}>{current.location_text ?? "No location"}</small>

          <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
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
