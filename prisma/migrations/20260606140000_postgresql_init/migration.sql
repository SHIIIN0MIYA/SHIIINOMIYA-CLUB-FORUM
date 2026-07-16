CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,
    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserNotification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "postId" TEXT,
    "fromUserId" TEXT,
    CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Post_pinned_createdAt_idx" ON "Post"("pinned", "createdAt");
CREATE INDEX "Post_authorId_createdAt_idx" ON "Post"("authorId", "createdAt");
CREATE INDEX "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt");
CREATE INDEX "Comment_authorId_createdAt_idx" ON "Comment"("authorId", "createdAt");
CREATE UNIQUE INDEX "Like_userId_postId_key" ON "Like"("userId", "postId");
CREATE INDEX "Like_postId_idx" ON "Like"("postId");
CREATE INDEX "UserNotification_userId_read_createdAt_idx" ON "UserNotification"("userId", "read", "createdAt");
CREATE INDEX "UserNotification_postId_idx" ON "UserNotification"("postId");
CREATE INDEX "UserNotification_fromUserId_idx" ON "UserNotification"("fromUserId");

ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Like" ADD CONSTRAINT "Like_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_fromUserId_fkey"
FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
