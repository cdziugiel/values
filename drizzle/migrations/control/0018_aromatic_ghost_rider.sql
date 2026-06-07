CREATE TYPE "public"."discount_code_applies_to" AS ENUM('report_unlock', 'report_access_purchase', 'all_report_access');--> statement-breakpoint
CREATE TYPE "public"."discount_code_status" AS ENUM('active', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."discount_code_type" AS ENUM('fixed_amount', 'percent');--> statement-breakpoint
CREATE TYPE "public"."discount_code_redemption_context" AS ENUM('report_unlock', 'report_access_purchase');--> statement-breakpoint
CREATE TYPE "public"."discount_code_redemption_status" AS ENUM('redeemed', 'cancelled');--> statement-breakpoint
CREATE TABLE "discount_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_hash" text NOT NULL,
	"code_preview" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "discount_code_status" DEFAULT 'active' NOT NULL,
	"discount_type" "discount_code_type" NOT NULL,
	"discount_value_cents" integer,
	"discount_percent_bps" integer,
	"allow_zero_final_price" boolean DEFAULT true NOT NULL,
	"maximum_discount_cents" integer,
	"minimum_order_value_cents" integer,
	"applies_to" "discount_code_applies_to" DEFAULT 'all_report_access' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"max_redemptions" integer,
	"max_redemptions_per_user" integer,
	"max_redemptions_per_tenant" integer,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "discount_code_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discount_code_id" uuid NOT NULL,
	"status" "discount_code_redemption_status" DEFAULT 'redeemed' NOT NULL,
	"redemption_context" "discount_code_redemption_context" NOT NULL,
	"user_id" uuid,
	"tenant_id" uuid,
	"order_id" uuid,
	"report_access_order_id" uuid,
	"report_access_grant_id" uuid,
	"assessment_session_id" uuid,
	"original_amount_cents" integer NOT NULL,
	"discount_amount_cents" integer NOT NULL,
	"final_amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'PLN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "discount_code_redemptions" ADD CONSTRAINT "discount_code_redemptions_discount_code_id_discount_codes_id_fk" FOREIGN KEY ("discount_code_id") REFERENCES "public"."discount_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "discount_codes_code_hash_uidx" ON "discount_codes" USING btree ("code_hash");