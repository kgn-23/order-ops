-- AlterTable
ALTER TABLE "CallLog" ADD COLUMN     "orderStage" "OrderStage";

-- CreateIndex
CREATE INDEX "CallLog_orderStage_calledAt_idx" ON "CallLog"("orderStage", "calledAt");

-- CreateIndex
CREATE INDEX "CallLog_deletedAt_calledAt_idx" ON "CallLog"("deletedAt", "calledAt");

-- CreateIndex
CREATE INDEX "Order_customerPhone_idx" ON "Order"("customerPhone");

-- CreateIndex
CREATE INDEX "Order_deletedAt_createdAt_idx" ON "Order"("deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Order_deletedAt_currentStage_createdAt_idx" ON "Order"("deletedAt", "currentStage", "createdAt");
