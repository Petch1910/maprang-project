CREATE TYPE "ReportTargetType" AS ENUM ('CHARACTER', 'MESSAGE');
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED', 'REJECTED');

CREATE TABLE "Report" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "targetType" "ReportTargetType" NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "reporterId" UUID NOT NULL,
    "characterId" UUID,
    "messageId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt" DESC);
CREATE INDEX "Report_targetType_createdAt_idx" ON "Report"("targetType", "createdAt" DESC);
CREATE INDEX "Report_reporterId_createdAt_idx" ON "Report"("reporterId", "createdAt" DESC);
CREATE INDEX "Report_characterId_idx" ON "Report"("characterId");
CREATE INDEX "Report_messageId_idx" ON "Report"("messageId");

ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
