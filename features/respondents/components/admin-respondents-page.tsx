// @humanet-respondent-directory-v1
// features/respondents/components/admin-respondents-page.tsx

import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/shared/ui";

import { listAdminRespondents } from "../api/admin-respondent.queries";
import { AdminRespondentDirectory } from "./admin-respondent-directory";

function percent(value: number, total: number) {
  if (total <= 0) return 0;

  return Math.round((value / total) * 100);
}

function MetricCard({
  label,
  value,
  helper,
  icon,
  progress,
}: {
  label: string;
  value: number;
  helper: string;
  icon: ReactNode;
  progress?: number;
}) {
  return (
    <article className="group relative overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b7280]">
            {label}
          </p>
          <div className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-[#171717]">
            {value}
          </div>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#171717]">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-[#6b7280]">{helper}</p>

      {typeof progress === "number" ? (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-[#6b7280]">Udział</span>
            <span className="font-semibold text-[#171717]">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#f3f4f6]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#171717] to-[#2dd4bf]"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
        </div>
      ) : null}
    </article>
  );
}

export async function AdminRespondentsPage() {
  const data = await listAdminRespondents();

  const questionnaireRunCount = data.respondents.reduce(
    (sum, respondent) => sum + respondent.questionnaireRuns.length,
    0,
  );

  const completedRunCount = data.respondents.reduce(
    (sum, respondent) =>
      sum +
      respondent.questionnaireRuns.filter(
        (run) => run.status === "completed",
      ).length,
    0,
  );

  const startedRunCount = questionnaireRunCount - completedRunCount;

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <PageHeader
          title="Respondenci"
          description="Audytowany podgląd respondentów ze wszystkich baz partnerów wraz z informacją o rozpoczętych i zakończonych kwestionariuszach."
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Respondenci"
            value={data.respondents.length}
            helper="Respondenci odczytani z dostępnych baz tenantów."
            icon={<Users size={20} />}
          />

          <MetricCard
            label="Bazy partnerów"
            value={data.readableTenantCount}
            helper={`${data.readableTenantCount} z ${data.tenantCount} baz jest dostępnych dla tego podglądu.`}
            icon={<Database size={20} />}
            progress={percent(
              data.readableTenantCount,
              data.tenantCount,
            )}
          />

          <MetricCard
            label="Rozpoczęte"
            value={startedRunCount}
            helper="Kwestionariusze z zapisanymi odpowiedziami, bez potwierdzonego zakończenia."
            icon={<Clock3 size={20} />}
            progress={percent(startedRunCount, questionnaireRunCount)}
          />

          <MetricCard
            label="Zakończone"
            value={completedRunCount}
            helper="Kwestionariusze zakończone na podstawie snapshotu wyniku lub bezpiecznego fallbacku legacy."
            icon={<CheckCircle2 size={20} />}
            progress={percent(completedRunCount, questionnaireRunCount)}
          />
        </section>

        {data.tenantErrors.length > 0 ? (
          <section className="rounded-[1.5rem] border border-amber-200 bg-amber-50/80 p-5">
            <div className="flex gap-3">
              <AlertTriangle
                size={20}
                className="mt-0.5 shrink-0 text-amber-700"
              />
              <div className="min-w-0">
                <h2 className="font-semibold text-amber-950">
                  Częściowe dane
                </h2>
                <p className="mt-1 text-sm leading-6 text-amber-900/80">
                  Nie wszystkie bazy tenantów mogły zostać bezpiecznie
                  odczytane. Pozostałe dane są dostępne poniżej.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.tenantErrors.map((error) => (
                    <Badge
                      key={error.tenantId}
                      variant="outline"
                      className="rounded-full border-amber-300 bg-white/70 text-amber-900"
                      title={error.message}
                    >
                      {error.tenantName}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-[2rem] hv-brand-card">
          <div className="p-5 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                  Lista respondentów wszystkich partnerów
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-[#6b7280]">
                  Wyszukuj po osobie, partnerze, projekcie lub
                  kwestionariuszu. Rozwiń respondenta, aby zobaczyć
                  historię rozpoczętych i zakończonych kwestionariuszy.
                </p>
              </div>

              <Badge className="shrink-0 rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                {data.respondents.length} respondentów
              </Badge>
            </div>

            <div className="mt-5">
              <AdminRespondentDirectory
                respondents={data.respondents}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
