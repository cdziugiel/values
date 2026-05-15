import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/shared/ui";

import { getReportTemplateDetailsData } from "../api/report-template-admin.queries";
import { ReportTemplateVersionCreateForm } from "./report-template-version-create-form";
import { ReportTemplateEditForm } from "./report-template-edit-form";
import { ReportTemplateArchiveButton } from "./report-template-archive-button";

function statusLabel(status: string) {
    if (status === "active") return "Aktywny";
    if (status === "draft") return "Roboczy";
    if (status === "archived") return "Archiwalny";

    return status;
}

export async function ReportTemplateDetailsPage({
    reportTemplateId,
}: {
    reportTemplateId: string;
}) {
    const data = await getReportTemplateDetailsData(reportTemplateId);

    if (!data) {
        return (
            <div className="space-y-6">
                <PageHeader
                    title="Nie znaleziono template’u"
                    description="Template raportu nie istnieje albo został zarchiwizowany."
                />

                <Button asChild variant="outline">
                    <Link href="/dashboard/report-templates">Wróć</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <PageHeader
                title={data.template.name}
                description={`Template raportu dla kwestionariusza: ${data.template.questionnaireName}.`}
                actions={
                    <Button asChild variant="outline">
                        <Link href="/dashboard/report-templates">
                            Wróć do template’ów
                        </Link>
                    </Button>
                }
            />

            <section className="rounded-2xl border bg-card p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-semibold">Ustawienia template’u</h2>
                            <Badge variant="secondary">
                                {statusLabel(data.template.status)}
                            </Badge>
                        </div>

                        <p className="mt-1 text-sm text-muted-foreground">
                            {data.template.code}
                        </p>
                    </div>

                    <ReportTemplateArchiveButton
                        reportTemplateId={data.template.id}
                        templateName={data.template.name}
                    />
                </div>

                <div className="mt-5">
                    <ReportTemplateEditForm template={data.template} />
                </div>
            </section>

            <ReportTemplateVersionCreateForm
                reportTemplateId={data.template.id}
                questionnaireVersions={data.availableQuestionnaireVersions}
            />

            <section className="space-y-4">
                <div>
                    <h2 className="text-xl font-semibold">Wersje template’u</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Każda wersja template’u raportu jest powiązana z konkretną wersją
                        kwestionariusza.
                    </p>
                </div>

                {data.versions.length === 0 ? (
                    <EmptyState
                        title="Brak wersji template’u"
                        description="Utwórz pierwszą wersję raportu, aby można było przypiąć ją do wersji kwestionariusza."
                    />
                ) : (
                    <div className="grid gap-4">
                        {data.versions.map((version) => (
                            <section
                                key={version.id}
                                className="rounded-2xl border bg-card p-5"
                            >
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-lg font-semibold">{version.name}</h3>

                                            <Badge variant="secondary">
                                                {statusLabel(version.status)}
                                            </Badge>

                                            {version.isDefault ? <Badge>Domyślna</Badge> : null}
                                        </div>

                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {version.version} · {version.pageSize} ·{" "}
                                            {version.orientation === "portrait" ? "pionowo" : "poziomo"}
                                        </p>

                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Kwestionariusz: {version.questionnaireVersionName} (
                                            {version.questionnaireVersion})
                                        </p>

                                        {version.description ? (
                                            <p className="mt-3 text-sm text-muted-foreground">
                                                {version.description}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Button asChild variant="outline">
                                            <Link
                                                href={`/dashboard/report-templates/${data.template.id}/versions/${version.id}`}
                                            >
                                                Ustawienia
                                            </Link>
                                        </Button>

                                        <Button asChild>
                                            <Link href={`/dashboard/report-builder/${version.id}`}>
                                                Builder
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}