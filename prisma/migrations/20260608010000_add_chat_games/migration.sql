-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "inviterId" TEXT NOT NULL,
    "winnerId" TEXT,
    "state" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameStat" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameType" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "played" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameSession_conversationId_status_updatedAt_idx" ON "GameSession"("conversationId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "GameSession_inviterId_createdAt_idx" ON "GameSession"("inviterId", "createdAt");

-- CreateIndex
CREATE INDEX "GameSession_winnerId_idx" ON "GameSession"("winnerId");

-- CreateIndex
CREATE UNIQUE INDEX "GameStat_conversationId_userId_gameType_key" ON "GameStat"("conversationId", "userId", "gameType");

-- CreateIndex
CREATE INDEX "GameStat_userId_gameType_idx" ON "GameStat"("userId", "gameType");

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameStat" ADD CONSTRAINT "GameStat_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameStat" ADD CONSTRAINT "GameStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
