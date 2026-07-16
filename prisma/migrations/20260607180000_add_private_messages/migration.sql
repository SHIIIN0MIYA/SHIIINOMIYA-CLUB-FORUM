ALTER TABLE "User" ADD COLUMN "messagingPreference" TEXT NOT NULL DEFAULT 'EVERYONE';

CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "pairKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConversationMember" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3),
    "hiddenAt" TIMESTAMP(3),
    CONSTRAINT "ConversationMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL DEFAULT '',
    "postId" TEXT,
    "replyToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HiddenMessage" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HiddenMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageReport" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "MessageReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Conversation_pairKey_key" ON "Conversation"("pairKey");
CREATE INDEX "Conversation_updatedAt_idx" ON "Conversation"("updatedAt");
CREATE UNIQUE INDEX "ConversationMember_conversationId_userId_key" ON "ConversationMember"("conversationId", "userId");
CREATE INDEX "ConversationMember_userId_hiddenAt_idx" ON "ConversationMember"("userId", "hiddenAt");
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX "Message_senderId_createdAt_idx" ON "Message"("senderId", "createdAt");
CREATE INDEX "Message_postId_idx" ON "Message"("postId");
CREATE INDEX "MessageAttachment_messageId_idx" ON "MessageAttachment"("messageId");
CREATE UNIQUE INDEX "HiddenMessage_messageId_userId_key" ON "HiddenMessage"("messageId", "userId");
CREATE INDEX "HiddenMessage_userId_idx" ON "HiddenMessage"("userId");
CREATE UNIQUE INDEX "UserBlock_blockerId_blockedId_key" ON "UserBlock"("blockerId", "blockedId");
CREATE INDEX "UserBlock_blockedId_idx" ON "UserBlock"("blockedId");
CREATE UNIQUE INDEX "MessageReport_messageId_reporterId_key" ON "MessageReport"("messageId", "reporterId");
CREATE INDEX "MessageReport_status_createdAt_idx" ON "MessageReport"("status", "createdAt");
CREATE INDEX "MessageReport_reporterId_createdAt_idx" ON "MessageReport"("reporterId", "createdAt");

ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey"
FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey"
FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HiddenMessage" ADD CONSTRAINT "HiddenMessage_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HiddenMessage" ADD CONSTRAINT "HiddenMessage_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerId_fkey"
FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedId_fkey"
FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_reporterId_fkey"
FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
