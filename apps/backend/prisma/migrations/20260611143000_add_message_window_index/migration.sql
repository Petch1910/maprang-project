-- Support saved chat message window queries:
-- WHERE chatId = ? AND deletedAt IS NULL
-- ORDER BY createdAt DESC, id DESC
CREATE INDEX "Message_chatId_deletedAt_createdAt_id_idx"
ON "Message"("chatId", "deletedAt", "createdAt" DESC, "id" DESC);
