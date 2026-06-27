CREATE TYPE "public"."normative_profile_reward_status" AS ENUM('pending', 'issued', 'redeemed', 'expired', 'revoked');--> statement-breakpoint
CREATE TABLE "respondent_statistical_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"respondent_id" uuid NOT NULL,
	"assessment_session_id" uuid NOT NULL,
	"assessment_project_id" uuid NOT NULL,
	"project_respondent_id" uuid NOT NULL,
	"schema_version" text DEFAULT '1.0' NOT NULL,
	"dictionary_version" text DEFAULT '2026-01' NOT NULL,
	"date_of_birth" date,
	"birth_year" integer,
	"age_at_assessment" integer NOT NULL,
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
	"recruitment_channel" text,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "normative_data_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"respondent_id" uuid NOT NULL,
	"assessment_session_id" uuid NOT NULL,
	"statistical_profile_id" uuid,
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
	"respondent_id" uuid NOT NULL,
	"assessment_session_id" uuid NOT NULL,
	"reward_type" text DEFAULT 'discount_code' NOT NULL,
	"status" "normative_profile_reward_status" DEFAULT 'pending' NOT NULL,
	"discount_code_id" uuid,
	"discount_code_preview" text,
	"issued_at" timestamp with time zone,
	"redeemed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "respondent_statistical_profiles" ADD CONSTRAINT "respondent_statistical_profiles_respondent_id_respondents_id_fk" FOREIGN KEY ("respondent_id") REFERENCES "public"."respondents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respondent_statistical_profiles" ADD CONSTRAINT "respondent_statistical_profiles_assessment_session_id_assessment_sessions_id_fk" FOREIGN KEY ("assessment_session_id") REFERENCES "public"."assessment_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respondent_statistical_profiles" ADD CONSTRAINT "respondent_statistical_profiles_assessment_project_id_assessment_projects_id_fk" FOREIGN KEY ("assessment_project_id") REFERENCES "public"."assessment_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respondent_statistical_profiles" ADD CONSTRAINT "respondent_statistical_profiles_project_respondent_id_assessment_project_respondents_id_fk" FOREIGN KEY ("project_respondent_id") REFERENCES "public"."assessment_project_respondents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normative_data_consents" ADD CONSTRAINT "normative_data_consents_respondent_id_respondents_id_fk" FOREIGN KEY ("respondent_id") REFERENCES "public"."respondents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normative_data_consents" ADD CONSTRAINT "normative_data_consents_assessment_session_id_assessment_sessions_id_fk" FOREIGN KEY ("assessment_session_id") REFERENCES "public"."assessment_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normative_data_consents" ADD CONSTRAINT "normative_data_consents_statistical_profile_id_respondent_statistical_profiles_id_fk" FOREIGN KEY ("statistical_profile_id") REFERENCES "public"."respondent_statistical_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normative_profile_rewards" ADD CONSTRAINT "normative_profile_rewards_statistical_profile_id_respondent_statistical_profiles_id_fk" FOREIGN KEY ("statistical_profile_id") REFERENCES "public"."respondent_statistical_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normative_profile_rewards" ADD CONSTRAINT "normative_profile_rewards_respondent_id_respondents_id_fk" FOREIGN KEY ("respondent_id") REFERENCES "public"."respondents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normative_profile_rewards" ADD CONSTRAINT "normative_profile_rewards_assessment_session_id_assessment_sessions_id_fk" FOREIGN KEY ("assessment_session_id") REFERENCES "public"."assessment_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "respondent_statistical_profiles_session_uidx" ON "respondent_statistical_profiles" USING btree ("assessment_session_id");--> statement-breakpoint
CREATE INDEX "respondent_statistical_profiles_respondent_id_idx" ON "respondent_statistical_profiles" USING btree ("respondent_id");--> statement-breakpoint
CREATE INDEX "respondent_statistical_profiles_project_id_idx" ON "respondent_statistical_profiles" USING btree ("assessment_project_id");--> statement-breakpoint
CREATE INDEX "respondent_statistical_profiles_project_respondent_id_idx" ON "respondent_statistical_profiles" USING btree ("project_respondent_id");--> statement-breakpoint
CREATE INDEX "respondent_statistical_profiles_age_idx" ON "respondent_statistical_profiles" USING btree ("age_at_assessment");--> statement-breakpoint
CREATE INDEX "respondent_statistical_profiles_sex_idx" ON "respondent_statistical_profiles" USING btree ("sex");--> statement-breakpoint
CREATE INDEX "respondent_statistical_profiles_voivodeship_idx" ON "respondent_statistical_profiles" USING btree ("voivodeship_code");--> statement-breakpoint
CREATE INDEX "respondent_statistical_profiles_completed_at_idx" ON "respondent_statistical_profiles" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "respondent_statistical_profiles_deleted_at_idx" ON "respondent_statistical_profiles" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "normative_data_consents_session_type_uidx" ON "normative_data_consents" USING btree ("assessment_session_id","consent_type");--> statement-breakpoint
CREATE INDEX "normative_data_consents_respondent_id_idx" ON "normative_data_consents" USING btree ("respondent_id");--> statement-breakpoint
CREATE INDEX "normative_data_consents_profile_id_idx" ON "normative_data_consents" USING btree ("statistical_profile_id");--> statement-breakpoint
CREATE INDEX "normative_data_consents_accepted_at_idx" ON "normative_data_consents" USING btree ("accepted_at");--> statement-breakpoint
CREATE INDEX "normative_data_consents_withdrawn_at_idx" ON "normative_data_consents" USING btree ("withdrawn_at");--> statement-breakpoint
CREATE UNIQUE INDEX "normative_profile_rewards_profile_type_uidx" ON "normative_profile_rewards" USING btree ("statistical_profile_id","reward_type");--> statement-breakpoint
CREATE INDEX "normative_profile_rewards_respondent_id_idx" ON "normative_profile_rewards" USING btree ("respondent_id");--> statement-breakpoint
CREATE INDEX "normative_profile_rewards_session_id_idx" ON "normative_profile_rewards" USING btree ("assessment_session_id");--> statement-breakpoint
CREATE INDEX "normative_profile_rewards_discount_code_id_idx" ON "normative_profile_rewards" USING btree ("discount_code_id");--> statement-breakpoint
CREATE INDEX "normative_profile_rewards_status_idx" ON "normative_profile_rewards" USING btree ("status");