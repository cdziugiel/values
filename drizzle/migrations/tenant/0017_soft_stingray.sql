ALTER TABLE "respondent_statistical_profiles" ALTER COLUMN "date_of_birth" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "respondent_statistical_profiles" ALTER COLUMN "birth_year" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "respondent_statistical_profiles" ALTER COLUMN "recruitment_channel" SET DEFAULT 'discount_incentive';--> statement-breakpoint
ALTER TABLE "respondent_statistical_profiles" ALTER COLUMN "recruitment_channel" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "normative_data_consents" ALTER COLUMN "statistical_profile_id" SET NOT NULL;