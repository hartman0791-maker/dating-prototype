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
};

export default function ChatPage({ params }: { params: { matchId: string } }) {
  const matchId = params.matchId;

  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll
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

  // Load messages
  useEffect(() => {
    if (!userId) return;
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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

    await loadMessages();
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
      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 12,
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button className="btn btn-warm" onClick={sendMessage}>
          Send
        </button>
      </div>
    </main>
  );
}
