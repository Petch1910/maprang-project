CREATE TABLE "UserProviderKey" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "keyCiphertext" TEXT NOT NULL,
    "keyHint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProviderKey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserSecurityAuditLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSecurityAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserProviderKey_userId_provider_key" ON "UserProviderKey"("userId", "provider");
CREATE INDEX "UserProviderKey_userId_idx" ON "UserProviderKey"("userId");
CREATE INDEX "UserSecurityAuditLog_userId_createdAt_idx" ON "UserSecurityAuditLog"("userId", "createdAt" DESC);
CREATE INDEX "UserSecurityAuditLog_action_createdAt_idx" ON "UserSecurityAuditLog"("action", "createdAt" DESC);

ALTER TABLE "UserProviderKey" ADD CONSTRAINT "UserProviderKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSecurityAuditLog" ADD CONSTRAINT "UserSecurityAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
