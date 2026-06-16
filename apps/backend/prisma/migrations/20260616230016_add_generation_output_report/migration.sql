-- AlterEnum
ALTER TYPE "AdminAuditAction" ADD VALUE 'HIDE_GENERATION_OUTPUT';

-- AlterEnum
ALTER TYPE "ReportTargetType" ADD VALUE 'GENERATION_OUTPUT';

-- AlterTable
ALTER TABLE "AdminAuditLog" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Character" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Chat" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Favorite" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "GenerationJob" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "GenerationOutput" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Message" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "generationOutputId" UUID,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Tag" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TokenTransaction" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Report_generationOutputId_idx" ON "Report"("generationOutputId");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_generationOutputId_fkey" FOREIGN KEY ("generationOutputId") REFERENCES "GenerationOutput"("id") ON DELETE SET NULL ON UPDATE CASCADE;
