DROP INDEX "consultation_entitlements_order_unique";--> statement-breakpoint
ALTER TABLE "consultation_entitlements" ALTER COLUMN "order_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "consultation_entitlements" ADD COLUMN "source" varchar(30) DEFAULT 'package' NOT NULL;--> statement-breakpoint
ALTER TABLE "consultation_entitlements" ADD COLUMN "scheduled_start_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "consultation_entitlements" ADD COLUMN "scheduled_end_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "consultation_entitlements" ADD COLUMN "meeting_url" text;--> statement-breakpoint
ALTER TABLE "consultation_entitlements" ADD COLUMN "reschedule_url" text;--> statement-breakpoint
ALTER TABLE "consultation_entitlements" ADD COLUMN "cancel_url" text;--> statement-breakpoint
ALTER TABLE "consultation_entitlements" ADD COLUMN "booking_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "consultation_entitlements_booking_reference_unique" ON "consultation_entitlements" USING btree ("booking_reference") WHERE "consultation_entitlements"."booking_reference" is not null;--> statement-breakpoint
CREATE INDEX "consultation_entitlements_scheduled_start_idx" ON "consultation_entitlements" USING btree ("scheduled_start_at");--> statement-breakpoint
CREATE UNIQUE INDEX "consultation_entitlements_order_unique" ON "consultation_entitlements" USING btree ("order_id") WHERE "consultation_entitlements"."order_id" is not null;