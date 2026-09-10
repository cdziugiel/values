ALTER TABLE "normative_profiles" ALTER COLUMN "schema_version" SET DEFAULT '1.2';--> statement-breakpoint
ALTER TABLE "normative_profiles" ALTER COLUMN "dictionary_version" SET DEFAULT '2026-09-10';--> statement-breakpoint
ALTER TABLE "normative_profiles" ADD COLUMN "work_situation" text;--> statement-breakpoint
CREATE INDEX "normative_profiles_work_situation_idx" ON "normative_profiles" USING btree ("work_situation");