ALTER TYPE "public"."assessment_response_value_type" ADD VALUE 'boolean' BEFORE 'json';--> statement-breakpoint
ALTER TABLE "assessment_responses" ALTER COLUMN "number_value" SET DATA TYPE numeric(12, 4);--> statement-breakpoint
ALTER TABLE "assessment_responses" ADD COLUMN "boolean_value" boolean;