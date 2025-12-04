import React, { useEffect, useState, useCallback } from "react";
import { getBackendActor } from "../ic/backendActor";

type Room = {
  id: bigint;
  name: string;
  description: string;
  creator: any;
  is_private: boolean;
  created_at: bigint;
};

type Message = {
  id: bigint;
  room_id: bigint;
  author: any;
  content: string;
  timestamp: bigint;
  reply_to: [] | [bigint];
  edited: boolean;
  tip_total_e8s: bigint;
};

interface ChatPanelProps {
  principal: string | null;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ principal }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [editText, setEditText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Dynamically load emoji-picker-react only in the browser
  const [EmojiPickerComponent, setEmojiPickerComponent] =
    useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let canceled = false;
    import("emoji-picker-react")
      .then((mod) => {
        if (!canceled) {
          setEmojiPickerComponent(() => mod.default);
        }
      })
      .catch((err) => {
        console.error("Failed to load emoji-picker-react", err);
      });

    return () => {
      canceled = true;
    };
  }, []);

  const loadRooms = useCallback(async () => {
    try {
      const actor = await getBackendActor();
      const list: Room[] = await actor.list_rooms();

      // De-dupe by NAME so duplicate "Global Chat" rooms collapse
      const byName = new Map<string, Room>();
      for (const r of list) {
        if (!byName.has(r.name)) byName.set(r.name, r);
      }
      let deduped = Array.from(byName.values());

      if (deduped.length === 0) {
        const created: Room = await actor.create_room(
          "Global Chat",
          "Everyone's trading floor.",
          false
        );
        deduped = [created];
      }

      setRooms(deduped);
      setActiveRoom((prev) => {
        if (!prev) return deduped[0];
        const found = deduped.find((r) => r.id === prev.id);
        return found ?? deduped[0];
      });
    } catch (e) {
      console.error("loadRooms error", e);
      setError("Failed to load rooms: " + String(e));
    }
  }, []);

  const loadMessages = useCallback(
    async (room: Room | null) => {
      if (!room) return;
      try {
        const actor = await getBackendActor();
        const msgs: Message[] = await actor.list_messages(
          room.id,
          [],
          50
        );
        msgs.sort((a, b) => Number(a.timestamp - b.timestamp));
        setMessages(msgs);
      } catch (e) {
        console.error("loadMessages error", e);
        setError("Failed to load messages: " + String(e));
      }
    },
    []
  );

  useEffect(() => {
    setLoading(true);
    loadRooms()
      .then(() => setLoading(false))
      .catch(() => setLoading(false));
  }, [loadRooms]);

  useEffect(() => {
    if (!activeRoom) return;

    let canceled = false;

    const fetchOnce = async () => {
      await loadMessages(activeRoom);
    };

    fetchOnce().catch(() => {});

    const id = setInterval(() => {
      if (!canceled) {
        fetchOnce().catch(() => {});
      }
    }, 1500);

    return () => {
      canceled = true;
      clearInterval(id);
    };
  }, [activeRoom, loadMessages]);

  const formatTime = (timestamp: bigint) => {
    try {
      const ms = Number(timestamp / BigInt(1_000_000));
      return new Date(ms).toLocaleTimeString();
    } catch {
      return "";
    }
  };

  const handleSendOrEdit = async () => {
    if (!activeRoom) return;

    const text = (editing ? editText : newMessage).trim();
    if (!text) return;

    setSending(true);
    setError(null);

    try {
      const actor = await getBackendActor();

      if (editing) {
        await actor.edit_message(editing.id, text);
        setEditing(null);
        setEditText("");
      } else {
        const replyOpt = replyTo ? [replyTo.id] : [];
        await actor.send_message(activeRoom.id, text, replyOpt);
        setNewMessage("");
        setReplyTo(null);
      }

      await loadMessages(activeRoom);
    } catch (e) {
      console.error("send/edit error", e);
      setError("Failed to send message: " + String(e));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendOrEdit();
    }
  };

  const handleRoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const room = rooms.find((r) => r.id.toString() === id) || null;
    setActiveRoom(room);
    setReplyTo(null);
    setEditing(null);
    setEditText("");
  };

  const handleEmojiClick = (emojiData: any) => {
    const emoji = emojiData?.emoji ?? "";
    if (!emoji) return;

    if (editing) {
      setEditText((t) => t + emoji);
    } else {
      setNewMessage((t) => t + emoji);
    }
  };

  const startReply = (msg: Message) => {
    setReplyTo(msg);
    setEditing(null);
    setEditText("");
  };

  const startEdit = (msg: Message) => {
    setEditing(msg);
    setReplyTo(null);
    setShowEmojiPicker(false);
    setEditText(msg.content);
  };

  const cancelReplyOrEdit = () => {
    setReplyTo(null);
    setEditing(null);
    setEditText("");
  };

  const currentText = editing ? editText : newMessage;

  return (
    <div className="flex flex-col h-full max-h-[520px] space-y-3">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            💬 Global Chat
          </h2>
          <p className="text-xs text-slate-400">
            Messages are stored on-chain in the Rust backend canister.
          </p>
        </div>
        <span className="text-xs text-slate-500">
          You:{" "}
          <span className="font-mono">
            {principal
              ? `${principal.slice(0, 5)}…${principal.slice(-3)}`
              : "anonymous"}
          </span>
        </span>
      </header>

      {/* Room selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">Room:</span>
        {rooms.length > 0 ? (
          <select
            className="text-xs bg-slate-900/80 border border-slate-700 rounded-lg px-2 py-1 text-slate-100"
            value={activeRoom ? activeRoom.id.toString() : rooms[0].id.toString()}
            onChange={handleRoomChange}
          >
            {rooms.map((room) => (
              <option key={room.id.toString()} value={room.id.toString()}>
                {room.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-slate-500">
            {loading ? "Loading rooms..." : "No rooms yet"}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 rounded-xl border border-slate-800 bg-black/30 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-xs">
          {error && (
            <div className="text-[11px] text-red-400 bg-red-900/20 border border-red-500/40 rounded-md px-2 py-1 mb-2">
              {error}
            </div>
          )}

          {messages.length === 0 && !error && (
            <div className="text-slate-500 text-[11px] pt-2">
              No messages yet. Be the first bull to say something 🐂
            </div>
          )}

          {messages.map((msg) => {
            const authorText =
              msg.author && msg.author.toText
                ? msg.author.toText()
                : String(msg.author ?? "unknown");

            const isReply =
              msg.reply_to && msg.reply_to.length === 1;

            // 🔹 Compute friendly "replying to [user]" label
            let replyLabel: string | null = null;
            if (isReply) {
              const parentId = msg.reply_to[0];
              const parent = messages.find((m) => m.id === parentId);
              if (parent) {
                const parentAuthor =
                  parent.author && parent.author.toText
                    ? parent.author.toText()
                    : String(parent.author ?? "unknown");
                replyLabel =
                  parentAuthor.length > 10
                    ? `${parentAuthor.slice(0, 5)}…${parentAuthor.slice(-3)}`
                    : parentAuthor;
              }
            }

            return (
              <div
                key={msg.id.toString()}
                className="rounded-lg bg-slate-900/70 border border-slate-800 px-3 py-2 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-400">
                    {authorText.slice(0, 5)}…{authorText.slice(-3)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>

                {replyLabel && (
                  <div className="text-[10px] text-slate-500 border-l border-slate-600 pl-2">
                    ↪ Replying to {replyLabel}
                  </div>
                )}

                <div className="text-[13px] text-slate-100">
                  {msg.content}
                  {msg.edited && (
                    <span className="ml-1 text-[10px] text-slate-500">
                      (edited)
                    </span>
                  )}
                </div>

                {msg.tip_total_e8s !== undefined &&
                  msg.tip_total_e8s !== BigInt(0) && (
                    <div className="text-[10px] text-amber-300">
                      💰 Tips: {Number(msg.tip_total_e8s) / 1e8} ICP
                    </div>
                  )}

                <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-1">
                  <button
                    className="hover:text-slate-300"
                    onClick={() => startReply(msg)}
                  >
                    Reply
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    className="hover:text-slate-300"
                    onClick={() => startEdit(msg)}
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Compose area */}
        <div className="border-t border-slate-800 bg-black/60 px-3 py-2 space-y-2 relative">
          {(replyTo || editing) && (
            <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-900/70 border border-slate-700 rounded-md px-2 py-1 mb-1">
              <span>
                {editing
                  ? `Editing your message #${editing.id.toString()}`
                  : replyTo
                  ? `Replying to ${(() => {
                      const a =
                        replyTo.author && replyTo.author.toText
                          ? replyTo.author.toText()
                          : String(replyTo.author ?? "unknown");
                      return a.length > 10
                        ? `${a.slice(0, 5)}…${a.slice(-3)}`
                        : a;
                    })()}`
                  : null}
              </span>
              <button
                className="text-slate-300 hover:text-red-300"
                onClick={cancelReplyOrEdit}
              >
                ✕ Cancel
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((s) => !s)}
              className="px-2 py-1 rounded-lg border border-slate-700 bg-slate-900/80 text-xs"
            >
              😄
            </button>
            <input
              value={currentText}
              onChange={(e) =>
                editing ? setEditText(e.target.value) : setNewMessage(e.target.value)
              }
              onKeyDown={handleKeyDown}
              className="flex-1 rounded-lg bg-slate-900/80 border border-slate-700 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
              placeholder={
                activeRoom
                  ? editing
                    ? "Edit your message and press Enter…"
                    : replyTo
                    ? "Reply and press Enter…"
                    : "Type a message and hit Enter to send…"
                  : "No room selected."
              }
            />
            <button
              onClick={handleSendOrEdit}
              disabled={sending || !currentText.trim() || !activeRoom}
              className="px-3 py-2 rounded-lg bg-bullOrange/90 hover:bg-bullOrange text-black text-xs font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sending ? "…" : editing ? "Save" : "Send"}
            </button>
          </div>

          {showEmojiPicker && EmojiPickerComponent && (
            <div className="absolute bottom-20 left-2 z-20">
              <EmojiPickerComponent
                onEmojiClick={handleEmojiClick}
                theme="dark"
                lazyLoadEmojis
                width={260}
                height={320}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
