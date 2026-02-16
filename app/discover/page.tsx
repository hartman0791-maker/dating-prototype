"use client";
export {};

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [loading, setLoading] = useState(true);

  // Match modal
  const [matchModal, setMatchModal] = useState<{ open: boolean; matchId?: string }>({
    open: false,
  });

  // Animation state
  const [anim, setAnim] = useState<"in" | "out">("in");

  // Signed url cache
  const signedUrlCache = useRef<Record<string, string>>({});

  // ===== Swipe gesture state =====
  const cardRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const dxRef = useRef(0);
  const dyRef = useRef(0);

  const [drag, setDrag] = useState({ x: 0, y: 0, rot: 0 }); // for render
  const [dragLabel, setDragLabel] = useState<"" | "LIKE" | "PASS">("");

  const canSwipe = Boolean(current) && !loading && !matchModal.open;

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

  async function loadProfiles(firstLoad = false) {
    if (firstLoad) setLoading(true);
    setStatus(firstLoad ? "" : status);

    try {
      const { data, error } = await supabase.rpc("get_discovery_profiles", { limit_count: 10 });
      if (error) {
        setStatus(`Error: ${error.message}`);
        setLoading(false);
        return;
      }

      const raw = (data ?? []) as DiscoveryRow[];
      const list = await attachSignedUrls(raw);

      setProfiles(list);
      setCurrent(list[0] ?? null);
      setStatus(list.length ? "" : "No more profiles.");
    } finally {
      setLoading(false);
    }
  }

  async function swipe(direction: "like" | "pass") {
    if (!current || !canSwipe) return;

    setAnim("out");
    // reset drag UI instantly
    setDrag({ x: 0, y: 0, rot: 0 });
    setDragLabel("");

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

      if (error) {
        setStatus(`Error: ${error.message}`);
        return;
      }

      const result = Array.isArray(data) ? data[0] : data;

      if (result?.matched) {
        setStatus("");
        setMatchModal({ open: true, matchId: result.match_id });
      } else {
        setStatus("");
      }

      if (remaining.length < 3) loadProfiles(false);
    }, 170);
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

  // ===== Gesture handlers =====
  const swipeThreshold = 110; // px
  const rotFactor = 0.06; // degrees per px-ish

  function applyCardTransform(x: number, y: number) {
    const rot = Math.max(-14, Math.min(14, x * rotFactor));
    setDrag({ x, y, rot });

    if (x > 60) setDragLabel("LIKE");
    else if (x < -60) setDragLabel("PASS");
    else setDragLabel("");
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!canSwipe) return;
    draggingRef.current = true;

    // capture pointer so we keep getting events
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    dxRef.current = 0;
    dyRef.current = 0;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current || !canSwipe) return;

    dxRef.current = e.clientX - startXRef.current;
    dyRef.current = e.clientY - startYRef.current;

    // dampen vertical movement
    const x = dxRef.current;
    const y = dyRef.current * 0.35;

    applyCardTransform(x, y);
  }

  function onPointerUp() {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    const x = dxRef.current;

    // Decide swipe or snap back
    if (x > swipeThreshold) {
      swipe("like");
      return;
    }
    if (x < -swipeThreshold) {
      swipe("pass");
      return;
    }

    // Snap back
    setDrag({ x: 0, y: 0, rot: 0 });
    setDragLabel("");
  }

  const cardStyle = useMemo(() => {
    const t = `translate3d(${drag.x}px, ${drag.y}px, 0) rotate(${drag.rot}deg)`;
    return {
      transform: t,
      transition: draggingRef.current ? "none" : "transform 180ms ease",
      touchAction: "pan-y", // allow scrolling; we handle horizontal drag
      willChange: "transform",
    } as React.CSSProperties;
  }, [drag.x, drag.y, drag.rot]);

  return (
    <main className="app-container">
      <style>{`
        .cardWrap { position: relative; }
        .card { transition: opacity 180ms ease; }
        .card.in { opacity: 1; }
        .card.out { opacity: 0; }

        .badge {
          position: absolute;
          top: 14px;
          padding: 10px 14px;
          border-radius: 999px;
          font-weight: 950;
          font-size: 12px;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          box-shadow: 0 12px 30px rgba(0,0,0,0.16);
          border: 1px solid rgba(255,255,255,0.35);
          backdrop-filter: blur(8px);
          color: white;
        }
        .badge.like { left: 14px; background: rgba(34,197,94,0.75); }
        .badge.pass { right: 14px; background: rgba(239,68,68,0.72); }

        .skeleton {
          border-radius: 22px;
          border: 1px solid var(--border);
          background: var(--card-solid);
          overflow: hidden;
          box-shadow: 0 14px 28px rgba(0,0,0,0.10);
        }
        .shimmer {
          position: relative;
          overflow: hidden;
          background: rgba(0,0,0,0.03);
        }
        .shimmer::after{
          content:"";
          position:absolute;
          inset:0;
          transform: translateX(-120%);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent);
          animation: shimmer 1.15s infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }

        .modalBackdrop{
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          display: grid;
          place-items: center;
          z-index: 50;
          padding: 18px;
        }
        .modal{
          width: 100%;
          max-width: 420px;
          border-radius: 22px;
          background: white;
          padding: 18px;
          box-shadow: 0 26px 70px rgba(0,0,0,0.25);
          border: 1px solid rgba(0,0,0,0.08);
        }
        .modalTitle{
          font-weight: 950;
          font-size: 20px;
          margin: 0 0 6px 0;
        }
        .modalText{
          margin: 0 0 14px 0;
          opacity: 0.8;
          font-weight: 700;
          font-size: 13px;
          line-height: 1.3;
        }
        .modalBtns{
          display:flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
      `}</style>

      <AppHeader
        right={
          <>
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
          </>
        }
      />

      {/* Match modal */}
      {matchModal.open && (
        <div
          className="modalBackdrop"
          onClick={() => setMatchModal({ open: false })}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p className="modalTitle">It’s a match! 🎉</p>
            <p className="modalText">
              You matched with <b>{current?.name ?? "someone"}</b>. Want to start chatting?
            </p>

            <div className="modalBtns">
              <button className="btn btn-gray" onClick={() => setMatchModal({ open: false })}>
                Keep swiping
              </button>
              <button
                className="btn btn-warm"
                onClick={() => (window.location.href = "/matches")}
              >
                Go to Matches
              </button>
              {matchModal.matchId && (
                <button
                  className="btn btn-gray"
                  onClick={() => (window.location.href = `/chat/${matchModal.matchId}`)}
                >
                  Open chat
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status */}
      {status && (
        <div
          style={{
            padding: 12,
            borderRadius: 14,
            background: "rgba(255, 244, 235, 0.85)",
            marginBottom: 12,
            fontWeight: 800,
          }}
        >
          {status}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="skeleton" style={{ padding: 20 }}>
          <div className="shimmer" style={{ height: 260, borderRadius: 18, marginBottom: 16 }} />
          <div className="shimmer" style={{ height: 14, borderRadius: 999, width: "55%", marginBottom: 10 }} />
          <div className="shimmer" style={{ height: 10, borderRadius: 999, width: "80%", marginBottom: 8 }} />
          <div className="shimmer" style={{ height: 10, borderRadius: 999, width: "68%", marginBottom: 16 }} />
          <div style={{ display: "flex", gap: 12 }}>
            <div className="shimmer" style={{ height: 44, borderRadius: 999, flex: 1 }} />
            <div className="shimmer" style={{ height: 44, borderRadius: 999, flex: 1 }} />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !current && (
        <div
          style={{
            borderRadius: 22,
            background: "var(--card-solid)",
            border: "1px solid var(--border)",
            padding: 18,
            boxShadow: "0 14px 28px rgba(0,0,0,0.10)",
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 18, marginBottom: 6 }}>No more profiles 😅</div>
          <div style={{ fontSize: 13, opacity: 0.75, fontWeight: 700, marginBottom: 14 }}>
            Try again later, or reload now.
          </div>
          <button className="btn btn-gray btn-full" onClick={() => loadProfiles(true)}>
            Reload
          </button>
        </div>
      )}

      {/* Card */}
      {!loading && current && (
        <div className="cardWrap">
          <div
            ref={cardRef}
            className={`card ${anim}`}
            style={{
              padding: 20,
              borderRadius: 22,
              background: "linear-gradient(180deg, var(--card-solid), rgba(238,242,247,0.8))",
              border: "1px solid var(--border)",
              boxShadow: "0 14px 28px rgba(0,0,0,0.10)",
              userSelect: "none",
              ...cardStyle,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* Like / Pass label */}
            {dragLabel === "LIKE" && <div className="badge like">LIKE</div>}
            {dragLabel === "PASS" && <div className="badge pass">PASS</div>}

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
                <div style={{ fontWeight: 950, fontSize: 20 }}>{current.name ?? "Unnamed"}</div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>{current.location_text ?? "No location"}</div>
              </div>
            </div>

            <p style={{ margin: "0 0 10px 0", color: "var(--muted)", fontWeight: 700 }}>
              {current.bio ?? "No bio yet."}
            </p>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="btn btn-gray"
                style={{ flex: 1, borderRadius: 30, padding: 14 }}
                onClick={() => swipe("pass")}
                disabled={!canSwipe}
              >
                ❌ Pass
              </button>
              <button
                className="btn btn-warm"
                style={{ flex: 1, borderRadius: 30, padding: 14 }}
                onClick={() => swipe("like")}
                disabled={!canSwipe}
              >
                ❤️ Like
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 11, opacity: 0.55, fontWeight: 700 }}>
              Tip: drag right to like, left to pass.
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
