CREATE TYPE "public"."assessment_session_status" AS ENUM('in_progress', 'completed', 'abandoned', 'expired');--> statement-breakpoint
CREATE TABLE "assessment_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_project_id" uuid NOT NULL,
	"respondent_id" uuid NOT NULL,
	"project_respondent_id" uuid NOT NULL,
	"access_link_id" uuid NOT NULL,
	"status" "assessment_session_status" DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"abandoned_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_assessment_project_id_assessment_projects_id_fk" FOREIGN KEY ("assessment_project_id") REFERENCES "public"."assessment_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_respondent_id_respondents_id_fk" FOREIGN KEY ("respondent_id") REFERENCES "public"."respondents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_project_respondent_id_assessment_project_respondents_id_fk" FOREIGN KEY ("project_respondent_id") REFERENCES "public"."assessment_project_respondents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_access_link_id_assessment_access_links_id_fk" FOREIGN KEY ("access_link_id") REFERENCES "public"."assessment_access_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_sessions_project_id_idx" ON "assessment_sessions" USING btree ("assessment_project_id");--> statement-breakpoint
CREATE INDEX "assessment_sessions_respondent_id_idx" ON "assessment_sessions" USING btree ("respondent_id");--> statement-breakpoint
CREATE INDEX "assessment_sessions_project_respondent_id_idx" ON "assessment_sessions" USING btree ("project_respondent_id");--> statement-breakpoint
CREATE INDEX "assessment_sessions_access_link_id_idx" ON "assessment_sessions" USING btree ("access_link_id");--> statement-breakpoint
CREATE INDEX "assessment_sessions_status_idx" ON "assessment_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assessment_sessions_deleted_at_idx" ON "assessment_sessions" USING btree ("deleted_at");