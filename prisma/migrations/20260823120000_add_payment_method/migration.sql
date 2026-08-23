-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD');

-- AlterTable
ALTER TABLE "plan_expenses" ADD COLUMN "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH';
