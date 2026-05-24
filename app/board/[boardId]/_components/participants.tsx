"use client";

import { useMemo } from "react";
import { useOthers, useSelf } from "@/liveblocks.config";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { Users, Shield, MessageSquare, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { connectionIdToColor } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { UserAvatar } from "./user-avatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const MAX_SHOWN_USERS = 2;

interface ParticipantsProps {
  boardId: string;
}

export const Participants = ({ boardId }: ParticipantsProps) => {
  const users = useOthers();
  const currentUser = useSelf();
  const { userId } = useAuth();

  const hasMoreUsers = users.length > MAX_SHOWN_USERS;

  // Retrieve permissions and board details from Convex
  const permissions = useQuery(api.permissions.get, {
    boardId: boardId as Id<"boards">,
  });

  const board = useQuery(api.board.get, {
    id: boardId as Id<"boards">,
  });

  const togglePermission = useMutation(api.permissions.toggle);

  const isAdmin = board?.authorId === userId;

  // Build real-time list of all active users in the room
  const activeUsers = useMemo(() => {
    const list = [];
    if (currentUser) {
      list.push({
        id: currentUser.id || currentUser.presence?.userId || "current-user",
        connectionId: currentUser.connectionId,
        name: currentUser.info?.name || currentUser.presence?.name || "Teammate",
        picture: currentUser.info?.picture || currentUser.presence?.picture,
        isSelf: true,
      });
    }
    for (const other of users) {
      list.push({
        id: other.id || other.presence?.userId || `other-${other.connectionId}`,
        connectionId: other.connectionId,
        name: other.info?.name || other.presence?.name || "Teammate",
        picture: other.info?.picture || other.presence?.picture,
        isSelf: false,
      });
    }
    return list;
  }, [currentUser, users]);

  const handleToggle = async (targetUserId: string, permissionType: "annotate" | "chat") => {
    if (!isAdmin) return;
    try {
      await togglePermission({
        boardId: boardId as Id<"boards">,
        userId: targetUserId,
        permissionType,
      });
      toast.success("Permissions updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update permissions");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="absolute h-12 top-2 right-2 bg-white hover:bg-neutral-50 cursor-pointer rounded-md p-3 flex items-center shadow-md select-none border border-neutral-200 transition duration-150 outline-none"
          title="Click to manage board permissions"
        >
          <div className="flex gap-x-2">
            {users.slice(0, MAX_SHOWN_USERS).map(({ connectionId, info, presence }) => {
              const name = info?.name || presence?.name || "Teammate";
              const picture = info?.picture || presence?.picture;
              return (
                <UserAvatar
                  borderColor={connectionIdToColor(connectionId)}
                  key={connectionId}
                  src={picture}
                  name={name}
                  fallback={name.charAt(0).toUpperCase()}
                />
              );
            })}

            {currentUser && (
              <UserAvatar
                borderColor={connectionIdToColor(currentUser.connectionId)}
                src={currentUser.info?.picture || currentUser.presence?.picture}
                name={`${currentUser.info?.name || currentUser.presence?.name || "Teammate"} (You)`}
                fallback={(currentUser.info?.name || currentUser.presence?.name || "T")[0]}
              />
            )}

            {hasMoreUsers && (
              <UserAvatar
                name={`${users.length - MAX_SHOWN_USERS} more`}
                fallback={`+${users.length - MAX_SHOWN_USERS}`}
              />
            )}
          </div>
        </button>
      </DialogTrigger>

      <DialogContent 
        className="max-w-[480px] p-6 bg-white rounded-lg shadow-xl"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <DialogHeader className="border-b border-neutral-100 pb-3">
          <DialogTitle className="text-lg font-semibold flex items-center gap-x-2 text-violet-950">
            <Users className="h-5 w-5 text-violet-600" />
            Collaborators & Permissions
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4 max-h-[300px] overflow-y-auto pr-1">
          {board === undefined || permissions === undefined ? (
            <div className="flex flex-col items-center justify-center py-8 gap-y-2 text-neutral-500">
              <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
              <span className="text-xs">Loading room metadata...</span>
            </div>
          ) : (
            activeUsers.map((user) => {
              const isUserAdmin = board?.authorId === user.id;
              
              // Get permission override or default to allowed
              const userPerm = permissions.find((p) => p.userId === user.id) || {
                canAnnotate: true,
                canChat: true,
              };

              return (
                <div
                  key={user.connectionId}
                  className="flex items-center justify-between p-2 hover:bg-neutral-50 rounded-lg transition"
                >
                  <div className="flex items-center gap-x-2.5">
                    <Avatar className="h-9 w-9 border border-neutral-200">
                      <AvatarImage src={user.picture} />
                      <AvatarFallback className="bg-violet-50 text-violet-800 font-bold text-xs">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-neutral-800 flex items-center gap-x-1.5">
                        {user.name}
                        {user.isSelf && (
                          <span className="text-[10px] text-neutral-400 font-normal">
                            (You)
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-neutral-400 flex items-center gap-x-1">
                        {isUserAdmin ? (
                          <span className="text-amber-600 flex items-center gap-x-0.5 font-medium">
                            <Shield className="h-3 w-3 fill-amber-100" />
                            Administrator
                          </span>
                        ) : (
                          "Collaborator"
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-x-2">
                    {isUserAdmin ? (
                      <span className="text-[11px] font-medium bg-neutral-100 text-neutral-500 px-2.5 py-1 rounded-full border border-neutral-200">
                        Full Access
                      </span>
                    ) : isAdmin ? (
                      // Admin Toggle Controls
                      <>
                        <button
                          onClick={() => handleToggle(user.id, "annotate")}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-x-1 transition border outline-none ${
                            userPerm.canAnnotate
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                          }`}
                          title={userPerm.canAnnotate ? "Click to restrict annotation" : "Click to allow annotation"}
                        >
                          <Pencil className="h-3 w-3 shrink-0" />
                          {userPerm.canAnnotate ? "Draw: Allowed" : "Draw: Restricted"}
                        </button>

                        <button
                          onClick={() => handleToggle(user.id, "chat")}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-x-1 transition border outline-none ${
                            userPerm.canChat
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                          }`}
                          title={userPerm.canChat ? "Click to restrict chat" : "Click to allow chat"}
                        >
                          <MessageSquare className="h-3 w-3 shrink-0" />
                          {userPerm.canChat ? "Chat: Allowed" : "Chat: Restricted"}
                        </button>
                      </>
                    ) : (
                      // Read-only badges for other users
                      <>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-x-1 border ${
                            userPerm.canAnnotate
                              ? "bg-neutral-50 text-neutral-500 border-neutral-200"
                              : "bg-rose-50 text-rose-600 border-rose-100"
                          }`}
                        >
                          <Pencil className="h-2.5 w-2.5" />
                          {userPerm.canAnnotate ? "Can Draw" : "Restricted"}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-x-1 border ${
                            userPerm.canChat
                              ? "bg-neutral-50 text-neutral-500 border-neutral-200"
                              : "bg-rose-50 text-rose-600 border-rose-100"
                          }`}
                        >
                          <MessageSquare className="h-2.5 w-2.5" />
                          {userPerm.canChat ? "Can Chat" : "Restricted"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const ParticipantsSkeleton = () => {
  return (
    <div className="absolute h-12 top-2 right-2 bg-white rounded-md p-3 flex items-center shadow-md w-[100px]" />
  );
};
