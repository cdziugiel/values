DROP INDEX "report_templates_questionnaire_code_unique";--> statement-breakpoint
ALTER TABLE "report_template_versions" ALTER COLUMN "questionnaire_version_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "report_templates" ALTER COLUMN "questionnaire_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "report_templates" ADD COLUMN "kind" varchar(60) DEFAULT 'personal' NOT NULL;--> statement-breakpoint
ALTER TABLE "report_access_codes" ADD COLUMN "subject_type" varchar(60);--> statement-breakpoint
ALTER TABLE "report_access_codes" ADD COLUMN "subject_id" uuid;--> statement-breakpoint
ALTER TABLE "report_access_grants" ADD COLUMN "subject_type" varchar(60) DEFAULT 'assessment_session' NOT NULL;--> statement-breakpoint
ALTER TABLE "report_access_grants" ADD COLUMN "subject_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "report_templates_code_unique" ON "report_templates" USING btree ("code") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "rag_subject_idx" ON "report_access_grants" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rag_one_active_grant_per_subject_report_type_idx" ON "report_access_grants" USING btree ("subject_type","subject_id","report_template_id") WHERE deleted_at is null and status = 'active' and subject_id is not null;