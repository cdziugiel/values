// app/(protected)/my/assessment/compare/page.tsx

import { MyComparisonReportPage } from "@/features/comparison-reports/components/my-comparison-report-page";
import { listMyCompletedComparisonQuestionnaires } from "@/features/comparison-reports/api/my-comparison-session.queries";

export default async function MyAssessmentComparePage() {
  const questionnaires = await listMyCompletedComparisonQuestionnaires();

  return <MyComparisonReportPage questionnaires={questionnaires} />;
}