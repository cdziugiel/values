ALTER TABLE "normative_profiles" ADD COLUMN "excluded_from_norms" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "normative_profiles" ADD COLUMN "normative_exclusion_reason" text;--> statement-breakpoint
ALTER TABLE "normative_profiles" ADD COLUMN "normative_excluded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "normative_profiles" ADD COLUMN "normative_excluded_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "normative_profiles" ADD CONSTRAINT "normative_profiles_normative_excluded_by_user_id_users_id_fk" FOREIGN KEY ("normative_excluded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "normative_profiles_excluded_from_norms_idx" ON "normative_profiles" USING btree ("excluded_from_norms");