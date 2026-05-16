CREATE TABLE "assessment_invitation_index" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tenant_slug" text NOT NULL,
	"tenant_name" text NOT NULL,
	"respondent_email_normalized" text NOT NULL,
	"user_id" uuid,
	"tenant_respondent_id" uuid NOT NULL,
	"tenant_project_id" uuid NOT NULL,
	"tenant_project_respondent_id" uuid NOT NULL,
	"tenant_session_id" uuid,
	"tenant_access_link_id" uuid,
	"tenant_project_questionnaire_id" uuid,
	"questionnaire_version_id" uuid,
	"project_name_snapshot" text,
	"questionnaire_name_snapshot" text,
	"status" text DEFAULT 'invited' NOT NULL,
	"invited_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessment_invitation_index" ADD CONSTRAINT "assessment_invitation_index_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_invitation_index" ADD CONSTRAINT "assessment_invitation_index_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_invitation_index_email_idx" ON "assessment_invitation_index" USING btree ("respondent_email_normalized");--> statement-breakpoint
CREATE INDEX "assessment_invitation_index_user_idx" ON "assessment_invitation_index" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "assessment_invitation_index_tenant_idx" ON "assessment_invitation_index" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "assessment_invitation_index_status_idx" ON "assessment_invitation_index" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_invitation_index_tenant_project_respondent_uq" ON "assessment_invitation_index" USING btree ("tenant_id","tenant_project_respondent_id");