-- AlterTable
ALTER TABLE "plan_expenses" ADD COLUMN "is_adjustment" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "plan_incomes" ADD COLUMN "is_adjustment" BOOLEAN NOT NULL DEFAULT false;
