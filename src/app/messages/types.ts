export type ConversationSummary = {
  id: string;
  updatedAt: string;
  other: {
    id: string;
    name: string | null;
    image: string | null;
    role: string;
  };
  lastMessage: {
    id: string;
    content: string;
    type: string;
    createdAt: string;
    revokedAt: string | null;
    senderId: string;
  } | null;
  unreadCount: number;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  type: string;
  content: string;
  postId: string | null;
  replyToId: string | null;
  createdAt: string;
  revokedAt: string | null;
  sender: { id: string; name: string | null; role: string };
  attachments: Array<{
    id: string;
    url: string;
    mimeType: string;
    size: number;
  }>;
  post: {
    id: string;
    title: string;
    content: string;
    author: { name: string | null };
  } | null;
  replyTo: {
    id: string;
    content: string;
    type: string;
    revokedAt: string | null;
    sender: { name: string | null };
  } | null;
};
