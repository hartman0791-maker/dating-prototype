"use client";
export {};

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PresenceContextValue = {
  userId: string | null;
  onlineIds: Set<string>;
  isOnline: (uid: string | null | undefined) => boolean;
};

const PresenceContext = createContext<PresenceContextValue | null>(null);

/**
 * Global Presence Provider:
 * - Tracks "who is online anywhere in the app" using ONE channel: presence:global
 * - Updates profiles.last_seen_at every 30s (backup for "Last seen")
 * - Exposes onlineIds + isOnline() via context
 */
export default function PresenceProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const intervalRef = useRef<number | null>(null);

  const value = useMemo<PresenceContextValue>(() => {
    return {
      userId,
      onlineIds,
      isOnline: (uid) => !!uid && onlineIds.has(uid),
    };
  }, [userId, onlineIds]);

  async function touchLastSeen(uid: string) {
    // Best-effort (don’t block UI). This is used for "Last seen X ago"
    const { error } = await supabase
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", uid);

    if (error) console.log("[presence] last_seen update error:", error.message);
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id ?? null;
      if (cancelled) return;

      // If not logged in, nothing to track
      if (!uid) {
        setUserId(null);
        setOnlineIds(new Set());
        return;
      }

      setUserId(uid);

      // Backup “last seen”: update immediately + every 30s
      void touchLastSeen(uid);
      intervalRef.current = window.setInterval(() => void touchLastSeen(uid), 30_000);

      // Update on tab close (best effort)
      const onUnload = () => void touchLastSeen(uid);
      window.addEventListener("beforeunload", onUnload);

      // ✅ Global presence channel
      const channel = supabase.channel("presence:global", {
        config: { presence: { key: uid } },
      });
      channelRef.current = channel;

      channel.on("presence", { event: "sync" }, () => {
        // presenceState is: { [key]: [payload, payload, ...] }
        const state = channel.presenceState() as Record<string, any[]>;
        setOnlineIds(new Set(Object.keys(state)));
      });

      channel.on("presence", { event: "join" }, ({ key }) => {
        setOnlineIds((prev) => new Set([...prev, key]));
      });

      channel.on("presence", { event: "leave" }, ({ key }) => {
        setOnlineIds((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      });

      channel.subscribe(async (status) => {
        // Track once subscribed
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: uid, at: new Date().toISOString() });
        }
      });

      return () => {
        window.removeEventListener("beforeunload", onUnload);
      };
    })();

    return () => {
      cancelled = true;

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (channelRef.current) {
        // IMPORTANT: cleanup must return void (not Promise)
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

/** Hook to read global presence anywhere */
export function usePresence() {
  const ctx = useContext(PresenceContext);
  if (!ctx) {
    throw new Error("usePresence must be used inside <PresenceProvider>");
  }
  return ctx;
}
