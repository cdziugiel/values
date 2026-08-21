import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  FlaskConical,
  HeartHandshake,
  LockKeyhole,
  Waypoints,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { resolvePublicQuestionnaireVersionByCode } from "@/features/purchase-flow/api/purchase-flow.queries";
import { getPurchaseFlowConfig } from "@/features/purchase-flow/config/purchase-flow.config";
import type { ReportType } from "@/features/purchase-flow/types/purchase-flow.types";
import { startResearchAssessmentAction } from "../api/start-research-assessment.action";
import { ResearchReportTypeLink } from "./research-report-type-link";

type Props = {
  isAuthenticated: boolean;
  reportType: ReportType | null;
  passthrough: Record<string, string>;
};

const icons: Record<ReportType, typeof HeartHandshake> = {
  relations: HeartHandshake,
  work: BriefcaseBusiness,
  change: Waypoints,
};

function buildResearchHref(
  input: Record<string, string | null | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value) params.set(key, value);
  }
  return `/research?${params.toString()}`;
}

export async function ResearchStartPage({
  isAuthenticated,
  reportType,
  passthrough,
}: Props) {
  const config = getPurchaseFlowConfig();

  if (!reportType) {
    return (
      <Shell
        title="Wybierz obszar badania"
        description="Udział w programie badawczym nie wymaga zakupu pełnego raportu. Po ukończeniu badania możesz dobrowolnie przekazać dane statystyczne i otrzymać podstawową informację zwrotną."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {(Object.keys(config.reports) as ReportType[]).map((code) => {
            const report = config.reports[code];
            const Icon = icons[code];

            return (
              <ResearchReportTypeLink
                key={code}
                reportType={code}
                href={buildResearchHref({
                  ...passthrough,
                  reportType: code,
                })}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 font-semibold">{report.label}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {report.description}
                </p>
                <p className="mt-4 text-xs font-medium text-teal-800">
                  Około 15–25 minut
                </p>
              </ResearchReportTypeLink>
            );
          })}
        </div>
      </Shell>
    );
  }

  const report = config.reports[reportType];
  const questionnaire = await resolvePublicQuestionnaireVersionByCode(
    report.questionnaireCode,
  );

  if (!questionnaire) {
    return (
      <Shell
        title="To badanie jest chwilowo niedostępne"
        description="Wybrany kwestionariusz nie ma obecnie aktywnej publicznej wersji. Wybierz inny obszar albo wróć później."
      >
        <Button asChild variant="outline" className="rounded-full">
          <Link href={buildResearchHref(passthrough)}>Wybierz inne badanie</Link>
        </Button>
      </Shell>
    );
  }

  const callbackUrl = buildResearchHref({
    ...passthrough,
    reportType,
  });

  if (!isAuthenticated) {
    return (
      <Shell
        title="Zapisz postęp badania"
        description="Zaloguj się jednorazowym linkiem wysłanym na e-mail. Po powrocie wybrany obszar pozostanie zapisany."
      >
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Wybrane badanie</p>
              <p className="mt-1 text-lg font-semibold">{report.label}</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {report.description}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-neutral-50 p-4 text-sm leading-6 text-muted-foreground">
            <div className="flex gap-3">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-teal-800" />
              <span>
                Po ukończeniu badania samodzielnie zdecydujesz, czy chcesz dołączyć do programu badawczego i przekazać dane statystyczne. Zgoda marketingowa nie jest wymagana.
              </span>
            </div>
          </div>

          <Button asChild className="mt-6 rounded-full">
            <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
              Zaloguj się i rozpocznij
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      title="Rozpocznij badanie"
      description="System wznowi aktywną sesję tego badania albo utworzy jedną nową. Pełny raport nie jest wymagany do udziału w programie badawczym."
    >
      <form action={startResearchAssessmentAction} className="rounded-2xl border bg-white p-6 shadow-sm">
        <input type="hidden" name="reportType" value={reportType} />

        <p className="text-sm text-muted-foreground">Badanie</p>
        <p className="mt-1 text-xl font-semibold">{report.label}</p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          {report.description}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            "badanie możesz przerwać i kontynuować później",
            "udział w części badawczej po wyniku jest dobrowolny",
            "pełny raport pozostaje opcjonalny",
          ].map((item) => (
            <div key={item} className="flex gap-2 rounded-xl bg-neutral-50 p-3 text-xs leading-5 text-muted-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="submit" className="rounded-full">
            Rozpocznij lub kontynuuj badanie
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button asChild type="button" variant="outline" className="rounded-full">
            <Link href={buildResearchHref(passthrough)}>Zmień obszar</Link>
          </Button>
        </div>
      </form>
    </Shell>
  );
}

function Shell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen hv-brand-surface px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8">
          <p className="hv-brand-eyebrow">PROGRAM BADAWCZY HUMANET</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">
            {description}
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
