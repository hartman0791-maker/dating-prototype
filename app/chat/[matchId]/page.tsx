"use client";
export {};

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

type MessageRow = {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

const topBtn: React.CSSProperties = {
  border: "none",
  background: "#f1f1f1",
  padding: "8px 12px",
  borderRadius: 12,
  cursor: "pointer",
};

export default function ChatPage({ params }: { params: { matchId: string } }) {
  const matchId = params.matchId;

  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const canSend = useMemo(() => text.trim().length > 0 && !!userId, [text, userId]);

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

  useEffect(() => {
    if (!userId) return;
    loadMessages();
    const unsub = subscribeToNewMessages();
    return () => unsub?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function loadMessages() {
    setStatus("Loading chat...");
    const { data, error } = await supabase
      .from("messages")
      .select("id,match_id,sender_id,body,created_at")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });

    if (error) {
      setStatus(`Error loading messages: ${error.message}`);
      return;
    }

    setMessages((data ?? []) as MessageRow[]);
    setStatus("");
  }

  function subscribeToNewMessages() {
    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const row = payload.new as MessageRow;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async function sendMessage() {
    if (!canSend || !userId) return;

    const body = text.trim();
    setText("");

    const { error } = await supabase.from("messages").insert({
      match_id: matchId,
      sender_id: userId,
      body,
    });

    if (error) setStatus(`Send failed: ${error.message}`);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="app-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Chat</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={topBtn} onClick={() => (window.location.href = "/matches")}>
            💬 Matches
          </button>
          <button style={topBtn} onClick={logout}>
            🚪 Logout
          </button>
        </div>
      </div>

      <p style={{ fontSize: 12, opacity: 0.75, margin: "0 0 12px 0" }}>match_id: {matchId}</p>

      {status && (
        <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 14, marginBottom: 12, background: "#fff7f2" }}>
          {status}
        </div>
      )}

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 18,
          padding: 12,
          height: 360,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          background: "linear-gradient(180deg, #ffffff, #eef2f7)",
        }}
      >
        {messages.length === 0 ? (
          <div style={{ opacity: 0.7, color: "#333" }}>No messages yet. Say hi 👋</div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === userId;
            return (
              <div
                key={m.id}
                style={{
                  alignSelf: mine ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  borderRadius: 16,
                  padding: "10px 12px",
                  background: mine ? "linear-gradient(135deg, #ff416c, #ff4b2b)" : "#ffffff",
                  color: mine ? "#fff" : "#111",
                  border: mine ? "none" : "1px solid #eee",
                  boxShadow: "0 8px 14px rgba(0,0,0,0.08)",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.85 }}>{mine ? "You" : "Them"}</div>
                <div style={{ marginTop: 4 }}>{m.body}</div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 14,
            border: "1px solid #ddd",
            outline: "none",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!canSend}
          style={{
            padding: "12px 14px",
            borderRadius: 14,
            border: "none",
            cursor: canSend ? "pointer" : "not-allowed",
            background: canSend ? "linear-gradient(135deg, #6a11cb, #2575fc)" : "#ddd",
            color: "white",
            fontWeight: 800,
          }}
        >
          Send
        </button>
      </div>
    </main>
  );
}
