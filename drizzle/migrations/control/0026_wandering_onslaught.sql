CREATE TABLE "respondent_identity_index" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_slug" varchar(160) NOT NULL,
	"respondent_id" uuid NOT NULL,
	"normalized_email" varchar(320),
	"user_id" uuid,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "respondent_identity_index" ADD CONSTRAINT "respondent_identity_index_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "respondent_identity_index_tenant_respondent_uidx" ON "respondent_identity_index" USING btree ("tenant_slug","respondent_id");--> statement-breakpoint
CREATE INDEX "respondent_identity_index_user_id_idx" ON "respondent_identity_index" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "respondent_identity_index_normalized_email_idx" ON "respondent_identity_index" USING btree ("normalized_email");--> statement-breakpoint
CREATE INDEX "respondent_identity_index_tenant_status_idx" ON "respondent_identity_index" USING btree ("tenant_slug","status");