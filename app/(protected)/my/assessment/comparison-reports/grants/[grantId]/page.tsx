// app/(protected)/my/assessment/comparison-reports/grants/[grantId]/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNull, or } from "drizzle-orm";
import { ArrowLeft, BarChart3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { reportAccessGrants } from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";
import { requireSession } from "@/server/auth/require-session";

import {
  getUserVsUserComparisonReport,
  readComparisonDefinition,
} from "@/features/comparison-reports/api/comparison-report-render.queries";

import { getReportTemplateVersionForRender } from "@/features/report-builder/api/report-render.queries";
import { renderReportDocument } from "@/features/report-builder/lib/report-template-renderer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    grantId: string;
  }>;
};

function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

function isGrantCurrentlyActive(grant: {
  status: string;
  validFrom: Date | null;
  validUntil: Date | null;
}) {
  if (grant.status !== "active") return false;

  const now = new Date();

  if (grant.validFrom && grant.validFrom > now) return false;
  if (grant.validUntil && grant.validUntil < now) return false;

  return true;
}

export default async function MyComparisonReportGrantPage({
  params,
}: PageProps) {
  const { grantId } = await params;

  if (!grantId) {
    notFound();
  }

  const session = await requireSession();
  const userId = session.user?.id;
  const email = normalizeEmail(session.user?.email);

  if (!userId || !email) {
    notFound();
  }

  const [grant] = await controlDb
    .select({
      id: reportAccessGrants.id,
      tenantSlug: reportAccessGrants.tenantSlug,
      status: reportAccessGrants.status,

      userId: reportAccessGrants.userId,
      email: reportAccessGrants.email,

      subjectType: reportAccessGrants.subjectType,
      subjectId: reportAccessGrants.subjectId,

      assessmentProjectId: reportAccessGrants.assessmentProjectId,

      reportTemplateId: reportAccessGrants.reportTemplateId,
      reportTemplateVersionId: reportAccessGrants.reportTemplateVersionId,

      validFrom: reportAccessGrants.validFrom,
      validUntil: reportAccessGrants.validUntil,

      metadata: reportAccessGrants.metadata,
    })
    .from(reportAccessGrants)
    .where(
      and(
        eq(reportAccessGrants.id, grantId),
        eq(reportAccessGrants.status, "active"),
        isNull(reportAccessGrants.deletedAt),
        or(
          eq(reportAccessGrants.userId, userId),
          eq(reportAccessGrants.email, email),
        ),
      ),
    )
    .limit(1);

  if (!grant) {
    notFound();
  }

  if (!isGrantCurrentlyActive(grant)) {
    notFound();
  }

  if (grant.subjectType !== "comparison") {
    notFound();
  }

  if (!grant.assessmentProjectId || !grant.reportTemplateVersionId) {
    notFound();
  }

  const comparisonDefinition = readComparisonDefinition(grant.metadata);

  if (!comparisonDefinition) {
    notFound();
  }

  const data = await getUserVsUserComparisonReport({
    tenantSlug: grant.tenantSlug,
    assessmentProjectId: grant.assessmentProjectId,
    reportTemplateVersionId: grant.reportTemplateVersionId,
    comparisonDefinition,
  });

  const reportTemplateVersion = await getReportTemplateVersionForRender({
    reportTemplateVersionId: grant.reportTemplateVersionId,
  });

  if (!data || !reportTemplateVersion) {
    notFound();
  }

  const backHref = "/my/assessment?tab=reports";

  if (!data.eligibility.canRender) {
    return (
      <main className="min-h-screen bg-[#f3f4f6] p-6">
        <section className="mx-auto max-w-4xl rounded-[2rem] border border-amber-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={backHref}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Wróć
              </Link>
            </Button>

            <Badge
              variant="outline"
              className="rounded-full border-amber-200 bg-amber-50 text-amber-700"
            >
              {data.eligibility.status}
            </Badge>
          </div>

          <h1 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
            Nie można wygenerować raportu porównawczego
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#6b7280]">
            Raport nie spełnia warunków renderowania. Sprawdź, czy oba wyniki
            są nadal dostępne i dotyczą tego samego kwestionariusza.
          </p>
        </section>
      </main>
    );
  }

  const rendered = renderReportDocument({
    reportTemplateVersion,
    payload: data.payload,
  });

  return (
    <main className="min-h-screen bg-[#f3f4f6]">
      <div className="sticky top-0 z-10 border-b border-black/10 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
              <BarChart3 className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]">
                HUMANET VALUES
              </div>

              <h1 className="truncate text-base font-semibold tracking-[-0.02em] text-[#171717]">
                Raport porównawczy
              </h1>
            </div>
          </div>

          <Button asChild variant="outline" size="sm">
            <Link href={backHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Wróć do raportów
            </Link>
          </Button>
        </div>
      </div>

      <iframe
        title="Raport porównawczy"
        srcDoc={rendered.html}
        className="h-[calc(100vh-65px)] w-full border-0 bg-white"
      />
    </main>
  );
}