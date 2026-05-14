CREATE TYPE "public"."assessment_project_respondent_status" AS ENUM('invited', 'started', 'completed', 'excluded', 'archived');--> statement-breakpoint
CREATE TABLE "assessment_project_respondents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_project_id" uuid NOT NULL,
	"respondent_id" uuid NOT NULL,
	"status" "assessment_project_respondent_status" DEFAULT 'invited' NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now(),
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "assessment_project_respondents" ADD CONSTRAINT "assessment_project_respondents_assessment_project_id_assessment_projects_id_fk" FOREIGN KEY ("assessment_project_id") REFERENCES "public"."assessment_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_project_respondents" ADD CONSTRAINT "assessment_project_respondents_respondent_id_respondents_id_fk" FOREIGN KEY ("respondent_id") REFERENCES "public"."respondents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_project_respondents_project_respondent_uidx" ON "assessment_project_respondents" USING btree ("assessment_project_id","respondent_id");--> statement-breakpoint
CREATE INDEX "assessment_project_respondents_project_id_idx" ON "assessment_project_respondents" USING btree ("assessment_project_id");--> statement-breakpoint
CREATE INDEX "assessment_project_respondents_respondent_id_idx" ON "assessment_project_respondents" USING btree ("respondent_id");--> statement-breakpoint
CREATE INDEX "assessment_project_respondents_status_idx" ON "assessment_project_respondents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assessment_project_respondents_deleted_at_idx" ON "assessment_project_respondents" USING btree ("deleted_at");