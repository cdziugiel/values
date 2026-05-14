CREATE TABLE "assessment_dimension_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_session_id" uuid NOT NULL,
	"questionnaire_id" uuid NOT NULL,
	"questionnaire_version_id" uuid NOT NULL,
	"questionnaire_dimension_id" uuid NOT NULL,
	"dimension_code" text NOT NULL,
	"dimension_name" text NOT NULL,
	"raw_score" numeric(14, 4) NOT NULL,
	"weighted_score" numeric(14, 4) NOT NULL,
	"mean_score" numeric(14, 4) NOT NULL,
	"weighted_mean_score" numeric(14, 4) NOT NULL,
	"normalized_score" numeric(14, 4),
	"answered_items_count" numeric(10, 0) NOT NULL,
	"expected_items_count" numeric(10, 0) NOT NULL,
	"completeness" numeric(8, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "assessment_dimension_scores" ADD CONSTRAINT "assessment_dimension_scores_assessment_session_id_assessment_sessions_id_fk" FOREIGN KEY ("assessment_session_id") REFERENCES "public"."assessment_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_dimension_scores_session_dimension_uidx" ON "assessment_dimension_scores" USING btree ("assessment_session_id","questionnaire_dimension_id");--> statement-breakpoint
CREATE INDEX "assessment_dimension_scores_session_id_idx" ON "assessment_dimension_scores" USING btree ("assessment_session_id");--> statement-breakpoint
CREATE INDEX "assessment_dimension_scores_questionnaire_version_id_idx" ON "assessment_dimension_scores" USING btree ("questionnaire_version_id");--> statement-breakpoint
CREATE INDEX "assessment_dimension_scores_dimension_id_idx" ON "assessment_dimension_scores" USING btree ("questionnaire_dimension_id");--> statement-breakpoint
CREATE INDEX "assessment_dimension_scores_deleted_at_idx" ON "assessment_dimension_scores" USING btree ("deleted_at");