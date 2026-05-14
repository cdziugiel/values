import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { assessmentProjects } from "@/drizzle/schema/tenant-schema";
import { getTenantDb } from "@/server/db/tenant-db";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";
import { PageHeader } from "@/shared/ui";
import { and, eq, isNull } from "drizzle-orm";
import { AccessLinkActions } from "@/features/assessment-access-links";

import {
    listAssessmentProjectRespondents,
    listRespondentOptionsForProject,
} from "../api/assessment-project-respondent.queries";
import { AddProjectRespondentForm } from "./add-project-respondent-form";
import { ProjectRespondentRowActions } from "./project-respondent-row-actions";

function formatDate(value: Date | null) {
    if (!value) return "—";

    return new Intl.DateTimeFormat("pl-PL", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(value);
}

function getRespondentName(participant: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
}) {
    const fullName = [participant.firstName, participant.lastName]
        .filter(Boolean)
        .join(" ");

    return fullName || participant.email || "—";
}

type AssessmentProjectRespondentsPageProps = {
    tenantSlug: string;
    assessmentProjectId: string;
};

export async function AssessmentProjectRespondentsPage({
    tenantSlug,
    assessmentProjectId,
}: AssessmentProjectRespondentsPageProps) {
    const ctx = await requireTenantContext({
        tenantSlug,
    });

    const canRead = ctx.permissions.includes("assessment_project_respondent:read");
    const canCreate = ctx.permissions.includes(
        "assessment_project_respondent:create",
    );
    const canUpdate = ctx.permissions.includes(
        "assessment_project_respondent:update",
    );

    if (!canRead) {
        throw new Error("Missing permission: assessment_project_respondent:read");
    }

    const db = await getTenantDb(ctx);

    const project = await db.query.assessmentProjects.findFirst({
        where: and(
            eq(assessmentProjects.id, assessmentProjectId),
            isNull(assessmentProjects.deletedAt),
        ),
    });

    if (!project) {
        throw new Error("Assessment project not found.");
    }

    const [participants, respondentOptions] = await Promise.all([
        listAssessmentProjectRespondents({
            db,
            assessmentProjectId,
        }),
        listRespondentOptionsForProject({
            db,
            assessmentProjectId,
        }),
    ]);

    return (
        <div className="space-y-8">
            <PageHeader
                title={`Uczestnicy projektu: ${project.name}`}
                description="Respondenci przypisani do konkretnego projektu badawczego."
                actions={
                    <Button asChild variant="outline">
                        <Link href={`/t/${ctx.tenantSlug}/assessment-projects`}>
                            Wróć do projektów
                        </Link>
                    </Button>
                }
            />

            <AddProjectRespondentForm
                tenantSlug={ctx.tenantSlug}
                assessmentProjectId={assessmentProjectId}
                canAdd={canCreate}
                respondentOptions={respondentOptions}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Lista uczestników</CardTitle>
                </CardHeader>

                <CardContent>
                    {participants.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
                            Brak respondentów przypisanych do tego projektu.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1100px] text-left text-sm">
                                <thead className="border-b text-xs uppercase text-muted-foreground">
                                    <tr>
                                        <th className="py-3 pr-4 font-medium">Respondent</th>
                                        <th className="py-3 pr-4 font-medium">Email</th>
                                        <th className="py-3 pr-4 font-medium">Kod</th>
                                        <th className="py-3 pr-4 font-medium">Organizacja</th>
                                        <th className="py-3 pr-4 font-medium">Jednostka</th>
                                        <th className="py-3 pr-4 font-medium">Status</th>
                                        <th className="py-3 pr-4 font-medium">Zaproszony</th>
                                        <th className="py-3 pr-4 font-medium">Link</th>
                                        <th className="py-3 pr-4 font-medium">Ukończony</th>
                                        <th className="py-3 pr-4 font-medium">Akcje</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y">
                                    {participants.map((participant) => (
                                        <tr key={participant.id}>
                                            <td className="py-3 pr-4 font-medium">
                                                {getRespondentName(participant)}
                                            </td>

                                            <td className="py-3 pr-4">
                                                {participant.email ?? "—"}
                                            </td>

                                            <td className="py-3 pr-4">
                                                {participant.externalCode ?? "—"}
                                            </td>

                                            <td className="py-3 pr-4">
                                                {participant.clientOrganizationName ?? "—"}
                                            </td>

                                            <td className="py-3 pr-4">
                                                {participant.clientUnitName ?? "—"}
                                            </td>

                                            <td className="py-3 pr-4">
                                                <Badge variant="outline">{participant.status}</Badge>
                                            </td>

                                            <td className="py-3 pr-4">
                                                {formatDate(participant.invitedAt)}
                                            </td>
                                            <td className="py-3 pr-4">
                                                <div className="space-y-2">
                                                    {participant.activeAccessLinkId ? (
                                                        <div className="text-xs text-muted-foreground">
                                                            Aktywny do: {formatDate(participant.accessLinkExpiresAt)}
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-muted-foreground">Brak aktywnego linku</div>
                                                    )}

                                                    <AccessLinkActions
                                                        tenantSlug={ctx.tenantSlug}
                                                        assessmentProjectId={assessmentProjectId}
                                                        projectRespondentId={participant.id}
                                                        activeAccessLinkId={participant.activeAccessLinkId}
                                                        canManage={canUpdate}
                                                    />
                                                </div>
                                            </td>
                                            <td className="py-3 pr-4">
                                                {formatDate(participant.completedAt)}
                                            </td>

                                            <td className="py-3 pr-4">
                                                <ProjectRespondentRowActions
                                                    tenantSlug={ctx.tenantSlug}
                                                    participant={participant}
                                                    canManage={canUpdate}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}