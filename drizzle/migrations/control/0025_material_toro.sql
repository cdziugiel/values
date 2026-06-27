CREATE TYPE "public"."normative_profile_reward_status" AS ENUM('pending', 'issued', 'redeemed', 'expired', 'revoked');--> statement-breakpoint
CREATE TABLE "normative_data_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"statistical_profile_id" uuid NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"source_tenant_id" uuid,
	"source_assessment_session_id" uuid,
	"consent_type" text DEFAULT 'normative_data_processing' NOT NULL,
	"consent_version" text NOT NULL,
	"purpose_code" text DEFAULT 'psychometric_norm_development' NOT NULL,
	"consent_text_snapshot" text NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "normative_profile_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"statistical_profile_id" uuid NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"source_tenant_id" uuid,
	"source_assessment_session_id" uuid,
	"reward_type" text DEFAULT 'discount_code' NOT NULL,
	"status" "normative_profile_reward_status" DEFAULT 'pending' NOT NULL,
	"usage_limit" integer DEFAULT 4 NOT NULL,
	"discount_code_id" uuid,
	"discount_code_preview" text,
	"issued_at" timestamp with time zone,
	"redeemed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"eligible_again_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "normative_profile_session_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"statistical_profile_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"assessment_session_id" uuid NOT NULL,
	"respondent_id" uuid NOT NULL,
	"assessment_project_id" uuid NOT NULL,
	"project_respondent_id" uuid NOT NULL,
	"profile_revision" integer NOT NULL,
	"profile_snapshot" jsonb NOT NULL,
	"assessment_completed_at" timestamp with time zone NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "normative_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"schema_version" text DEFAULT '1.0' NOT NULL,
	"dictionary_version" text DEFAULT '2026-01' NOT NULL,
	"date_of_birth" date NOT NULL,
	"birth_year" integer NOT NULL,
	"sex" text NOT NULL,
	"country_code" text DEFAULT 'PL' NOT NULL,
	"voivodeship_code" text,
	"locality_size" text,
	"education_level" text,
	"education_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"employment_status" text,
	"industry_code" text,
	"job_level" text,
	"job_function" text,
	"organization_size" text,
	"employment_sector" text,
	"recruitment_channel" text DEFAULT 'discount_incentive' NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "normative_data_consents" ADD CONSTRAINT "normative_data_consents_statistical_profile_id_normative_profiles_id_fk" FOREIGN KEY ("statistical_profile_id") REFERENCES "public"."normative_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normative_data_consents" ADD CONSTRAINT "normative_data_consents_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normative_data_consents" ADD CONSTRAINT "normative_data_consents_source_tenant_id_tenants_id_fk" FOREIGN KEY ("source_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normative_profile_rewards" ADD CONSTRAINT "normative_profile_rewards_statistical_profile_id_normative_profiles_id_fk" FOREIGN KEY ("statistical_profile_id") REFERENCES "public"."normative_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normative_profile_rewards" ADD CONSTRAINT "normative_profile_rewards_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normative_profile_rewards" ADD CONSTRAINT "normative_profile_rewards_source_tenant_id_tenants_id_fk" FOREIGN KEY ("source_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normative_profile_rewards" ADD CONSTRAINT "normative_profile_rewards_discount_code_id_discount_codes_id_fk" FOREIGN KEY ("discount_code_id") REFERENCES "public"."discount_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normative_profile_session_links" ADD CONSTRAINT "normative_profile_session_links_statistical_profile_id_normative_profiles_id_fk" FOREIGN KEY ("statistical_profile_id") REFERENCES "public"."normative_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normative_profile_session_links" ADD CONSTRAINT "normative_profile_session_links_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normative_profiles" ADD CONSTRAINT "normative_profiles_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "normative_data_consents_profile_idx" ON "normative_data_consents" USING btree ("statistical_profile_id");--> statement-breakpoint
CREATE INDEX "normative_data_consents_owner_idx" ON "normative_data_consents" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "normative_data_consents_accepted_at_idx" ON "normative_data_consents" USING btree ("accepted_at");--> statement-breakpoint
CREATE INDEX "normative_data_consents_withdrawn_at_idx" ON "normative_data_consents" USING btree ("withdrawn_at");--> statement-breakpoint
CREATE INDEX "normative_profile_rewards_profile_idx" ON "normative_profile_rewards" USING btree ("statistical_profile_id");--> statement-breakpoint
CREATE INDEX "normative_profile_rewards_owner_idx" ON "normative_profile_rewards" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "normative_profile_rewards_status_idx" ON "normative_profile_rewards" USING btree ("status");--> statement-breakpoint
CREATE INDEX "normative_profile_rewards_eligible_again_at_idx" ON "normative_profile_rewards" USING btree ("eligible_again_at");--> statement-breakpoint
CREATE UNIQUE INDEX "normative_profile_session_links_tenant_session_uidx" ON "normative_profile_session_links" USING btree ("tenant_id","assessment_session_id");--> statement-breakpoint
CREATE INDEX "normative_profile_session_links_profile_idx" ON "normative_profile_session_links" USING btree ("statistical_profile_id");--> statement-breakpoint
CREATE INDEX "normative_profile_session_links_tenant_idx" ON "normative_profile_session_links" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "normative_profiles_owner_user_uidx" ON "normative_profiles" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "normative_profiles_sex_idx" ON "normative_profiles" USING btree ("sex");--> statement-breakpoint
CREATE INDEX "normative_profiles_voivodeship_idx" ON "normative_profiles" USING btree ("voivodeship_code");--> statement-breakpoint
CREATE INDEX "normative_profiles_completed_at_idx" ON "normative_profiles" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "normative_profiles_deleted_at_idx" ON "normative_profiles" USING btree ("deleted_at");