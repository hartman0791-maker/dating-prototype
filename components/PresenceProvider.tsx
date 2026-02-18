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
    const { error } = await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", uid);
    if (error) console.log("[presence] last_seen update error:", error.message);
  }

  useEffect(() => {
    let cancelled = false;

    console.log("[presence] Provider mounted ✅");

    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id ?? null;

      console.log("[presence] session uid:", uid);

      if (cancelled) return;

      if (!uid) {
        setUserId(null);
        setOnlineIds(new Set());
        return;
      }

      setUserId(uid);

      void touchLastSeen(uid);
      intervalRef.current = window.setInterval(() => void touchLastSeen(uid), 30_000);

      const onUnload = () => void touchLastSeen(uid);
      window.addEventListener("beforeunload", onUnload);

      const channel = supabase.channel("presence:global", {
        config: { presence: { key: uid } },
      });
      channelRef.current = channel;

      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, any[]>;
        console.log("[presence] sync state:", state);
        setOnlineIds(new Set(Object.keys(state)));
      });

      channel.on("presence", { event: "join" }, ({ key }) => {
        console.log("[presence] join:", key);
        setOnlineIds((prev) => new Set([...prev, key]));
      });

      channel.on("presence", { event: "leave" }, ({ key }) => {
        console.log("[presence] leave:", key);
        setOnlineIds((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      });

      channel.subscribe(async (status) => {
        console.log("[presence] subscribe status:", status);

        if (status === "SUBSCRIBED") {
          const res = await channel.track({ user_id: uid, at: new Date().toISOString() });
          console.log("[presence] track result:", res);
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
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence() {
  const ctx = useContext(PresenceContext);
  if (!ctx) throw new Error("usePresence must be used inside <PresenceProvider>");
  return ctx;
}

