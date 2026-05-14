CREATE TYPE "public"."questionnaire_item_type" AS ENUM('likert', 'single_choice', 'multiple_choice', 'text');--> statement-breakpoint
CREATE TYPE "public"."questionnaire_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."questionnaire_version_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TABLE "questionnaire_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"questionnaire_version_id" uuid NOT NULL,
	"code" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"type" "questionnaire_item_type" DEFAULT 'likert' NOT NULL,
	"text" text NOT NULL,
	"help_text" text,
	"required" boolean DEFAULT true NOT NULL,
	"scale_min" integer,
	"scale_max" integer,
	"scale_min_label" text,
	"scale_max_label" text,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scoring_key" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "questionnaire_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"questionnaire_id" uuid NOT NULL,
	"version" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "questionnaire_version_status" DEFAULT 'draft' NOT NULL,
	"scoring_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "questionnaires" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "questionnaire_status" DEFAULT 'draft' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "questionnaire_items" ADD CONSTRAINT "questionnaire_items_questionnaire_version_id_questionnaire_versions_id_fk" FOREIGN KEY ("questionnaire_version_id") REFERENCES "public"."questionnaire_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_versions" ADD CONSTRAINT "questionnaire_versions_questionnaire_id_questionnaires_id_fk" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."questionnaires"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "questionnaire_items_version_code_uidx" ON "questionnaire_items" USING btree ("questionnaire_version_id","code");--> statement-breakpoint
CREATE INDEX "questionnaire_items_version_id_idx" ON "questionnaire_items" USING btree ("questionnaire_version_id");--> statement-breakpoint
CREATE INDEX "questionnaire_items_order_idx" ON "questionnaire_items" USING btree ("order_index");--> statement-breakpoint
CREATE INDEX "questionnaire_items_deleted_at_idx" ON "questionnaire_items" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "questionnaire_versions_questionnaire_version_uidx" ON "questionnaire_versions" USING btree ("questionnaire_id","version");--> statement-breakpoint
CREATE INDEX "questionnaire_versions_questionnaire_id_idx" ON "questionnaire_versions" USING btree ("questionnaire_id");--> statement-breakpoint
CREATE INDEX "questionnaire_versions_status_idx" ON "questionnaire_versions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "questionnaire_versions_deleted_at_idx" ON "questionnaire_versions" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "questionnaires_code_uidx" ON "questionnaires" USING btree ("code");--> statement-breakpoint
CREATE INDEX "questionnaires_status_idx" ON "questionnaires" USING btree ("status");--> statement-breakpoint
CREATE INDEX "questionnaires_deleted_at_idx" ON "questionnaires" USING btree ("deleted_at");