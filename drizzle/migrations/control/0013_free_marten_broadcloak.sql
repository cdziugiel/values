ALTER TABLE "assessment_invitation_index" DROP CONSTRAINT "assessment_invitation_index_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "assessment_invitation_index" DROP CONSTRAINT "assessment_invitation_index_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "assessment_invitation_index_user_idx";--> statement-breakpoint
DROP INDEX "assessment_invitation_index_tenant_idx";--> statement-breakpoint
DROP INDEX "assessment_invitation_index_tenant_project_respondent_uq";--> statement-breakpoint
ALTER TABLE "assessment_invitation_index" ALTER COLUMN "tenant_project_questionnaire_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_invitation_index" ALTER COLUMN "questionnaire_version_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_invitation_index" ADD COLUMN "questionnaire_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_invitation_index" ADD COLUMN "questionnaire_version_name_snapshot" text;--> statement-breakpoint
ALTER TABLE "assessment_invitation_index" ADD CONSTRAINT "assessment_invitation_index_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_invitation_index" ADD CONSTRAINT "assessment_invitation_index_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_invitation_index_user_id_idx" ON "assessment_invitation_index" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "assessment_invitation_index_tenant_id_idx" ON "assessment_invitation_index" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "assessment_invitation_index_session_idx" ON "assessment_invitation_index" USING btree ("tenant_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_invitation_index_unique_invitation_questionnaire" ON "assessment_invitation_index" USING btree ("tenant_id","tenant_project_respondent_id","tenant_project_questionnaire_id");