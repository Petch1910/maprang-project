-- Character lifecycle for production roleplay publishing.
CREATE TYPE "CharacterStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED');

-- Character rich creation fields and quality gate fields.
ALTER TABLE "Character"
ADD COLUMN "sourceKey" TEXT,
ADD COLUMN "tagline" TEXT,
ADD COLUMN "biography" TEXT,
ADD COLUMN "scenario" TEXT,
ADD COLUMN "compactPrompt" TEXT,
ADD COLUMN "characterAnchor" TEXT,
ADD COLUMN "constraints" TEXT,
ADD COLUMN "status" "CharacterStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "qualityScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "qualityNotes" JSONB,
ADD COLUMN "publishedAt" TIMESTAMP(3);

UPDATE "Character"
SET
  "status" = CASE
    WHEN "visibility" = 'PUBLIC' THEN 'PUBLISHED'::"CharacterStatus"
    ELSE 'DRAFT'::"CharacterStatus"
  END,
  "publishedAt" = CASE
    WHEN "visibility" = 'PUBLIC' THEN COALESCE("publishedAt", "createdAt")
    ELSE "publishedAt"
  END;

CREATE UNIQUE INDEX "Character_sourceKey_key" ON "Character"("sourceKey");

-- Chat runtime state fields.
ALTER TABLE "Chat"
ADD COLUMN "sceneState" JSONB,
ADD COLUMN "relationshipState" JSONB;

-- Per-message LLM/cost metrics.
ALTER TABLE "Message"
ADD COLUMN "promptTokens" INTEGER,
ADD COLUMN "completionTokens" INTEGER,
ADD COLUMN "totalTokens" INTEGER,
ADD COLUMN "modelUsed" TEXT,
ADD COLUMN "cost" DECIMAL(10,6);

-- Lorebook.
CREATE TABLE "LoreEntry" (
  "id" UUID NOT NULL,
  "characterId" UUID NOT NULL,
  "keyword" TEXT NOT NULL,
  "aliases" TEXT[] NOT NULL,
  "content" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "hierarchyLevel" INTEGER NOT NULL DEFAULT 0,
  "parentLoreId" UUID,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LoreEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoreEntry_characterId_keyword_idx" ON "LoreEntry"("characterId", "keyword");
CREATE INDEX "LoreEntry_characterId_priority_idx" ON "LoreEntry"("characterId", "priority");
CREATE INDEX "LoreEntry_deletedAt_idx" ON "LoreEntry"("deletedAt");

ALTER TABLE "LoreEntry" ADD CONSTRAINT "LoreEntry_characterId_fkey"
FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LoreEntry" ADD CONSTRAINT "LoreEntry_parentLoreId_fkey"
FOREIGN KEY ("parentLoreId") REFERENCES "LoreEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Replace discovery indexes with status-aware indexes.
DROP INDEX IF EXISTS "Character_visibility_deletedAt_createdAt_idx";
DROP INDEX IF EXISTS "Character_visibility_deletedAt_chatCount_idx";
DROP INDEX IF EXISTS "idx_character_public_active_created";
DROP INDEX IF EXISTS "idx_character_public_active_popular";

CREATE INDEX "Character_status_visibility_deletedAt_createdAt_idx"
ON "Character"("status", "visibility", "deletedAt", "createdAt" DESC);

CREATE INDEX "Character_status_visibility_deletedAt_chatCount_idx"
ON "Character"("status", "visibility", "deletedAt", "chatCount" DESC);

-- Partial indexes for published active discovery.
CREATE INDEX "idx_character_published_active_created"
ON "Character"("visibility", "createdAt" DESC)
WHERE "deletedAt" IS NULL
AND "status" = 'PUBLISHED';

CREATE INDEX "idx_character_published_active_popular"
ON "Character"("visibility", "chatCount" DESC)
WHERE "deletedAt" IS NULL
AND "status" = 'PUBLISHED';
