-- AlterTable
ALTER TABLE "plan_expenses" ADD COLUMN     "average_amount" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "plan_incomes" ADD COLUMN     "average_amount" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "settings" ALTER COLUMN "period_count" SET DEFAULT 1;
