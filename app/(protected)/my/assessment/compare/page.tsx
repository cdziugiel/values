// app/(protected)/my/assessment/compare/page.tsx

import { MyComparisonCenterPage } from "@/features/comparison-reports/components/my-comparison-center-page";
import { listMyCompletedComparisonQuestionnaires } from "@/features/comparison-reports/api/my-comparison-session.queries";
import { getMyComparisonCenterData } from "@/features/comparison-reports/api/my-comparison-center.queries";
import { listMyComparisonShares } from "@/features/comparison-reports/api/my-comparison-tokens.queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams: Promise<{
    tenant?: string;
    product?: string;
    reportTemplateVersionId?: string;
    showRevokedTokens?: string;
    ownSessionId?: string;
    accessId?: string;
  }>;
};

export default async function MyAssessmentComparePage({
  searchParams,
}: PageProps) {
  const { tenant, product, reportTemplateVersionId, ownSessionId,
  showRevokedTokens,accessId } =
    await searchParams;


const includeInactiveTokens = showRevokedTokens === "1";

  const tenantSlug = tenant ?? "humanet";

const [questionnaires, centerData, comparisonShares] = await Promise.all([
  listMyCompletedComparisonQuestionnaires({}),
  getMyComparisonCenterData({
    tenantSlug,
    productId: product ?? null,
    reportTemplateVersionId: reportTemplateVersionId ?? null,
  }),
  listMyComparisonShares({
    tenantSlug,
    includeInactive: includeInactiveTokens,
  }),
]);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
      <MyComparisonCenterPage
        tenantSlug={tenantSlug}
        questionnaires={questionnaires}
        centerData={centerData}
        comparisonShares={comparisonShares}
        includeInactiveTokens={includeInactiveTokens}
        productId={product ?? centerData.defaultProductId}
        activeAccessId={accessId ?? null}
        reportTemplateVersionId={
          reportTemplateVersionId ?? centerData.defaultReportTemplateVersionId
        }
        initialOwnSessionId={ownSessionId ?? null}
      />
    </main>
  );
}