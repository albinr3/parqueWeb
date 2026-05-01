-- CreateEnum
CREATE TYPE "EmployeeShift" AS ENUM ('SHIFT_1', 'SHIFT_2');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "shift" "EmployeeShift" NOT NULL DEFAULT 'SHIFT_1';
