// features/my-assessment/components/my-assessment-page.tsx

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/shared/ui";
import { MyReportAccessList } from "@/features/report-access/components/my-report-access-list";
import { MyReportPurchaseOpportunities } from "@/features/report-access/components/my-report-purchase-opportunities";
import { MyReportTabs } from "@/features/report-access/components/my-report-tabs";

import { getMyAssessments } from "../api/my-assessment.queries";
import {
  MyAssessmentTabs,
  type MyAssessmentTabKey,
} from "./my-assessment-tabs";

type MyAssessmentPageProps = {
  activeTab?: MyAssessmentTabKey;
};


function collectAssessmentTenantSlugs(
  questionnaires: Array<{
    tenantSlug?: string | null;
  }>,
) {
  return Array.from(
    new Set(
      questionnaires
        .map((questionnaire) => questionnaire.tenantSlug?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

export async function MyAssessmentPage({ activeTab }: MyAssessmentPageProps) {
  const assessment = await getMyAssessments();
  const reportTenantSlugs = collectAssessmentTenantSlugs([
    ...assessment.publicQuestionnaires,
    ...assessment.invitedQuestionnaires,
  ]);
  console.log("MY_ASSESSMENT_REPORT_TENANTS", {
  reportTenantSlugs,
  public: assessment.publicQuestionnaires.map((item) => ({
    name: item.name,
    tenantSlug: item.tenantSlug,
  })),
  invited: assessment.invitedQuestionnaires.map((item) => ({
    name: item.name,
    tenantSlug: item.tenantSlug,
  })),
});
  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <PageHeader
          title="Moje badania"
          description="Wypełniaj badania, wracaj do rozpoczętych sesji i sprawdzaj dostępne raporty."
          actions={
            <Badge className="rounded-full hv-brand-accent-pill">
              HUMANET VALUES
            </Badge>
          }
        />

<MyAssessmentTabs
  publicQuestionnaires={assessment.publicQuestionnaires}
  invitedQuestionnaires={assessment.invitedQuestionnaires}
  initialActiveTab={activeTab}
  reportsSlot={
    <MyReportTabs
      key="my-assessment-reports-tabs"
purchaseSlot={
  <MyReportPurchaseOpportunities
    key="my-report-purchase-opportunities"
    tenantSlugs={reportTenantSlugs}
  />
}
      ownedSlot={<MyReportAccessList key="my-report-access-list" />}
    />
  }
/>
      </div>
    </div>
  );
}