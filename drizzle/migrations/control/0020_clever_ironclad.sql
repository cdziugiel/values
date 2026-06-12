DROP INDEX "rag_one_active_grant_per_session_report_scope_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "rag_one_active_grant_per_session_report_scope_idx" ON "report_access_grants" USING btree ("tenant_slug","assessment_session_id","report_template_id",COALESCE(metadata->>'projectQuestionnaireId', ''),COALESCE(metadata->>'questionnaireVersionId', '')) WHERE 
      deleted_at is null
      and status = 'active'
      and assessment_session_id is not null
      and report_template_id is not null
    ;