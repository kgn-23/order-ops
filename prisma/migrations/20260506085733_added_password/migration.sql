/*
  Warnings:

  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "callerTeamId" TEXT,
ADD COLUMN     "passwordHash" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "CallerTeam" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CallerTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookInboxEvent" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "headers" JSONB,
    "payload" JSONB,
    "rawBody" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookInboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CallerTeam_leaderId_key" ON "CallerTeam"("leaderId");

-- CreateIndex
CREATE INDEX "CallerTeam_name_idx" ON "CallerTeam"("name");

-- CreateIndex
CREATE INDEX "WebhookInboxEvent_endpoint_receivedAt_idx" ON "WebhookInboxEvent"("endpoint", "receivedAt");

-- CreateIndex
CREATE INDEX "User_callerTeamId_idx" ON "User"("callerTeamId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_callerTeamId_fkey" FOREIGN KEY ("callerTeamId") REFERENCES "CallerTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallerTeam" ADD CONSTRAINT "CallerTeam_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
