// app/(protected)/dashboard/report-templates/new/page.tsx

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/shared/ui";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";

import { getReportTemplateCreateData } from "@/features/report-builder/api/report-template-admin.queries";
import { ReportTemplateCreateForm } from "@/features/report-builder/components/report-template-create-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewReportTemplatePage() {
  await requireSuperAdmin();

  const data = await getReportTemplateCreateData();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Nowy template raportu"
        description="Utwórz template raportu przypisany do kwestionariusza."
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/report-templates">
              Wróć do template’ów
            </Link>
          </Button>
        }
      />

      <ReportTemplateCreateForm questionnaires={data.questionnaires} />
    </div>
  );
}