"use client";

import { useState, useEffect, useRef, useMemo, FormEvent } from "react";
import { useQuery, useMutation } from "convex/react";
import { MessageSquare, Send, X, Loader2, Trash2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useOthers } from "@/liveblocks.config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatProps {
  boardId: string;
}

// Stable hashing function to assign a pleasant distinct text color to different users in group chat
const COLORS = [
  "text-rose-500",
  "text-emerald-500",
  "text-sky-500",
  "text-amber-500",
  "text-violet-500",
  "text-fuchsia-500",
  "text-teal-500",
  "text-orange-500",
];

const getNameColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLORS.length;
  return COLORS[index];
};

export const Chat = ({ boardId }: ChatProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [lastReadCount, setLastReadCount] = useState(0);
  
  const { userId } = useAuth();
  const others = useOthers();
  const onlineCount = others.length + 1;

  // Retrieve chat messages from Convex (real-time reactive query)
  const rawMessages = useQuery(api.messages.list, {
    boardId: boardId as Id<"boards">,
  });

  const board = useQuery(api.board.get, {
    id: boardId as Id<"boards">,
  });

  const sendMessage = useMutation(api.messages.send);
  const removeMessage = useMutation(api.messages.remove);

  const isAdmin = board?.authorId === userId;

  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Chronologically sort messages (newest at bottom)
  const messages = useMemo(() => {
    if (!rawMessages) return [];
    return [...rawMessages].reverse();
  }, [rawMessages]);

  // Load and sync unread state from localStorage
  useEffect(() => {
    const key = `chat_last_read_${boardId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      setTimeout(() => {
        setLastReadCount(parseInt(stored, 10));
      }, 0);
    }
  }, [boardId]);

  // Update read counter when chat is open and new messages arrive
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      const key = `chat_last_read_${boardId}`;
      localStorage.setItem(key, messages.length.toString());
      setTimeout(() => {
        setLastReadCount(messages.length);
      }, 0);
    }
  }, [isOpen, messages.length, boardId]);

  // Compute unread count
  const unreadCount = useMemo(() => {
    if (isOpen) return 0;
    return Math.max(0, messages.length - lastReadCount);
  }, [isOpen, messages.length, lastReadCount]);

  // Scroll to bottom upon receiving new messages or opening the panel
  useEffect(() => {
    if (isOpen) {
      // Small timeout to allow transition/DOM rendering to complete
      const timer = setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, messages.length]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const content = inputValue.trim();
    if (!content) return;

    try {
      setIsSending(true);
      setInputValue("");
      await sendMessage({
        boardId: boardId as Id<"boards">,
        content,
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Check if sender is the current user. 
  // We compare the userId with our own Clerk user ID from currentUser metadata.
  const isMe = (msgUserId: string) => {
    return userId === msgUserId;
  };

  const handleDelete = async (messageId: string) => {
    try {
      await removeMessage({ id: messageId as Id<"messages"> });
      toast.success("Message deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete message");
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="absolute top-[68px] right-2 bg-white hover:bg-neutral-50 text-neutral-800 rounded-md p-3 flex items-center justify-center shadow-md border border-neutral-200 transition duration-200 group z-40 h-12 w-12"
          aria-label="Open Chat"
        >
          <MessageSquare className="h-5 w-5 group-hover:scale-105 transition-transform" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-violet-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border border-white animate-in zoom-in">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Sidebar */}
      {isOpen && (
        <div
          ref={containerRef}
          // Prevent interactions inside chat panel from propagating to the underlying Miro board canvas
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 bottom-2 w-80 md:w-96 bg-white rounded-lg shadow-xl border border-neutral-200 flex flex-col z-50 overflow-hidden animate-in slide-in-from-right duration-200"
        >
          {/* Header */}
          <div className="bg-violet-700 text-white p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-x-2">
              <div className="bg-violet-600 p-1.5 rounded-full">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-tight">Board Chat</h3>
                <span className="text-[11px] text-violet-100 flex items-center gap-x-1">
                  <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full inline-block animate-pulse" />
                  {onlineCount} {onlineCount === 1 ? "user" : "users"} online
                </span>
              </div>
            </div>
            <Button
              onClick={() => setIsOpen(false)}
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages Area (WhatsApp doodle pattern vibe) */}
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#faf5ff] relative"
            style={{
              backgroundImage: `radial-gradient(circle, #edd8ff 1.5px, transparent 1.5px)`,
              backgroundSize: "24px 24px"
            }}
          >
            {rawMessages === undefined ? (
              <div className="flex flex-col items-center justify-center h-full gap-y-2 text-neutral-500">
                <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
                <span className="text-xs">Loading chat history...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <div className="bg-white/90 rounded-lg p-3 shadow-sm border border-neutral-200/50 max-w-[80%]">
                  <p className="text-xs text-neutral-600 font-medium">Welcome to the board chat!</p>
                  <p className="text-[11px] text-neutral-500 mt-1">Send a message to start chatting in real time.</p>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isSenderMe = isMe(msg.userId);
                return (
                  <div
                    key={msg._id}
                    className={`flex items-start gap-x-2 group/bubble ${
                      isSenderMe ? "justify-end" : "justify-start"
                    }`}
                  >
                    {/* Trash Button for Admin */}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(msg._id)}
                        className={`opacity-0 group-hover/bubble:opacity-100 transition-opacity p-1 text-neutral-400 hover:text-rose-500 rounded-md shrink-0 self-center ${
                          isSenderMe ? "order-first mr-1" : "order-last ml-1"
                        }`}
                        title="Delete message"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {/* Other User Avatar */}
                    {!isSenderMe && (
                      <Avatar className="h-7 w-7 border border-neutral-200/80 shadow-sm mt-0.5">
                        <AvatarImage src={msg.userPicture} />
                        <AvatarFallback className="text-[10px] bg-neutral-200 text-neutral-700 font-semibold">
                          {msg.userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    {/* Chat Bubble */}
                    <div
                      className={`relative max-w-[70%] px-3 py-1.5 shadow-sm border text-[13px] leading-relaxed flex flex-col ${
                        isSenderMe
                          ? "bg-[#f3e8ff] text-violet-950 border-[#e9d5ff] rounded-l-lg rounded-br-lg rounded-tr-none"
                          : "bg-white text-[#303030] border-neutral-100 rounded-r-lg rounded-bl-lg rounded-tl-none"
                      }`}
                    >
                      {/* User Display Name (Only for other users) */}
                      {!isSenderMe && (
                        <span className={`text-[11px] font-semibold leading-none mb-1 ${getNameColor(msg.userName)}`}>
                          {msg.userName}
                        </span>
                      )}

                      {/* Message Content */}
                      <span className="whitespace-pre-wrap break-words pr-8">
                        {msg.content}
                      </span>

                      {/* Timestamp */}
                      <span className="absolute bottom-1 right-1.5 text-[9px] text-neutral-400 self-end select-none">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={handleSend}
            className="p-3 bg-[#f0f2f5] border-t border-neutral-200 flex items-center gap-x-2"
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message..."
              disabled={isSending}
              className="flex-1 bg-white border border-neutral-200 rounded-full px-4 h-9 text-sm focus-visible:ring-1 focus-visible:ring-violet-600 focus-visible:ring-offset-0 placeholder:text-neutral-400"
            />
            <Button
              type="submit"
              disabled={!inputValue.trim() || isSending}
              size="icon"
              className="h-9 w-9 rounded-full bg-violet-600 hover:bg-violet-700 text-white shrink-0 shadow-sm transition duration-150 disabled:opacity-50 disabled:bg-neutral-300"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4 fill-white text-transparent ml-0.5" />
              )}
            </Button>
          </form>
        </div>
      )}
    </>
  );
};
