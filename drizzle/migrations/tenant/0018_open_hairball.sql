CREATE TABLE "normative_profile_session_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_session_id" uuid NOT NULL,
	"statistical_profile_id" uuid NOT NULL,
	"profile_revision" integer NOT NULL,
	"profile_snapshot" jsonb NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "respondent_statistical_profiles_session_uidx";--> statement-breakpoint
DROP INDEX "normative_profile_rewards_profile_type_uidx";--> statement-breakpoint
ALTER TABLE "respondent_statistical_profiles" ADD COLUMN "owner_user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "respondent_statistical_profiles" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "normative_profile_rewards" ADD COLUMN "owner_user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "normative_profile_rewards" ADD COLUMN "usage_limit" integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE "normative_profile_rewards" ADD COLUMN "eligible_again_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "normative_profile_session_links" ADD CONSTRAINT "normative_profile_session_links_assessment_session_id_assessment_sessions_id_fk" FOREIGN KEY ("assessment_session_id") REFERENCES "public"."assessment_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normative_profile_session_links" ADD CONSTRAINT "normative_profile_session_links_statistical_profile_id_respondent_statistical_profiles_id_fk" FOREIGN KEY ("statistical_profile_id") REFERENCES "public"."respondent_statistical_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "normative_profile_session_links_session_uidx" ON "normative_profile_session_links" USING btree ("assessment_session_id");--> statement-breakpoint
CREATE INDEX "normative_profile_session_links_profile_idx" ON "normative_profile_session_links" USING btree ("statistical_profile_id");--> statement-breakpoint
CREATE INDEX "respondent_statistical_profiles_owner_user_id_idx" ON "respondent_statistical_profiles" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "normative_profile_rewards_profile_id_idx" ON "normative_profile_rewards" USING btree ("statistical_profile_id");--> statement-breakpoint
CREATE INDEX "normative_profile_rewards_owner_user_id_idx" ON "normative_profile_rewards" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "normative_profile_rewards_eligible_again_at_idx" ON "normative_profile_rewards" USING btree ("eligible_again_at");