
// app/(protected)/my/reports/composite/grants/[grantId]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";

import { reportAccessGrants } from "@/drizzle/schema";
import { eq, isNull, and } from "drizzle-orm";
import { controlDb } from "@/server/db/control-db";
import { requireSession } from "@/server/auth/require-session";

import { getMyPersonalCompositeReportByGrantForCurrentUser } from "@/features/report-access/api/my-composite-report.queries";
import { getReportTemplateVersionForRender } from "@/features/report-builder/api/report-render.queries";
import { renderReportDocument } from "@/features/report-builder/lib/report-template-renderer";
import { ReportDocumentPreviewFrame } from "@/features/report-builder/components/report-document-preview-frame";

import type { FrozenCompositeSelection } from "@/features/assessment-results/types/personal-composite-selection.types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    grantId: string;
  }>;
  searchParams: Promise<{
    tenant?: string;
  }>;
};



export default async function Page({ params, searchParams }: PageProps) {
  const { grantId } = await params;
  const { tenant } = await searchParams;

  if (!tenant) {
    notFound();
  }
console.log("MY_COMPOSITE_GRANT_REPORT_ROUTE_HIT", {
  grantId,
  tenant,
});
  const authSession = await requireSession();

  const [grant] = await controlDb
    .select()
    .from(reportAccessGrants)
    .where(
      and(
        eq(reportAccessGrants.id, grantId),
        eq(reportAccessGrants.tenantSlug, tenant),
        eq(reportAccessGrants.subjectType, "respondent"),
        eq(reportAccessGrants.userId, authSession.user.id),
        eq(reportAccessGrants.status, "active"),
        isNull(reportAccessGrants.deletedAt),
      ),
    )
    .limit(1);

if (!grant) {
  console.log("MY_COMPOSITE_GRANT_REPORT_NOT_FOUND", {
    reason: "grant_not_found_or_not_owned_by_user",
    grantId,
    tenant,
    userId: authSession.user.id,
  });

  notFound();
}

if (!grant.subjectId) {
  console.log("MY_COMPOSITE_GRANT_REPORT_NOT_FOUND", {
    reason: "missing_subject_id",
    grantId,
    tenant,
    grant,
  });

  notFound();
}

if (!grant.reportTemplateVersionId) {
  console.log("MY_COMPOSITE_GRANT_REPORT_NOT_FOUND", {
    reason: "missing_report_template_version_id",
    grantId,
    tenant,
    grant,
  });

  notFound();
}

const [data, reportTemplateVersion] = await Promise.all([
  getMyPersonalCompositeReportByGrantForCurrentUser({
    tenantSlug: tenant,
    grantId,
  }),
  getReportTemplateVersionForRender({
    reportTemplateVersionId: grant.reportTemplateVersionId,
  }),
]);

console.log("MY_COMPOSITE_GRANT_REPORT_DATA_QUERY", {
  grantId,
  tenant,
  hasData: Boolean(data),
  hasReportTemplateVersion: Boolean(reportTemplateVersion),
  canRender: data?.eligibility?.canRender ?? null,
  eligibilityStatus: data?.eligibility?.status ?? null,
  reportTemplateVersionId: grant.reportTemplateVersionId,
});

if (!data) {
  console.log("MY_COMPOSITE_GRANT_REPORT_NOT_FOUND", {
    reason: "user_safe_composite_data_null",
    grantId,
    tenant,
  });

  notFound();
}

if (!reportTemplateVersion) {
  console.log("MY_COMPOSITE_GRANT_REPORT_NOT_FOUND", {
    reason: "report_template_version_for_render_null",
    grantId,
    tenant,
    reportTemplateVersionId: grant.reportTemplateVersionId,
  });

  notFound();
}

if (!data.eligibility.canRender) {
  console.log("MY_COMPOSITE_GRANT_REPORT_NOT_FOUND", {
    reason: "composite_cannot_render",
    grantId,
    tenant,
    eligibility: data.eligibility,
  });

  notFound();
}

  if (!data || !reportTemplateVersion || !data.eligibility.canRender) {
    notFound();
  }

  const rendered = renderReportDocument({
    reportTemplateVersion,
    payload: data.payload,
  });

  console.log("data.payload",data.payload.composite.dimensionScores)

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm text-muted-foreground">
            HUMANET VALUES · Raport złożony
          </div>

          <h1 className="mt-1 text-3xl font-semibold">
            {reportTemplateVersion.name}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Tryb źródeł: {data.payload?.composite?.selection?.mode} · źródła:{" "}
            {data.payload?.composite?.availableSourceCount ?? 0}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
            <a
                href={`/my/reports/composite/grants/${grantId}/pdf?tenant=${encodeURIComponent(
                tenant,
                )}`}
                target="_blank"
                rel="noreferrer"
            >
                Pobierz PDF
            </a>
            </Button>

          <Link
            href="/my/assessment"
            className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
          >
            Wróć do moich badań
          </Link>
        </div>
      </div>

      <ReportDocumentPreviewFrame html={rendered.html} />
    </main>
  );
}