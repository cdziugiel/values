ALTER TABLE "report_access_products" RENAME COLUMN "product_kind" TO "kind";--> statement-breakpoint
DROP INDEX "rap_product_group_idx";--> statement-breakpoint
DROP INDEX "rap_product_kind_idx";--> statement-breakpoint
DROP INDEX "rap_status_idx";--> statement-breakpoint
ALTER TABLE "report_access_products" ALTER COLUMN "report_template_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "report_access_products" DROP COLUMN "product_group";