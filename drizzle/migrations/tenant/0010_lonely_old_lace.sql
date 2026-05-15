CREATE TABLE "assessment_result_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_session_id" uuid NOT NULL,
	"tenant_slug" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "assessment_result_snapshots" ADD CONSTRAINT "assessment_result_snapshots_assessment_session_id_assessment_sessions_id_fk" FOREIGN KEY ("assessment_session_id") REFERENCES "public"."assessment_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_result_snapshots_session_uidx" ON "assessment_result_snapshots" USING btree ("assessment_session_id");--> statement-breakpoint
CREATE INDEX "assessment_result_snapshots_session_id_idx" ON "assessment_result_snapshots" USING btree ("assessment_session_id");--> statement-breakpoint
CREATE INDEX "assessment_result_snapshots_tenant_slug_idx" ON "assessment_result_snapshots" USING btree ("tenant_slug");--> statement-breakpoint
CREATE INDEX "assessment_result_snapshots_deleted_at_idx" ON "assessment_result_snapshots" USING btree ("deleted_at");