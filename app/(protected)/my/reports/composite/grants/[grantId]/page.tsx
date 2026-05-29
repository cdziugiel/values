import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";

import { reportAccessGrants } from "@/drizzle/schema";
import { eq, isNull, and } from "drizzle-orm";
import { controlDb } from "@/server/db/control-db";
import { requireSession } from "@/server/auth/require-session";

import { getPersonalCompositeReport } from "@/features/assessment-results/api/personal-composite-report.queries";
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

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function readFrozenSelection(metadata: unknown): FrozenCompositeSelection | null {
  const record = asRecord(metadata);
  const selection = record.compositeSelection;

  if (!selection || typeof selection !== "object" || Array.isArray(selection)) {
    return null;
  }

  return selection as FrozenCompositeSelection;
}

export default async function Page({ params, searchParams }: PageProps) {
  const { grantId } = await params;
  const { tenant } = await searchParams;

  if (!tenant) {
    notFound();
  }

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

  if (!grant || !grant.subjectId || !grant.reportTemplateVersionId) {
    notFound();
  }

  const frozenSelection = readFrozenSelection(grant.metadata);

  if (!frozenSelection) {
    notFound();
  }

  const [data, reportTemplateVersion] = await Promise.all([
    getPersonalCompositeReport({
      tenantSlug: tenant,
      respondentId: grant.subjectId,
      reportTemplateVersionId: grant.reportTemplateVersionId,
      frozenSelection,
      previewMode: false,
    }),
    getReportTemplateVersionForRender({
      reportTemplateVersionId: grant.reportTemplateVersionId,
    }),
  ]);

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