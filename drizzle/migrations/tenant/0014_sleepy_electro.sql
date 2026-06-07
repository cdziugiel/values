CREATE TABLE "comparison_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"respondent_id" uuid NOT NULL,
	"assessment_session_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"label" text,
	"allowed_scope" text DEFAULT 'comparison_snapshot' NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"is_single_use" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "comparison_shares" ADD CONSTRAINT "comparison_shares_respondent_id_respondents_id_fk" FOREIGN KEY ("respondent_id") REFERENCES "public"."respondents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparison_shares" ADD CONSTRAINT "comparison_shares_assessment_session_id_assessment_sessions_id_fk" FOREIGN KEY ("assessment_session_id") REFERENCES "public"."assessment_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "comparison_shares_token_hash_unique" ON "comparison_shares" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "comparison_shares_respondent_id_idx" ON "comparison_shares" USING btree ("respondent_id");--> statement-breakpoint
CREATE INDEX "comparison_shares_session_id_idx" ON "comparison_shares" USING btree ("assessment_session_id");--> statement-breakpoint
CREATE INDEX "comparison_shares_status_idx" ON "comparison_shares" USING btree ("status");--> statement-breakpoint
CREATE INDEX "comparison_shares_deleted_at_idx" ON "comparison_shares" USING btree ("deleted_at");