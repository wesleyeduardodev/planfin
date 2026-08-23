-- AlterTable
ALTER TABLE "settings"
  ADD COLUMN "theme_preference" TEXT NOT NULL DEFAULT 'system',
  ADD COLUMN "swipe_actions" BOOLEAN NOT NULL DEFAULT true;
