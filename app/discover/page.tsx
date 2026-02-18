"use client";
export {};

import { useEffect, useMemo, useRef, useState } from "react";
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
  gender?: string | null;
  birthdate?: string | null; // comes back as string from Supabase
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
  if (!lastSeen) return "Offline";

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
  const [anim, setAnim] = useState<"in" | "out">("in");
  const [loading, setLoading] = useState(false);
  const [swiping, setSwiping] = useState(false);

  // ✅ Filter UI state
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [genderFilter, setGenderFilter] = useState<string>("any"); // any | male | female | other
  const [minAge, setMinAge] = useState<number>(18);
  const [activeWithinMins, setActiveWithinMins] = useState<number>(1440); // 24h default
  const [requirePhoto, setRequirePhoto] = useState<boolean>(true);

  // Applied filters (only change when user hits Apply)
  const [applied, setApplied] = useState({
    genderFilter: "any",
    minAge: 18,
    activeWithinMins: 1440,
    requirePhoto: true,
  });

  const signedUrlCache = useRef<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        window.location.href = "/login";
        return;
      }
      setUserId(data.session.user.id);
      await loadProfiles(); // loads with defaults
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function getSignedAvatarUrl(path: string) {
    if (signedUrlCache.current[path]) return signedUrlCache.current[path];
   const { data, error } = await supabase.rpc("get_discovery_profiles_filtered", {
  limit_count: 10,
  min_age: applied.minAge,
  max_age: 60, // or make it a UI slider too
  gender_filter: applied.genderFilter === "any" ? null : applied.genderFilter,
  require_photo: applied.requirePhoto,
  active_within_mins: applied.activeWithinMins,
});


  async function attachSignedUrls(list: DiscoveryRow[]): Promise<ViewProfile[]> {
    const out: ViewProfile[] = [];
    for (const p of list) {
      let signed: string | null = null;
      if (p.avatar_path) signed = await getSignedAvatarUrl(p.avatar_path);
      out.push({ ...p, avatar_signed_url: signed });
    }
    return out;
  }

  // ✅ Loads using applied filters
  async function loadProfiles() {
    setLoading(true);
    setStatus("");

    const genderArg = applied.genderFilter === "any" ? null : applied.genderFilter;

    const { data, error } = await supabase.rpc("get_discovery_profiles_filtered", {
      limit_count: 10,
      active_within_mins: applied.activeWithinMins,
      gender_filter: genderArg,
      require_photo: applied.requirePhoto,
      min_age: applied.minAge,
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

  async function swipe(direction: "like" | "pass") {
    if (!current || swiping) return;

    setSwiping(true);
    setAnim("out");

    setTimeout(async () => {
      try {
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
        if (result?.matched) setStatus(`It's a match! 🎉`);
        else setStatus("");

        if (remaining.length < 3) void loadProfiles();
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
    await loadProfiles();
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const photoUrl = current?.avatar_signed_url || FALLBACK_AVATAR;
  const online = current ? isOnline(current.id) : false;
  const label = online ? "Online now" : formatActiveLabel(current?.last_seen_at ?? null);

  const age = useMemo(() => calcAge(current?.birthdate ?? null), [current?.birthdate]);

  function applyFilters() {
    setApplied({
      genderFilter,
      minAge,
      activeWithinMins,
      requirePhoto,
    });
    setFiltersOpen(false);
    void loadProfiles();
  }

  function clearFilters() {
    setGenderFilter("any");
    setMinAge(18);
    setActiveWithinMins(1440);
    setRequirePhoto(true);
  }

  return (
    <main className="app-container">
      <style>{`
        .card { transition: transform 180ms ease, opacity 180ms ease; will-change: transform, opacity; }
        .card.in { opacity: 1; transform: translateY(0) scale(1); }
        .card.out { opacity: 0; transform: translateY(10px) scale(0.98); }
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

      {/* ✅ Filter panel */}
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
            {/* Gender */}
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 900, opacity: 0.85 }}>Gender</div>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)" }}
              >
                <option value="any">Any</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Min age */}
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 900, opacity: 0.85 }}>Minimum age: {minAge}</div>
              <input
                type="range"
                min={18}
                max={60}
                value={minAge}
                onChange={(e) => setMinAge(parseInt(e.target.value, 10))}
              />
            </div>

            {/* Active within */}
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 900, opacity: 0.85 }}>
                Active within:{" "}
                {activeWithinMins <= 60
                  ? `${activeWithinMins} min`
                  : activeWithinMins < 1440
                  ? `${Math.round(activeWithinMins / 60)} hr`
                  : `${Math.round(activeWithinMins / 1440)} day`}
              </div>
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

            {/* Require photo */}
            <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 900, fontSize: 13, opacity: 0.9 }}>
              <input type="checkbox" checked={requirePhoto} onChange={(e) => setRequirePhoto(e.target.checked)} />
              Require photo
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

            {/* Status badge */}
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
              <div style={{ fontWeight: 950, fontSize: 20 }}>
                {current.name ?? "Unnamed"}{age ? `, ${age}` : ""}
              </div>
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

          {swiping && <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65, fontWeight: 800 }}>Saving…</div>}
        </div>
      )}
    </main>
  );
}
