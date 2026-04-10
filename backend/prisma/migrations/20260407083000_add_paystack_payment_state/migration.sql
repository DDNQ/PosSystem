-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MANUAL', 'PAYSTACK');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "Payment"
ADD COLUMN "provider" "PaymentProvider" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "providerReference" TEXT,
ADD COLUMN "status" "PaymentStatus" NOT NULL DEFAULT 'SUCCESS';

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerReference_key" ON "Payment"("providerReference");

-- CreateIndex
CREATE INDEX "Payment_provider_idx" ON "Payment"("provider");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
