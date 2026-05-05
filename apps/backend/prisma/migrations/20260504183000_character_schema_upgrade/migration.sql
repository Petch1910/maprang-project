CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateTable
CREATE TABLE "Tag" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateTable
CREATE TABLE "CharacterTag" (
    "characterId" UUID NOT NULL,
    "tagId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterTag_pkey" PRIMARY KEY ("characterId","tagId")
);

-- CreateTable
CREATE TABLE "Usage" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokens" INTEGER NOT NULL,
    "cost" DECIMAL(10,6),
    "modelName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usage_pkey" PRIMARY KEY ("id")
);

-- Preserve existing Character.tags array data before removing the column.
INSERT INTO "Tag" ("id", "name", "updatedAt")
SELECT gen_random_uuid(), tag_name, CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT unnest("tags") AS tag_name
    FROM "Character"
    WHERE "tags" IS NOT NULL
) existing_tags
WHERE tag_name IS NOT NULL AND tag_name <> ''
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "CharacterTag" ("characterId", "tagId")
SELECT c."id", t."id"
FROM "Character" c
CROSS JOIN LATERAL unnest(c."tags") AS tag_name
JOIN "Tag" t ON t."name" = tag_name
ON CONFLICT ("characterId", "tagId") DO NOTHING;

-- DropIndex
DROP INDEX IF EXISTS "Character_visibility_chatCount_idx";
DROP INDEX IF EXISTS "Character_visibility_createdAt_idx";
DROP INDEX IF EXISTS "Chat_userId_isArchived_updatedAt_idx";
DROP INDEX IF EXISTS "Message_chatId_id_idx";

-- AlterTable
ALTER TABLE "Character"
DROP COLUMN "tags",
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "promptVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Chat"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "memory" JSONB;

UPDATE "Message" SET "tokenUsed" = 0 WHERE "tokenUsed" IS NULL;

ALTER TABLE "Message"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "metadata" JSONB,
ALTER COLUMN "tokenUsed" SET NOT NULL,
ALTER COLUMN "tokenUsed" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX "CharacterTag_tagId_idx" ON "CharacterTag"("tagId");
CREATE INDEX "Usage_userId_createdAt_idx" ON "Usage"("userId", "createdAt" DESC);
CREATE INDEX "Character_visibility_deletedAt_createdAt_idx" ON "Character"("visibility", "deletedAt", "createdAt" DESC);
CREATE INDEX "Character_visibility_deletedAt_chatCount_idx" ON "Character"("visibility", "deletedAt", "chatCount" DESC);
CREATE INDEX "Character_creatorId_idx" ON "Character"("creatorId");
CREATE INDEX "Chat_userId_isArchived_lastMessageAt_idx" ON "Chat"("userId", "isArchived", "lastMessageAt" DESC);
CREATE INDEX "Chat_characterId_lastMessageAt_idx" ON "Chat"("characterId", "lastMessageAt" DESC);
CREATE INDEX "Chat_deletedAt_idx" ON "Chat"("deletedAt");
CREATE INDEX "Favorite_characterId_idx" ON "Favorite"("characterId");
CREATE INDEX "Message_chatId_createdAt_idx" ON "Message"("chatId", "createdAt" ASC);
CREATE INDEX "Message_deletedAt_idx" ON "Message"("deletedAt");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- Partial indexes for active public character listings.
CREATE INDEX "idx_character_public_active_created"
ON "Character"("visibility", "createdAt" DESC)
WHERE "deletedAt" IS NULL;

CREATE INDEX "idx_character_public_active_popular"
ON "Character"("visibility", "chatCount" DESC)
WHERE "deletedAt" IS NULL;

-- AddForeignKey
ALTER TABLE "CharacterTag" ADD CONSTRAINT "CharacterTag_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharacterTag" ADD CONSTRAINT "CharacterTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Usage" ADD CONSTRAINT "Usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
