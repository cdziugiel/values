import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileText,
  KeyRound,
  LockKeyhole,
  PackagePlus,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { GrantReportAccessToSessionForm } from "@/features/assessment-projects";
import { TenantReportAccessPurchaseDialog } from "@/features/report-access";

import {
  getPartnerAssessmentSessionMaterials,
  type PartnerAssessmentSessionMaterial,
} from "../api/partner-assessment-session-materials.queries";

type AssessmentSessionResultsPageProps = {
  tenantSlug: string;
  sessionId: string;
};

function formatDateTime(value: Date | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function statusLabel(status: string) {
  if (status === "completed") return "Zakończona";
  if (status === "in_progress") return "W trakcie";
  if (status === "not_started") return "Nierozpoczęta";
  if (status === "cancelled") return "Anulowana";

  return status;
}

function statusBadgeClassName(status: string) {
  if (status === "completed") {
    return "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]";
  }

  if (status === "in_progress") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "not_started") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "cancelled") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-black/10 bg-white/70 text-[#6b7280]";
}

function BrandLink({
  href,
  children,
  variant = "secondary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "accent";
}) {
  const className =
    variant === "primary"
      ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#171717] px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
      : variant === "accent"
        ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#0f766e] px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#115e59]"
        : "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/10 bg-white/70 px-5 text-sm font-semibold text-[#171717] shadow-sm transition hover:-translate-y-0.5 hover:bg-white";

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function BadgePill({
  children,
  className = "border-black/10 bg-white/70 text-[#6b7280]",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7280]">
            {label}
          </p>

          <div className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[#171717]">
            {value}
          </div>

          {helper ? (
            <div className="mt-1 break-words text-xs leading-5 text-[#6b7280]">
              {helper}
            </div>
          ) : null}
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#171717]">
          {icon}
        </div>
      </div>
    </article>
  );
}

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] hv-brand-card">
      <div className="flex gap-4 p-5 md:p-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
          {icon}
        </div>

        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
            {title}
          </h2>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#6b7280]">
            {description}
          </p>
        </div>
      </div>

      <div className="px-5 pb-5 md:px-6 md:pb-6">{children}</div>
    </section>
  );
}

function EmptyPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-6 text-sm leading-6 text-[#6b7280] shadow-sm">
      {children}
    </div>
  );
}

