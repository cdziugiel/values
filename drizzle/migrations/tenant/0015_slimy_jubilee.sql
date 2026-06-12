DROP INDEX "assessment_result_snapshots_session_uidx";--> statement-breakpoint
ALTER TABLE "assessment_result_snapshots" ADD COLUMN "project_questionnaire_id" uuid;--> statement-breakpoint
ALTER TABLE "assessment_result_snapshots" ADD COLUMN "questionnaire_id" uuid;--> statement-breakpoint
ALTER TABLE "assessment_result_snapshots" ADD COLUMN "questionnaire_version_id" uuid;--> statement-breakpoint
ALTER TABLE "assessment_result_snapshots" ADD CONSTRAINT "assessment_result_snapshots_project_questionnaire_id_assessment_project_questionnaires_id_fk" FOREIGN KEY ("project_questionnaire_id") REFERENCES "public"."assessment_project_questionnaires"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_result_snapshots_session_questionnaire_uidx" ON "assessment_result_snapshots" USING btree ("assessment_session_id","project_questionnaire_id") WHERE deleted_at is null and project_questionnaire_id is not null;--> statement-breakpoint
CREATE INDEX "assessment_result_snapshots_project_questionnaire_id_idx" ON "assessment_result_snapshots" USING btree ("project_questionnaire_id");--> statement-breakpoint
CREATE INDEX "assessment_result_snapshots_questionnaire_id_idx" ON "assessment_result_snapshots" USING btree ("questionnaire_id");--> statement-breakpoint
CREATE INDEX "assessment_result_snapshots_questionnaire_version_id_idx" ON "assessment_result_snapshots" USING btree ("questionnaire_version_id");