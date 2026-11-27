CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"opponent" varchar(100) NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"location" varchar(200) DEFAULT '' NOT NULL,
	"notes" varchar(1000) DEFAULT '' NOT NULL,
	"status" varchar(9) DEFAULT 'scheduled' NOT NULL,
	"team_score" integer,
	"opponent_score" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matches_opponent_not_blank" CHECK (length(btrim("matches"."opponent")) > 0),
	CONSTRAINT "matches_scheduled_at_finite" CHECK (isfinite("matches"."scheduled_at")),
	CONSTRAINT "matches_status_valid" CHECK ("matches"."status" IN ('scheduled', 'completed', 'cancelled')),
	CONSTRAINT "matches_team_score_nonnegative" CHECK ("matches"."team_score" >= 0),
	CONSTRAINT "matches_opponent_score_nonnegative" CHECK ("matches"."opponent_score" >= 0),
	CONSTRAINT "matches_result_state" CHECK ((
    "matches"."status" = 'completed' AND "matches"."team_score" IS NOT NULL AND "matches"."opponent_score" IS NOT NULL
  ) OR (
    "matches"."status" IN ('scheduled', 'cancelled') AND "matches"."team_score" IS NULL AND "matches"."opponent_score" IS NULL
  ))
);
--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "matches_scheduled_at_id_idx" ON "matches" USING btree ("scheduled_at","id");--> statement-breakpoint
CREATE INDEX "matches_team_id_scheduled_at_id_idx" ON "matches" USING btree ("team_id","scheduled_at","id");