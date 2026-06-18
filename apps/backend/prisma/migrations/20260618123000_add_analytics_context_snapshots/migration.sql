CREATE TABLE "AnalyticsEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID,
    "chatId" UUID,
    "characterId" UUID,
    "eventName" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'server',
    "route" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContextSnapshot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requestId" TEXT,
    "userId" UUID,
    "chatId" UUID,
    "characterId" UUID,
    "modelRoute" TEXT NOT NULL,
    "replyProfile" TEXT NOT NULL,
    "modelName" TEXT,
    "promptHash" TEXT NOT NULL,
    "promptTokensEstimate" INTEGER NOT NULL,
    "promptBudget" JSONB,
    "loreCount" INTEGER NOT NULL DEFAULT 0,
    "retrievedLore" JSONB,
    "sectionStats" JSONB,
    "redactedPromptPreview" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContextSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnalyticsEvent_eventName_createdAt_idx" ON "AnalyticsEvent"("eventName", "createdAt" DESC);
CREATE INDEX "AnalyticsEvent_userId_createdAt_idx" ON "AnalyticsEvent"("userId", "createdAt" DESC);
CREATE INDEX "AnalyticsEvent_chatId_createdAt_idx" ON "AnalyticsEvent"("chatId", "createdAt" DESC);
CREATE INDEX "AnalyticsEvent_characterId_createdAt_idx" ON "AnalyticsEvent"("characterId", "createdAt" DESC);

CREATE UNIQUE INDEX "ContextSnapshot_requestId_key" ON "ContextSnapshot"("requestId");
CREATE INDEX "ContextSnapshot_userId_createdAt_idx" ON "ContextSnapshot"("userId", "createdAt" DESC);
CREATE INDEX "ContextSnapshot_chatId_createdAt_idx" ON "ContextSnapshot"("chatId", "createdAt" DESC);
CREATE INDEX "ContextSnapshot_characterId_createdAt_idx" ON "ContextSnapshot"("characterId", "createdAt" DESC);
CREATE INDEX "ContextSnapshot_modelRoute_createdAt_idx" ON "ContextSnapshot"("modelRoute", "createdAt" DESC);
CREATE INDEX "ContextSnapshot_promptHash_idx" ON "ContextSnapshot"("promptHash");

ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ContextSnapshot" ADD CONSTRAINT "ContextSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContextSnapshot" ADD CONSTRAINT "ContextSnapshot_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContextSnapshot" ADD CONSTRAINT "ContextSnapshot_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
