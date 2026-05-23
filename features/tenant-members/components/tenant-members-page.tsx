// features/tenant-members/components/tenant-members-page.tsx

import {
  CheckCircle2,
  Clock3,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/shared/ui";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

import { listTenantMembers } from "../api/tenant-member.queries";
import { TENANT_MEMBER_ROLE_OPTIONS, TENANT_MEMBER_STATUS_OPTIONS } from "../forms/tenant-member.schema";
import { AddTenantMemberForm } from "./add-tenant-member-form";
import { TenantMemberRowActions } from "./tenant-member-row-actions";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getRoleLabel(role: string) {
  return (
    TENANT_MEMBER_ROLE_OPTIONS.find((option) => option.value === role)?.label ??
    role
  );
}

function getStatusLabel(status: string) {
  return (
    TENANT_MEMBER_STATUS_OPTIONS.find((option) => option.value === status)
      ?.label ?? status
  );
}

function getRoleBadgeClassName(role: string) {
  if (role === "TENANT_OWNER") {
    return "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]";
  }

  if (role === "TENANT_ADMIN") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-black/10 bg-white/70 text-[#6b7280]";
}

function getStatusBadgeClassName(status: string) {
  if (status === "active") {
    return "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]";
  }

  if (status === "invited" || status === "pending") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "archived" || status === "disabled" || status === "suspended") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-black/10 bg-white/70 text-[#6b7280]";
}

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

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-black/10 bg-white/60 p-8 text-sm leading-6 text-[#6b7280] shadow-sm backdrop-blur">
      {children}
    </div>
  );
}

type TenantMembersPageProps = {
  tenantSlug: string;
};

export async function TenantMembersPage({ tenantSlug }: TenantMembersPageProps) {
  const ctx = await requireTenantContext({
    tenantSlug,
  });

  const canManageMembers = ctx.permissions.includes("user:invite");

  const members = await listTenantMembers(ctx.tenantSlug);

  const activeMembersCount = members.filter(
    (member) => member.status === "active",
  ).length;

  const ownersCount = members.filter(
    (member) => member.role === "TENANT_OWNER",
  ).length;

  const adminsCount = members.filter(
    (member) => member.role === "TENANT_ADMIN",
  ).length;

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <PageHeader
          title="Zespół partnera"
          description="Zarządzanie dostępem użytkowników, rolami i statusem członkostwa."
        />

        <section className="overflow-hidden rounded-[2rem] hv-brand-card">
          <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8 lg:p-10">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
                <ShieldCheck size={14} />
                <span className="hv-brand-eyebrow text-[0.68rem]">
                  Dostęp do partnera
                </span>
              </div>

              <h1 className="max-w-3xl text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#171717] md:text-5xl">
                Członkowie zespołu i ich uprawnienia.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-[#6b7280]">
                Dodawaj użytkowników, kontroluj ich role i szybko sprawdzaj,
                kto ma aktywny dostęp do środowiska partnera.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                  <Users size={20} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#171717]">
                    Partner
                  </p>
                  <p className="mt-0.5 font-mono text-sm text-[#6b7280]">
                    {ctx.tenantSlug}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="Członkowie"
            value={members.length}
            helper="Wszyscy użytkownicy przypisani do partnera."
            icon={<Users size={20} />}
          />

          <MetricCard
            label="Aktywni"
            value={activeMembersCount}
            helper="Użytkownicy z aktywnym dostępem."
            icon={<CheckCircle2 size={20} />}
            progress={percent(activeMembersCount, members.length)}
          />

          <MetricCard
            label="Ownerzy"
            value={ownersCount}
            helper="Osoby z najwyższym poziomem uprawnień."
            icon={<ShieldCheck size={20} />}
            progress={percent(ownersCount, members.length)}
          />

          <MetricCard
            label="Admini"
            value={adminsCount}
            helper="Osoby zarządzające operacyjnie dostępami."
            icon={<UserRound size={20} />}
            progress={percent(adminsCount, members.length)}
          />
        </section>

        <AddTenantMemberForm
          tenantSlug={ctx.tenantSlug}
          canInvite={canManageMembers}
        />

        <section className="rounded-[2rem] hv-brand-card">
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between md:p-6">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                <Users size={20} />
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                  Lista członków zespołu
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6b7280]">
                  Przegląd użytkowników, ich ról, statusów oraz dat dodania.
                  Ustawienia dostępu są dostępne z poziomu przycisku w kolumnie
                  akcji.
                </p>
              </div>
            </div>

            <Badge className="w-fit rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
              {members.length} członków
            </Badge>
          </div>

          <div className="px-5 pb-5 md:px-6 md:pb-6">
            {members.length === 0 ? (
              <EmptyPanel>
                Brak członków partnera. Dodaj pierwszego użytkownika, aby nadać
                dostęp do środowiska.
              </EmptyPanel>
            ) : (
              <>
                <div className="grid gap-4 lg:hidden">
                  {members.map((member) => (
                    <article
                      key={member.membershipId}
                      className="rounded-[1.5rem] border border-black/10 bg-white/75 p-4 shadow-sm backdrop-blur"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold tracking-[-0.02em] text-[#171717]">
                            {member.name ?? member.email}
                          </h3>

                          <p className="mt-1 truncate font-mono text-xs text-[#6b7280]">
                            {member.email}
                          </p>
                        </div>

                        <Badge
                          variant="outline"
                          className={`shrink-0 rounded-full ${getStatusBadgeClassName(
                            member.status,
                          )}`}
                        >
                          {getStatusLabel(member.status)}
                        </Badge>
                      </div>

                      <dl className="mt-4 grid gap-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-[#6b7280]">Rola</dt>
                          <dd>
                            <Badge
                              variant="outline"
                              className={`rounded-full ${getRoleBadgeClassName(
                                member.role,
                              )}`}
                            >
                              {getRoleLabel(member.role)}
                            </Badge>
                          </dd>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <dt className="text-[#6b7280]">Dodano</dt>
                            <dd className="mt-0.5 text-[#171717]">
                              {formatDate(member.createdAt)}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-[#6b7280]">Aktualizacja</dt>
                            <dd className="mt-0.5 text-[#171717]">
                              {formatDate(member.updatedAt)}
                            </dd>
                          </div>
                        </div>
                      </dl>

                      <div className="mt-5">
                        <TenantMemberRowActions
                          tenantSlug={ctx.tenantSlug}
                          member={member}
                          canManage={canManageMembers}
                        />
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/70 lg:block">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-left text-sm">
                      <thead className="border-b border-black/10 bg-[#f7f7f8] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Użytkownik</th>
                          <th className="px-4 py-3 font-semibold">Nazwa</th>
                          <th className="px-4 py-3 font-semibold">Rola</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold">Dodano</th>
                          <th className="px-4 py-3 font-semibold">
                            Aktualizacja
                          </th>
                          <th className="px-4 py-3 font-semibold">Akcje</th>
                        </tr>
                      </thead>

                      <tbody>
                        {members.map((member) => (
                          <tr
                            key={member.membershipId}
                            className="border-b border-black/10 last:border-0"
                          >
                            <td className="px-4 py-4">
                              <div className="font-medium text-[#171717]">
                                {member.email}
                              </div>
                            </td>

                            <td className="px-4 py-4 text-[#171717]">
                              {member.name ?? "—"}
                            </td>

                            <td className="px-4 py-4">
                              <Badge
                                variant="outline"
                                className={`rounded-full ${getRoleBadgeClassName(
                                  member.role,
                                )}`}
                              >
                                {getRoleLabel(member.role)}
                              </Badge>
                            </td>

                            <td className="px-4 py-4">
                              <Badge
                                variant="outline"
                                className={`rounded-full ${getStatusBadgeClassName(
                                  member.status,
                                )}`}
                              >
                                {getStatusLabel(member.status)}
                              </Badge>
                            </td>

                            <td className="px-4 py-4 text-[#6b7280]">
                              <span className="inline-flex items-center gap-1.5">
                                <Clock3 size={13} />
                                {formatDate(member.createdAt)}
                              </span>
                            </td>

                            <td className="px-4 py-4 text-[#6b7280]">
                              {formatDate(member.updatedAt)}
                            </td>

                            <td className="px-4 py-4">
                              <TenantMemberRowActions
                                tenantSlug={ctx.tenantSlug}
                                member={member}
                                canManage={canManageMembers}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}