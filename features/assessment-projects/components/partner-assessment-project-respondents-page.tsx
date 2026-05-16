import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getPartnerAssessmentProjectRespondents } from "../api/partner-assessment-project.queries";
import { GrantReportAccessToSessionForm } from "./grant-report-access-to-session-form";
import { ReportAccessPoolSummary } from "./report-access-pool-summary";
import { BulkGrantReportAccessDialog } from "./bulk-grant-report-access-dialog";
import { GenerateReportAccessPoolDialog } from "./generate-report-access-pool-dialog";


type PartnerAssessmentProjectRespondentsPageProps = {
    tenantSlug: string;
    projectId: string;
};

function formatDateTime(value: unknown) {
    if (!value) return "—";

    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("pl-PL", {
        timeZone: "Europe/Warsaw",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function getSessionStatusLabel(status: string | null) {
    switch (status) {
        case "not_started":
            return "Nierozpoczęta";
        case "in_progress":
            return "W trakcie";
        case "completed":
            return "Zakończona";
        case "cancelled":
            return "Anulowana";
        default:
            return status ?? "—";
    }
}

function getGrantSourceLabel(source: string) {
    switch (source) {
        case "purchase":
            return "Zakup";
        case "placeholder_payment":
            return "Płatność testowa";
        case "access_code":
            return "Kod dostępu";
        case "invitation":
            return "Zaproszenie";
        case "admin_grant":
            return "Nadanie admina";
        default:
            return source;
    }
}

function getStatusBadgeClass(status: string | null) {
    if (status === "completed") {
        return "border-green-200 bg-green-50 text-green-800";
    }

    if (status === "in_progress") {
        return "border-blue-200 bg-blue-50 text-blue-800";
    }

    if (status === "cancelled") {
        return "border-muted bg-muted text-muted-foreground";
    }

    return "border-amber-200 bg-amber-50 text-amber-800";
}

export async function PartnerAssessmentProjectRespondentsPage({
    tenantSlug,
    projectId,
}: PartnerAssessmentProjectRespondentsPageProps) {
    const data = await getPartnerAssessmentProjectRespondents({
        tenantSlug,
        projectId,
    });

    if (!data) {
        return (
            <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
                <section className="rounded-2xl border bg-card p-8">
                    <div className="text-sm font-medium text-muted-foreground">
                        HUMANET VALUES · Partner
                    </div>

                    <h1 className="mt-4 text-3xl font-semibold">
                        Nie znaleziono projektu
                    </h1>

                    <p className="mt-4 text-muted-foreground">
                        Projekt nie istnieje, został usunięty albo nie masz do niego dostępu.
                    </p>

                    <Button asChild variant="outline" className="mt-6">
                        <Link href="/dashboard">Wróć do panelu</Link>
                    </Button>
                </section>
            </main>
        );
    }

    const completedCount = data.sessions.filter(
        (session) => session.sessionStatus === "completed",
    ).length;

    const inProgressCount = data.sessions.filter(
        (session) => session.sessionStatus === "in_progress",
    ).length;

    const unlockedReportCount = data.sessions.filter((session) =>
        session.grants.some((grant: any) => grant.isCurrentlyActive),
    ).length;

    return (
        <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
            <section className="rounded-2xl border bg-card p-6 md:p-8">
                <div className="text-sm font-medium text-muted-foreground">
                    HUMANET VALUES · Partner
                </div>

                <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold">{data.project.name}</h1>

                        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                            Tenant: {data.tenant.name} ({data.tenant.slug})
                        </p>

                        {data.project.description ? (
                            <p className="mt-3 max-w-3xl text-muted-foreground">
                                {data.project.description}
                            </p>
                        ) : null}
                    </div>

                    <Button asChild variant="outline">
                        <Link href="/dashboard">Wróć do panelu</Link>
                    </Button>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-4">
                    <div className="rounded-xl border bg-muted/20 p-4">
                        <div className="text-xs uppercase text-muted-foreground">
                            Sesje
                        </div>
                        <div className="mt-1 text-3xl font-semibold">
                            {data.sessions.length}
                        </div>
                    </div>

                    <div className="rounded-xl border bg-muted/20 p-4">
                        <div className="text-xs uppercase text-muted-foreground">
                            W trakcie
                        </div>
                        <div className="mt-1 text-3xl font-semibold">
                            {inProgressCount}
                        </div>
                    </div>

                    <div className="rounded-xl border bg-muted/20 p-4">
                        <div className="text-xs uppercase text-muted-foreground">
                            Zakończone
                        </div>
                        <div className="mt-1 text-3xl font-semibold">
                            {completedCount}
                        </div>
                    </div>

                    <div className="rounded-xl border bg-muted/20 p-4">
                        <div className="text-xs uppercase text-muted-foreground">
                            Raporty odblokowane
                        </div>
                        <div className="mt-1 text-3xl font-semibold">
                            {unlockedReportCount}
                        </div>
                    </div>
                </div>
            </section>
            <div className="mt-8 space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold">Dostępy raportowe</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Pula dostępów, z której partner/admin może nadawać raporty respondentom.
                        </p>
                    </div>

                    <GenerateReportAccessPoolDialog
                        tenantSlug={tenantSlug}
                        projectId={projectId}
                        products={data.reportAccessProducts}
                        billingProfile={data.billingProfile}
                    />
                </div>

                <ReportAccessPoolSummary products={data.reportAccessProducts} />
            </div>

            <section className="mt-8 space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold">Respondenci i sesje</h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Lista sesji w projekcie wraz ze statusem odpowiedzi, snapshotem
                            wyniku i dostępem do raportu.
                        </p>
                    </div>

                    <BulkGrantReportAccessDialog
                        tenantSlug={tenantSlug}
                        projectId={projectId}
                        products={data.reportAccessProducts}
                        sessions={data.sessions}
                    />
                </div>

                {data.sessions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                        Ten projekt nie ma jeszcze sesji respondentów.
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border bg-card">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                                <thead className="bg-muted/40">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium">
                                            Respondent
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium">
                                            Zakończono
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium">
                                            Snapshot
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium">
                                            Raport
                                        </th>
                                        <th className="px-4 py-3 text-right font-medium">
                                            Akcje
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {data.sessions.map((session) => {
                                        const activeGrant = session.grants.find(
                                            (grant: any) => grant.isCurrentlyActive,
                                        );

                                        return (
                                            <tr key={session.sessionId} className="border-t">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium">
                                                        {session.respondentEmail ?? "—"}
                                                    </div>

                                                    <div className="mt-1 font-mono text-xs text-muted-foreground">
                                                        {session.sessionId}
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClass(
                                                            session.sessionStatus,
                                                        )}`}
                                                    >
                                                        {getSessionStatusLabel(session.sessionStatus)}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-3">
                                                    {formatDateTime(session.sessionCompletedAt)}
                                                </td>

                                                <td className="px-4 py-3">
                                                    {session.hasSnapshot ? (
                                                        <span className="text-green-700">Jest</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">Brak</span>
                                                    )}

                                                    {session.snapshotCreatedAt ? (
                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            {formatDateTime(session.snapshotCreatedAt)}
                                                        </div>
                                                    ) : null}
                                                </td>

                                                <td className="px-4 py-3">
                                                    {activeGrant ? (
                                                        <div>
                                                            <div className="font-medium text-green-700">
                                                                Odblokowany
                                                            </div>

                                                            <div className="mt-1 text-xs text-muted-foreground">
                                                                {activeGrant.reportTemplateName}
                                                            </div>

                                                            <div className="mt-1 text-xs text-muted-foreground">
                                                                Źródło:{" "}
                                                                {getGrantSourceLabel(activeGrant.source)}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            Brak aktywnego dostępu
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {session.sessionStatus === "completed" ? (
                                                            <Button asChild size="sm" variant="outline">
                                                                <Link
                                                                    href={`/t/${tenantSlug}/assessment-sessions/${session.sessionId}/results`}
                                                                >
                                                                    Wynik
                                                                </Link>
                                                            </Button>
                                                        ) : null}

                                                        {activeGrant ? (
                                                            <Button asChild size="sm">
                                                                <Link
                                                                    href={`/t/${tenantSlug}/assessment-sessions/${session.sessionId}/report/${activeGrant.reportTemplateVersionId}`}
                                                                >
                                                                    Raport
                                                                </Link>
                                                            </Button>
                                                        ) : null}

                                                        {!activeGrant && session.sessionStatus === "completed" ? (
                                                            <GrantReportAccessToSessionForm
                                                                tenantSlug={tenantSlug}
                                                                sessionId={session.sessionId}
                                                                products={data.reportAccessProducts}
                                                            />
                                                        ) : null}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
}