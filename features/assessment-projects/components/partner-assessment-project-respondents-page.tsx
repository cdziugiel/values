// features/partner-assessment/components/partner-assessment-project-respondents-page.tsx

import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  KeyRound,
  PackageCheck,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getPartnerAssessmentProjectRespondents } from "../api/partner-assessment-project.queries";
import { GrantReportAccessToSessionForm } from "./grant-report-access-to-session-form";
import { ReportAccessPoolSummary } from "./report-access-pool-summary";
import { BulkGrantReportAccessDialog } from "./bulk-grant-report-access-dialog";
import { GenerateReportAccessPoolDialog } from "./generate-report-access-pool-dialog";
import { GrantCompositeReportAccessToRespondentForm } from "./grant-composite-report-access-to-respondent-form";
import { PartnerRespondentsAccordion } from "./partner-respondents-accordion";

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
    return "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]";
  }

  if (status === "in_progress") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "cancelled") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;

  return Math.round((value / total) * 100);
}

function BrandLinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const className =
    variant === "primary"
      ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#171717] px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]"
      : "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 text-sm font-semibold text-[#171717] shadow-sm transition hover:-translate-y-0.5 hover:bg-white";

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
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
  icon: React.ReactNode;
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

function SectionShell({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] hv-brand-card">
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between md:p-6">
        <div className="flex gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
            {icon}
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
              {title}
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6b7280]">
              {description}
            </p>
          </div>
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="px-5 pb-5 md:px-6 md:pb-6">{children}</div>
    </section>
  );
}

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-black/10 bg-white/60 p-8 text-sm leading-6 text-[#6b7280] shadow-sm backdrop-blur">
      {children}
    </div>
  );
}

function StatusPill({
  status,
  children,
}: {
  status: string | null;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClass(
        status,
      )}`}
    >
      {children}
    </span>
  );
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
      <main className="min-h-screen hv-brand-surface px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-2xl rounded-[2rem] hv-brand-card p-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
            <ShieldCheck size={14} />
            <span className="hv-brand-eyebrow text-[0.68rem]">
              HUMANET VALUES · Partner
            </span>
          </div>

          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#171717]">
            Nie znaleziono projektu
          </h1>

          <p className="mt-4 text-sm leading-6 text-[#6b7280]">
            Projekt nie istnieje, został usunięty albo nie masz do niego dostępu.
          </p>

          <div className="mt-6">
            <BrandLinkButton href="/dashboard" variant="secondary">
              <ArrowLeft size={16} />
              Wróć do panelu
            </BrandLinkButton>
          </div>
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

  const completionRate = percent(completedCount, data.sessions.length);
  const unlockRate = percent(unlockedReportCount, completedCount);

  return (
    <main className="min-h-screen hv-brand-surface px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[2rem] hv-brand-card">
          <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8 lg:p-10">
            <div className="max-w-4xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
                <ShieldCheck size={14} />
                <span className="hv-brand-eyebrow text-[0.68rem]">
                  HUMANET VALUES · Partner
                </span>
              </div>

              <h1 className="max-w-4xl text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#171717] md:text-5xl">
                {data.project.name}
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-6 text-[#6b7280]">
                Partner: {data.tenant.name} ({data.tenant.slug})
              </p>

              {data.project.description ? (
                <p className="mt-4 max-w-3xl text-base leading-8 text-[#6b7280]">
                  {data.project.description}
                </p>
              ) : null}
            </div>

            <BrandLinkButton href="/dashboard" variant="secondary">
              <ArrowLeft size={16} />
              Wróć do panelu
            </BrandLinkButton>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Sesje"
            value={data.sessions.length}
            helper="Wszystkie sesje respondentów w projekcie."
            icon={<Users size={20} />}
          />

          <MetricCard
            label="W trakcie"
            value={inProgressCount}
            helper="Sesje rozpoczęte, ale jeszcze niezakończone."
            icon={<Clock3 size={20} />}
            progress={percent(inProgressCount, data.sessions.length)}
          />

          <MetricCard
            label="Zakończone"
            value={completedCount}
            helper="Sesje gotowe do podglądu wyników lub raportu."
            icon={<CheckCircle2 size={20} />}
            progress={completionRate}
          />

          <MetricCard
            label="Raporty"
            value={unlockedReportCount}
            helper="Sesje z aktywnym dostępem do raportu."
            icon={<FileText size={20} />}
            progress={unlockRate}
          />
        </section>

        <SectionShell
          icon={<KeyRound size={20} />}
          title="Dostępy dla parnera"
          description="Pula dostępów, z której partner lub admin może nadawać raporty respondentom."
          action={
            <GenerateReportAccessPoolDialog
              tenantSlug={tenantSlug}
              projectId={projectId}
              products={data.partnerReportAccessProducts ?? []}
              billingProfile={data.billingProfile}
            />
          }
        >
          <ReportAccessPoolSummary
  products={data.partnerReportAccessProducts ?? []}
/>
        </SectionShell>
        <SectionShell
          icon={<KeyRound size={20} />}
          title="Dostępy dla respondentów"
          description="Pula dostępów, z której partner lub admin może nadawać raporty respondentom."
          action={
            <GenerateReportAccessPoolDialog
              tenantSlug={tenantSlug}
              projectId={projectId}
              products={data.respondentReportAccessProducts ?? []}
              billingProfile={data.billingProfile}
            />
          }
        >
          <ReportAccessPoolSummary
  products={data.respondentReportAccessProducts ?? []}
/>
        </SectionShell>

        <SectionShell
  icon={<BarChart3 size={20} />}
  title="Respondenci"
  description="Kompaktowa lista respondentów. Rozwiń respondenta, aby zobaczyć jego sesje, raporty sesyjne i raporty specjalne."
  action={
    <BulkGrantReportAccessDialog
      tenantSlug={tenantSlug}
      projectId={projectId}
      products={data.reportAccessProducts}
      sessions={data.sessions}
    />
  }
>
  <PartnerRespondentsAccordion
    tenantSlug={tenantSlug}
    projectId={projectId}
    respondents={data.respondents ?? []}
    sessions={data.sessions}
  />
</SectionShell>
      </div>
    </main>
  );
}
