CREATE TABLE "billing_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_type" varchar(40) NOT NULL,
	"tenant_slug" varchar(120),
	"tenant_id" uuid,
	"user_id" uuid,
	"type" varchar(40) NOT NULL,
	"company_name" varchar(255),
	"tax_id" varchar(80),
	"first_name" varchar(120),
	"last_name" varchar(120),
	"email" varchar(320),
	"phone" varchar(80),
	"country" varchar(80) DEFAULT 'PL' NOT NULL,
	"postal_code" varchar(40),
	"city" varchar(160),
	"street" varchar(255),
	"building_number" varchar(40),
	"apartment_number" varchar(40),
	"invoice_email" varchar(320),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "report_access_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"order_id" uuid,
	"code_hash" varchar(255) NOT NULL,
	"code_preview" varchar(40) NOT NULL,
	"status" varchar(40) DEFAULT 'available' NOT NULL,
	"tenant_slug" varchar(120),
	"tenant_id" uuid,
	"owner_user_id" uuid,
	"purchased_by_user_id" uuid,
	"assigned_to_email" varchar(320),
	"assigned_to_user_id" uuid,
	"assessment_project_id" uuid,
	"assessment_session_id" uuid,
	"assessment_access_link_id" uuid,
	"redeemed_by_user_id" uuid,
	"redeemed_at" timestamp with time zone,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "report_access_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" varchar(40) NOT NULL,
	"status" varchar(40) DEFAULT 'active' NOT NULL,
	"product_id" uuid,
	"order_id" uuid,
	"access_code_id" uuid,
	"report_template_id" uuid NOT NULL,
	"report_template_version_id" uuid NOT NULL,
	"tenant_slug" varchar(120) NOT NULL,
	"tenant_id" uuid,
	"user_id" uuid,
	"email" varchar(320),
	"assessment_project_id" uuid,
	"assessment_session_id" uuid NOT NULL,
	"assessment_access_link_id" uuid,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "report_access_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_net" numeric(12, 2) DEFAULT '0' NOT NULL,
	"unit_vat" numeric(12, 2) DEFAULT '0' NOT NULL,
	"unit_gross" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_net" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_vat" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_gross" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "report_access_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_type" varchar(40) NOT NULL,
	"tenant_slug" varchar(120),
	"tenant_id" uuid,
	"buyer_user_id" uuid,
	"status" varchar(40) DEFAULT 'draft' NOT NULL,
	"payment_provider" varchar(80),
	"payment_provider_order_id" varchar(255),
	"payment_provider_session_id" varchar(255),
	"currency" varchar(8) DEFAULT 'PLN' NOT NULL,
	"total_net" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_vat" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_gross" numeric(12, 2) DEFAULT '0' NOT NULL,
	"invoice_requested" boolean DEFAULT false NOT NULL,
	"billing_profile_id" uuid,
	"billing_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "report_access_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_template_id" uuid NOT NULL,
	"code" varchar(120) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(40) DEFAULT 'draft' NOT NULL,
	"access_count" integer DEFAULT 1 NOT NULL,
	"validity_days" integer,
	"currency" varchar(8) DEFAULT 'PLN' NOT NULL,
	"price_net" numeric(12, 2) DEFAULT '0' NOT NULL,
	"vat_rate" numeric(5, 2) DEFAULT '23' NOT NULL,
	"price_gross" numeric(12, 2) DEFAULT '0' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "report_access_codes" ADD CONSTRAINT "report_access_codes_product_id_report_access_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."report_access_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_access_codes" ADD CONSTRAINT "report_access_codes_order_id_report_access_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."report_access_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_access_grants" ADD CONSTRAINT "report_access_grants_product_id_report_access_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."report_access_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_access_grants" ADD CONSTRAINT "report_access_grants_order_id_report_access_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."report_access_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_access_grants" ADD CONSTRAINT "report_access_grants_access_code_id_report_access_codes_id_fk" FOREIGN KEY ("access_code_id") REFERENCES "public"."report_access_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_access_grants" ADD CONSTRAINT "report_access_grants_report_template_id_report_templates_id_fk" FOREIGN KEY ("report_template_id") REFERENCES "public"."report_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_access_grants" ADD CONSTRAINT "report_access_grants_report_template_version_id_report_template_versions_id_fk" FOREIGN KEY ("report_template_version_id") REFERENCES "public"."report_template_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_access_order_items" ADD CONSTRAINT "report_access_order_items_order_id_report_access_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."report_access_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_access_order_items" ADD CONSTRAINT "report_access_order_items_product_id_report_access_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."report_access_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_access_products" ADD CONSTRAINT "report_access_products_report_template_id_report_templates_id_fk" FOREIGN KEY ("report_template_id") REFERENCES "public"."report_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bp_user_idx" ON "billing_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bp_tenant_slug_idx" ON "billing_profiles" USING btree ("tenant_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "rac_code_hash_unique" ON "report_access_codes" USING btree ("code_hash") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "rac_product_idx" ON "report_access_codes" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "rac_order_idx" ON "report_access_codes" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "rac_session_idx" ON "report_access_codes" USING btree ("assessment_session_id");--> statement-breakpoint
CREATE INDEX "rac_tenant_slug_idx" ON "report_access_codes" USING btree ("tenant_slug");--> statement-breakpoint
CREATE INDEX "rac_status_idx" ON "report_access_codes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rag_session_idx" ON "report_access_grants" USING btree ("assessment_session_id");--> statement-breakpoint
CREATE INDEX "rag_user_idx" ON "report_access_grants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rag_tenant_slug_idx" ON "report_access_grants" USING btree ("tenant_slug");--> statement-breakpoint
CREATE INDEX "rag_template_idx" ON "report_access_grants" USING btree ("report_template_id");--> statement-breakpoint
CREATE INDEX "rag_template_version_idx" ON "report_access_grants" USING btree ("report_template_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rag_one_active_grant_per_session_report_type_idx" ON "report_access_grants" USING btree ("assessment_session_id","report_template_id") WHERE deleted_at is null and status = 'active';--> statement-breakpoint
CREATE INDEX "raoi_order_idx" ON "report_access_order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "raoi_product_idx" ON "report_access_order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "rao_buyer_user_idx" ON "report_access_orders" USING btree ("buyer_user_id");--> statement-breakpoint
CREATE INDEX "rao_tenant_slug_idx" ON "report_access_orders" USING btree ("tenant_slug");--> statement-breakpoint
CREATE INDEX "rao_status_idx" ON "report_access_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rap_report_template_idx" ON "report_access_products" USING btree ("report_template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rap_code_unique" ON "report_access_products" USING btree ("code") WHERE deleted_at is null;