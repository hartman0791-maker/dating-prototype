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
  const [anim, setAnim] = useState<"in" | "out">("in");

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

    // animate card out
    setAnim("out");
    setTimeout(async () => {
      const targetId = current.id;

      // move to next card
      const remaining = profiles.slice(1);
      setProfiles(remaining);
      setCurrent(remaining[0] ?? null);
      setAnim("in");

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
    }, 180);
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
      <style>{`
        .card {
          transition: transform 180ms ease, opacity 180ms ease;
          will-change: transform, opacity;
        }
        .card.in { opacity: 1; transform: translateY(0) scale(1); }
        .card.out { opacity: 0; transform: translateY(10px) scale(0.98); }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Discover</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-gray" onClick={() => (window.location.href = "/matches")}>
            💬 Matches
          </button>
          <button className="btn btn-gray" onClick={() => (window.location.href = "/profile")}>
            👤 Profile
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
          className={`card ${anim}`}
          style={{
            padding: 20,
            borderRadius: 22,
            background: "linear-gradient(180deg, #ffffff, #eef2f7)",
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
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.35) 100%)",
              }}
            />
            <div style={{ position: "absolute", left: 14, bottom: 12, color: "white" }}>
              <div style={{ fontWeight: 900, fontSize: 20 }}>{current.name ?? "Unnamed"}</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>{current.location_text ?? "No location"}</div>
            </div>
          </div>

          <p style={{ margin: "0 0 10px 0", color: "#444" }}>{current.bio ?? "No bio yet."}</p>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              className="btn btn-gray"
              style={{ flex: 1, borderRadius: 30, padding: 14 }}
              onClick={() => swipe("pass")}
            >
              ❌ Pass
            </button>

            <button
              className="btn btn-warm"
              style={{ flex: 1, borderRadius: 30, padding: 14 }}
              onClick={() => swipe("like")}
            >
              ❤️ Like
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
