import Link from "next/link";
import { Archive, ArchiveRestore } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { PageHeader } from "@/shared/ui";
import { QuestionnaireRowActions } from "./questionnaire-row-actions";
import { QuestionnaireVersionRowActions } from "./questionnaire-version-row-actions";

import {
  listQuestionnairesAdmin,
  listQuestionnaireVersionsAdmin,
} from "../api/questionnaire-admin.queries";
import { CreateQuestionnaireForm } from "./create-questionnaire-form";
import { CreateQuestionnaireVersionForm } from "./create-questionnaire-version-form";

type QuestionnairesAdminPageProps = {
  showArchivedOnly?: boolean;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function isArchivedStatus(status: string) {
  return status === "archived";
}

export async function QuestionnairesAdminPage({
  showArchivedOnly = false,
}: QuestionnairesAdminPageProps) {
  await requireSuperAdmin();

  const questionnaires = await listQuestionnairesAdmin();

  const versionsByQuestionnaireId = new Map<
    string,
    Awaited<ReturnType<typeof listQuestionnaireVersionsAdmin>>
  >();

  for (const questionnaire of questionnaires) {
    versionsByQuestionnaireId.set(
      questionnaire.id,
      await listQuestionnaireVersionsAdmin(questionnaire.id),
    );
  }

  const visibleQuestionnaires = questionnaires
    .map((questionnaire) => {
      const allVersions =
        versionsByQuestionnaireId.get(questionnaire.id) ?? [];

      const visibleVersions = allVersions.filter((version) =>
        showArchivedOnly
          ? isArchivedStatus(version.status)
          : !isArchivedStatus(version.status),
      );

      return {
        questionnaire,
        versions: visibleVersions,
      };
    })
    .filter(({ questionnaire, versions }) => {
      if (showArchivedOnly) {
        return isArchivedStatus(questionnaire.status) || versions.length > 0;
      }

      return !isArchivedStatus(questionnaire.status);
    });

  return (
    <div className="space-y-8">
      <PageHeader
        title={showArchivedOnly ? "Archiwum kwestionariuszy" : "Kwestionariusze"}
        description={
          showArchivedOnly
            ? "Zarchiwizowane kwestionariusze i zarchiwizowane wersje narzędzi."
            : "Systemowe definicje narzędzi, wersji, stron, itemów i wymiarów scoringowych."
        }
        actions={
          <Button asChild variant={showArchivedOnly ? "default" : "outline"}>
            <Link
              href={
                showArchivedOnly
                  ? "/dashboard/questionnaires"
                  : "/dashboard/questionnaires?archived=1"
              }
              title={
                showArchivedOnly
                  ? "Pokaż aktywne kwestionariusze"
                  : "Pokaż zarchiwizowane kwestionariusze"
              }
            >
              {showArchivedOnly ? (
                <ArchiveRestore className="mr-2 h-4 w-4" />
              ) : (
                <Archive className="mr-2 h-4 w-4" />
              )}
              {showArchivedOnly ? "Pokaż aktywne" : "Pokaż archiwum"}
            </Link>
          </Button>
        }
      />

      {!showArchivedOnly ? <CreateQuestionnaireForm /> : null}

      <Card>
        <CardHeader>
          <CardTitle>
            {showArchivedOnly
              ? "Zarchiwizowane kwestionariusze"
              : "Lista kwestionariuszy"}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {visibleQuestionnaires.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              {showArchivedOnly
                ? "Brak zarchiwizowanych kwestionariuszy lub wersji."
                : "Brak aktywnych kwestionariuszy."}
            </div>
          ) : (
            <div className="space-y-6">
              {visibleQuestionnaires.map(({ questionnaire, versions }) => (
                <div
                  key={questionnaire.id}
                  className="rounded-2xl border p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">
                          {questionnaire.name}
                        </h3>

                        <Badge
                          variant={
                            isArchivedStatus(questionnaire.status)
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {questionnaire.status}
                        </Badge>

                        <Badge variant="secondary">
                          {questionnaire.code}
                        </Badge>
                      </div>

                      {questionnaire.description ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {questionnaire.description}
                        </p>
                      ) : null}

                      <p className="mt-2 text-xs text-muted-foreground">
                        Aktualizacja: {formatDate(questionnaire.updatedAt)}
                      </p>
                    </div>

                    {!showArchivedOnly ? (
                      <div className="flex flex-wrap gap-2">
                        <QuestionnaireRowActions questionnaire={questionnaire} />

                        <CreateQuestionnaireVersionForm
                          questionnaireId={questionnaire.id}
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 text-sm font-medium">
                      {showArchivedOnly ? "Zarchiwizowane wersje" : "Wersje"}
                    </div>

                    {versions.length === 0 ? (
                      <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                        {showArchivedOnly
                          ? "Brak zarchiwizowanych wersji dla tego kwestionariusza."
                          : "Brak wersji."}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px] text-left text-sm">
                          <thead className="border-b text-xs uppercase text-muted-foreground">
                            <tr>
                              <th className="py-2 pr-4 font-medium">Wersja</th>
                              <th className="py-2 pr-4 font-medium">Nazwa</th>
                              <th className="py-2 pr-4 font-medium">Status</th>
                              <th className="py-2 pr-4 font-medium">
                                Aktualizacja
                              </th>
                              <th className="py-2 pr-4 font-medium">Akcje</th>
                            </tr>
                          </thead>

                          <tbody className="divide-y">
                            {versions.map((version) => (
                              <tr key={version.id}>
                                <td className="py-2 pr-4 font-mono text-xs">
                                  {version.version}
                                </td>

                                <td className="py-2 pr-4">{version.name}</td>

                                <td className="py-2 pr-4">
                                  <div className="flex flex-wrap gap-2">
                                    <Badge
                                      variant={
                                        isArchivedStatus(version.status)
                                          ? "secondary"
                                          : "outline"
                                      }
                                    >
                                      {version.status}
                                    </Badge>

                                    {version.isPublic ? (
                                      <Badge variant="secondary">
                                        publiczna
                                      </Badge>
                                    ) : null}
                                  </div>
                                </td>

                                <td className="py-2 pr-4">
                                  {formatDate(version.updatedAt)}
                                </td>

                                <td className="py-2 pr-4">
                                  <div className="flex flex-wrap gap-2">
                                    <Button asChild size="sm" variant="outline">
                                      <Link
                                        href={`/dashboard/questionnaires/editor/${version.id}`}
                                      >
                                        Edytuj treść
                                      </Link>

                                    </Button>
                                    <Button asChild  size="sm"  variant="outline">
                                      <Link href={`/dashboard/questionnaires/preview/${version.id}`}>
                                        Podgląd
                                      </Link>
                                    </Button>

                                    {!showArchivedOnly ? (
                                      <QuestionnaireVersionRowActions
                                        version={version}
                                      />
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}