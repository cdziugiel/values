CREATE TABLE "questionnaire_report_template_bindings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"questionnaire_version_id" uuid NOT NULL,
	"report_template_version_id" uuid NOT NULL,
	"is_default" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "questionnaire_report_template_bindings" ADD CONSTRAINT "questionnaire_report_template_bindings_questionnaire_version_id_questionnaire_versions_id_fk" FOREIGN KEY ("questionnaire_version_id") REFERENCES "public"."questionnaire_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_report_template_bindings" ADD CONSTRAINT "questionnaire_report_template_bindings_report_template_version_id_report_template_versions_id_fk" FOREIGN KEY ("report_template_version_id") REFERENCES "public"."report_template_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "qrtb_questionnaire_version_idx" ON "questionnaire_report_template_bindings" USING btree ("questionnaire_version_id");--> statement-breakpoint
CREATE INDEX "qrtb_report_template_version_idx" ON "questionnaire_report_template_bindings" USING btree ("report_template_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "qrtb_one_default_per_questionnaire_version_idx" ON "questionnaire_report_template_bindings" USING btree ("questionnaire_version_id","is_default") WHERE deleted_at is null;