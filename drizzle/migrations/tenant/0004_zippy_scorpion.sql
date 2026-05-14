CREATE TYPE "public"."assessment_project_questionnaire_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TABLE "assessment_project_questionnaires" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_project_id" uuid NOT NULL,
	"questionnaire_id" uuid NOT NULL,
	"questionnaire_version_id" uuid NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"status" "assessment_project_questionnaire_status" DEFAULT 'active' NOT NULL,
	"snapshot" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "assessment_project_questionnaires" ADD CONSTRAINT "assessment_project_questionnaires_assessment_project_id_assessment_projects_id_fk" FOREIGN KEY ("assessment_project_id") REFERENCES "public"."assessment_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_project_questionnaires_project_version_uidx" ON "assessment_project_questionnaires" USING btree ("assessment_project_id","questionnaire_version_id");--> statement-breakpoint
CREATE INDEX "assessment_project_questionnaires_project_id_idx" ON "assessment_project_questionnaires" USING btree ("assessment_project_id");--> statement-breakpoint
CREATE INDEX "assessment_project_questionnaires_questionnaire_id_idx" ON "assessment_project_questionnaires" USING btree ("questionnaire_id");--> statement-breakpoint
CREATE INDEX "assessment_project_questionnaires_version_id_idx" ON "assessment_project_questionnaires" USING btree ("questionnaire_version_id");--> statement-breakpoint
CREATE INDEX "assessment_project_questionnaires_status_idx" ON "assessment_project_questionnaires" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assessment_project_questionnaires_deleted_at_idx" ON "assessment_project_questionnaires" USING btree ("deleted_at");