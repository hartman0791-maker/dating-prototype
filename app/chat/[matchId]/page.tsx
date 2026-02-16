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
  const pressTimerRef = useRef<number | null>(null);

  function openMenuAt(x: number, y: number, msg: Message) {
    setMenu({ open: true, x, y, msg });
  }

  function closeMenu() {
    setMenu({ open: false, x: 0, y: 0, msg: null });
  }

  async function copyMessage(body: string) {
    await navigator.clipboard.writeText(body);
    setStatus("Copied ✅");
    setTimeout(() => setStatus(""), 900);
    closeMenu();
  }

  async function deleteMessageForEveryone(msg: Message) {
    if (!userId) return;

    if (msg.sender_id !== userId) {
      setStatus("You can only delete your own messages.");
      setTimeout(() => setStatus(""), 1500);
      closeMenu();
      return;
    }

    const ok = window.confirm("Delete for everyone?");
    if (!ok) return;

    setStatus("Deleting…");

    const { data, error } = await supabase.rpc("delete_message_for_everyone", {
      p_message_id: msg.id,
    });

    if (error) {
      console.log(error);
      setStatus(`Delete failed: ${error.message}`);
      return;
    }

    if (!data) {
      setStatus("Not deleted — permission or sender mismatch.");
      setTimeout(() => setStatus(""), 2000);
      return;
    }

    // ✅ Change A: DO NOT clear body (your table has a check constraint)
    const nowIso = new Date().toISOString();
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, deleted_at: nowIso } : m))
    );

    setStatus("Deleted ✅");
    setTimeout(() => setStatus(""), 900);
    closeMenu();
  }

  async function reportMessage(msg: Message) {
    await supabase.from("reports").insert({
      match_id: matchId,
      reporter_id: userId,
      reported_user_id: msg.sender_id,
      message_id: msg.id,
      reason: "User reported message",
    });

    setStatus("Reported ✅");
    setTimeout(() => setStatus(""), 900);
    closeMenu();
  }

  useEffect(() => {
    const onDown = () => menu.open && closeMenu();
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [menu.open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    const { data } = await supabase
      .from("messages")
      .select("id,match_id,sender_id,body,created_at,deleted_at")
      .eq("match_id", matchId)
      .order("created_at");

    setMessages((data ?? []) as Message[]);
  }

  async function setTyping(isTyping: boolean) {
    if (!userId) return;

    await supabase.from("typing_status").upsert(
      {
        match_id: matchId,
        user_id: userId,
        is_typing: isTyping,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "match_id,user_id" }
    );
  }

  function handleTypingChange(v: string) {
    setText(v);
    setTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTyping(false), 4000);
  }

  useEffect(() => {
    if (!userId) return;
    loadMessages();
  }, [userId]);

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
            return exists ? prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)) : [...prev, m];
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`typing:${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "typing_status", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const row = payload.new as TypingRow;
          if (row.user_id !== userId) setOtherTyping(row.is_typing);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  async function sendMessage() {
    if (!text.trim()) return;

    await supabase.from("messages").insert({
      match_id: matchId,
      sender_id: userId,
      body: text.trim(),
    });

    setText("");
    setTyping(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="app-container" style={{ maxWidth: 560 }}>
      <AppHeader title="Chat" right={<button className="btn btn-gray" onClick={logout}>Logout</button>} />

      {status && (
        <div style={{ padding: 12, borderRadius: 14, background: "#fff3cd", marginBottom: 12 }}>
          {status}
        </div>
      )}

      {otherTyping && <div style={{ marginBottom: 10, fontWeight: 700 }}>Typing…</div>}

      <div style={{ maxHeight: "55vh", overflowY: "auto", padding: 12, borderRadius: 18, background: "#f5f5f5" }}>
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          const deleted = Boolean(m.deleted_at);

          return (
            <div
              key={m.id}
              style={{
                alignSelf: mine ? "flex-end" : "flex-start",
                marginBottom: 6,
                padding: "8px 12px",
                borderRadius: 14,
                background: mine ? "#ff4d79" : "#ddd",
                color: mine ? "white" : "#222",
                cursor: "context-menu",
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                openMenuAt(e.clientX, e.clientY, m);
              }}
            >
              {deleted ? <i>Message deleted</i> : m.body}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input value={text} onChange={(e) => handleTypingChange(e.target.value)} />
        <button className="btn btn-warm" onClick={sendMessage}>Send</button>
      </div>

      {menu.open && menu.msg && (
        <div style={{ position: "fixed", left: menu.x, top: menu.y, background: "white", padding: 8, borderRadius: 12 }}>
          <button onClick={() => copyMessage(menu.msg!.body)}>Copy</button>
          <button onClick={() => deleteMessageForEveryone(menu.msg!)}>Delete for everyone</button>
          <button onClick={() => reportMessage(menu.msg!)}>Report</button>
        </div>
      )}
    </main>
  );
}
