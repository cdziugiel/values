import Link from "next/link";

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

import {
  listQuestionnairesAdmin,
  listQuestionnaireVersionsAdmin,
} from "../api/questionnaire-admin.queries";
import { CreateQuestionnaireForm } from "./create-questionnaire-form";
import { CreateQuestionnaireVersionForm } from "./create-questionnaire-version-form";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export async function QuestionnairesAdminPage() {
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Kwestionariusze"
        description="Systemowe definicje narzędzi, wersji, stron, itemów i wymiarów scoringowych."
      />

      <CreateQuestionnaireForm />

      <Card>
        <CardHeader>
          <CardTitle>Lista kwestionariuszy</CardTitle>
        </CardHeader>

        <CardContent>
          {questionnaires.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              Brak kwestionariuszy.
            </div>
          ) : (
            <div className="space-y-6">
              {questionnaires.map((questionnaire) => {
                const versions =
                  versionsByQuestionnaireId.get(questionnaire.id) ?? [];

                return (
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
                          <Badge variant="outline">
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

                      <div className="flex flex-wrap gap-2">
                        <QuestionnaireRowActions questionnaire={questionnaire} />

                        <CreateQuestionnaireVersionForm
                          questionnaireId={questionnaire.id}
                        />
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="mb-2 text-sm font-medium">Wersje</div>

                      {versions.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                          Brak wersji.
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
                                    <Badge variant="outline">
                                      {version.status}
                                    </Badge>
                                  </td>
                                  <td className="py-2 pr-4">
                                    {formatDate(version.updatedAt)}
                                  </td>
                                  <td className="py-2 pr-4">
                                    <Button asChild size="sm" variant="outline">
                                      <Link
                                        href={`/dashboard/questionnaires/editor/${version.id}`}
                                      >
                                        Edytuj wersję
                                      </Link>
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}