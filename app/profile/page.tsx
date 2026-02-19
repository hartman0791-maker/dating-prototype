"use client";
export {};

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Profile = {
  id: string;
  name: string | null;
  bio: string | null;
  location_text: string | null;
  avatar_path: string | null;

  // ✅ new fields
  birthdate: string | null; // date in Supabase
  gender: string | null; // text
  looking_for: string | null; // text
  interests: string | null; // text (comma separated is fine)
};

const FALLBACK_AVATAR =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#ff4d79"/>
        <stop offset="100%" stop-color="#ff9a3c"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="300" cy="240" r="90" fill="rgba(255,255,255,0.35)"/>
    <rect x="150" y="340" width="300" height="170" rx="85" fill="rgba(255,255,255,0.35)"/>
  </svg>
`);

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [locationText, setLocationText] = useState("");

  // ✅ new fields state
  const [birthdate, setBirthdate] = useState(""); // yyyy-mm-dd
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [lookingFor, setLookingFor] = useState("");
  const [interests, setInterests] = useState("");

  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string>(FALLBACK_AVATAR);

  const canSave = useMemo(() => !!userId, [userId]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        window.location.href = "/login";
        return;
      }
      const uid = data.session.user.id;
      setUserId(uid);
      await loadProfile(uid);
    })();
  }, []);

  async function loadProfile(uid: string) {
    setStatus("Loading profile...");

    const { data, error } = await supabase
      .from("profiles")
      .select("id,name,bio,location_text,avatar_path,birthdate,gender,looking_for,interests")
      .eq("id", uid)
      .single();

    if (error) {
      setStatus(`Error: ${error.message}`);
      return;
    }

    const p = data as Profile;
    setProfile(p);

    setName(p.name ?? "");
    setBio(p.bio ?? "");
    setLocationText(p.location_text ?? "");

    // ✅ new fields populate
    setBirthdate(p.birthdate ?? "");
    setGender(((p.gender ?? "") as any) || "");
    setLookingFor(p.looking_for ?? "");
    setInterests(p.interests ?? "");

    setStatus("");

    if (p.avatar_path) {
      const url = await getSignedAvatarUrl(p.avatar_path);
      if (url) setAvatarUrl(url);
    } else {
      setAvatarUrl(FALLBACK_AVATAR);
    }
  }

  async function getSignedAvatarUrl(path: string) {
    // 1 hour signed URL
    const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
    if (error) {
      console.log("signed url error:", error.message);
      return null;
    }
    return data.signedUrl;
  }

  async function saveProfile() {
    if (!userId) return;

    setStatus("Saving...");

    const { error } = await supabase
      .from("profiles")
      .update({
        name: name.trim() || null,
        bio: bio.trim() || null,
        location_text: locationText.trim() || null,

        // ✅ new fields saved
        birthdate: birthdate || null,
        gender: gender || null,
        looking_for: lookingFor.trim() || null,
        interests: interests.trim() || null,
      })
      .eq("id", userId);

    if (error) {
      setStatus(`Save failed: ${error.message}`);
      return;
    }

    setStatus("Saved ✅");
    await loadProfile(userId);
  }

  async function uploadAvatar(file: File) {
    if (!userId) return;

    setUploading(true);
    setStatus("Uploading photo...");

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${userId}/avatar.${ext}`; // IMPORTANT: matches RLS policy

    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

    if (upErr) {
      setUploading(false);
      setStatus(`Upload failed: ${upErr.message}`);
      return;
    }

    // Save only the path (NOT a public URL)
    const { error: profErr } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", userId);

    if (profErr) {
      setUploading(false);
      setStatus(`Saving avatar path failed: ${profErr.message}`);
      return;
    }

    const signed = await getSignedAvatarUrl(path);
    if (signed) setAvatarUrl(signed);

    setUploading(false);
    setStatus("Photo updated ✅");
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="app-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Profile</h1>
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

      <div
        style={{
          padding: 18,
          borderRadius: 20,
          background: "linear-gradient(180deg, #ffffff, #eef2f7)",
          boxShadow: "0 12px 24px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: 22,
              backgroundImage: `url(${avatarUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              boxShadow: "0 10px 18px rgba(0,0,0,0.10)",
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{name || "Your name"}</div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>{userId ? `id: ${userId}` : ""}</div>

            <label
              className="btn btn-soft"
              style={{
                display: "inline-block",
                marginTop: 10,
                padding: "10px 12px",
                borderRadius: 14,
                cursor: uploading ? "not-allowed" : "pointer",
                opacity: uploading ? 0.6 : 1,
              }}
            >
              {uploading ? "Uploading..." : "📸 Upload photo"}
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                }}
              />
            </label>
          </div>
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 800 }}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)" }} />

          <label style={{ fontSize: 13, fontWeight: 800 }}>Bio</label>
          <input value={bio} onChange={(e) => setBio(e.target.value)} style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)" }} />

          <label style={{ fontSize: 13, fontWeight: 800 }}>Location</label>
          <input value={locationText} onChange={(e) => setLocationText(e.target.value)} style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)" }} />

          {/* ✅ New fields */}
          <label style={{ fontSize: 13, fontWeight: 800 }}>Birthdate</label>
          <input
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)" }}
          />

          <label style={{ fontSize: 13, fontWeight: 800 }}>Gender</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as any)}
            style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)" }}
          >
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>

          <label style={{ fontSize: 13, fontWeight: 800 }}>Looking for</label>
          <input
            value={lookingFor}
            onChange={(e) => setLookingFor(e.target.value)}
            placeholder="e.g. Long-term, Friends, Casual"
            style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)" }}
          />

          <label style={{ fontSize: 13, fontWeight: 800 }}>Interests</label>
          <input
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="e.g. gym, travel, music"
            style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)" }}
          />

          <button className="btn btn-warm btn-full" disabled={!canSave} onClick={saveProfile}>
            Save changes
          </button>
        </div>
      </div>
    </main>
  );
}
