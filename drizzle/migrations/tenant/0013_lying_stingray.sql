CREATE TABLE "client_unit_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_unit_id" uuid NOT NULL,
	"respondent_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"is_leader" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp,
	"ends_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "client_unit_memberships" ADD CONSTRAINT "client_unit_memberships_client_unit_id_client_units_id_fk" FOREIGN KEY ("client_unit_id") REFERENCES "public"."client_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_unit_memberships" ADD CONSTRAINT "client_unit_memberships_respondent_id_respondents_id_fk" FOREIGN KEY ("respondent_id") REFERENCES "public"."respondents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_unit_memberships_client_unit_id_idx" ON "client_unit_memberships" USING btree ("client_unit_id");--> statement-breakpoint
CREATE INDEX "client_unit_memberships_respondent_id_idx" ON "client_unit_memberships" USING btree ("respondent_id");--> statement-breakpoint
CREATE INDEX "client_unit_memberships_role_idx" ON "client_unit_memberships" USING btree ("role");--> statement-breakpoint
CREATE INDEX "client_unit_memberships_is_leader_idx" ON "client_unit_memberships" USING btree ("is_leader");--> statement-breakpoint
CREATE INDEX "client_unit_memberships_deleted_at_idx" ON "client_unit_memberships" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "client_unit_memberships_created_at_idx" ON "client_unit_memberships" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "client_unit_memberships_unit_respondent_active_uidx" ON "client_unit_memberships" USING btree ("client_unit_id","respondent_id") WHERE "client_unit_memberships"."deleted_at" is null;