-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashed_password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "period_count" INTEGER NOT NULL DEFAULT 2,
    "period_days" INTEGER[] DEFAULT ARRAY[1, 20]::INTEGER[],

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "cut_days" INTEGER[] DEFAULT ARRAY[1, 20]::INTEGER[],
    "initial_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_expenses" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "period" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "due_date" TIMESTAMP(3),
    "planned_amount" DOUBLE PRECISION NOT NULL,
    "paid_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_fixed" BOOLEAN NOT NULL DEFAULT true,
    "category_id" TEXT,

    CONSTRAINT "plan_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_incomes" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "period" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "expected_amount" DOUBLE PRECISION NOT NULL,
    "received_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "due_date" TIMESTAMP(3),
    "is_fixed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "plan_incomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "settings_user_id_key" ON "settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_user_id_name_key" ON "categories"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_plans_user_id_year_month_key" ON "monthly_plans"("user_id", "year", "month");

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_plans" ADD CONSTRAINT "monthly_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_expenses" ADD CONSTRAINT "plan_expenses_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "monthly_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_expenses" ADD CONSTRAINT "plan_expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_incomes" ADD CONSTRAINT "plan_incomes_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "monthly_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
