"use client";
export {};

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import AppHeader from "../../../components/AppHeader";

type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  deleted_at?: string | null;
};

type TypingRow = {
  match_id: string;
  user_id: string;
  is_typing: boolean;
};

type MatchRow = {
  id: string;
  user_low: string;
  user_high: string;
};

type ProfileRow = {
  id: string;
  name: string | null;
  last_seen_at: string | null;
};

type MenuState = {
  open: boolean;
  x: number;
  y: number;
  msg: Message | null;
};

function getPresenceLabel(lastSeen: string | null | undefined) {
  if (!lastSeen) return "Offline";
  const diffMs = Date.now() - new Date(lastSeen).getTime();
  if (diffMs < 60_000) return "Online recently";

  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `Last seen ${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;

  const d = new Date(lastSeen);
  return `Last seen ${d.toLocaleDateString()}`;
}

export default function ChatPage({ params }: { params: { matchId: string } }) {
  const matchId = params.matchId;

  const [userId, setUserId] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);

  const [otherProfile, setOtherProfile] = useState<ProfileRow | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");

  const [status, setStatus] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);

  // ✅ Presence: who is currently in the chat room
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  // menu (optional)
  const [menu, setMenu] = useState<MenuState>({ open: false, x: 0, y: 0, msg: null });

  const typingTimeoutRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const pressTimerRef = useRef<number | null>(null);

  const roomTopic = useMemo(() => `presence:match:${matchId}`, [matchId]);

  const isOtherOnline = useMemo(() => {
    if (!otherUserId) return false;
    return onlineIds.has(otherUserId);
  }, [onlineIds, otherUserId]);

  const otherName = otherProfile?.name || "User";

  function openMenuAt(x: number, y: number, msg: Message) {
    setMenu({ open: true, x, y, msg });
  }
  function closeMenu() {
    setMenu({ open: false, x: 0, y: 0, msg: null });
  }

  async function updateMyLastSeen(uid: string) {
    // best effort
    const { error } = await supabase
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", uid);
    if (error) console.log("update last_seen_at error:", error.message);
  }

  async function loadOtherProfile(oid: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,name,last_seen_at")
      .eq("id", oid)
      .single();
    if (error) {
      console.log("load other profile error:", error.message);
      return;
    }
    setOtherProfile(data as ProfileRow);
  }

  async function loadMessages() {
    const { data, error } = await supabase
      .from("messages")
      .select("id,match_id,sender_id,body,created_at,deleted_at")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });

    if (error) {
      setStatus(`Load failed: ${error.message}`);
      return;
    }

    setMessages((data ?? []) as Message[]);
  }

  async function setTyping(isTyping: boolean) {
    if (!userId) return;
    const { error } = await supabase.from("typing_status").upsert(
      {
        match_id: matchId,
        user_id: userId,
        is_typing: isTyping,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "match_id,user_id" }
    );
    if (error) console.log("setTyping error:", error.message);
  }

  function handleTypingChange(v: string) {
    setText(v);
    void setTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => void setTyping(false), 2500);
  }

  async function sendMessage() {
    if (!userId) return;
    if (!text.trim()) return;

    const body = text.trim();
    setText("");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    void setTyping(false);

    const { error } = await supabase.from("messages").insert({
      match_id: matchId,
      sender_id: userId,
      body,
    });

    if (error) {
      setStatus(`Send failed: ${error.message}`);
      window.setTimeout(() => setStatus(""), 2000);
    }
  }

  // ✅ Delete for everyone (soft delete via deleted_at)
  async function deleteForEveryone(msg: Message) {
    if (!userId) return;

    if (msg.sender_id !== userId) {
      setStatus("You can only delete your own messages.");
      window.setTimeout(() => setStatus(""), 1500);
      closeMenu();
      return;
    }

    const ok = window.confirm("Delete for everyone?");
    if (!ok) return;

    setStatus("Deleting…");

    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from("messages")
      .update({ deleted_at: nowIso })
      .eq("id", msg.id)
      .eq("sender_id", userId)
      .select("id,deleted_at")
      .single();

    if (error) {
      setStatus(`Delete failed: ${error.message}`);
      window.setTimeout(() => setStatus(""), 2500);
      return;
    }

    if (!data?.id) {
      setStatus("Delete did nothing (blocked by RLS or sender mismatch).");
      window.setTimeout(() => setStatus(""), 2500);
      return;
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, deleted_at: data.deleted_at } : m))
    );

    setStatus("Deleted ✅");
    window.setTimeout(() => setStatus(""), 900);
    closeMenu();
  }

  async function logout() {
    if (userId) await updateMyLastSeen(userId);
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // Close menu on outside click
  useEffect(() => {
    const onDown = () => menu.open && closeMenu();
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [menu.open]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 1) Get session + identify other user from matches
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;

      if (!uid) {
        window.location.href = "/login";
        return;
      }

      setUserId(uid);

      const { data: match, error: matchErr } = await supabase
        .from("matches")
        .select("id,user_low,user_high")
        .eq("id", matchId)
        .single();

      if (matchErr) {
        setStatus(`Match load failed: ${matchErr.message}`);
        return;
      }

      const m = match as MatchRow;
      const other = m.user_low === uid ? m.user_high : m.user_low;
      setOtherUserId(other);
      void loadOtherProfile(other);
    })();
  }, [matchId]);

  // 2) Keep updating my last_seen_at (backup for “last seen” text)
  useEffect(() => {
    if (!userId) return;

    void updateMyLastSeen(userId);

    const interval = window.setInterval(() => void updateMyLastSeen(userId), 30_000);

    const onUnload = () => {
      void updateMyLastSeen(userId);
    };
    window.addEventListener("beforeunload", onUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", onUnload);
      void updateMyLastSeen(userId);
    };
  }, [userId]);

  // 3) Presence channel (TRUE realtime online/offline)
  useEffect(() => {
    if (!userId) return;

    // Presence state looks like { [presenceKey]: [{...payload}, ...] }
    const channel = supabase.channel(roomTopic, {
      config: { presence: { key: userId } },
    });

    // On full sync, rebuild online set
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState() as Record<string, any[]>;
      setOnlineIds(new Set(Object.keys(state)));
    });

    // On join, add keys
    channel.on("presence", { event: "join" }, ({ key }) => {
      setOnlineIds((prev) => new Set([...prev, key]));
    });

    // On leave, remove keys
    channel.on("presence", { event: "leave" }, ({ key }) => {
      setOnlineIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });

      // When someone leaves, refresh their profile so "last seen" updates soon
      if (otherUserId) void loadOtherProfile(otherUserId);
    });

    channel.subscribe(async (st) => {
      if (st === "SUBSCRIBED") {
        // track my presence payload (optional extra state)
        await channel.track({ user_id: userId, at: new Date().toISOString() });
      }
    });

    return () => {
      // cleanup must return void (not Promise)
      void supabase.removeChannel(channel);
    };
  }, [userId, roomTopic, otherUserId]);

  // 4) Load + realtime messages
  useEffect(() => {
    if (!userId) return;
    void loadMessages();
  }, [userId, matchId]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`chat:${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const m = payload.new as Message;

          setMessages((prev) => {
            const exists = prev.some((x) => x.id === m.id);
            const next = exists
              ? prev.map((x) => (x.id === m.id ? { ...x, ...m } : x))
              : [...prev, m];

            next.sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, matchId]);

  // 5) realtime typing
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`typing:${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "typing_status", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const row = payload.new as TypingRow;
          if (row.user_id !== userId) setOtherTyping(Boolean(row.is_typing));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, matchId]);

  // Cleanup typing timer
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (userId) void setTyping(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, matchId]);

  const presenceText = isOtherOnline
    ? "Online now"
    : getPresenceLabel(otherProfile?.last_seen_at);

  return (
    <main className="app-container" style={{ maxWidth: 560 }}>
      <AppHeader
        title="Chat"
        right={
          <>
            <button className="btn btn-gray" type="button" onClick={() => (window.location.href = "/matches")}>
              ← Matches
            </button>
            <button className="btn btn-gray" type="button" onClick={() => (window.location.href = "/discover")}>
              🔥 Discover
            </button>
            <button className="btn btn-gray" type="button" onClick={logout}>
              Logout
            </button>
          </>
        }
      />

      {/* Other user's online/last seen */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: isOtherOnline ? "#22c55e" : "#cbd5e1",
            boxShadow: isOtherOnline ? "0 0 0 6px rgba(34,197,94,0.12)" : "none",
          }}
        />
        <div style={{ display: "grid" }}>
          <div style={{ fontWeight: 950 }}>{otherName}</div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>{presenceText}</div>
        </div>
      </div>

      {status && (
        <div style={{ padding: 12, borderRadius: 14, background: "#fff3cd", marginBottom: 12 }}>
          {status}
        </div>
      )}

      {otherTyping && <div style={{ marginBottom: 10, fontWeight: 800, opacity: 0.75 }}>Typing…</div>}

      {/* Messages */}
      <div
        style={{
          maxHeight: "55vh",
          overflowY: "auto",
          padding: 12,
          borderRadius: 18,
          background: "var(--card-solid, #f5f5f5)",
          border: "1px solid rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          const deleted = Boolean(m.deleted_at);

          return (
            <div
              key={m.id}
              style={{
                alignSelf: mine ? "flex-end" : "flex-start",
                maxWidth: "78%",
                padding: "10px 14px",
                borderRadius: 16,
                background: mine
                  ? "linear-gradient(135deg, var(--warm1,#ff4d79), var(--warm2,#ff9a3c))"
                  : "#e6e6e6",
                color: mine ? "white" : "#222",
                cursor: "context-menu",
                opacity: deleted ? 0.75 : 1,
                userSelect: "none",
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                openMenuAt(e.clientX, e.clientY, m);
              }}
              onPointerDown={(e) => {
                // long-press opens menu (mobile)
                if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
                const x = (e as any).clientX ?? 120;
                const y = (e as any).clientY ?? 120;
                pressTimerRef.current = window.setTimeout(() => openMenuAt(x, y, m), 450);
              }}
              onPointerUp={() => {
                if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
              }}
              onPointerCancel={() => {
                if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
              }}
            >
              {deleted ? <i>Message deleted</i> : m.body}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <input
          value={text}
          onChange={(e) => handleTypingChange(e.target.value)}
          placeholder="Type a message…"
          onKeyDown={(e) => {
            if (e.key === "Enter") void sendMessage();
          }}
        />
        <button className="btn btn-warm" type="button" onClick={() => void sendMessage()}>
          Send
        </button>
      </div>

      {/* Simple menu (optional) */}
      {menu.open && menu.msg && (
        <div
          style={{
            position: "fixed",
            left: menu.x,
            top: menu.y,
            background: "white",
            padding: 10,
            borderRadius: 12,
            boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
            border: "1px solid rgba(0,0,0,0.10)",
            display: "grid",
            gap: 8,
            zIndex: 9999,
            minWidth: 220,
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(menu.msg!.body);
              setStatus("Copied ✅");
              window.setTimeout(() => setStatus(""), 900);
              closeMenu();
            }}
            disabled={Boolean(menu.msg!.deleted_at)}
          >
            Copy
          </button>

          <button
            type="button"
            onClick={() => void deleteForEveryone(menu.msg!)}
            disabled={menu.msg!.sender_id !== userId || Boolean(menu.msg!.deleted_at)}
            title={menu.msg!.sender_id !== userId ? "Only the sender can delete for everyone" : ""}
          >
            Delete for everyone
          </button>

          <button type="button" onClick={closeMenu}>
            Close
          </button>
        </div>
      )}
    </main>
  );
}
