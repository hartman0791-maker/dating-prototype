
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

type MenuState = {
  open: boolean;
  x: number;
  y: number;
  msg: Message | null;
};

export default function ChatPage({ params }: { params: { matchId: string } }) {
  const matchId = params.matchId;

  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);

  const typingTimeoutRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [menu, setMenu] = useState<MenuState>({ open: false, x: 0, y: 0, msg: null });

  // ✅ Long-press support (mobile)
  const pressTimerRef = useRef<number | null>(null);

  // ✅ Delete-for-me store (per match + user)
  const hiddenKey = useMemo(() => {
    if (!userId) return null;
    return `hidden_msgs:${matchId}:${userId}`;
  }, [matchId, userId]);

  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  // Load hidden ids from localStorage
  useEffect(() => {
    if (!hiddenKey) return;
    try {
      const raw = localStorage.getItem(hiddenKey);
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      setHiddenIds(new Set(arr));
    } catch {
      setHiddenIds(new Set());
    }
  }, [hiddenKey]);

  function persistHidden(next: Set<string>) {
    setHiddenIds(new Set(next));
    if (!hiddenKey) return;
    localStorage.setItem(hiddenKey, JSON.stringify(Array.from(next)));
  }

  function openMenuAt(x: number, y: number, msg: Message) {
    setMenu({ open: true, x, y, msg });
  }

  function closeMenu() {
    setMenu({ open: false, x: 0, y: 0, msg: null });
  }

  async function copyMessage(body: string) {
    await navigator.clipboard.writeText(body);
    setStatus("Copied ✅");
    window.setTimeout(() => setStatus(""), 900);
    closeMenu();
  }

  // ✅ Delete for me (only hides locally)
  function deleteForMe(msg: Message) {
    const next = new Set(hiddenIds);
    next.add(msg.id);
    persistHidden(next);

    setStatus("Deleted for you ✅");
    window.setTimeout(() => setStatus(""), 900);
    closeMenu();
  }

  // ✅ Delete for everyone (real delete via deleted_at update)
  async function deleteMessageForEveryone(msg: Message) {
    if (!userId) {
      setStatus("Not logged in.");
      window.setTimeout(() => setStatus(""), 1200);
      return;
    }

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

    // ✅ Direct UPDATE (no RPC). Also returns the updated row so we KNOW it worked.
    const { data, error } = await supabase
      .from("messages")
      .update({ deleted_at: nowIso })
      .eq("id", msg.id)
      .eq("sender_id", userId)
      .select("id,deleted_at")
      .single();

    if (error) {
      console.log(error);
      setStatus(`Delete failed: ${error.message}`);
      return;
    }

    if (!data?.id) {
      setStatus("Delete did nothing (RLS blocked or sender mismatch).");
      window.setTimeout(() => setStatus(""), 2500);
      return;
    }

    // Update UI immediately
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, deleted_at: data.deleted_at } : m))
    );

    setStatus("Deleted ✅");
    window.setTimeout(() => setStatus(""), 900);
    closeMenu();
  }

  async function reportMessage(msg: Message) {
    if (!userId) return;

    const { error } = await supabase.from("reports").insert({
      match_id: matchId,
      reporter_id: userId,
      reported_user_id: msg.sender_id,
      message_id: msg.id,
      reason: "User reported message",
    });

    if (error) {
      setStatus(`Report failed: ${error.message}`);
      window.setTimeout(() => setStatus(""), 2000);
      closeMenu();
      return;
    }

    setStatus("Reported ✅");
    window.setTimeout(() => setStatus(""), 900);
    closeMenu();
  }

  // ✅ Close menu on outside click
  useEffect(() => {
    const onDown = () => {
      if (menu.open) closeMenu();
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [menu.open]);

  // Auto scroll when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Get session
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        window.location.href = "/login";
        return;
      }
      setUserId(data.session.user.id);
    })();
  }, []);

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

  useEffect(() => {
    if (!userId) return;
    void loadMessages();
  }, [userId, matchId]);

  // Realtime messages
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
              (a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
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

  // Realtime typing
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

  // Cleanup typing timer on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (userId) void setTyping(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, matchId]);

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

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // Filter out hidden messages (delete-for-me)
  const visibleMessages = useMemo(
    () => messages.filter((m) => !hiddenIds.has(m.id)),
    [messages, hiddenIds]
  );

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

      {status && (
        <div style={{ padding: 12, borderRadius: 14, background: "#fff3cd", marginBottom: 12 }}>
          {status}
        </div>
      )}

      {otherTyping && <div style={{ marginBottom: 10, fontWeight: 800, opacity: 0.75 }}>Typing…</div>}

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
        {visibleMessages.map((m) => {
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
                // ✅ Long press opens menu (mobile)
                if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
                const x = (e as any).clientX ?? 120;
                const y = (e as any).clientY ?? 120;
                pressTimerRef.current = window.setTimeout(() => {
                  openMenuAt(x, y, m);
                }, 450);
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
            minWidth: 200,
          }}
          // ✅ THIS IS THE BIG FIX: allow clicking buttons without closing menu first
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" onClick={() => copyMessage(menu.msg!.body)} disabled={Boolean(menu.msg!.deleted_at)}>
            Copy
          </button>

          <button type="button" onClick={() => deleteForMe(menu.msg!)}>
            Delete for me
          </button>

          <button
            type="button"
            onClick={() => deleteMessageForEveryone(menu.msg!)}
            disabled={menu.msg!.sender_id !== userId || Boolean(menu.msg!.deleted_at)}
            title={menu.msg!.sender_id !== userId ? "Only the sender can delete for everyone" : ""}
          >
            Delete for everyone
          </button>

          <button type="button" onClick={() => reportMessage(menu.msg!)}>
            Report
          </button>
        </div>
      )}
    </main>
  );
}
