-- AlterTable
ALTER TABLE "Sale"
ADD COLUMN "customerId" INTEGER;

-- CreateIndex
CREATE INDEX "Sale_customerId_idx" ON "Sale"("customerId");

-- AddForeignKey
ALTER TABLE "Sale"
ADD CONSTRAINT "Sale_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
