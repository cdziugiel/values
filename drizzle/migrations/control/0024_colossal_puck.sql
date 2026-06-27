ALTER TABLE "discount_codes" ADD COLUMN "assigned_user_id" uuid;--> statement-breakpoint
ALTER TABLE "discount_codes" ADD COLUMN "source_type" text;--> statement-breakpoint
ALTER TABLE "discount_codes" ADD COLUMN "source_reference_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "discount_codes_source_reference_uidx" ON "discount_codes" USING btree ("source_type","source_reference_id");--> statement-breakpoint
CREATE INDEX "discount_codes_assigned_user_id_idx" ON "discount_codes" USING btree ("assigned_user_id");