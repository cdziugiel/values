// features/comparison-reports/components/my-comparison-report-page.tsx

"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Check,
  Clipboard,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import { createMyComparisonReportWithTokenAction } from "../api/comparison-report.actions";
import { createMyComparisonShareClientAction } from "../api/comparison-share-client.actions";
import type { MyComparisonQuestionnaireOption } from "../api/my-comparison-session.queries";
import type { ComparisonReportData } from "../types/comparison-report.types";
import { ComparisonDimensionTable } from "./comparison-dimension-table";
import { ComparisonSummaryCards } from "./comparison-summary-cards";
import { ProjectComparisonSubjectOption } from "../api/project-comparison-subjects.queries";

type MyComparisonReportPageProps = {
  questionnaires: MyComparisonQuestionnaireOption[];
  productId?: string | null;
  reportTemplateVersionId?: string | null;
  mode?: "full" | "token-only" | "configure-only";
  initialOwnSessionId?: string | null;
};

function getQuestionnaireOptions(subjects: ProjectComparisonSubjectOption[]) {
  const map = new Map<
    string,
    {
      questionnaireVersionId: string;
      label: string;
      count: number;
    }
  >();

  for (const subject of subjects) {
    const current = map.get(subject.questionnaireVersionId);

    if (current) {
      current.count += 1;
      continue;
    }

    map.set(subject.questionnaireVersionId, {
      questionnaireVersionId: subject.questionnaireVersionId,
      label: subject.questionnaireLabel,
      count: 1,
    });
  }

  return Array.from(map.values());
}

function buildQuestionnaireKey(option: MyComparisonQuestionnaireOption) {
  return `${option.assessmentSessionId}:${option.questionnaireVersionId}`;
}

