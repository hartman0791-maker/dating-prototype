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
    return () => {
      unsub?.();
    };
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
    // Realtime: listen for new messages in this match
    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const row = payload.new as MessageRow;
          setMessages((prev) => {
            // avoid duplicates
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
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

    if (error) {
      setStatus(`Send failed: ${error.message}`);
      return;
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main style={{ maxWidth: 600, margin: "40px auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Chat</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => (window.location.href = "/matches")}>Matches</button>
          <button onClick={logout}>Logout</button>
        </div>
      </div>

      <p style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>match_id: {matchId}</p>

      {status && (
        <div style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10, marginTop: 12 }}>
          {status}
        </div>
      )}

      <div
        style={{
          marginTop: 12,
          border: "1px solid #ddd",
          borderRadius: 14,
          padding: 12,
          height: 360,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {messages.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No messages yet. Say hi 👋</div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === userId;
            return (
              <div
                key={m.id}
                style={{
                  alignSelf: mine ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  border: "1px solid #ddd",
                  borderRadius: 14,
                  padding: "10px 12px",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.6 }}>{mine ? "You" : "Them"}</div>
                <div style={{ marginTop: 4 }}>{m.body}</div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          style={{ flex: 1, padding: 10 }}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
        />
        <button onClick={sendMessage} disabled={!canSend} style={{ padding: "10px 12px" }}>
          Send
        </button>
      </div>
    </main>
  );
}
