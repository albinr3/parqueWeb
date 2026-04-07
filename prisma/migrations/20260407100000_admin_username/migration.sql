-- Rename admin login field from email to username without data loss
ALTER TABLE "AdminAccount" RENAME COLUMN "email" TO "username";
ALTER INDEX "AdminAccount_email_key" RENAME TO "AdminAccount_username_key";
