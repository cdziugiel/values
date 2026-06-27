ALTER TABLE "report_access_products" ALTER COLUMN "report_template_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "report_access_products" ADD COLUMN "product_group" varchar(60) DEFAULT 'report_access' NOT NULL;--> statement-breakpoint
ALTER TABLE "report_access_products" ADD COLUMN "product_kind" varchar(60);--> statement-breakpoint
CREATE INDEX "rap_product_group_idx" ON "report_access_products" USING btree ("product_group");--> statement-breakpoint
CREATE INDEX "rap_product_kind_idx" ON "report_access_products" USING btree ("product_kind");--> statement-breakpoint
CREATE INDEX "rap_status_idx" ON "report_access_products" USING btree ("status");