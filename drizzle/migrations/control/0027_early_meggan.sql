CREATE TABLE "report_preview_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_template_version_id" uuid NOT NULL,
	"questionnaire_version_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "report_preview_snapshots" ADD CONSTRAINT "report_preview_snapshots_report_template_version_id_report_template_versions_id_fk" FOREIGN KEY ("report_template_version_id") REFERENCES "public"."report_template_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_preview_snapshots" ADD CONSTRAINT "report_preview_snapshots_questionnaire_version_id_questionnaire_versions_id_fk" FOREIGN KEY ("questionnaire_version_id") REFERENCES "public"."questionnaire_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "report_preview_snapshots_template_version_idx" ON "report_preview_snapshots" USING btree ("report_template_version_id");--> statement-breakpoint
CREATE INDEX "report_preview_snapshots_questionnaire_version_idx" ON "report_preview_snapshots" USING btree ("questionnaire_version_id");--> statement-breakpoint
CREATE INDEX "report_preview_snapshots_created_by_idx" ON "report_preview_snapshots" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "report_preview_snapshots_expires_at_idx" ON "report_preview_snapshots" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "report_preview_snapshots_deleted_at_idx" ON "report_preview_snapshots" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rao_payment_provider_session_unique" ON "report_access_orders" USING btree ("payment_provider","payment_provider_session_id") WHERE 
          deleted_at is null
          and payment_provider_session_id is not null
        ;--> statement-breakpoint
CREATE INDEX "rao_payment_provider_order_idx" ON "report_access_orders" USING btree ("payment_provider","payment_provider_order_id");