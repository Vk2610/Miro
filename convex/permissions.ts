import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthorized");
    }

    const permissions = await ctx.db
      .query("userPermissions")
      .withIndex("by_board_user", (q) => q.eq("boardId", args.boardId))
      .collect();

    return permissions;
  },
});

export const toggle = mutation({
  args: {
    boardId: v.id("boards"),
    userId: v.string(),
    permissionType: v.union(v.literal("annotate"), v.literal("chat")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthorized");
    }

    const board = await ctx.db.get(args.boardId);

    if (!board) {
      throw new Error("Board not found");
    }

    // Only the board administrator (creator) can toggle user permissions
    if (board.authorId !== identity.subject) {
      throw new Error("Unauthorized: Only the board administrator can modify permissions");
    }

    const existingPermission = await ctx.db
      .query("userPermissions")
      .withIndex("by_board_user", (q) =>
        q.eq("boardId", args.boardId).eq("userId", args.userId)
      )
      .unique();

    if (existingPermission) {
      const updates =
        args.permissionType === "annotate"
          ? { canAnnotate: !existingPermission.canAnnotate }
          : { canChat: !existingPermission.canChat };

      await ctx.db.patch(existingPermission._id, updates);
      return existingPermission._id;
    } else {
      // By default permissions are true, so toggling it sets it to false
      const newPermission = await ctx.db.insert("userPermissions", {
        boardId: args.boardId,
        userId: args.userId,
        canAnnotate: args.permissionType === "annotate" ? false : true,
        canChat: args.permissionType === "chat" ? false : true,
      });
      return newPermission;
    }
  },
});
