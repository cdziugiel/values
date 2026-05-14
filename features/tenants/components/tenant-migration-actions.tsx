"use client";

import { useActionState } from "react";

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

export function MigrateTenantButton({ tenantId }: { tenantId: string }) {
  const [state, formAction, isPending] = useActionState(
    migrateTenantAction,
    initialState,
  );

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <input type="hidden" name="tenantId" value={tenantId} />

        <Button type="submit" size="sm" variant="outline" disabled={isPending}>
          {isPending ? "Migracja..." : "Migruj"}
        </Button>
      </form>

      {state.status !== "idle" ? (
        <p
          className={
            state.status === "success"
              ? "max-w-[260px] text-xs text-green-700"
              : "max-w-[260px] text-xs text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

export function MigrateAllTenantsButton() {
  const [state, formAction, isPending] = useActionState(
    migrateAllTenantsAction,
    initialState,
  );

  return (
    <div className="space-y-2">
      <form
        action={formAction}
        onSubmit={(event) => {
          const confirmed = window.confirm(
            "Uruchomić migracje dla wszystkich aktywnych tenantów? Operacja może potrwać.",
          );

          if (!confirmed) {
            event.preventDefault();
          }
        }}
      >
        <Button type="submit" disabled={isPending}>
          {isPending ? "Migracja wszystkich..." : "Migruj wszystkich aktywnych"}
        </Button>
      </form>

      {state.status !== "idle" ? (
        <p
          className={
            state.status === "success"
              ? "text-sm text-green-700"
              : "text-sm text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}
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
            "Przygotować / naprawić bazę tego tenanta i uruchomić migracje?",
          );

          if (!confirmed) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="tenantId" value={tenantId} />

        <Button type="submit" size="sm" variant="outline" disabled={isPending}>
          {isPending ? "Naprawa..." : "Napraw DB"}
        </Button>
      </form>

      {state.status !== "idle" ? (
        <p
          className={
            state.status === "success"
              ? "max-w-[260px] text-xs text-green-700"
              : "max-w-[260px] text-xs text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}