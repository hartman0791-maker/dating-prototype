"use client";
export {};

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import AppHeader from "../../../components/AppHeader";

type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type TypingRow = {
  match_id: string;
  user_id: string;
  is_typing: boolean;
  updated_at?: string;
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

  // ✅ Typing indicator state
  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // ✅ Long-press / right-click menu
  const [menu, setMenu] = useState<MenuState>({ open: false, x: 0, y: 0, msg: null });
  const pressTimerRef = useRef<number | null>(null);

  function openMenuAt(x: number, y: number, msg: Message) {
    const maxW = typeof window !== "undefined" ? window.innerWidth : 9999;
    const maxH = typeof window !== "undefined" ? window.innerHeight : 9999;

    setMenu({
      open: true,
      x: Math.min(x, maxW - 240),
      y: Math.min(y, maxH - 200),
      msg,
    });
  }

  function closeMenu() {
    setMenu({ open: false, x: 0, y: 0, msg: null });
  }

  async function copyMessage(body: string) {
    try {
      await navigator.clipboard.writeText(body);
      setStatus("Copied ✅");
      window.setTimeout(() => setStatus(""), 900);
      closeMenu();
    } catch {
      setStatus("Copy failed");
      window.setTimeout(() => setStatus(""), 900);
    }
  }

  async function deleteMessage(msg: Message) {
    if (!userId) return;

    // only allow deleting your own messages
    if (msg.sender_id !== userId) {
      setStatus("You can only delete your own messages.");
      window.setTimeout(() => setStatus(""), 1200);
      closeMenu();
      return;
    }

    const ok = window.confirm("Delete this message?");
    if (!ok) return;

    const { error } = await supabase.from("messages").delete().eq("id", msg.id);
    if (error) {
      setStatus(`Delete failed: ${error.message}`);
      return;
    }

    // Optimistic remove
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    closeMenu();
  }

  async function reportMessage(msg: Message) {
    if (!userId) return;

    // report the sender of that message (usually the other user)
    const reportedUserId = msg.sender_id;

    const reason = window.prompt("Report reason (optional):", "Spam / Harassment / Inappropriate");
    const { error } = await supabase.from("reports").insert({
      match_id: matchId,
      reporter_id: userId,
      reported_user_id: reportedUserId,
      message_id: msg.id,
      reason: reason ?? null,
    });

    if (error) {
      setStatus(`Report failed: ${error.message}`);
      return;
    }

    setStatus("Reported ✅");
    window.setTimeout(() => setStatus(""), 1200);
    closeMenu();
  }

  // Close menu when tapping anywhere
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

  // Get session on mount
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
    setStatus("Loading messages...");

    const { data, error } = await supabase
      .from("messages")
      .select("id,match_id,sender_id,body,created_at")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });

    if (error) {
      setStatus(`Error: ${error.message}`);
      return;
    }

    setMessages((data ?? []) as Message[]);
    setStatus("");
  }

  async function markRead() {
    if (!userId) return;

    const { error } = await supabase.from("message_reads").upsert(
      {
        match_id: matchId,
        user_id: userId,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: "match_id,user_id" }
    );

    if (error) console.log("markRead error:", error.message);
  }

  // ✅ Typing status writer
  async function setTyping(isTyping: boolean) {
    if (!userId) return;

    const { error } = await supabase.from("typing_status").upsert(
      {
        match_id: matchId,
        user_id: userId,
        is_typing: isTyping,
        updated_at: new Date().toISOString(), // forces update events
      },
      { onConflict: "match_id,user_id" }
    );

    if (error) console.log("setTyping error:", error.message);
  }

  // ✅ Input handler that actually triggers typing
  function handleTypingChange(next: string) {
    setText(next);

    // mark typing true
    setTyping(true);

    // debounce: set false after 4s of no input
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 4000);
  }

  // Load messages once and mark as read
  useEffect(() => {
    if (!userId) return;

    (async () => {
      await loadMessages();
      await markRead();
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, matchId]);

  // ✅ Realtime: listen for new messages on this match_id
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`chat:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const m = payload.new as Message;

          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            const next = [...prev, m];
            next.sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            return next;
          });

          markRead();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, matchId]);

  // ✅ Realtime Typing: listen for INSERT + UPDATE + DELETE
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`typing:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_status",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const row = payload.new as TypingRow | undefined;
          if (!row) return;

          // ignore my own typing row
          if (row.user_id === userId) return;

          setOtherTyping(Boolean(row.is_typing));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, matchId]);

  // ✅ Cleanup: stop typing when leaving page
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setTyping(false);

      if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, matchId]);

  async function sendMessage() {
    if (!text.trim() || !userId) return;

    const body = text.trim();

    // Clear input immediately
    setText("");

    // Stop typing immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    await setTyping(false);

    const { error } = await supabase.from("messages").insert({
      match_id: matchId,
      sender_id: userId,
      body,
    });

    if (error) {
      setStatus(`Send failed: ${error.message}`);
      return;
    }

    // Realtime will deliver it
    await markRead();
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="app-container" style={{ maxWidth: 560 }}>
      <AppHeader
        title="Chat"
        right={
          <>
            <button className="btn btn-gray" type="button" onClick={() => (window.location.href = "/matches")}>
              ← Matches
            </button>
            <button className="btn btn-gray" type="button" onClick={logout}>
              Logout
            </button>
          </>
        }
      />

      {status && (
        <div
          style={{
            padding: 12,
            borderRadius: 14,
            background: "rgba(255,244,235,0.85)",
            marginBottom: 12,
            fontWeight: 800,
          }}
        >
          {status}
        </div>
      )}

      {/* ✅ Typing indicator */}
      {otherTyping && (
        <div
          style={{
            marginBottom: 10,
            fontSize: 13,
            fontWeight: 800,
            opacity: 0.75,
          }}
        >
          Typing…
        </div>
      )}

      {/* Messages */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxHeight: "55vh",
          overflowY: "auto",
          padding: 12,
          borderRadius: 18,
          background: "var(--card-solid)",
          border: "1px solid var(--border)",
        }}
      >
        {messages.map((m) => {
          const mine = m.sender_id === userId;

          return (
            <div
              key={m.id}
              style={{
                alignSelf: mine ? "flex-end" : "flex-start",
                maxWidth: "75%",
                padding: "10px 14px",
                borderRadius: 18,
                background: mine
                  ? "linear-gradient(135deg, var(--warm1), var(--warm2))"
                  : "var(--btn-gray)",
                color: mine ? "white" : "var(--text)",
                boxShadow: "0 6px 12px rgba(0,0,0,0.12)",
                cursor: "context-menu",
                userSelect: "text",
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                openMenuAt(e.clientX, e.clientY, m);
              }}
              onPointerDown={(e) => {
                // long press for touch
                if (e.pointerType === "touch") {
                  pressTimerRef.current = window.setTimeout(() => {
                    openMenuAt(e.clientX, e.clientY, m);
                  }, 450);
                }
              }}
              onPointerUp={() => {
                if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
                pressTimerRef.current = null;
              }}
              onPointerCancel={() => {
                if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
                pressTimerRef.current = null;
              }}
            >
              {m.body}
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
            if (e.key === "Enter") sendMessage();
          }}
        />
        <button className="btn btn-warm" type="button" onClick={sendMessage}>
          Send
        </button>
      </div>

      {/* ✅ Long-press / right-click menu */}
      {menu.open && menu.msg && (
        <div
          style={{
            position: "fixed",
            left: menu.x,
            top: menu.y,
            width: 220,
            background: "white",
            borderRadius: 14,
            boxShadow: "0 18px 40px rgba(0,0,0,0.25)",
            border: "1px solid rgba(0,0,0,0.08)",
            padding: 8,
            zIndex: 9999,
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            className="btn btn-gray"
            type="button"
            style={{ width: "100%", marginBottom: 8 }}
            onClick={() => copyMessage(menu.msg!.body)}
          >
            📋 Copy
          </button>

          <button
            className="btn btn-gray"
            type="button"
            style={{ width: "100%", marginBottom: 8 }}
            onClick={() => deleteMessage(menu.msg!)}
          >
            🗑️ Delete
          </button>

          <button
            className="btn btn-warm"
            type="button"
            style={{ width: "100%" }}
            onClick={() => reportMessage(menu.msg!)}
          >
            🚩 Report
          </button>
        </div>
      )}
    </main>
  );
}
