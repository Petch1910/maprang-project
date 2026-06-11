-- Preserve moderation report records if their reported targets are hard-deleted later.
ALTER TABLE "Report" DROP CONSTRAINT IF EXISTS "Report_characterId_fkey";
ALTER TABLE "Report" DROP CONSTRAINT IF EXISTS "Report_messageId_fkey";

ALTER TABLE "Report"
ADD CONSTRAINT "Report_characterId_fkey"
FOREIGN KEY ("characterId") REFERENCES "Character"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Report"
ADD CONSTRAINT "Report_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "Message"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