function SummaryPanel({
  material,
  normativeDataAvailable,
}: {
  material: PartnerAssessmentSessionMaterial;
  normativeDataAvailable: boolean;
}) {
  if (material.summaryHref) {
    return (
      <div className="rounded-[1.5rem] border border-[rgba(15,118,110,0.18)] bg-[linear-gradient(145deg,rgba(240,253,250,0.96),rgba(255,255,255,0.98))] p-5 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.16)] text-[#0f766e]">
          <Sparkles size={18} />
        </div>

        <h3 className="mt-4 font-semibold tracking-[-0.02em] text-[#171717]">
          Bezpłatne podsumowanie
        </h3>

        <p className="mt-2 text-sm leading-6 text-[#6b7280]">
          Wybrane elementy rzeczywistego wyniku, dostępne dzięki kompletnym
          danym normatywnym przypisanym do tej sesji.
        </p>

        <div className="mt-5">
          <BrandLink href={material.summaryHref} variant="accent">
            <Eye size={16} />
            Zobacz podsumowanie
          </BrandLink>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-black/10 bg-white/60 p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#6b7280]">
        <LockKeyhole size={18} />
      </div>

      <h3 className="mt-4 font-semibold tracking-[-0.02em] text-[#171717]">
        Bezpłatne podsumowanie
      </h3>

      <p className="mt-2 text-sm leading-6 text-[#6b7280]">
        {normativeDataAvailable
          ? "Dane normatywne są dostępne, ale dla tego kwestionariusza nie skonfigurowano aktywnego podsumowania."
          : "Podsumowanie pojawi się, gdy do sesji zostaną przypisane kompletne dane normatywne."}
      </p>
    </div>
  );
}

function ReportPanel({
  tenantSlug,
  sessionId,
  material,
  canManageReportAccess,
  billingProfile,
}: {
  tenantSlug: string;
  sessionId: string;
  material: PartnerAssessmentSessionMaterial;
  canManageReportAccess: boolean;
  billingProfile: {
    type: string | null;
    companyName: string | null;
    taxId: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    country: string | null;
    postalCode: string | null;
    city: string | null;
    street: string | null;
    buildingNumber: string | null;
    apartmentNumber: string | null;
    invoiceEmail: string | null;
  } | null;
}) {
  if (material.grant) {
    return (
      <div className="rounded-[1.5rem] bg-[#171717] p-5 text-white shadow-[0_18px_48px_rgba(15,23,42,0.14)]">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-[#5eead4]">
          <FileText size={18} />
        </div>

        <h3 className="mt-4 font-semibold tracking-[-0.02em]">
          Pełny raport jest dostępny
        </h3>

        <p className="mt-2 text-sm leading-6 text-white/65">
          Dla tego wyniku istnieje aktywny grant. Raport jest gotowy do
          podglądu i pobrania.
        </p>

        <div className="mt-5">
          <BrandLink href={material.grant.reportHref} variant="primary">
            <FileText size={16} />
            Zobacz raport
          </BrandLink>
        </div>
      </div>
    );
  }

  if (!canManageReportAccess) {
    return (
      <div className="rounded-[1.5rem] border border-black/10 bg-white/60 p-5 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#6b7280]">
          <ShieldCheck size={18} />
        </div>

        <h3 className="mt-4 font-semibold tracking-[-0.02em] text-[#171717]">
          Pełny raport
        </h3>

        <p className="mt-2 text-sm leading-6 text-[#6b7280]">
          Nie masz uprawnienia do wykorzystania lub zakupu dostępu. Poproś
          administratora partnera o nadanie raportu.
        </p>
      </div>
    );
  }

  if (material.availableProducts.length > 0) {
    return (
      <div className="rounded-[1.5rem] border border-[rgba(45,212,191,0.30)] bg-white/80 p-5 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
          <KeyRound size={18} />
        </div>

        <h3 className="mt-4 font-semibold tracking-[-0.02em] text-[#171717]">
          Wykorzystaj dostęp z puli
        </h3>

        <p className="mt-2 text-sm leading-6 text-[#6b7280]">
          Partner ma wolny dostęp pasujący do tego raportu. Nadanie dostępu
          zużyje jedną pozycję z puli.
        </p>

        <div className="mt-5">
          <GrantReportAccessToSessionForm
            tenantSlug={tenantSlug}
            sessionId={sessionId}
            products={material.availableProducts}
            session={{
              projectQuestionnaireId:
                material.projectQuestionnaireId,
              questionnaireId: material.questionnaireId,
              questionnaireVersionId:
                material.questionnaireVersionId,
            }}
          />
        </div>
      </div>
    );
  }

  if (material.products.length > 0) {
    return (
      <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm">
          <ShoppingCart size={18} />
        </div>

        <h3 className="mt-4 font-semibold tracking-[-0.02em] text-[#171717]">
          Brak wolnych dostępów
        </h3>

        <p className="mt-2 text-sm leading-6 text-[#6b7280]">
          Kup dostęp do tego typu raportu. Po zaksięgowaniu płatności trafi on
          do puli partnera i będzie można przypisać go tej sesji.
        </p>

        <div className="mt-5">
          <TenantReportAccessPurchaseDialog
            tenantSlug={tenantSlug}
            products={material.products}
            billingProfile={billingProfile}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm">
        <TriangleAlert size={18} />
      </div>

      <h3 className="mt-4 font-semibold tracking-[-0.02em] text-[#171717]">
        Raport nie jest jeszcze dostępny
      </h3>

      <p className="mt-2 text-sm leading-6 text-[#6b7280]">
        {material.message ??
          "Dla tego kwestionariusza nie skonfigurowano raportu lub produktu dostępu."}
      </p>
    </div>
  );
}

function MaterialCard({
  tenantSlug,
  sessionId,
  material,
  normativeDataAvailable,
  canManageReportAccess,
  billingProfile,
}: {
  tenantSlug: string;
  sessionId: string;
  material: PartnerAssessmentSessionMaterial;
  normativeDataAvailable: boolean;
  canManageReportAccess: boolean;
  billingProfile: {
    type: string | null;
    companyName: string | null;
    taxId: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    country: string | null;
    postalCode: string | null;
    city: string | null;
    street: string | null;
    buildingNumber: string | null;
    apartmentNumber: string | null;
    invoiceEmail: string | null;
  } | null;
}) {
  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-black/10 bg-white/70 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-black/10 p-5 md:flex-row md:items-start md:justify-between md:p-6">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#171717]">
            {material.questionnaireName}
          </h3>

          {material.questionnaireVersion ? (
            <p className="mt-1 text-sm text-[#6b7280]">
              Wersja {material.questionnaireVersion}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <BadgePill
            className={
              normativeDataAvailable
                ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
                : "border-black/10 bg-white/70 text-[#6b7280]"
            }
          >
            {normativeDataAvailable
              ? "Dane normatywne dostępne"
              : "Brak danych normatywnych"}
          </BadgePill>

          <BadgePill
            className={
              material.grant
                ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
                : material.availableProducts.length > 0
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
            }
          >
            {material.grant
              ? "Raport odblokowany"
              : material.availableProducts.length > 0
                ? "Dostęp w puli"
                : material.products.length > 0
                  ? "Wymagany zakup"
                  : "Raport niedostępny"}
          </BadgePill>
        </div>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-2 md:p-6">
        <SummaryPanel
          material={material}
          normativeDataAvailable={normativeDataAvailable}
        />

        <ReportPanel
          tenantSlug={tenantSlug}
          sessionId={sessionId}
          material={material}
          canManageReportAccess={canManageReportAccess}
          billingProfile={billingProfile}
        />
      </div>
    </article>
  );
}

export async function AssessmentSessionResultsPage({
  tenantSlug,
  sessionId,
}: AssessmentSessionResultsPageProps) {
  const data = await getPartnerAssessmentSessionMaterials({
    tenantSlug,
    sessionId,
  });

  if (!data) {
    return (
      <main className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <section className="rounded-[2rem] hv-brand-card p-6 md:p-8">
            <h1 className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
              Nie znaleziono sesji
            </h1>

            <p className="mt-2 text-sm leading-6 text-[#6b7280]">
              Nie znaleziono sesji badania dla wskazanego partnera albo sesja
              została usunięta.
            </p>

            <div className="mt-5">
              <BrandLink href={`/t/${tenantSlug}/assessment-projects`}>
                <ArrowLeft size={16} />
                Wróć do projektów
              </BrandLink>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[2rem] hv-brand-card">
          <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-start md:p-8 lg:p-10">
            <div className="max-w-4xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
                <PackagePlus size={14} />
                <span className="hv-brand-eyebrow text-[0.68rem]">
                  MATERIAŁY PO BADANIU
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#171717] md:text-5xl">
                  {data.respondent.displayName}
                </h1>

                <BadgePill
                  className={statusBadgeClassName(data.session.status)}
                >
                  {statusLabel(data.session.status)}
                </BadgePill>
              </div>

              <p className="mt-5 max-w-2xl text-base leading-8 text-[#6b7280]">
                Projekt:{" "}
                <span className="font-semibold text-[#171717]">
                  {data.project.name}
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-2 md:min-w-56">
              <BrandLink
                href={`/t/${tenantSlug}/assessment-projects/${data.project.id}/respondents`}
              >
                <ArrowLeft size={16} />
                Wróć do respondentów
              </BrandLink>
            </div>
          </div>

          <div className="grid gap-3 border-t border-black/10 bg-white/35 p-6 md:grid-cols-3 md:p-8">
            <MetricCard
              label="Status sesji"
              value={statusLabel(data.session.status)}
              icon={<ShieldCheck size={18} />}
            />

            <MetricCard
              label="Respondent"
              value={data.respondent.displayName}
              helper={data.respondent.email}
              icon={<ClipboardList size={18} />}
            />

            <MetricCard
              label="Zakończono"
              value={formatDateTime(data.session.completedAt)}
              icon={<CheckCircle2 size={18} />}
            />
          </div>
        </section>

        <SectionCard
          icon={<FileText size={20} />}
          title="Podsumowania i raporty"
          description="Dla każdego ukończonego kwestionariusza możesz zobaczyć bezpłatne podsumowanie, otworzyć istniejący raport, wykorzystać dostęp z puli albo kupić nowy dostęp."
        >
          {data.session.status !== "completed" ? (
            <EmptyPanel>
              Materiały będą dostępne po zakończeniu sesji badawczej.
            </EmptyPanel>
          ) : data.materials.length === 0 ? (
            <EmptyPanel>
              Nie znaleziono zapisanych wyników kwestionariuszy dla tej sesji.
            </EmptyPanel>
          ) : (
            <div className="space-y-4">
              {data.materials.map((material) => (
                <MaterialCard
                  key={material.snapshotId}
                  tenantSlug={tenantSlug}
                  sessionId={sessionId}
                  material={material}
                  normativeDataAvailable={
                    data.normativeDataAvailable
                  }
                  canManageReportAccess={
                    data.canManageReportAccess
                  }
                  billingProfile={data.billingProfile}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </main>
  );
}
