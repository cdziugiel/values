ALTER TYPE "public"."questionnaire_item_type" ADD VALUE 'true_false' BEFORE 'single_choice';--> statement-breakpoint
ALTER TYPE "public"."questionnaire_item_type" ADD VALUE 'number';--> statement-breakpoint
CREATE TABLE "questionnaire_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"questionnaire_version_id" uuid NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "questionnaire_dimensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"questionnaire_version_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "questionnaire_item_dimension_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"questionnaire_item_id" uuid NOT NULL,
	"questionnaire_dimension_id" uuid NOT NULL,
	"weight" numeric(8, 4) DEFAULT '1' NOT NULL,
	"reverse_scored" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "questionnaire_items" ADD COLUMN "questionnaire_page_id" uuid;--> statement-breakpoint
ALTER TABLE "questionnaire_items" ADD COLUMN "response_config" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "questionnaire_pages" ADD CONSTRAINT "questionnaire_pages_questionnaire_version_id_questionnaire_versions_id_fk" FOREIGN KEY ("questionnaire_version_id") REFERENCES "public"."questionnaire_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_dimensions" ADD CONSTRAINT "questionnaire_dimensions_questionnaire_version_id_questionnaire_versions_id_fk" FOREIGN KEY ("questionnaire_version_id") REFERENCES "public"."questionnaire_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_item_dimension_scores" ADD CONSTRAINT "questionnaire_item_dimension_scores_questionnaire_item_id_questionnaire_items_id_fk" FOREIGN KEY ("questionnaire_item_id") REFERENCES "public"."questionnaire_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_item_dimension_scores" ADD CONSTRAINT "questionnaire_item_dimension_scores_questionnaire_dimension_id_questionnaire_dimensions_id_fk" FOREIGN KEY ("questionnaire_dimension_id") REFERENCES "public"."questionnaire_dimensions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "questionnaire_pages_version_code_uidx" ON "questionnaire_pages" USING btree ("questionnaire_version_id","code");--> statement-breakpoint
CREATE INDEX "questionnaire_pages_version_id_idx" ON "questionnaire_pages" USING btree ("questionnaire_version_id");--> statement-breakpoint
CREATE INDEX "questionnaire_pages_order_idx" ON "questionnaire_pages" USING btree ("order_index");--> statement-breakpoint
CREATE INDEX "questionnaire_pages_deleted_at_idx" ON "questionnaire_pages" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "questionnaire_dimensions_version_code_uidx" ON "questionnaire_dimensions" USING btree ("questionnaire_version_id","code");--> statement-breakpoint
CREATE INDEX "questionnaire_dimensions_version_id_idx" ON "questionnaire_dimensions" USING btree ("questionnaire_version_id");--> statement-breakpoint
CREATE INDEX "questionnaire_dimensions_order_idx" ON "questionnaire_dimensions" USING btree ("order_index");--> statement-breakpoint
CREATE INDEX "questionnaire_dimensions_deleted_at_idx" ON "questionnaire_dimensions" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "questionnaire_item_dimension_scores_item_dimension_uidx" ON "questionnaire_item_dimension_scores" USING btree ("questionnaire_item_id","questionnaire_dimension_id");--> statement-breakpoint
CREATE INDEX "questionnaire_item_dimension_scores_item_id_idx" ON "questionnaire_item_dimension_scores" USING btree ("questionnaire_item_id");--> statement-breakpoint
CREATE INDEX "questionnaire_item_dimension_scores_dimension_id_idx" ON "questionnaire_item_dimension_scores" USING btree ("questionnaire_dimension_id");--> statement-breakpoint
CREATE INDEX "questionnaire_item_dimension_scores_deleted_at_idx" ON "questionnaire_item_dimension_scores" USING btree ("deleted_at");--> statement-breakpoint
ALTER TABLE "questionnaire_items" ADD CONSTRAINT "questionnaire_items_questionnaire_page_id_questionnaire_pages_id_fk" FOREIGN KEY ("questionnaire_page_id") REFERENCES "public"."questionnaire_pages"("id") ON DELETE set null ON UPDATE no action;