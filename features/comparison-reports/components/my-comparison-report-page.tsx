"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clipboard,
  KeyRound,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createMyComparisonReportWithTokenAction } from "../api/comparison-report.actions";
import { createMyComparisonShareClientAction } from "../api/comparison-share-client.actions";
import type { MyComparisonQuestionnaireOption } from "../api/my-comparison-session.queries";

type MyComparisonReportPageProps = {
  questionnaires: MyComparisonQuestionnaireOption[];
  productId?: string | null;
  reportTemplateVersionId?: string | null;
  mode: "token-only" | "configure-only";
  initialOwnSessionId?: string | null;
  onBack?: () => void;
};

type ConfigureStep = 1 | 2 | 3;
type ShareStep = 1 | 2;

function buildQuestionnaireKey(option: MyComparisonQuestionnaireOption) {
  return `${option.assessmentSessionId}:${option.questionnaireVersionId}`;
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>
          Krok {current} z {total}
        </span>
        <span>{Math.round((current / total) * 100)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-[#171717] transition-[width] duration-300"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

function QuestionnaireSummary({
  questionnaire,
}: {
  questionnaire: MyComparisonQuestionnaireOption;
}) {
  return (
    <div className="rounded-2xl border bg-muted/20 p-4 text-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-medium">{questionnaire.questionnaireName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Projekt: {questionnaire.assessmentProjectName}
          </p>
        </div>

        {questionnaire.completedAt ? (
          <Badge variant="secondary">
            ukończono {new Date(questionnaire.completedAt).toLocaleDateString("pl-PL")}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

export function MyComparisonReportPage({
  questionnaires,
  productId,
  reportTemplateVersionId,
  mode,
  initialOwnSessionId = null,
  onBack,
}: MyComparisonReportPageProps) {
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

  const [configureStep, setConfigureStep] = useState<ConfigureStep>(1);
  const [shareStep, setShareStep] = useState<ShareStep>(1);
  const [otherToken, setOtherToken] = useState("");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [generatedTokenExpiresAt, setGeneratedTokenExpiresAt] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const [isComparing, startCompareTransition] = useTransition();
  const [isGeneratingToken, startGenerateTokenTransition] = useTransition();

  const selectedQuestionnaire = useMemo(
    () =>
      questionnaires.find((option) => buildQuestionnaireKey(option) === ownKey) ??
      null,
    [questionnaires, ownKey],
  );

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
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("failed");
      setShareError("Nie udało się automatycznie skopiować kodu.");
    }
  }

  function handleCompare() {
    if (!selectedQuestionnaire) return;

    if (!productId || !reportTemplateVersionId) {
      setError("Nie masz aktywnego dostępu do raportu dopasowania.");
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
        setError(result.error ?? "Nie udało się utworzyć raportu dopasowania.");
        return;
      }

      window.location.assign(result.reportHref);
    });
  }

  if (!questionnaires.length) {
    return (
      <Alert>
        <AlertTitle>Brak ukończonych badań</AlertTitle>
        <AlertDescription>
          Aby skorzystać z dopasowania, najpierw ukończ przynajmniej jeden kwestionariusz.
        </AlertDescription>
      </Alert>
    );
  }

  if (mode === "configure-only") {
    return (
      <Card className="rounded-[2rem] shadow-sm">
        <CardHeader className="space-y-4">
          <StepIndicator current={configureStep} total={3} />
          <div>
            <CardTitle>
              {configureStep === 1
                ? "Wybierz swój wynik"
                : configureStep === 2
                  ? "Wprowadź kod drugiej osoby"
                  : "Potwierdź dopasowanie"}
            </CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {configureStep === 1
                ? "Wskaż ukończone badanie, które ma zostać użyte w raporcie."
                : configureStep === 2
                  ? "Wklej kod otrzymany od osoby, z którą chcesz sprawdzić dopasowanie."
                  : "Sprawdź dane i utwórz raport dopasowania."}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {configureStep === 1 ? (
            <div className="space-y-3">
              <Label htmlFor="own-questionnaire-configure">Twój wynik</Label>
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
                <QuestionnaireSummary questionnaire={selectedQuestionnaire} />
              ) : null}
            </div>
          ) : null}

          {configureStep === 2 ? (
            <div className="space-y-3">
              <Label htmlFor="comparison-code">Kod dopasowania</Label>
              <Input
                id="comparison-code"
                value={otherToken}
                onChange={(event) => {
                  setOtherToken(event.target.value);
                  setError(null);
                }}
                placeholder="Wklej otrzymany kod"
                className="rounded-xl font-mono text-xs"
                autoFocus
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Kod powinien pochodzić bezpośrednio od osoby, która dobrowolnie udostępniła swój wynik.
              </p>
            </div>
          ) : null}

          {configureStep === 3 && selectedQuestionnaire ? (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Twój wynik
                </p>
                <QuestionnaireSummary questionnaire={selectedQuestionnaire} />
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Kod drugiej osoby
                </p>
                <p className="mt-2 break-all font-mono text-sm">
                  {otherToken.trim()}
                </p>
              </div>
            </div>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Nie udało się utworzyć raportu dopasowania</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (configureStep === 1) onBack?.();
                else setConfigureStep((configureStep - 1) as ConfigureStep);
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              {configureStep === 1 ? "Wróć" : "Poprzedni krok"}
            </Button>

            {configureStep < 3 ? (
              <Button
                type="button"
                disabled={
                  (configureStep === 1 && !selectedQuestionnaire) ||
                  (configureStep === 2 && otherToken.trim().length < 24)
                }
                onClick={() => setConfigureStep((configureStep + 1) as ConfigureStep)}
              >
                Dalej
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                disabled={!canSubmit || isComparing}
                onClick={handleCompare}
                className="gap-2"
              >
                {isComparing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isComparing ? "Tworzę raport..." : "Utwórz raport dopasowania"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[2rem] shadow-sm">
      <CardHeader className="space-y-4">
        <StepIndicator current={shareStep} total={2} />
        <div>
          <CardTitle>
            {shareStep === 1 ? "Wybierz swój wynik" : "Utwórz kod dopasowania"}
          </CardTitle>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {shareStep === 1
              ? "Wskaż ukończone badanie, które chcesz bezpiecznie udostępnić."
              : "Utwórz kod i przekaż go wybranej osobie."}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {shareStep === 1 ? (
          <div className="space-y-3">
            <Label htmlFor="own-questionnaire-share">Twój wynik</Label>
            <select
              id="own-questionnaire-share"
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-ring"
              value={ownKey}
              onChange={(event) => {
                setOwnKey(event.target.value);
                resetGeneratedToken();
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
              <QuestionnaireSummary questionnaire={selectedQuestionnaire} />
            ) : null}
          </div>
        ) : null}

        {shareStep === 2 ? (
          <div className="space-y-4">
            {selectedQuestionnaire ? (
              <QuestionnaireSummary questionnaire={selectedQuestionnaire} />
            ) : null}

            <Alert>
              <AlertTitle>Co umożliwia ten kod?</AlertTitle>
              <AlertDescription>
                Kod pozwala drugiej osobie utworzyć raport dopasowania. Nie daje dostępu do Twoich odpowiedzi ani pełnego raportu.
              </AlertDescription>
            </Alert>

            {!generatedToken ? (
              <Button
                type="button"
                disabled={!selectedQuestionnaire || isGeneratingToken}
                onClick={handleGenerateToken}
                className="w-full gap-2"
              >
                {isGeneratingToken ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                {isGeneratingToken ? "Tworzę kod..." : "Utwórz kod dopasowania"}
              </Button>
            ) : (
              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Kod jest gotowy</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Skopiuj go i przekaż drugiej osobie.
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
                  <Button type="button" variant="secondary" onClick={handleCopyToken}>
                    {copyState === "copied" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Clipboard className="h-4 w-4" />
                    )}
                    {copyState === "copied" ? "Skopiowano" : "Kopiuj kod"}
                  </Button>
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  {generatedTokenExpiresAt
                    ? `Kod jest ważny do ${new Date(generatedTokenExpiresAt).toLocaleDateString("pl-PL")}.`
                    : "Kod ma ograniczoną ważność."}
                </p>
              </div>
            )}
          </div>
        ) : null}

        {shareError ? (
          <Alert variant="destructive">
            <AlertTitle>Nie udało się utworzyć kodu</AlertTitle>
            <AlertDescription>{shareError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (shareStep === 1) onBack?.();
              else {
                setShareStep(1);
                resetGeneratedToken();
              }
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            {shareStep === 1 ? "Wróć" : "Poprzedni krok"}
          </Button>

          {shareStep === 1 ? (
            <Button
              type="button"
              disabled={!selectedQuestionnaire}
              onClick={() => setShareStep(2)}
            >
              Dalej
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : generatedToken ? (
            <Button type="button" onClick={onBack}>
              Gotowe
              <Check className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
