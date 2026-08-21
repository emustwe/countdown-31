-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" JSONB NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityEvent_action_createdAt_idx" ON "SecurityEvent"("action", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_actor_createdAt_idx" ON "SecurityEvent"("actor", "createdAt");

