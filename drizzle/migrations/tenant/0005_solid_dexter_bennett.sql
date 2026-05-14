CREATE TYPE "public"."assessment_response_value_type" AS ENUM('number', 'text', 'json');--> statement-breakpoint
CREATE TABLE "assessment_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_session_id" uuid NOT NULL,
	"questionnaire_id" uuid NOT NULL,
	"questionnaire_version_id" uuid NOT NULL,
	"questionnaire_item_id" uuid NOT NULL,
	"item_code" text NOT NULL,
	"value_type" "assessment_response_value_type" DEFAULT 'number' NOT NULL,
	"number_value" integer,
	"text_value" text,
	"json_value" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_assessment_session_id_assessment_sessions_id_fk" FOREIGN KEY ("assessment_session_id") REFERENCES "public"."assessment_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_responses_session_item_uidx" ON "assessment_responses" USING btree ("assessment_session_id","questionnaire_item_id");--> statement-breakpoint
CREATE INDEX "assessment_responses_session_id_idx" ON "assessment_responses" USING btree ("assessment_session_id");--> statement-breakpoint
CREATE INDEX "assessment_responses_questionnaire_version_id_idx" ON "assessment_responses" USING btree ("questionnaire_version_id");--> statement-breakpoint
CREATE INDEX "assessment_responses_item_id_idx" ON "assessment_responses" USING btree ("questionnaire_item_id");--> statement-breakpoint
CREATE INDEX "assessment_responses_deleted_at_idx" ON "assessment_responses" USING btree ("deleted_at");