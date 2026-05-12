CREATE TYPE "public"."assessment_project_status" AS ENUM('draft', 'active', 'closed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."client_organization_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."client_unit_type" AS ENUM('organization', 'division', 'department', 'team', 'other');--> statement-breakpoint
CREATE TABLE "assessment_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_organization_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"status" "assessment_project_status" DEFAULT 'draft' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "client_organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"industry" text,
	"size" text,
	"status" "client_organization_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "client_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_organization_id" uuid NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"type" "client_unit_type" DEFAULT 'department' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "respondent_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"respondent_id" uuid NOT NULL,
	"email" text,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "respondents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_code" text,
	"client_organization_id" uuid,
	"client_unit_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tenant_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"actor_role" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"before" jsonb,
	"after" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessment_projects" ADD CONSTRAINT "assessment_projects_client_organization_id_client_organizations_id_fk" FOREIGN KEY ("client_organization_id") REFERENCES "public"."client_organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_units" ADD CONSTRAINT "client_units_client_organization_id_client_organizations_id_fk" FOREIGN KEY ("client_organization_id") REFERENCES "public"."client_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respondent_identities" ADD CONSTRAINT "respondent_identities_respondent_id_respondents_id_fk" FOREIGN KEY ("respondent_id") REFERENCES "public"."respondents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respondents" ADD CONSTRAINT "respondents_client_organization_id_client_organizations_id_fk" FOREIGN KEY ("client_organization_id") REFERENCES "public"."client_organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respondents" ADD CONSTRAINT "respondents_client_unit_id_client_units_id_fk" FOREIGN KEY ("client_unit_id") REFERENCES "public"."client_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_projects_client_organization_id_idx" ON "assessment_projects" USING btree ("client_organization_id");--> statement-breakpoint
CREATE INDEX "assessment_projects_status_idx" ON "assessment_projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assessment_projects_starts_at_idx" ON "assessment_projects" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "assessment_projects_ends_at_idx" ON "assessment_projects" USING btree ("ends_at");--> statement-breakpoint
CREATE INDEX "assessment_projects_deleted_at_idx" ON "assessment_projects" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "assessment_projects_created_at_idx" ON "assessment_projects" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "client_organizations_status_idx" ON "client_organizations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "client_organizations_deleted_at_idx" ON "client_organizations" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "client_organizations_created_at_idx" ON "client_organizations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "client_units_client_organization_id_idx" ON "client_units" USING btree ("client_organization_id");--> statement-breakpoint
CREATE INDEX "client_units_parent_id_idx" ON "client_units" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "client_units_type_idx" ON "client_units" USING btree ("type");--> statement-breakpoint
CREATE INDEX "client_units_deleted_at_idx" ON "client_units" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "respondent_identities_respondent_id_unique" ON "respondent_identities" USING btree ("respondent_id");--> statement-breakpoint
CREATE INDEX "respondent_identities_email_idx" ON "respondent_identities" USING btree ("email");--> statement-breakpoint
CREATE INDEX "respondent_identities_deleted_at_idx" ON "respondent_identities" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "respondents_external_code_idx" ON "respondents" USING btree ("external_code");--> statement-breakpoint
CREATE INDEX "respondents_client_organization_id_idx" ON "respondents" USING btree ("client_organization_id");--> statement-breakpoint
CREATE INDEX "respondents_client_unit_id_idx" ON "respondents" USING btree ("client_unit_id");--> statement-breakpoint
CREATE INDEX "respondents_deleted_at_idx" ON "respondents" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "respondents_created_at_idx" ON "respondents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tenant_audit_log_actor_user_id_idx" ON "tenant_audit_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "tenant_audit_log_action_idx" ON "tenant_audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "tenant_audit_log_entity_idx" ON "tenant_audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "tenant_audit_log_created_at_idx" ON "tenant_audit_log" USING btree ("created_at");