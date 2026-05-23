// features/tenants/components/tenant-migration-actions.tsx

"use client";

import { useActionState } from "react";
import { DatabaseBackup, Layers3, RefreshCcw, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  migrateAllTenantsAction,
  migrateTenantAction,
  reprovisionTenantDatabaseAction,
  type TenantMigrationActionState,
} from "../api/tenant-migration.actions";

const initialState: TenantMigrationActionState = {
  status: "idle",
  message: "",
};

function ActionMessage({
  status,
  message,
  compact = false,
}: {
  status: "idle" | "success" | "error";
  message: string;
  compact?: boolean;
}) {
  if (status === "idle") {
    return null;
  }

  return (
    <p
      className={[
        compact ? "max-w-[260px] text-xs" : "text-sm",
        "leading-5",
        status === "success" ? "text-[#0f766e]" : "text-red-700",
      ].join(" ")}
    >
      {message}
    </p>
  );
}

export function MigrateTenantButton({ tenantId }: { tenantId: string }) {
  const [state, formAction, isPending] = useActionState(
    migrateTenantAction,
    initialState,
  );

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <input type="hidden" name="tenantId" value={tenantId} />

        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={isPending}
          className="rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
        >
          <RefreshCcw size={14} />
          {isPending ? "Migracja..." : "Migruj"}
        </Button>
      </form>

      <ActionMessage
        status={state.status}
        message={state.message}
        compact
      />
    </div>
  );
}

export function MigrateAllTenantsButton() {
  const [state, formAction, isPending] = useActionState(
    migrateAllTenantsAction,
    initialState,
  );

  return (
    <div className="space-y-3">
      <form
        action={formAction}
        onSubmit={(event) => {
          const confirmed = window.confirm(
            "Uruchomić migracje dla wszystkich aktywnych partnerów? Operacja może potrwać.",
          );

          if (!confirmed) {
            event.preventDefault();
          }
        }}
      >
        <Button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] md:w-auto"
        >
          <Layers3 size={16} />
          {isPending
            ? "Migracja wszystkich..."
            : "Migruj wszystkich aktywnych"}
        </Button>
      </form>

      <ActionMessage status={state.status} message={state.message} />

      <div className="rounded-[1.25rem] border border-black/10 bg-white/60 p-4 text-xs leading-5 text-[#6b7280]">
        <div className="mb-1 flex items-center gap-2 font-semibold text-[#171717]">
          <DatabaseBackup size={14} />
          Bezpieczna praktyka
        </div>
        Przed uruchomieniem migracji produkcyjnej upewnij się, że migracje
        zostały przejrzane, a backupy baz partnerów są aktualne.
      </div>
    </div>
  );
}

export function ReprovisionTenantDatabaseButton({
  tenantId,
}: {
  tenantId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    reprovisionTenantDatabaseAction,
    initialState,
  );

  return (
    <div className="space-y-2">
      <form
        action={formAction}
        onSubmit={(event) => {
          const confirmed = window.confirm(
            "Przygotować / naprawić bazę tego partnera i uruchomić migracje?",
          );

          if (!confirmed) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="tenantId" value={tenantId} />

        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={isPending}
          className="rounded-full border-amber-200 bg-amber-50 text-amber-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-100"
        >
          <Wrench size={14} />
          {isPending ? "Naprawa..." : "Napraw DB"}
        </Button>
      </form>

      <ActionMessage
        status={state.status}
        message={state.message}
        compact
      />
    </div>
  );
}