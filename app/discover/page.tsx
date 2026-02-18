"use client";
export {};

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import AppHeader from "../../components/AppHeader";
import { usePresence } from "../../components/PresenceProvider";

type DiscoveryRow = {
  id: string;
  name: string | null;
  bio: string | null;
  location_text: string | null;
  avatar_path: string | null;
  last_seen_at?: string | null;
  birthdate?: string | null;
  gender?: string | null;
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

function formatActiveLabel(lastSeen?: string | null) {
  if (!lastSeen) return "Offline recently";

  const last = new Date(lastSeen).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - last);

  const mins = Math.floor(diffMs / 60000);
  if (mins <= 0) return "Active just now";
  if (mins < 60) return `Active ${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Active ${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Active yesterday";
  if (days < 7) return `Active ${days}d ago`;

  return `Active ${new Date(lastSeen).toLocaleDateString()}`;
}

function calcAge(birthdate?: string | null) {
  if (!birthdate) return null;
  const d = new Date(birthdate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export default function DiscoverPage() {
  const { isOnline } = usePresence();

  const [userId, setUserId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ViewProfile[]>([]);
  const [current, setCurrent] = useState<ViewProfile | null>(null);

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [swiping, setSwiping] = useState(false);

  // Card animation state (for swipe-away)
  const [anim, setAnim] = useState<"in" | "out">("in");

  // ===== Filters UI =====
  const [filtersOpen, setFiltersOpen] = useState(false);

  // UI values
  const [genderFilter, setGenderFilter] = useState<"any" | "male" | "female" | "other">("any");
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(60);
  const [activeWithinMins, setActiveWithinMins] = useState(10080); // 7 days
  const [requirePhoto, setRequirePhoto] = useState(false);

  // Applied filters (used in loadProfiles)
  const [applied, setApplied] = useState({
    genderFilter: "any" as "any" | "male" | "female" | "other",
    minAge: 18,
    maxAge: 60,
    activeWithinMins: 10080,
    requirePhoto: false,
  });

  // Signed url cache
  const signedUrlCache = useRef<Record<string, string>>({});

  // ===== Swipe gestures =====
  const cardRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const [drag, setDrag] = useState({ x: 0, y: 0, rot: 0 });
  const [dragging, setDragging] = useState(false);

  const SWIPE_X_THRESHOLD = 120; // px
  const SWIPE_VELOCITY_THRESHOLD = 0.5; // px/ms

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

  function applyFilters() {
    const mn = Math.min(minAge, maxAge);
    const mx = Math.max(minAge, maxAge);

    setApplied({
      genderFilter,
      minAge: mn,
      maxAge: mx,
      activeWithinMins,
      requirePhoto,
    });

    setFiltersOpen(false);
    void loadProfiles();
  }

  function clearFilters() {
    setGenderFilter("any");
    setMinAge(18);
    setMaxAge(60);
    setActiveWithinMins(10080);
    setRequirePhoto(false);
  }

  async function loadProfiles() {
    setLoading(true);
    setStatus("");

    try {
      const genderArg = applied.genderFilter === "any" ? null : applied.genderFilter;

      let data: any = null;
      let error: any = null;

      // Try filtered RPC first (if present)
      const res1 = await supabase.rpc("get_discovery_profiles_filtered", {
        limit_count: 10,
        min_age: applied.minAge,
        max_age: applied.maxAge,
        gender_filter: genderArg,
        require_photo: applied.requirePhoto,
        active_within_mins: applied.activeWithinMins,
      });

      data = res1.data;
      error = res1.error;

      // Fallback if function doesn't exist / schema cache
      if (error && String(error.message || "").includes("schema cache")) {
        const res2 = await supabase.rpc("get_discovery_profiles", { limit_count: 10 });
        data = res2.data;
        error = res2.error;

        // Client-side filter fallback (best-effort)
        if (!error) {
          let raw = (data ?? []) as DiscoveryRow[];

          if (applied.requirePhoto) raw = raw.filter((p) => !!p.avatar_path);

          if (genderArg) {
            raw = raw.filter((p) => (p.gender || "").toLowerCase() === String(genderArg).toLowerCase());
          }

          raw = raw.filter((p) => {
            const age = calcAge(p.birthdate ?? null);
            if (age === null) return true;
            return age >= applied.minAge && age <= applied.maxAge;
          });

          if (applied.activeWithinMins && applied.activeWithinMins > 0) {
            const cutoff = Date.now() - applied.activeWithinMins * 60_000;
            raw = raw.filter((p) => {
              if (!p.last_seen_at) return true;
              return new Date(p.last_seen_at).getTime() >= cutoff;
            });
          }

          data = raw;
        }
      }

      if (error) {
        setProfiles([]);
        setCurrent(null);
        setStatus(`Error: ${error.message}`);
        return;
      }

      const raw = (data ?? []) as DiscoveryRow[];
      const list = await attachSignedUrls(raw);

      setProfiles(list);
      setCurrent(list[0] ?? null);
      setStatus(list.length ? "" : "No more profiles. Tip: turn OFF filters or create a second test account.");
      setAnim("in");
      setDrag({ x: 0, y: 0, rot: 0 });
    } finally {
      setLoading(false);
    }
  }

  async function swipe(direction: "like" | "pass") {
    if (!current || swiping) return;

    setSwiping(true);
    setAnim("out");

    window.setTimeout(async () => {
      try {
        const targetId = current.id;

        const remaining = profiles.slice(1);
        setProfiles(remaining);
        setCurrent(remaining[0] ?? null);

        // reset card drag immediately for next card
        setDrag({ x: 0, y: 0, rot: 0 });
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
        if (result?.matched) setStatus("It's a match! 🎉");
        else setStatus("");

        if (remaining.length < 3) void loadProfiles();
      } finally {
        setSwiping(false);
      }
    }, 180);
  }

  // ===== Gesture handlers =====
  function onPointerDown(e: React.PointerEvent) {
    if (!current || swiping) return;
    setDragging(true);
    startRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging || !startRef.current) return;

    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;

    // rotation based on dx
    const rot = Math.max(-12, Math.min(12, dx * 0.06));

    setDrag({ x: dx, y: dy * 0.25, rot });
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!dragging || !startRef.current) return;

    const dx = drag.x;
    const dt = Math.max(1, performance.now() - startRef.current.t);
    const vx = dx / dt; // px/ms

    setDragging(false);
    startRef.current = null;

    const shouldSwipe =
      Math.abs(dx) > SWIPE_X_THRESHOLD || Math.abs(vx) > SWIPE_VELOCITY_THRESHOLD;

    if (shouldSwipe) {
      const dir: "like" | "pass" = dx > 0 ? "like" : "pass";

      // fling animation
      const flyX = dx > 0 ? 900 : -900;
      setDrag((p) => ({ ...p, x: flyX, rot: dx > 0 ? 18 : -18 }));
      window.setTimeout(() => {
        void swipe(dir);
      }, 120);
    } else {
      // snap back
      setDrag({ x: 0, y: 0, rot: 0 });
    }
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
  const online = current ? isOnline(current.id) : false;
  const label = online ? "Online now" : formatActiveLabel(current?.last_seen_at ?? null);

  // overlays for swipe direction
  const likeOpacity = Math.max(0, Math.min(1, drag.x / 120));
  const nopeOpacity = Math.max(0, Math.min(1, -drag.x / 120));

  return (
    <main className="app-container">
      <style>{`
        .cardBase {
          transition: transform 180ms ease, opacity 180ms ease;
          will-change: transform, opacity;
        }
        .card.in { opacity: 1; transform: translateY(0) scale(1); }
        .card.out { opacity: 0; transform: translateY(10px) scale(0.98); }

        .pillBtn { border-radius: 999px; padding: 12px 14px; font-weight: 950; }
      `}</style>

      <AppHeader
        right={
          <>
            <button className="btn btn-gray" type="button" onClick={() => setFiltersOpen((v) => !v)}>
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

      {filtersOpen && (
        <div
          style={{
            marginBottom: 12,
            padding: 14,
            borderRadius: 18,
            border: "1px solid var(--border)",
            background: "var(--card-solid)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ fontWeight: 950, marginBottom: 10 }}>Filters</div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 900, opacity: 0.85 }}>Gender</div>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as any)}
                style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)" }}
              >
                <option value="any">Any</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 900, opacity: 0.85 }}>Min age: {minAge}</div>
              <input type="range" min={18} max={60} value={minAge} onChange={(e) => setMinAge(parseInt(e.target.value, 10))} />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 900, opacity: 0.85 }}>Max age: {maxAge}</div>
              <input type="range" min={18} max={80} value={maxAge} onChange={(e) => setMaxAge(parseInt(e.target.value, 10))} />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 900, opacity: 0.85 }}>Active within</div>
              <select
                value={activeWithinMins}
                onChange={(e) => setActiveWithinMins(parseInt(e.target.value, 10))}
                style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)" }}
              >
                <option value={10}>10 min</option>
                <option value={60}>1 hour</option>
                <option value={240}>4 hours</option>
                <option value={1440}>24 hours</option>
                <option value={10080}>7 days</option>
              </select>
            </div>

            <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 900, fontSize: 13, opacity: 0.9 }}>
              <input type="checkbox" checked={requirePhoto} onChange={(e) => setRequirePhoto(e.target.checked)} />
              Require photo (can hide everyone)
            </label>

            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <button className="btn btn-gray" type="button" onClick={clearFilters} style={{ flex: 1 }}>
                Clear
              </button>
              <button className="btn btn-warm" type="button" onClick={applyFilters} style={{ flex: 1 }}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {status && (
        <div style={{ padding: 12, borderRadius: 14, background: "rgba(255, 244, 235, 0.85)", marginBottom: 12 }}>
          {status}
        </div>
      )}

      {/* Skeleton */}
      {loading && !current ? (
        <div style={{ padding: 20, borderRadius: 22, background: "var(--card-solid)", border: "1px solid var(--border)" }}>
          <div style={{ height: 260, borderRadius: 18, background: "rgba(0,0,0,0.08)", marginBottom: 16 }} />
          <div style={{ height: 14, width: "60%", borderRadius: 10, background: "rgba(0,0,0,0.08)", marginBottom: 10 }} />
          <div style={{ height: 12, width: "90%", borderRadius: 10, background: "rgba(0,0,0,0.06)", marginBottom: 8 }} />
          <div style={{ height: 12, width: "80%", borderRadius: 10, background: "rgba(0,0,0,0.06)" }} />
        </div>
      ) : !current ? (
        <button className="btn btn-gray btn-full" type="button" onClick={loadProfiles}>
          Reload
        </button>
      ) : (
        <div
          ref={cardRef}
          className={`cardBase card ${anim}`}
          style={{
            padding: 20,
            borderRadius: 22,
            background: "linear-gradient(180deg, var(--card-solid), rgba(238,242,247,0.8))",
            border: "1px solid var(--border)",
            boxShadow: "0 14px 28px rgba(0,0,0,0.10)",
            touchAction: "pan-y",
            transform: `translate(${drag.x}px, ${drag.y}px) rotate(${drag.rot}deg)`,
            transition: dragging ? "none" : "transform 180ms ease, opacity 180ms ease",
            position: "relative",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* LIKE / NOPE overlay */}
          <div
            style={{
              position: "absolute",
              top: 18,
              left: 18,
              padding: "8px 12px",
              borderRadius: 12,
              border: "3px solid rgba(34,197,94,0.95)",
              color: "rgba(34,197,94,0.95)",
              fontWeight: 950,
              letterSpacing: 1,
              transform: "rotate(-12deg)",
              opacity: likeOpacity,
              background: "rgba(255,255,255,0.75)",
              backdropFilter: "blur(6px)",
              zIndex: 5,
              pointerEvents: "none",
            }}
          >
            LIKE
          </div>

          <div
            style={{
              position: "absolute",
              top: 18,
              right: 18,
              padding: "8px 12px",
              borderRadius: 12,
              border: "3px solid rgba(239,68,68,0.95)",
              color: "rgba(239,68,68,0.95)",
              fontWeight: 950,
              letterSpacing: 1,
              transform: "rotate(12deg)",
              opacity: nopeOpacity,
              background: "rgba(255,255,255,0.75)",
              backdropFilter: "blur(6px)",
              zIndex: 5,
              pointerEvents: "none",
            }}
          >
            NOPE
          </div>

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

            {/* Online / last seen badge */}
            <div
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.35)",
                color: "white",
                backdropFilter: "blur(8px)",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: online ? "#22c55e" : "rgba(255,255,255,0.55)",
                  boxShadow: online ? "0 0 0 6px rgba(34,197,94,0.18)" : "none",
                }}
              />
              <div style={{ fontSize: 12, fontWeight: 900 }}>{label}</div>
            </div>

            <div style={{ position: "absolute", left: 14, bottom: 12, color: "white" }}>
              <div style={{ fontWeight: 950, fontSize: 20 }}>{current.name ?? "Unnamed"}</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>{current.location_text ?? "No location"}</div>
            </div>
          </div>

          <p style={{ margin: "0 0 10px 0", color: "var(--muted)" }}>{current.bio ?? "No bio yet."}</p>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              className="btn btn-gray pillBtn"
              style={{ flex: 1 }}
              type="button"
              disabled={swiping}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void swipe("pass");
              }}
            >
              ❌ Pass
            </button>

            <button
              className="btn btn-warm pillBtn"
              style={{ flex: 1 }}
              type="button"
              disabled={swiping}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void swipe("like");
              }}
            >
              ❤️ Like
            </button>
          </div>

          {swiping && <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65, fontWeight: 800 }}>Saving…</div>}

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65, fontWeight: 800 }}>
            Tip: drag left/right to swipe ✨
          </div>
        </div>
      )}
    </main>
  );
}
