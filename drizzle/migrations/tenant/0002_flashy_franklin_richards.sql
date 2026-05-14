CREATE TYPE "public"."assessment_access_link_status" AS ENUM('active', 'used', 'revoked', 'expired');--> statement-breakpoint
CREATE TABLE "assessment_access_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_project_id" uuid NOT NULL,
	"respondent_id" uuid NOT NULL,
	"project_respondent_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"status" "assessment_access_link_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_accessed_at" timestamp with time zone,
	"used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "assessment_access_links" ADD CONSTRAINT "assessment_access_links_assessment_project_id_assessment_projects_id_fk" FOREIGN KEY ("assessment_project_id") REFERENCES "public"."assessment_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_access_links" ADD CONSTRAINT "assessment_access_links_respondent_id_respondents_id_fk" FOREIGN KEY ("respondent_id") REFERENCES "public"."respondents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_access_links" ADD CONSTRAINT "assessment_access_links_project_respondent_id_assessment_project_respondents_id_fk" FOREIGN KEY ("project_respondent_id") REFERENCES "public"."assessment_project_respondents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_access_links_token_hash_uidx" ON "assessment_access_links" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "assessment_access_links_project_id_idx" ON "assessment_access_links" USING btree ("assessment_project_id");--> statement-breakpoint
CREATE INDEX "assessment_access_links_respondent_id_idx" ON "assessment_access_links" USING btree ("respondent_id");--> statement-breakpoint
CREATE INDEX "assessment_access_links_project_respondent_id_idx" ON "assessment_access_links" USING btree ("project_respondent_id");--> statement-breakpoint
CREATE INDEX "assessment_access_links_status_idx" ON "assessment_access_links" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assessment_access_links_expires_at_idx" ON "assessment_access_links" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "assessment_access_links_deleted_at_idx" ON "assessment_access_links" USING btree ("deleted_at");