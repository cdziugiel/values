// features/my-assessment/components/my-assessment-page.tsx

import { ArrowRight, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/shared/ui";
import { MyReportAccessList } from "@/features/report-access/components/my-report-access-list";

import { getMyAssessments } from "../api/my-assessment.queries";
import { MyAssessmentTabs } from "./my-assessment-tabs";

export async function MyAssessmentPage() {
  const assessment = await getMyAssessments();

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
          reportsSlot={<MyReportAccessList />}
        />
      </div>
    </div>
  );
}