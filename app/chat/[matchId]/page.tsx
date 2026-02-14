
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

export default function ChatPage({ params }: { params: { matchId: string } }) {
  const matchId = params.matchId;

  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const loadedOnceRef = useRef(false);

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

  // Load messages once and mark as read
  useEffect(() => {
    if (!userId) return;

    (async () => {
      await loadMessages();
      await markRead();
      loadedOnceRef.current = true;
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
          console.log("realtime INSERT payload:", payload);

          const m = payload.new as Message;

          // Avoid dupes + keep sorted
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            const next = [...prev, m];
            next.sort(
              (a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            return next;
          });

          // Mark as read when we receive a new message
          markRead();
        }
      )
      .subscribe((s) => {
        console.log("realtime status:", s, "matchId:", matchId, "userId:", userId);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, matchId]);

  async function sendMessage() {
    if (!text.trim() || !userId) return;

    const body = text.trim();
    setText("");

    const { error } = await supabase.from("messages").insert({
      match_id: matchId,
      sender_id: userId,
      body,
    });

    if (error) {
      setStatus(`Send failed: ${error.message}`);
      return;
    }

    // ✅ No loadMessages() needed anymore (realtime will deliver it)
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
            <button
              className="btn btn-gray"
              onClick={() => (window.location.href = "/matches")}
            >
              ← Matches
            </button>
            <button className="btn btn-gray" onClick={logout}>
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
          }}
        >
          {status}
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
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
        />
        <button className="btn btn-warm" onClick={sendMessage}>
          Send
        </button>
      </div>
    </main>
  );
}
