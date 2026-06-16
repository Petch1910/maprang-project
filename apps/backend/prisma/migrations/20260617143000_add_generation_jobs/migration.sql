-- CreateEnum
CREATE TYPE "GenerationJobStatus" AS ENUM ('BLOCKED', 'QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GenerationOutputKind" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "GenerationOutputVisibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');

-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "templateId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" "GenerationJobStatus" NOT NULL DEFAULT 'BLOCKED',
    "source" TEXT NOT NULL DEFAULT 'local-safe-preflight',
    "prompt" TEXT NOT NULL,
    "imageInputs" TEXT[],
    "videoInputs" TEXT[],
    "costTokens" INTEGER NOT NULL DEFAULT 0,
    "debitStatus" TEXT NOT NULL DEFAULT 'not_charged',
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationOutput" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "jobId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "kind" "GenerationOutputKind" NOT NULL,
    "url" TEXT,
    "storageKey" TEXT,
    "visibility" "GenerationOutputVisibility" NOT NULL DEFAULT 'PRIVATE',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationOutput_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GenerationJob_userId_createdAt_idx" ON "GenerationJob"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GenerationJob_userId_status_createdAt_idx" ON "GenerationJob"("userId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GenerationJob_templateId_createdAt_idx" ON "GenerationJob"("templateId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GenerationOutput_userId_createdAt_idx" ON "GenerationOutput"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GenerationOutput_userId_isFavorite_createdAt_idx" ON "GenerationOutput"("userId", "isFavorite", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GenerationOutput_visibility_createdAt_idx" ON "GenerationOutput"("visibility", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GenerationOutput_jobId_idx" ON "GenerationOutput"("jobId");

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationOutput" ADD CONSTRAINT "GenerationOutput_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationOutput" ADD CONSTRAINT "GenerationOutput_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
