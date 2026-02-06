"use client";
export {};

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Profile = {
  id: string;
  name: string | null;
  bio: string | null;
  location_text: string | null;
  avatar_url: string | null;
};

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80";

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [locationText, setLocationText] = useState("");
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);

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
      .select("id,name,bio,location_text,avatar_url")
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
    setStatus("");
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

    // File path inside bucket
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (upErr) {
      setUploading(false);
      setStatus(`Upload failed: ${upErr.message}`);
      return;
    }

    // Get public URL (bucket should be Public for easiest prototype)
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    const { error: profErr } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    setUploading(false);

    if (profErr) {
      setStatus(`Saved photo URL failed: ${profErr.message}`);
      return;
    }

    setStatus("Photo updated ✅");
    await loadProfile(userId);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const avatar = profile?.avatar_url || FALLBACK_AVATAR;

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
              backgroundImage: `url(${avatar})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              boxShadow: "0 10px 18px rgba(0,0,0,0.10)",
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{name || "Your name"}</div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
              {userId ? `id: ${userId}` : ""}
            </div>

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
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)" }}
            placeholder="Your name"
          />

          <label style={{ fontSize: 13, fontWeight: 800 }}>Bio</label>
          <input
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)" }}
            placeholder="Short bio"
          />

          <label style={{ fontSize: 13, fontWeight: 800 }}>Location</label>
          <input
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)" }}
            placeholder="Toronto"
          />

          <button className="btn btn-warm btn-full" disabled={!canSave} onClick={saveProfile}>
            Save changes
          </button>
        </div>
      </div>
    </main>
  );
}
