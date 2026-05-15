import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/shared/ui";

import { getReportTemplateListData } from "../api/report-template-admin.queries";

function statusLabel(status: string) {
  if (status === "active") return "Aktywny";
  if (status === "draft") return "Roboczy";
  if (status === "archived") return "Archiwalny";

  return status;
}

export async function ReportTemplateAdminListPage() {
  const templates = await getReportTemplateListData();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Template’y raportów"
        description="Zarządzaj template’ami raportów, ich wersjami oraz konfiguracją globalną."
        actions={
          <Button asChild>
            <Link href="/dashboard/report-templates/new">
              Utwórz template raportu
            </Link>
          </Button>
        }
      />

      {templates.length === 0 ? (
        <EmptyState
          title="Brak template’ów raportów"
          description="Utwórz pierwszy template raportu, aby móc później przypiąć go do wersji kwestionariusza."
        />
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <section
              key={template.reportTemplateId}
              className="rounded-2xl border bg-card p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">
                      {template.name}
                    </h2>

                    <Badge variant="secondary">
                      {statusLabel(template.status)}
                    </Badge>
                  </div>

                  <div className="mt-1 text-sm text-muted-foreground">
                    {template.code}
                  </div>

                  {template.description ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {template.description}
                    </p>
                  ) : null}

                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                    <div className="rounded-xl border bg-muted/20 p-3">
                      <div className="text-xs uppercase text-muted-foreground">
                        Kwestionariusz
                      </div>
                      <div className="mt-1 font-medium">
                        {template.questionnaireName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {template.questionnaireCode}
                      </div>
                    </div>

                    <div className="rounded-xl border bg-muted/20 p-3">
                      <div className="text-xs uppercase text-muted-foreground">
                        Wersje
                      </div>
                      <div className="mt-1 font-medium">
                        {template.versionsCount}
                      </div>
                    </div>

                    <div className="rounded-xl border bg-muted/20 p-3">
                      <div className="text-xs uppercase text-muted-foreground">
                        Aktywne
                      </div>
                      <div className="mt-1 font-medium">
                        {template.activeVersionsCount}
                      </div>
                    </div>

                    <div className="rounded-xl border bg-muted/20 p-3">
                      <div className="text-xs uppercase text-muted-foreground">
                        Robocze
                      </div>
                      <div className="mt-1 font-medium">
                        {template.draftVersionsCount}
                      </div>
                    </div>
                  </div>
                </div>

                <Button asChild variant="outline">
                  <Link
                    href={`/dashboard/report-templates/${template.reportTemplateId}`}
                  >
                    Otwórz
                  </Link>
                </Button>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}