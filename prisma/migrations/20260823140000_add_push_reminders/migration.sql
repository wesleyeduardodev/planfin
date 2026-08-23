-- AlterTable
ALTER TABLE "settings"
  ADD COLUMN "reminders_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reminder_eve_hour" INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN "reminder_day_hour" INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN "remind_expenses" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "remind_incomes" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "push_subscriptions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_used_at" TIMESTAMP(3),
  "failures" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "target_date" TIMESTAMP(3) NOT NULL,
  "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE UNIQUE INDEX "notification_logs_user_id_kind_target_date_key" ON "notification_logs"("user_id", "kind", "target_date");

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
