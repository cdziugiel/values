ALTER TABLE "normative_profiles" ALTER COLUMN "schema_version" SET DEFAULT '1.1';--> statement-breakpoint
ALTER TABLE "normative_profiles" ALTER COLUMN "dictionary_version" SET DEFAULT '2026-09';--> statement-breakpoint
ALTER TABLE "normative_profile_session_links" ADD COLUMN "recruitment_channel" text;--> statement-breakpoint
ALTER TABLE "normative_profile_session_links" ADD COLUMN "recruitment_provider" text;--> statement-breakpoint
ALTER TABLE "normative_profile_session_links" ADD COLUMN "external_respondent_id" text;--> statement-breakpoint
ALTER TABLE "normative_profile_session_links" ADD COLUMN "sample_wave" text;--> statement-breakpoint
ALTER TABLE "normative_profile_session_links" ADD COLUMN "sample_project_code" text;--> statement-breakpoint
ALTER TABLE "normative_profile_session_links" ADD COLUMN "quota_cell" text;--> statement-breakpoint
ALTER TABLE "normative_profile_session_links" ADD COLUMN "panel_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "normative_profiles" ADD COLUMN "worked_last_week" boolean;--> statement-breakpoint
ALTER TABLE "normative_profiles" ADD COLUMN "has_job_temporary_absence" boolean;--> statement-breakpoint
ALTER TABLE "normative_profiles" ADD COLUMN "is_working_for_norms" boolean;--> statement-breakpoint
ALTER TABLE "normative_profiles" ADD COLUMN "employment_form" text;--> statement-breakpoint
ALTER TABLE "normative_profiles" ADD COLUMN "work_time" text;--> statement-breakpoint
ALTER TABLE "normative_profiles" ADD COLUMN "industry_classification" text;--> statement-breakpoint
ALTER TABLE "normative_profiles" ADD COLUMN "industry_section" text;--> statement-breakpoint
ALTER TABLE "normative_profiles" ADD COLUMN "occupation_major_group" text;--> statement-breakpoint
ALTER TABLE "normative_profiles" ADD COLUMN "manages_people" boolean;--> statement-breakpoint
ALTER TABLE "normative_profiles" ADD COLUMN "ownership_sector" text;--> statement-breakpoint
ALTER TABLE "normative_profiles" ADD COLUMN "organization_tenure" text;--> statement-breakpoint
CREATE INDEX "normative_profile_session_links_sample_wave_idx" ON "normative_profile_session_links" USING btree ("sample_wave");--> statement-breakpoint
CREATE INDEX "normative_profile_session_links_external_respondent_idx" ON "normative_profile_session_links" USING btree ("recruitment_provider","external_respondent_id");--> statement-breakpoint
CREATE INDEX "normative_profiles_working_idx" ON "normative_profiles" USING btree ("is_working_for_norms");--> statement-breakpoint
CREATE INDEX "normative_profiles_occupation_major_group_idx" ON "normative_profiles" USING btree ("occupation_major_group");