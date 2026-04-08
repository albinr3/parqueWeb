ALTER TABLE "Ticket"
ADD COLUMN "entryAmountCharged" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lostExtraCharged" INTEGER NOT NULL DEFAULT 0;

UPDATE "Ticket"
SET "entryAmountCharged" = COALESCE("amountCharged", 0)
WHERE "status" IN ('ACTIVE', 'PAID')
  AND "amountCharged" IS NOT NULL;

UPDATE "Ticket"
SET "lostExtraCharged" = COALESCE("amountCharged", 0)
WHERE "status" = 'LOST_PAID'
  AND "amountCharged" IS NOT NULL;
