CREATE TABLE "purchase_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"offer_code" varchar(80) NOT NULL,
	"report_type" varchar(40) NOT NULL,
	"product_code" varchar(120) NOT NULL,
	"status" varchar(40) DEFAULT 'created' NOT NULL,
	"tenant_slug" varchar(120),
	"questionnaire_version_id" uuid,
	"project_questionnaire_id" uuid,
	"assessment_session_id" uuid,
	"order_id" uuid,
	"attribution" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "legal_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(40) NOT NULL,
	"version" varchar(80) NOT NULL,
	"content_hash" varchar(128) NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_acceptances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" varchar(80) NOT NULL,
	"ip_hash" varchar(128),
	"user_agent_hash" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" varchar(80) NOT NULL,
	"version" varchar(80) NOT NULL,
	"status" varchar(20) NOT NULL,
	"granted_at" timestamp with time zone,
	"withdrawn_at" timestamp with time zone,
	"source" varchar(80) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultation_entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" varchar(60) NOT NULL,
	"duration_minutes" integer NOT NULL,
	"status" varchar(30) DEFAULT 'available' NOT NULL,
	"booking_provider" varchar(40) DEFAULT 'calcom' NOT NULL,
	"booking_reference" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"booked_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "purchase_intents" ADD CONSTRAINT "purchase_intents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_document_id_legal_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."legal_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_entitlements" ADD CONSTRAINT "consultation_entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "purchase_intents_user_idx" ON "purchase_intents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "purchase_intents_session_idx" ON "purchase_intents" USING btree ("assessment_session_id");--> statement-breakpoint
CREATE INDEX "purchase_intents_order_idx" ON "purchase_intents" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "purchase_intents_status_idx" ON "purchase_intents" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_intents_session_offer_unique" ON "purchase_intents" USING btree ("user_id","assessment_session_id","offer_code") WHERE deleted_at is null and assessment_session_id is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "legal_documents_type_version_unique" ON "legal_documents" USING btree ("type","version");--> statement-breakpoint
CREATE INDEX "legal_documents_active_idx" ON "legal_documents" USING btree ("type","is_active");--> statement-breakpoint
CREATE INDEX "legal_acceptances_user_idx" ON "legal_acceptances" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "legal_acceptances_document_idx" ON "legal_acceptances" USING btree ("document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_acceptances_user_document_unique" ON "legal_acceptances" USING btree ("user_id","document_id");--> statement-breakpoint
CREATE INDEX "consent_records_user_purpose_idx" ON "consent_records" USING btree ("user_id","purpose","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "consultation_entitlements_order_unique" ON "consultation_entitlements" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "consultation_entitlements_user_idx" ON "consultation_entitlements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "consultation_entitlements_status_idx" ON "consultation_entitlements" USING btree ("status");