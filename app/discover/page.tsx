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
  last_seen_at: string | null; // ✅ added
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

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diffMs = Date.now() - t;

  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function DiscoverPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ViewProfile[]>([]);
  const [current, setCurrent] = useState<ViewProfile | null>(null);
  const [status, setStatus] = useState("");
  const [anim, setAnim] = useState<"in" | "out">("in");

  // ✅ prevents double-click / accidental form submit issues
  const [swiping, setSwiping] = useState(false);

  const signedUrlCache = useRef<Record<string, string>>({});

  // ✅ online presence (realtime, no DB writes)
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ✅ last seen heartbeat interval
  const heartbeatRef = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        window.location.href = "/login";
        return;
      }
      setUserId(data.session.user.id);
      await loadProfiles(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Presence: track who is online (global channel)
  useEffect(() => {
    if (!userId) return;

    const ch = supabase.channel("presence:online", {
      config: { presence: { key: userId } },
    });

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, any[]>;
      setOnlineIds(Object.keys(state));
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ online: true, t: Date.now() });
      }
    });

    presenceChannelRef.current = ch;

    return () => {
      if (presenceChannelRef.current) supabase.removeChannel(presenceChannelRef.current);
      presenceChannelRef.current = null;
    };
  }, [userId]);

  // ✅ Heartbeat: update my last_seen_at every 60 seconds
  useEffect(() => {
    if (!userId) return;

    const ping = async () => {
      await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", userId);
    };

    ping();
    heartbeatRef.current = window.setInterval(ping, 60000);

    return () => {
      if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    };
  }, [userId]);

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

  async function loadProfiles(showLoadingStatus = false) {
    if (showLoadingStatus) setStatus("Loading...");

    const { data, error } = await supabase.rpc("get_discovery_profiles", { limit_count: 10 });
    if (error) return setStatus(`Error: ${error.message}`);

    const raw = (data ?? []) as DiscoveryRow[];
    const list = await attachSignedUrls(raw);

    setProfiles(list);
    setCurrent(list[0] ?? null);

    // ✅ don’t show “No more profiles.” as status; we render a premium empty state instead
    setStatus(list.length ? "" : "");
  }

  async function swipe(direction: "like" | "pass") {
    if (!current || swiping) return;

    setSwiping(true);
    setAnim("out");

    setTimeout(async () => {
      try {
        const targetId = current.id;

        // move UI forward immediately
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
        if (result?.matched) setStatus(`It's a match! 🎉`);
        else setStatus("");

        if (remaining.length < 3) loadProfiles(false);
      } finally {
        setSwiping(false);
      }
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
    await loadProfiles(true);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const photoUrl = current?.avatar_signed_url || FALLBACK_AVATAR;
  const isCurrentOnline = current ? onlineIds.includes(current.id) : false;

  return (
    <main className="app-container">
      <style>{`
        .card { transition: transform 180ms ease, opacity 180ms ease; will-change: transform, opacity; }
        .card.in { opacity: 1; transform: translateY(0) scale(1); }
        .card.out { opacity: 0; transform: translateY(10px) scale(0.98); }

        .emptyCard{
          padding: 18px;
          border-radius: 22px;
          background:
            radial-gradient(circle at 20% 10%, rgba(255,77,121,0.18), transparent 55%),
            radial-gradient(circle at 90% 20%, rgba(255,154,60,0.18), transparent 55%),
            linear-gradient(180deg, var(--card-solid), rgba(238,242,247,0.85));
          border: 1px solid var(--border);
          box-shadow: 0 14px 28px rgba(0,0,0,0.10);
          text-align: center;
        }

        .onlineDot{
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #22c55e;
          box-shadow: 0 0 0 3px rgba(34,197,94,0.18);
          display: inline-block;
        }
      `}</style>

      <AppHeader
        right={
          <>
            <button className="btn btn-gray" type="button" onClick={() => (window.location.href = "/matches")}>
              💬 Matches
            </button>
            <button className="btn btn-gray" type="button" onClick={() => (window.location.href = "/profile")}>
              👤 Profile
            </button>
            <button className="btn btn-soft" type="button" onClick={resetMySwipes}>
              🔄 Reset
            </button>
            <button className="btn btn-gray" type="button" onClick={logout}>
              🚪 Logout
            </button>
          </>
        }
      />

      {status && (
        <div style={{ padding: 12, borderRadius: 14, background: "rgba(255, 244, 235, 0.85)", marginBottom: 12 }}>
          {status}
        </div>
      )}

      {/* ✅ Premium empty state */}
      {!current ? (
        <div className="emptyCard">
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 18,
              margin: "0 auto 12px auto",
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, var(--warm1), var(--warm2))",
              boxShadow: "0 16px 30px rgba(255, 77, 121, 0.20)",
            }}
            aria-hidden="true"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 21s-7-4.5-9.5-9C.2 8.6 2.3 5 6.4 5c2 0 3.4 1 4.6 2.4C12.2 6 13.6 5 15.6 5c4.1 0 6.2 3.6 3.9 7-2.5 4.5-9.5 9-9.5 9z"
                fill="white"
                opacity="0.95"
              />
            </svg>
          </div>

          <div style={{ fontWeight: 950, fontSize: 18, letterSpacing: -0.2 }}>You’re all caught up 🎉</div>

          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.75, fontWeight: 700, lineHeight: 1.35 }}>
            No new profiles match your feed right now. Check again later — or reset your swipes to re-see people.
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              className="btn btn-warm"
              type="button"
              onClick={() => loadProfiles(true)}
              style={{ borderRadius: 999, padding: "12px 16px" }}
            >
              🔄 Check again
            </button>

            <button
              className="btn btn-gray"
              type="button"
              onClick={resetMySwipes}
              style={{ borderRadius: 999, padding: "12px 16px" }}
            >
              ♻️ Reset swipes
            </button>
          </div>

          <div style={{ marginTop: 10, fontSize: 11, opacity: 0.55, fontWeight: 700 }}>
            Tip: When more users sign up, they’ll appear after you check again.
          </div>
        </div>
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
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontWeight: 950, fontSize: 20 }}>{current.name ?? "Unnamed"}</div>
                {isCurrentOnline && <span className="onlineDot" title="Online now" />}
              </div>

              <div style={{ fontSize: 12, opacity: 0.9 }}>
                {current.location_text ?? "No location"}
                {!isCurrentOnline && current.last_seen_at ? (
                  <>
                    {" "}
                    • Last seen {timeAgo(current.last_seen_at)}
                  </>
                ) : null}
                {isCurrentOnline ? <> • Online now</> : null}
              </div>
            </div>
          </div>

          <p style={{ margin: "0 0 10px 0", color: "var(--muted)" }}>{current.bio ?? "No bio yet."}</p>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              className="btn btn-gray"
              style={{ flex: 1, borderRadius: 30, padding: 14 }}
              type="button"
              disabled={swiping}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                swipe("pass");
              }}
            >
              ❌ Pass
            </button>

            <button
              className="btn btn-warm"
              style={{ flex: 1, borderRadius: 30, padding: 14 }}
              type="button"
              disabled={swiping}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                swipe("like");
              }}
            >
              ❤️ Like
            </button>
          </div>

          {swiping && (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65, fontWeight: 800 }}>Saving…</div>
          )}
        </div>
      )}
    </main>
  );
}