export function MyComparisonReportPage({
  questionnaires,
  productId,
  reportTemplateVersionId,
  mode = "full",
  initialOwnSessionId = null,
}: MyComparisonReportPageProps) {
  const firstOption = questionnaires[0] ?? null;

const [ownKey, setOwnKey] = useState(() => {
  const initialOption = initialOwnSessionId
    ? questionnaires.find(
        (option) => option.assessmentSessionId === initialOwnSessionId,
      )
    : null;

  return initialOption
    ? buildQuestionnaireKey(initialOption)
    : questionnaires[0]
      ? buildQuestionnaireKey(questionnaires[0])
      : "";
});
  const [otherToken, setOtherToken] = useState("");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [generatedTokenExpiresAt, setGeneratedTokenExpiresAt] = useState<
    string | null
  >(null);

  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  const [error, setError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const [isComparing, startCompareTransition] = useTransition();
  const [isGeneratingToken, startGenerateTokenTransition] = useTransition();

  const selectedQuestionnaire = useMemo(() => {
    return (
      questionnaires.find(
        (option) => buildQuestionnaireKey(option) === ownKey,
      ) ?? null
    );
  }, [questionnaires, ownKey]);

const canSubmit = Boolean(
  selectedQuestionnaire &&
    productId &&
    reportTemplateVersionId &&
    otherToken.trim().length >= 24,
);

  function resetGeneratedToken() {
    setGeneratedToken(null);
    setGeneratedTokenExpiresAt(null);
    setCopyState("idle");
    setShareError(null);
  }

  function handleGenerateToken() {
    if (!selectedQuestionnaire) return;

    resetGeneratedToken();

    startGenerateTokenTransition(async () => {
      const result = await createMyComparisonShareClientAction({
        assessmentSessionId: selectedQuestionnaire.assessmentSessionId,
        questionnaireVersionId: selectedQuestionnaire.questionnaireVersionId,
        label: selectedQuestionnaire.label,
        expiresInDays: 14,
        isSingleUse: false,
      });

      if (!result.ok) {
        setShareError(result.error);
        return;
      }

      setGeneratedToken(result.token);
      setGeneratedTokenExpiresAt(result.expiresAt);
    });
  }

  async function handleCopyToken() {
    if (!generatedToken) return;

    try {
      await navigator.clipboard.writeText(generatedToken);
      setCopyState("copied");

      window.setTimeout(() => {
        setCopyState("idle");
      }, 1600);
    } catch {
      setCopyState("failed");
      setShareError("Nie udało się skopiować tokenu automatycznie.");
    }
  }

function handleCompare() {
  if (!selectedQuestionnaire) return;

  if (!productId || !reportTemplateVersionId) {
    setError(
      "Nie masz aktywnego dostępu do raportu porównawczego. Kup porównanie, aby wygenerować raport.",
    );
    return;
  }

  setError(null);

  startCompareTransition(async () => {
    const result = await createMyComparisonReportWithTokenAction({
      ownSessionId: selectedQuestionnaire.assessmentSessionId,
      ownQuestionnaireVersionId: selectedQuestionnaire.questionnaireVersionId,
      otherToken: otherToken.trim(),

      assessmentProjectId: selectedQuestionnaire.assessmentProjectId,

      productId,
      reportTemplateVersionId,
    });

      if (!result.ok || !result.reportHref) {
        if (result.reason === "missing_report_access") {
          setError(
            "Nie masz jeszcze dostępu do raportu porównawczego. Kup dostęp, aby wygenerować raport.",
          );
          return;
        }

        setError(result.error ?? "Nie udało się wygenerować raportu.");
        return;
      }

        window.location.assign(result.reportHref);
    });
  }

return (
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
    {mode !== "configure-only" ? (
      <section className="overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-background to-muted/50 shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="absolute right-6 top-6 hidden rounded-full border bg-background/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur md:block">
            HUMANET VALUES · Porównanie
          </div>

          <div className="flex max-w-3xl flex-col gap-4">
            <Badge variant="secondary" className="w-fit gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Porównanie peer-to-peer
            </Badge>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Porównaj profile wartości
              </h1>

              <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">
                Wybierz swój ukończony kwestionariusz, wygeneruj token do
                udostępnienia albo wklej token otrzymany od drugiej osoby.
                Porównanie pokazuje profil wyników — bez odpowiedzi na pytania
                i bez dostępu do pełnego raportu drugiej osoby.
              </p>
            </div>

            <div className="grid gap-3 pt-2 md:grid-cols-3">
              <div className="rounded-2xl border bg-background/70 p-4">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                </div>

                <p className="text-sm font-medium">Dobrowolne</p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Token tworzy osoba, która chce udostępnić swój wynik.
                </p>
              </div>

              <div className="rounded-2xl border bg-background/70 p-4">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <Lock className="h-4 w-4 text-primary" />
                </div>

                <p className="text-sm font-medium">Ograniczone</p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Token nie daje dostępu do odpowiedzi ani pełnego raportu.
                </p>
              </div>

              <div className="rounded-2xl border bg-background/70 p-4">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <KeyRound className="h-4 w-4 text-primary" />
                </div>

                <p className="text-sm font-medium">Czasowe</p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Token ma ograniczoną ważność i może zostać odwołany.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    ) : null}

    {!questionnaires.length ? (
      <Alert>
        <AlertTitle>Brak ukończonych kwestionariuszy</AlertTitle>
        <AlertDescription>
          Aby porównać wyniki, najpierw ukończ przynajmniej jeden
          kwestionariusz.
        </AlertDescription>
      </Alert>
    ) : (
      <section
        className={
          mode === "full"
            ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]"
            : "grid gap-6"
        }
      >
        {mode !== "configure-only" ? (
          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>
                    {mode === "token-only"
                      ? "Udostępnij swój wynik"
                      : "1. Wybierz swój wynik"}
                  </CardTitle>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Do porównania pokazujemy tylko ukończone kwestionariusze.
                  </p>
                </div>

                <Badge variant="outline">
                  {questionnaires.length} dostępne
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="own-questionnaire-token">
                  Ukończony kwestionariusz
                </Label>

                <select
                  id="own-questionnaire-token"
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-ring"
                  value={ownKey}
                  onChange={(event) => {
                    setOwnKey(event.target.value);
                    resetGeneratedToken();
                    setError(null);
                  }}
                >
                  {questionnaires.map((option) => {
                    const key = buildQuestionnaireKey(option);

                    return (
                      <option key={key} value={key}>
                        {option.label}
                      </option>
                    );
                  })}
                </select>

                {selectedQuestionnaire ? (
                  <div className="rounded-2xl border bg-muted/20 p-4 text-sm">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium">
                          {selectedQuestionnaire.questionnaireName}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          Projekt:{" "}
                          {selectedQuestionnaire.assessmentProjectName}
                        </p>
                      </div>

                      {selectedQuestionnaire.completedAt ? (
                        <Badge variant="secondary">
                          ukończono{" "}
                          {new Date(
                            selectedQuestionnaire.completedAt,
                          ).toLocaleDateString("pl-PL")}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-semibold">
                    Utwórz token do udostępnienia
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Wygeneruj token i wyślij go osobie, która kupiła raport
                    porównawczy i chce porównać swój wynik z Twoim.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  disabled={!selectedQuestionnaire || isGeneratingToken}
                  onClick={handleGenerateToken}
                  className="gap-2"
                >
                  {isGeneratingToken ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4" />
                  )}
                  {isGeneratingToken ? "Tworzę token..." : "Utwórz token"}
                </Button>

                {shareError ? (
                  <Alert variant="destructive">
                    <AlertTitle>Nie udało się utworzyć tokenu</AlertTitle>
                    <AlertDescription>{shareError}</AlertDescription>
                  </Alert>
                ) : null}

                {generatedToken ? (
                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          Token gotowy do udostępnienia
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          Skopiuj i prześlij drugiej osobie.
                        </p>
                      </div>

                      <Badge variant="secondary" className="gap-1">
                        <Check className="h-3.5 w-3.5" />
                        aktywny
                      </Badge>
                    </div>

                    <div className="flex flex-col gap-2 md:flex-row">
                      <Input
                        readOnly
                        value={generatedToken}
                        className="font-mono text-xs"
                        onFocus={(event) => event.currentTarget.select()}
                      />

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleCopyToken}
                        className="gap-2"
                      >
                        {copyState === "copied" ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Clipboard className="h-4 w-4" />
                        )}
                        {copyState === "copied" ? "Skopiowano" : "Kopiuj"}
                      </Button>
                    </div>

                    <p className="mt-3 text-xs text-muted-foreground">
                      {generatedTokenExpiresAt
                        ? `Token jest ważny do ${new Date(
                            generatedTokenExpiresAt,
                          ).toLocaleDateString("pl-PL")}.`
                        : "Token ma ograniczoną ważność."}
                    </p>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {mode !== "token-only" ? (
          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>
                {mode === "configure-only"
                  ? "Skonfiguruj zakupione porównanie"
                  : "3. Porównaj z drugą osobą"}
              </CardTitle>

              <p className="text-sm text-muted-foreground">
                Wybierz swój wynik, wklej token otrzymany od drugiej osoby i
                wygeneruj raport porównawczy.
              </p>
            </CardHeader>

            <CardContent className="space-y-5">
              {mode === "configure-only" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="own-questionnaire-configure">
                      Twój wynik bazowy
                    </Label>

                    <select
                      id="own-questionnaire-configure"
                      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-ring"
                      value={ownKey}
                      onChange={(event) => {
                        setOwnKey(event.target.value);
                        setError(null);
                      }}
                    >
                      {questionnaires.map((option) => {
                        const key = buildQuestionnaireKey(option);

                        return (
                          <option key={key} value={key}>
                            {option.label}
                          </option>
                        );
                      })}
                    </select>

                    {selectedQuestionnaire ? (
                      <div className="rounded-2xl border bg-muted/20 p-4 text-sm">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-medium">
                              {selectedQuestionnaire.questionnaireName}
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              Projekt:{" "}
                              {selectedQuestionnaire.assessmentProjectName}
                            </p>
                          </div>

                          {selectedQuestionnaire.completedAt ? (
                            <Badge variant="secondary">
                              ukończono{" "}
                              {new Date(
                                selectedQuestionnaire.completedAt,
                              ).toLocaleDateString("pl-PL")}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <Separator />
                </>
              ) : null}

              {!productId || !reportTemplateVersionId ? (
                <Alert>
                  <AlertTitle>Brak aktywnego dostępu</AlertTitle>
                  <AlertDescription>
                    Aby wygenerować raport porównawczy, najpierw kup
                    porównanie. Nadal możesz wygenerować token i przekazać go
                    innej osobie.
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="comparison-token">
                  Token otrzymany od drugiej osoby
                </Label>

                <Input
                  id="comparison-token"
                  value={otherToken}
                  onChange={(event) => {
                    setOtherToken(event.target.value);
                    setError(null);
                  }}
                  placeholder="Wklej token porównania..."
                  className=" rounded-xl font-mono text-xs"
                />

                <p className="text-xs text-muted-foreground">
                  Token powinien pochodzić bezpośrednio od osoby, która chce
                  dobrowolnie porównać z Tobą swój wynik.
                </p>
              </div>

              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>Nie udało się porównać wyników</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button
                type="button"
                disabled={!canSubmit || isComparing}
                onClick={handleCompare}
                className="w-full gap-2"
              >
                {isComparing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isComparing ? "Porównuję..." : "Porównaj wyniki"}
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </section>
    )}
  </div>
);
}