"use client";

import Link from "next/link";
import {
  ChevronDown,
  FileText,
  KeyRound,
  Layers3,
  ListChecks,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { GrantReportAccessToSessionForm } from "./grant-report-access-to-session-form";
import { GrantCompositeReportAccessToRespondentForm } from "./grant-composite-report-access-to-respondent-form";

type PartnerRespondentsAccordionProps = {
  tenantSlug: string;
  projectId: string;
  respondents: any[];
  sessions: any[];
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

function getQuestionnaireKey(session: any) {
  
  return (
    session.projectQuestionnaireId ??
    session.completedQuestionnaire?.projectQuestionnaireId ??
    session.questionnaireVersionId ??
    session.completedQuestionnaire?.questionnaireVersionId ??
    session.questionnaireId ??
    session.completedQuestionnaire?.questionnaireId ??
    session.completedQuestionnaire?.questionnaireCode ??
    `${session.sessionId}:unknown`
  );
}

function getQuestionnaireName(session: any) {
  return (
    session.completedQuestionnaire?.questionnaireName ??
    session.questionnaireName ??
    session.questionnaireCode ??
    session.completedQuestionnaire?.questionnaireCode ??
    "Kwestionariusz"
  );
}

function statusRank(status: string | null) {
  if (status === "completed") return 4;
  if (status === "in_progress") return 3;
  if (status === "not_started") return 2;
  if (status === "cancelled") return 1;
  return 0;
}

function dotClass(status: string | null) {
  if (status === "completed") {
    return "border-[#0f766e] bg-[#2dd4bf]";
  }

  if (status === "in_progress") {
    return "border-amber-500 bg-amber-300";
  }

  if (status === "cancelled") {
    return "border-red-400 bg-red-200";
  }

  return "border-slate-300 bg-slate-200";
}

function pillClass(status: string | null) {
  if (status === "completed") {
    return "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]";
  }

  if (status === "in_progress") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (status === "cancelled") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function compositeStatusLabel(status: string) {
  switch (status) {
    case "ready":
      return "Gotowy";
    case "already_granted":
      return "Już nadany";
    case "missing_pool":
      return "Brak puli";
    case "missing_sources":
      return "Brakuje źródeł";
    default:
      return status;
  }
}

function compositeStatusClass(status: string) {
  if (status === "ready") {
    return "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]";
  }

  if (status === "already_granted") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-800";
}

function buildQuestionnaireIndicators(sessions: any[]) {
  const map = new Map<
    string,
    {
      key: string;
      name: string;
      status: string | null;
      completedAt: unknown;
      sessionId: string;
    }
  >();
console.log(
  "PARTNER_RESPONDENT_QUESTIONNAIRE_INDICATORS_INPUT",
  sessions.map((session) => {
    if (session.sessionId == "645bbe71-5ccf-470c-9338-be4460e740af")
    return {
sessionId: session.sessionId,
    projectQuestionnaireId: session.projectQuestionnaireId,
    questionnaireId: session.questionnaireId,
    questionnaireVersionId: session.questionnaireVersionId,
    completedQuestionnaire: session.completedQuestionnaire,
    questionnaireName: session.questionnaireName,
    questionnaireCode: session.questionnaireCode,
    sessionStatus: session.sessionStatus,
    hasSnapshot: session.hasSnapshot,
    }
    
  }),
);
  for (const session of sessions) {
    const key = String(getQuestionnaireKey(session));
    const name = getQuestionnaireName(session);

    const current = map.get(key);

    if (!current || statusRank(session.sessionStatus) > statusRank(current.status)) {
      map.set(key, {
        key,
        name,
        status: session.sessionStatus,
        completedAt: session.sessionCompletedAt,
        sessionId: session.sessionId,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "pl"),
  );
}

type RespondentAccordionItem = {
  respondentId: string;
  respondentEmail: string | null;
  sessions: any[];
  compositeReports: any[];
};

function groupSessionsByRespondent(sessions: any[]): RespondentAccordionItem[] {
  const map = new Map<string, RespondentAccordionItem>();

  for (const session of sessions) {
    const respondentId =
      typeof session.respondentId === "string" ? session.respondentId : null;

    if (!respondentId) {
      continue;
    }

    const current: RespondentAccordionItem =
      map.get(respondentId) ??
      {
        respondentId,
        respondentEmail:
          typeof session.respondentEmail === "string"
            ? session.respondentEmail
            : null,
        sessions: [],
        compositeReports: [],
      };

    current.sessions.push(session);
    map.set(respondentId, current);
  }

  return Array.from(map.values());
}

function normalizeRespondents({
  respondents,
  sessions,
}: {
  respondents: any[];
  sessions: any[];
}): RespondentAccordionItem[] {
  if (Array.isArray(respondents) && respondents.length > 0) {
    return respondents.map((respondent) => ({
      respondentId: respondent.respondentId,
      respondentEmail: respondent.respondentEmail ?? null,
      sessions: respondent.sessions ?? [],
      compositeReports: respondent.compositeReports ?? [],
    }));
  }

  return groupSessionsByRespondent(sessions);
}

function SessionReportActions({
  tenantSlug,
  session,
}: {
  tenantSlug: string;
  session: any;
}) {
  const activeGrant = session.grants?.find(
    (grant: any) => grant.isCurrentlyActive,
  );

  const compatibleReportAccessProducts =
    session.compatibleReportAccessProducts ?? [];

  const canGrantReportAccess =
    session.sessionStatus === "completed" &&
    session.hasSnapshot &&
    !activeGrant &&
    compatibleReportAccessProducts.length > 0;

  const cannotGrantBecauseNoCompatibleAccess =
    session.sessionStatus === "completed" &&
    session.hasSnapshot &&
    !activeGrant &&
    compatibleReportAccessProducts.length === 0;

  return (
    <div className="flex w-full min-w-0 flex-col items-end gap-2">
      <div className="flex w-full flex-wrap justify-end gap-2">
        {session.sessionStatus === "completed" ? (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-9 rounded-full border-black/10 bg-white/70 px-4 text-[#171717]"
          >
            <Link
              href={`/t/${tenantSlug}/assessment-sessions/${session.sessionId}/results`}
            >
              Wynik
            </Link>
          </Button>
        ) : null}

        {activeGrant ? (
          <Button
            asChild
            size="sm"
            className="h-9 rounded-full bg-[#171717] px-4 text-white hover:bg-[#2a2a2a]"
          >
            <Link
              href={`/t/${tenantSlug}/assessment-sessions/${session.sessionId}/report/${activeGrant.reportTemplateVersionId}`}
            >
              Raport
            </Link>
          </Button>
        ) : null}
      </div>

      {canGrantReportAccess ? (
        <div className="w-full min-w-0">
          <GrantReportAccessToSessionForm
            tenantSlug={tenantSlug}
            sessionId={session.sessionId}
            session={session}
            products={compatibleReportAccessProducts}
          />
        </div>
      ) : null}

      {cannotGrantBecauseNoCompatibleAccess ? (
        <div className="max-w-full text-right text-xs leading-5 text-[#6b7280]">
          Brak aktywnych dostępów dla tego kwestionariusza
        </div>
      ) : null}
    </div>
  );
}

function RespondentQuestionnaireDots({ sessions }: { sessions: any[] }) {
  const indicators = buildQuestionnaireIndicators(sessions);
  const completedCount = indicators.filter(
    (item) => item.status === "completed",
  ).length;

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-wrap gap-1.5">
        {indicators.map((item) => (
          <span
            key={item.key}
            title={`${item.name} · ${getSessionStatusLabel(item.status)}${
              item.completedAt ? ` · ${formatDateTime(item.completedAt)}` : ""
            }`}
            className={[
              "h-3.5 w-3.5 rounded-full border shadow-sm",
              dotClass(item.status),
            ].join(" ")}
          />
        ))}
      </div>

      <div className="text-sm font-medium text-[#171717]">
        {completedCount}/{indicators.length}
      </div>
    </div>
  );
}

function CompositeReportsBlock({
  tenantSlug,
  projectId,
  respondent,
}: {
  tenantSlug: string;
  projectId: string;
  respondent: any;
}) {
  const compositeReports = respondent.compositeReports ?? [];

  if (compositeReports.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 px-4 py-3 text-sm leading-6 text-[#6b7280]">
        Brak dostępnych raportów złożonych dla tego respondenta.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {compositeReports.map((report: any) => {
        const missing = report.missingRequiredSources ?? [];

        return (
          <article
            key={report.reportTemplateVersionId}
            className="rounded-[1.5rem] border border-black/10 bg-white/75 p-4"
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-semibold text-[#171717]">
                    {report.reportTemplateName}
                  </div>

                  <span
                    className={[
                      "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                      compositeStatusClass(report.status),
                    ].join(" ")}
                  >
                    {compositeStatusLabel(report.status)}
                  </span>
                </div>

                <div className="mt-1 text-xs text-[#6b7280]">
                  Wersja: {report.reportTemplateVersionName} (
                  {report.reportTemplateVersion}) · tryb: same_project
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {report.selectedSources.map((source: any) => (
                    <span
                      key={source.slot}
                      title={
                        source.available
                          ? `${source.questionnaireName || source.questionnaireCode} · sesja: ${source.selectedAssessmentSessionId}`
                          : `${source.questionnaireName || source.questionnaireCode} · brak ukończonego źródła`
                      }
                      className={[
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
                        source.available
                          ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.08)] text-[#0f766e]"
                          : "border-amber-200 bg-amber-50 text-amber-900",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "h-2 w-2 rounded-full",
                          source.available ? "bg-[#2dd4bf]" : "bg-amber-300",
                        ].join(" ")}
                      />
                      {source.questionnaireName || source.questionnaireCode}
                    </span>
                  ))}
                </div>

                {missing.length > 0 ? (
                  <div className="mt-3 text-xs leading-5 text-amber-800">
                    Brakuje:{" "}
                    {missing
                      .map(
                        (source: any) =>
                          source.questionnaireName || source.questionnaireCode,
                      )
                      .join(", ")}
                  </div>
                ) : null}
              </div>

              <div className="flex lg:justify-end">
                {report.existingGrant ? (
                  <Button
                    asChild
                    size="sm"
                    className="rounded-full bg-[#171717] text-white hover:bg-[#2a2a2a]"
                  >
                    <Link
                      href={`/t/${tenantSlug}/assessment-projects/${projectId}/respondents/${respondent.respondentId}/composite-report/${report.existingGrant.id}`}
                    >
                      Raport
                    </Link>
                  </Button>
                ) : report.product ? (
                  <GrantCompositeReportAccessToRespondentForm
                    tenantSlug={tenantSlug}
                    assessmentProjectId={projectId}
                    respondentId={respondent.respondentId}
                    productId={report.product.id}
                    reportTemplateVersionId={report.reportTemplateVersionId}
                    disabled={!report.canGrant}
                  />
                ) : (
                  <div className="text-sm text-[#6b7280]">Brak produktu</div>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function PartnerRespondentsAccordion({
  tenantSlug,
  projectId,
  respondents,
  sessions,
}: PartnerRespondentsAccordionProps) {
  const normalizedRespondents = normalizeRespondents({
    respondents,
    sessions,
  }).sort((a, b) =>
    String(a.respondentEmail ?? "").localeCompare(
      String(b.respondentEmail ?? ""),
      "pl",
    ),
  );

  if (normalizedRespondents.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-black/10 bg-white/60 p-8 text-sm leading-6 text-[#6b7280] shadow-sm backdrop-blur">
        Ten projekt nie ma jeszcze respondentów ani sesji.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-black/10 bg-white/70 shadow-sm backdrop-blur">
      <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-black/10 bg-[#f7f7f8] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">
        <div>Respondent</div>
        <div className="hidden text-right sm:block">Kwestionariusze</div>
        <div className="text-right">Szczegóły</div>
      </div>

      <div className="divide-y divide-black/10">
        {normalizedRespondents.map((respondent) => {
          const respondentSessions = respondent.sessions ?? [];
          const completedSessions = respondentSessions.filter(
            (session: any) => session.sessionStatus === "completed",
          );

          const activeSessionReports = respondentSessions.filter((session: any) =>
            session.grants?.some((grant: any) => grant.isCurrentlyActive),
          );

          return (
            <details
              key={respondent.respondentId}
              className="group/respondent bg-white/55 open:bg-white"
            >
              <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] gap-4 px-4 py-4 transition hover:bg-[#fafafa] sm:grid-cols-[1fr_auto_auto]">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-[#171717]">
                    {respondent.respondentEmail ?? "Respondent"}
                  </div>

                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6b7280]">
                    <span className="font-mono">{respondent.respondentId}</span>
                    <span>Sesje: {respondentSessions.length}</span>
                    <span>Zakończone: {completedSessions.length}</span>
                    <span>Raporty: {activeSessionReports.length}</span>
                  </div>
                </div>

                <div className="hidden items-center sm:flex">
                  <RespondentQuestionnaireDots sessions={respondentSessions} />
                </div>

                <div className="flex items-center justify-end gap-3">
                  <div className="sm:hidden">
                    <RespondentQuestionnaireDots sessions={respondentSessions} />
                  </div>

                  <ChevronDown
                    size={18}
                    className="text-[#6b7280] transition group-open/respondent:rotate-180"
                  />
                </div>
              </summary>

              <div className="space-y-5 border-t border-black/10 bg-[#fbfbfc] px-4 py-5">
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ListChecks size={16} className="text-[#0f766e]" />
                    <h3 className="text-sm font-semibold text-[#171717]">
                      Sesje i raporty sesyjne
                    </h3>
                  </div>

<div className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white">
  <div className="grid grid-cols-[minmax(280px,1.4fr)_130px_170px_minmax(320px,1fr)] gap-4 border-b border-black/10 bg-[#f7f7f8] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">
    <div className="min-w-0">Kwestionariusz</div>
    <div className="min-w-0">Status</div>
    <div className="min-w-0">Zakończono</div>
    <div className="min-w-0 text-right">Akcje</div>
  </div>

  <div className="divide-y divide-black/10">
    {respondentSessions.map((session: any, index) => {
      const activeGrant = session.grants?.find(
        (grant: any) => grant.isCurrentlyActive,
      );

      return (
        <div
          key={[
            session.sessionId,
            session.projectQuestionnaireId ??
              session.completedQuestionnaire?.projectQuestionnaireId ??
              session.questionnaireVersionId ??
              session.questionnaireId ??
              index,
          ].join(":")}
          className="grid grid-cols-[minmax(280px,1.4fr)_130px_170px_minmax(320px,1fr)] gap-4 bg-white px-4 py-4 text-sm"
        >
          <div className="min-w-0">
            <div className="break-words font-medium leading-6 text-[#171717]">
              {getQuestionnaireName(session)}
            </div>

            <div className="mt-1 break-all font-mono text-xs leading-5 text-[#6b7280]">
              {session.sessionId}
            </div>

            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-[#6b7280]">
              {session.completedQuestionnaire?.responseCount ? (
                <span>
                  Odpowiedzi:{" "}
                  <span className="text-[#171717]">
                    {session.completedQuestionnaire.responseCount}
                  </span>
                </span>
              ) : null}

              <span>
                Snapshot:{" "}
                <span
                  className={
                    session.hasSnapshot
                      ? "font-medium text-[#0f766e]"
                      : "text-[#6b7280]"
                  }
                >
                  {session.hasSnapshot ? "jest" : "brak"}
                </span>
              </span>

              {activeGrant ? (
                <span className="text-[#0f766e]">
                  Raport: {activeGrant.reportTemplateName}
                </span>
              ) : (
                <span>Raport: brak aktywnego dostępu</span>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <span
              className={[
                "inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium",
                pillClass(session.sessionStatus),
              ].join(" ")}
            >
              {getSessionStatusLabel(session.sessionStatus)}
            </span>
          </div>

          <div className="min-w-0 leading-6 text-[#6b7280]">
            {formatDateTime(session.sessionCompletedAt)}
          </div>

          <div className="min-w-0">
            <SessionReportActions
              tenantSlug={tenantSlug}
              session={session}
            />
          </div>
        </div>
      );
    })}
  </div>
</div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Layers3 size={16} className="text-[#0f766e]" />
                    <h3 className="text-sm font-semibold text-[#171717]">
                      Raporty specjalne dla respondenta
                    </h3>
                  </div>

                  <CompositeReportsBlock
                    tenantSlug={tenantSlug}
                    projectId={projectId}
                    respondent={respondent}
                  />
                </section>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}