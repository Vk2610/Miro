import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {
    boardId: v.id("boards"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Retrieve the last 200 messages for this board to keep it bounded and fast.
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .order("desc")
      .take(200);

    return messages;
  },
});

export const send = mutation({
  args: {
    boardId: v.id("boards"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthorized");
    }

    const content = args.content.trim();

    if (!content) {
      throw new Error("Message content cannot be empty");
    }

    // Enforce reasonable limit for message length
    if (content.length > 2000) {
      throw new Error("Message cannot be longer than 2000 characters");
    }

    const message = await ctx.db.insert("messages", {
      boardId: args.boardId,
      userId: identity.subject,
      userName: identity.name || identity.givenName || "Anonymous",
      userPicture: identity.pictureUrl,
      content,
      createdAt: Date.now(),
    });

    return message;
  },
});
