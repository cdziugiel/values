CREATE TABLE "questionnaire_page_dimension_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"questionnaire_page_id" uuid NOT NULL,
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
ALTER TABLE "questionnaire_page_dimension_scores" ADD CONSTRAINT "questionnaire_page_dimension_scores_questionnaire_page_id_questionnaire_pages_id_fk" FOREIGN KEY ("questionnaire_page_id") REFERENCES "public"."questionnaire_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_page_dimension_scores" ADD CONSTRAINT "questionnaire_page_dimension_scores_questionnaire_dimension_id_questionnaire_dimensions_id_fk" FOREIGN KEY ("questionnaire_dimension_id") REFERENCES "public"."questionnaire_dimensions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "questionnaire_page_dimension_scores_page_dimension_active_uidx" ON "questionnaire_page_dimension_scores" USING btree ("questionnaire_page_id","questionnaire_dimension_id") WHERE "questionnaire_page_dimension_scores"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "questionnaire_page_dimension_scores_page_id_idx" ON "questionnaire_page_dimension_scores" USING btree ("questionnaire_page_id");--> statement-breakpoint
CREATE INDEX "questionnaire_page_dimension_scores_dimension_id_idx" ON "questionnaire_page_dimension_scores" USING btree ("questionnaire_dimension_id");--> statement-breakpoint
CREATE INDEX "questionnaire_page_dimension_scores_deleted_at_idx" ON "questionnaire_page_dimension_scores" USING btree ("deleted_at");