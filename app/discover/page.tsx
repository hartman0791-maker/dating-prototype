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

  // Optional fields for filters (if your RPC returns them)
  birthdate?: string | null;
  gender?: string | null;
  looking_for?: string | null;
  last_seen_at?: string | null;
};

type ViewProfile = DiscoveryRow & { avatar_signed_url: string | null };

type Filters = {
  minAge: number;
  maxAge: number;
  gender: "any" | "male" | "female" | "other";
  hasPhoto: boolean;
  activeRecentlyMins: number; // 0 = ignore
};

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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function DiscoverPage() {
  const [userId, setUserId] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<ViewProfile[]>([]);
  const [current, setCurrent] = useState<ViewProfile | null>(null);

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [swiping, setSwiping] = useState(false);

  // Tap-to-preview modal
  const [openProfile, setOpenProfile] = useState<ViewProfile | null>(null);

  // Filters modal
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    minAge: 18,
    maxAge: 55,
    gender: "any",
    hasPhoto: true,
    activeRecentlyMins: 0,
  });

  // Match modal
  const [matchModal, setMatchModal] = useState<{ open: boolean; matchId?: string; profile?: ViewProfile }>(
    { open: false }
  );

  // Undo
  const [undoState, setUndoState] = useState<{
    canUndo: boolean;
    profile?: ViewProfile;
    direction?: "like" | "pass";
    matchId?: string | null;
  }>({ canUndo: false });

  // Signed URL cache
  const signedUrlCache = useRef<Record<string, string>>({});

  // ===== Drag swipe (A) =====
  const cardRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const dx = useRef(0);
  const dy = useRef(0);
  const [dragUi, setDragUi] = useState({ dx: 0, dy: 0, rot: 0, likeOpacity: 0, passOpacity: 0 });

  const SWIPE_THRESHOLD = 110;

  const canInteract = useMemo(() => Boolean(current) && !loading && !swiping && !filtersOpen && !openProfile && !matchModal.open, [
    current,
    loading,
    swiping,
    filtersOpen,
    openProfile,
    matchModal.open,
  ]);

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

  // ===== Filters (B): load with params =====
  async function loadProfiles(initial = false) {
    setLoading(true);
    if (initial) setStatus("Loading...");
    else setStatus("");

    // IMPORTANT: This expects the SQL RPC below: get_discovery_profiles_filtered(...)
    const { data, error } = await supabase.rpc("get_discovery_profiles_filtered", {
      limit_count: 10,
      min_age: filters.minAge,
      max_age: filters.maxAge,
      gender_filter: filters.gender === "any" ? null : filters.gender,
      require_photo: filters.hasPhoto,
      active_within_mins: filters.activeRecentlyMins === 0 ? null : filters.activeRecentlyMins,
    });

    if (error) {
      setLoading(false);
      setStatus(`Error: ${error.message}`);
      return;
    }

    const raw = (data ?? []) as DiscoveryRow[];
    const list = await attachSignedUrls(raw);

    setProfiles(list);
    setCurrent(list[0] ?? null);
    setStatus(list.length ? "" : "No more profiles.");
    setLoading(false);
  }

  // ===== Swipe logic (A + D) =====
  async function swipe(direction: "like" | "pass", source: "drag" | "button" = "button") {
    if (!current || !userId || swiping) return;

    // Close preview modal if open
    if (openProfile) setOpenProfile(null);

    setSwiping(true);

    const target = current;
    const targetId = target.id;

    // Move UI forward immediately
    const remaining = profiles.slice(1);
    setProfiles(remaining);
    setCurrent(remaining[0] ?? null);

    // record undo info before calling RPC
    setUndoState({ canUndo: true, profile: target, direction, matchId: null });

    // reset drag UI
    if (source === "drag") resetCardTransform(true);

    const { data, error } = await supabase.rpc("swipe_and_maybe_match", {
      target_user_id: targetId,
      swipe_dir: direction,
    });

    if (error) {
      // Roll back UI (best effort)
      setStatus(`Error: ${error.message}`);
      setProfiles((prev) => [target, ...prev]);
      setCurrent(target);
      setSwiping(false);
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (result?.matched) {
      // If match happened, we can still undo the swipe row, but match row may remain.
      // So we DISABLE undo when match occurs (clean behavior).
      setUndoState({ canUndo: false });
      setMatchModal({ open: true, matchId: result.match_id, profile: target });
      setStatus("");
    } else {
      setStatus("");
    }

    // If running low, fetch more
    if (remaining.length < 3) {
      await loadProfiles(false);
    }

    setSwiping(false);
  }

  async function undoLastSwipe() {
    if (!userId || !undoState.canUndo || !undoState.profile) return;

    // If a match happened, we disabled undo. Keep it that way.
    const p = undoState.profile;

    setStatus("Undoing…");

    // Best-effort: delete swipe record (your swipes table must use swiper_id + swipee_id)
    const { error } = await supabase
      .from("swipes")
      .delete()
      .eq("swiper_id", userId)
      .eq("swipee_id", p.id);

    if (error) {
      setStatus(`Undo failed: ${error.message}`);
      return;
    }

    // Put the profile back on top
    setProfiles((prev) => [p, ...prev]);
    setCurrent(p);
    setUndoState({ canUndo: false });
    setStatus("Undone ✅");
    window.setTimeout(() => setStatus(""), 900);
  }

  // ===== Drag handling =====
  function applyCardTransform(_dx: number, _dy: number) {
    const r = clamp(_dx / 180, -1.2, 1.2);
    const rot = r * 10;
    const likeOpacity = clamp((_dx - 20) / 140, 0, 1);
    const passOpacity = clamp((-_dx - 20) / 140, 0, 1);

    setDragUi({ dx: _dx, dy: _dy, rot, likeOpacity, passOpacity });
  }

  function resetCardTransform(instant = false) {
    const el = cardRef.current;
    if (!el) {
      setDragUi({ dx: 0, dy: 0, rot: 0, likeOpacity: 0, passOpacity: 0 });
      return;
    }

    if (instant) {
      el.style.transition = "none";
      setDragUi({ dx: 0, dy: 0, rot: 0, likeOpacity: 0, passOpacity: 0 });
      // re-enable transitions next tick
      requestAnimationFrame(() => {
        el.style.transition = "transform 180ms ease, opacity 180ms ease";
      });
      return;
    }

    el.style.transition = "transform 220ms ease, opacity 220ms ease";
    setDragUi({ dx: 0, dy: 0, rot: 0, likeOpacity: 0, passOpacity: 0 });
    window.setTimeout(() => {
      el.style.transition = "transform 180ms ease, opacity 180ms ease";
    }, 240);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!canInteract) return;
    dragging.current = true;
    startX.current = e.clientX;
    startY.current = e.clientY;
    dx.current = 0;
    dy.current = 0;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current || !canInteract) return;
    dx.current = e.clientX - startX.current;
    dy.current = e.clientY - startY.current;
    applyCardTransform(dx.current, dy.current);
  }

  async function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;

    const finalDx = dx.current;

    // swipe decision
    if (finalDx > SWIPE_THRESHOLD) {
      // fling out
      applyCardTransform(420, dy.current);
      await swipe("like", "drag");
      return;
    }
    if (finalDx < -SWIPE_THRESHOLD) {
      applyCardTransform(-420, dy.current);
      await swipe("pass", "drag");
      return;
    }

    resetCardTransform(false);
  }

  // Keyboard shortcuts (nice bonus)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!canInteract) return;
      if (e.key === "ArrowLeft") swipe("pass");
      if (e.key === "ArrowRight") swipe("like");
      if (e.key === "z" || e.key === "Z") undoLastSwipe();
      if (e.key === "Escape") {
        if (openProfile) setOpenProfile(null);
        if (filtersOpen) setFiltersOpen(false);
        if (matchModal.open) setMatchModal({ open: false });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canInteract, openProfile, filtersOpen, matchModal.open, current, profiles, undoState]);

  async function resetMySwipes() {
    if (!userId) return;
    const ok = window.confirm("Reset your swipes? You'll see profiles again.");
    if (!ok) return;

    setStatus("Resetting swipes...");
    const { error } = await supabase.from("swipes").delete().eq("swiper_id", userId);
    if (error) return setStatus(`Reset failed: ${error.message}`);

    setUndoState({ canUndo: false });
    setStatus("Swipes reset ✅ Reloading...");
    await loadProfiles(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const photoUrl = current?.avatar_signed_url || FALLBACK_AVATAR;

  return (
    <main className="app-container">
      <style>{`
        .card { transition: transform 180ms ease, opacity 180ms ease; will-change: transform, opacity; user-select: none; }
        .card.in { opacity: 1; }
        .card.out { opacity: 0.92; }
        .modalOverlay{
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.48);
          display: grid; place-items: center;
          padding: 18px; z-index: 9999;
        }
        .modalCard{
          width: min(560px, 100%);
          border-radius: 22px; overflow: hidden;
          background: white;
          border: 1px solid rgba(0,0,0,0.08);
          box-shadow: 0 24px 70px rgba(0,0,0,0.30);
        }
        .modalHero{
          height: 320px;
          background-size: cover;
          background-position: center;
          position: relative;
        }

        /* Shimmer skeleton */
        .skeletonWrap{
          padding: 20px;
          border-radius: 22px;
          background: var(--card-solid);
          border: 1px solid var(--border);
          overflow: hidden;
          position: relative;
        }
        .sk{
          position: relative;
          border-radius: 14px;
          background: rgba(0,0,0,0.08);
          overflow: hidden;
        }
        .sk::after{
          content:"";
          position:absolute;
          inset:0;
          transform: translateX(-140%);
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0) 0%,
            rgba(255,255,255,0.45) 45%,
            rgba(255,255,255,0) 90%
          );
          animation: shimmer 1.15s ease-in-out infinite;
          opacity: 0.65;
        }
        @keyframes shimmer{
          from{ transform: translateX(-140%); }
          to{ transform: translateX(140%); }
        }

        .badgeLike, .badgePass{
          position: absolute; top: 16px;
          padding: 10px 12px;
          border-radius: 14px;
          font-weight: 950;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          border: 2px solid rgba(255,255,255,0.9);
          color: white;
          backdrop-filter: blur(10px);
        }
        .badgeLike{ left: 16px; background: rgba(34,197,94,0.35); }
        .badgePass{ right: 16px; background: rgba(239,68,68,0.35); }

        .filterGrid{
          display: grid;
          gap: 10px;
        }
        .filterRow{
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .label{
          font-size: 12px;
          font-weight: 900;
          opacity: 0.8;
          margin-bottom: 6px;
        }
        .input{
          width: 100%;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(0,0,0,0.12);
        }
      `}</style>

      <AppHeader
        right={
          <>
            <button className="btn btn-gray" type="button" onClick={() => setFiltersOpen(true)}>
              ⚙️ Filters
            </button>
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

      {/* Undo button (D) */}
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <button className="btn btn-gray" type="button" disabled={!undoState.canUndo} onClick={undoLastSwipe}>
          ↩️ Undo
        </button>
        <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800, display: "flex", alignItems: "center" }}>
          Tip: drag card • arrows = swipe • Z = undo
        </div>
      </div>

      {/* Skeleton loader */}
      {loading && !current ? (
        <div className="skeletonWrap">
          <div className="sk" style={{ height: 260, borderRadius: 18, marginBottom: 16 }} />
          <div className="sk" style={{ height: 14, width: "60%", borderRadius: 10, marginBottom: 10 }} />
          <div className="sk" style={{ height: 12, width: "90%", borderRadius: 10, marginBottom: 8, background: "rgba(0,0,0,0.06)" }} />
          <div className="sk" style={{ height: 12, width: "80%", borderRadius: 10, background: "rgba(0,0,0,0.06)" }} />
        </div>
      ) : !current ? (
        <button className="btn btn-gray btn-full" type="button" onClick={() => loadProfiles(false)}>
          Reload
        </button>
      ) : (
        <>
          {/* Card (A) */}
          <div
            ref={cardRef}
            className={`card in`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              padding: 20,
              borderRadius: 22,
              background: "linear-gradient(180deg, var(--card-solid), rgba(238,242,247,0.8))",
              border: "1px solid var(--border)",
              boxShadow: "0 14px 28px rgba(0,0,0,0.10)",
              transform: `translate(${dragUi.dx}px, ${dragUi.dy}px) rotate(${dragUi.rot}deg)`,
              touchAction: "none",
              cursor: canInteract ? "grab" : "default",
            }}
            onClick={() => setOpenProfile(current)}
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

              {/* Like/Pass overlays */}
              <div className="badgeLike" style={{ opacity: dragUi.likeOpacity }}>
                LIKE
              </div>
              <div className="badgePass" style={{ opacity: dragUi.passOpacity }}>
                NOPE
              </div>

              <div style={{ position: "absolute", left: 14, bottom: 12, color: "white" }}>
                <div style={{ fontWeight: 950, fontSize: 20 }}>{current.name ?? "Unnamed"}</div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>{current.location_text ?? "No location"}</div>
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
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65, fontWeight: 800 }}>
                Saving…
              </div>
            )}
          </div>
        </>
      )}

      {/* Tap-to-preview modal */}
      {openProfile && (
        <div className="modalOverlay" onClick={() => setOpenProfile(null)} aria-modal="true" role="dialog">
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <div
              className="modalHero"
              style={{ backgroundImage: `url(${openProfile.avatar_signed_url || FALLBACK_AVATAR})` }}
            >
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.58) 100%)" }} />
              <div style={{ position: "absolute", left: 16, bottom: 14, color: "white" }}>
                <div style={{ fontSize: 22, fontWeight: 950 }}>{openProfile.name ?? "Unnamed"}</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>{openProfile.location_text ?? "No location"}</div>
              </div>
            </div>

            <div style={{ padding: 16 }}>
              <div style={{ fontWeight: 950, marginBottom: 6 }}>About</div>
              <div style={{ opacity: 0.82, lineHeight: 1.5 }}>{openProfile.bio ?? "No bio yet."}</div>

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button
                  className="btn btn-gray"
                  style={{ flex: 1, borderRadius: 999 }}
                  type="button"
                  disabled={swiping}
                  onClick={() => {
                    setOpenProfile(null);
                    swipe("pass");
                  }}
                >
                  ❌ Pass
                </button>
                <button
                  className="btn btn-warm"
                  style={{ flex: 1, borderRadius: 999 }}
                  type="button"
                  disabled={swiping}
                  onClick={() => {
                    setOpenProfile(null);
                    swipe("like");
                  }}
                >
                  ❤️ Like
                </button>
              </div>

              <button
                className="btn btn-gray"
                style={{ width: "100%", marginTop: 10, borderRadius: 999 }}
                type="button"
                onClick={() => setOpenProfile(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters modal (B) */}
      {filtersOpen && (
        <div className="modalOverlay" onClick={() => setFiltersOpen(false)} aria-modal="true" role="dialog">
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 16, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: 18, fontWeight: 950 }}>Filters</div>
              <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800, marginTop: 4 }}>
                Adjust preferences for who you see.
              </div>
            </div>

            <div style={{ padding: 16 }} className="filterGrid">
              <div className="filterRow">
                <div>
                  <div className="label">Min age</div>
                  <input
                    className="input"
                    type="number"
                    value={filters.minAge}
                    min={18}
                    max={99}
                    onChange={(e) => setFilters((f) => ({ ...f, minAge: clamp(Number(e.target.value || 18), 18, 99) }))}
                  />
                </div>
                <div>
                  <div className="label">Max age</div>
                  <input
                    className="input"
                    type="number"
                    value={filters.maxAge}
                    min={18}
                    max={99}
                    onChange={(e) => setFilters((f) => ({ ...f, maxAge: clamp(Number(e.target.value || 55), 18, 99) }))}
                  />
                </div>
              </div>

              <div>
                <div className="label">Gender</div>
                <select
                  className="input"
                  value={filters.gender}
                  onChange={(e) => setFilters((f) => ({ ...f, gender: e.target.value as any }))}
                >
                  <option value="any">Any</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 900 }}>
                <input
                  type="checkbox"
                  checked={filters.hasPhoto}
                  onChange={(e) => setFilters((f) => ({ ...f, hasPhoto: e.target.checked }))}
                />
                Require photo
              </label>

              <div>
                <div className="label">Active within (minutes)</div>
                <select
                  className="input"
                  value={filters.activeRecentlyMins}
                  onChange={(e) => setFilters((f) => ({ ...f, activeRecentlyMins: Number(e.target.value) }))}
                >
                  <option value={0}>Anytime</option>
                  <option value={15}>15 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={180}>3 hours</option>
                  <option value={1440}>24 hours</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button className="btn btn-gray" style={{ flex: 1, borderRadius: 999 }} type="button" onClick={() => setFiltersOpen(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-warm"
                  style={{ flex: 1, borderRadius: 999 }}
                  type="button"
                  onClick={async () => {
                    setFiltersOpen(false);
                    await loadProfiles(false);
                  }}
                >
                  Apply
                </button>
              </div>

              <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800, marginTop: 6 }}>
                Note: filters need the SQL function <b>get_discovery_profiles_filtered</b>.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Match modal (C) */}
      {matchModal.open && (
        <div className="modalOverlay" onClick={() => setMatchModal({ open: false })} aria-modal="true" role="dialog">
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <div
              className="modalHero"
              style={{ backgroundImage: `url(${matchModal.profile?.avatar_signed_url || FALLBACK_AVATAR})` }}
            >
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.30), rgba(0,0,0,0.60))" }} />
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "white", textAlign: "center", padding: 18 }}>
                <div>
                  <div style={{ fontSize: 34, fontWeight: 1000, letterSpacing: -0.6 }}>It’s a Match! 💖</div>
                  <div style={{ marginTop: 8, fontSize: 14, opacity: 0.9, fontWeight: 800 }}>
                    You and {matchModal.profile?.name ?? "someone"} liked each other.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: 16 }}>
              <button
                className="btn btn-warm btn-full"
                type="button"
                onClick={() => {
                  const mid = matchModal.matchId;
                  setMatchModal({ open: false });
                  if (mid) window.location.href = `/chat/${mid}`;
                  else window.location.href = "/matches";
                }}
              >
                💬 Start chat
              </button>

              <button
                className="btn btn-gray btn-full"
                style={{ marginTop: 10 }}
                type="button"
                onClick={() => setMatchModal({ open: false })}
              >
                Keep swiping
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
