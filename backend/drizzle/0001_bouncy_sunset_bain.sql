CREATE TYPE "public"."user_role" AS ENUM('player', 'manager', 'admin');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'player' NOT NULL;