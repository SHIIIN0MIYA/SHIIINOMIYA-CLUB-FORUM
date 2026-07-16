-- AlterTable
ALTER TABLE "User" ADD COLUMN "backgroundImage" TEXT;

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN "parentId" TEXT;

-- AlterTable
ALTER TABLE "UserNotification" ADD COLUMN "commentId" TEXT;

-- CreateTable
CREATE TABLE "CommentLike" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,

    CONSTRAINT "CommentLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comment_parentId_createdAt_idx" ON "Comment"("parentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommentLike_userId_commentId_key" ON "CommentLike"("userId", "commentId");

-- CreateIndex
CREATE INDEX "CommentLike_commentId_idx" ON "CommentLike"("commentId");

-- CreateIndex
CREATE INDEX "UserNotification_commentId_idx" ON "UserNotification"("commentId");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
