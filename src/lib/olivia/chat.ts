// src/lib/olivia/chat.ts
//
// Conversation-management slice of LTM's olivia/chat.ts. Provides CRUD over
// OliviaConversation + OliviaMessage. Used by the voice subsystem to persist
// call transcripts as Olivia conversations, and by future API routes that
// want to read conversation history.
//
// LTM's `processOliviaMessage` is intentionally NOT ported. It depends on
// `prisma.userProfile`, the Studio Preparation context, the CristianoShell
// pipeline context, and a code-knowledge layer (`@/lib/code-knowledge/...`)
// — none of which exist in Olivia Brain. The `/api/olivia/chat` route in
// Olivia Brain already provides a cascade-routed chat brain (built in
// Sessions 4–6) that serves the equivalent purpose. A future track may
// re-port a slim equivalent of `processOliviaMessage` if it becomes useful;
// meanwhile, the orchestrator layer is `/api/olivia/chat`, not this file.

import prisma from "@/lib/db/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateConversationInput {
  userId?: string | null;
  pageContext?: string;
  mode?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  mode: string;
  pageContext: string | null;
  messageCount: number;
  preview: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Conversation Management
// ---------------------------------------------------------------------------

export async function createConversation(
  input: CreateConversationInput
): Promise<{ conversationId: string; sessionToken: string }> {
  const conversation = await prisma.oliviaConversation.create({
    data: {
      userId: input.userId || null,
      pageContext: input.pageContext || null,
      mode: input.mode || "chat",
    },
  });

  return {
    conversationId: conversation.id,
    sessionToken: conversation.sessionToken,
  };
}

export async function getConversationHistory(
  userId: string,
  limit: number = 20
): Promise<ConversationSummary[]> {
  const conversations = await prisma.oliviaConversation.findMany({
    where: {
      userId,
      isArchived: false,
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      mode: true,
      pageContext: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { messages: true },
      },
      messages: {
        where: { role: "user" },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { content: true },
      },
    },
  });

  return conversations.map((c) => ({
    id: c.id,
    title: c.title || c.messages[0]?.content?.slice(0, 60) || "New conversation",
    mode: c.mode,
    pageContext: c.pageContext,
    messageCount: c._count.messages,
    preview: c.messages[0]?.content?.slice(0, 100) || "",
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));
}

export async function getConversationMessages(
  conversationId: string,
  userId?: string | null
) {
  // Verify ownership if userId is provided
  if (userId) {
    const conversation = await prisma.oliviaConversation.findUnique({
      where: { id: conversationId },
      select: { userId: true },
    });

    if (!conversation || conversation.userId !== userId) {
      return { error: "Conversation not found or access denied" };
    }
  }

  const messages = await prisma.oliviaMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      content: true,
      toolName: true,
      metadata: true,
      createdAt: true,
    },
  });

  return { messages };
}
