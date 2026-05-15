CREATE TABLE "report_template_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_template_version_id" uuid NOT NULL,
	"code" varchar(120) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"order_index" integer DEFAULT 1 NOT NULL,
	"html" text DEFAULT '' NOT NULL,
	"css" text DEFAULT '' NOT NULL,
	"js" text DEFAULT '' NOT NULL,
	"visibility_condition" jsonb,
	"component_bindings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "report_template_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_template_id" uuid NOT NULL,
	"questionnaire_version_id" uuid NOT NULL,
	"version" varchar(80) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(40) DEFAULT 'draft' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"global_css" text,
	"global_js" text,
	"page_size" varchar(20) DEFAULT 'A4' NOT NULL,
	"orientation" varchar(20) DEFAULT 'portrait' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"data_bindings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "report_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"questionnaire_id" uuid NOT NULL,
	"code" varchar(120) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(40) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "report_template_pages" ADD CONSTRAINT "report_template_pages_report_template_version_id_report_template_versions_id_fk" FOREIGN KEY ("report_template_version_id") REFERENCES "public"."report_template_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_template_versions" ADD CONSTRAINT "report_template_versions_report_template_id_report_templates_id_fk" FOREIGN KEY ("report_template_id") REFERENCES "public"."report_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_template_versions" ADD CONSTRAINT "report_template_versions_questionnaire_version_id_questionnaire_versions_id_fk" FOREIGN KEY ("questionnaire_version_id") REFERENCES "public"."questionnaire_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_questionnaire_id_questionnaires_id_fk" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."questionnaires"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "report_template_pages_version_code_unique" ON "report_template_pages" USING btree ("report_template_version_id","code") WHERE deleted_at is null;--> statement-breakpoint
CREATE UNIQUE INDEX "report_template_versions_template_version_unique" ON "report_template_versions" USING btree ("report_template_id","version") WHERE deleted_at is null;--> statement-breakpoint
CREATE UNIQUE INDEX "report_templates_questionnaire_code_unique" ON "report_templates" USING btree ("questionnaire_id","code") WHERE deleted_at is null;