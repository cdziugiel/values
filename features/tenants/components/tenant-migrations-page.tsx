import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { PageHeader } from "@/shared/ui";

import { listTenantMigrationStatuses } from "../api/tenant-migration.queries";
import {
    MigrateAllTenantsButton,
    MigrateTenantButton,
    ReprovisionTenantDatabaseButton,
} from "./tenant-migration-actions";

function formatDate(value: Date | null) {
    if (!value) {
        return "—";
    }

    return new Intl.DateTimeFormat("pl-PL", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(value);
}

function getMigrationBadgeVariant(status: string | null) {
    if (status === "success") {
        return "secondary";
    }

    if (status === "failed") {
        return "destructive";
    }

    if (status === "running") {
        return "default";
    }

    return "outline";
}

export async function TenantMigrationsPage() {
    await requireSuperAdmin();

    const tenants = await listTenantMigrationStatuses();

    return (
        <div className="space-y-8">
            <PageHeader
                title="Migracje baz tenantów"
                description="Uruchamianie przygotowanych migracji Drizzle na pojedynczych lub wszystkich aktywnych bazach tenantów."
            />

            <Card>
                <CardHeader>
                    <CardTitle>Migracje zbiorcze</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    <p className="max-w-3xl text-sm text-muted-foreground">
                        Ta akcja nie generuje nowych migracji. Uruchamia pliki migracji
                        znajdujące się w <code>drizzle/migrations/tenant</code> na bazach
                        aktywnych tenantów.
                    </p>

                    <MigrateAllTenantsButton />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Status tenantów</CardTitle>
                </CardHeader>

                <CardContent>
                    {tenants.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
                            Brak tenantów.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1000px] text-left text-sm">
                                <thead className="border-b text-xs uppercase text-muted-foreground">
                                    <tr>
                                        <th className="py-3 pr-4 font-medium">Tenant</th>
                                        <th className="py-3 pr-4 font-medium">Status tenanta</th>
                                        <th className="py-3 pr-4 font-medium">Baza</th>
                                        <th className="py-3 pr-4 font-medium">Migracje</th>
                                        <th className="py-3 pr-4 font-medium">Wersja</th>
                                        <th className="py-3 pr-4 font-medium">
                                            Ostatnia migracja
                                        </th>
                                        <th className="py-3 pr-4 font-medium">Aktualizacja</th>
                                        <th className="py-3 pr-4 font-medium">Akcje</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y">
                                    {tenants.map((tenant) => (
                                        <tr key={tenant.tenantId}>
                                            <td className="py-3 pr-4">
                                                <div className="font-medium">{tenant.tenantName}</div>
                                                <div className="font-mono text-xs text-muted-foreground">
                                                    {tenant.tenantSlug}
                                                </div>
                                            </td>

                                            <td className="py-3 pr-4">
                                                <Badge variant="outline">{tenant.tenantStatus}</Badge>
                                            </td>

                                            <td className="py-3 pr-4 font-mono text-xs">
                                                {tenant.databaseName ?? "—"}
                                            </td>

                                            <td className="py-3 pr-4">
                                                <Badge
                                                    variant={getMigrationBadgeVariant(
                                                        tenant.migrationStatus,
                                                    )}
                                                >
                                                    {tenant.migrationStatus ?? "missing"}
                                                </Badge>
                                            </td>

                                            <td className="py-3 pr-4">
                                                {tenant.schemaVersion ?? "—"}
                                            </td>

                                            <td className="py-3 pr-4">
                                                {formatDate(tenant.lastMigratedAt)}
                                            </td>

                                            <td className="py-3 pr-4">
                                                {formatDate(tenant.updatedAt)}
                                            </td>

                                            <td className="py-3 pr-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {tenant.tenantStatus === "active" ? (
                                                        <>
                                                            <MigrateTenantButton tenantId={tenant.tenantId} />

                                                            {tenant.migrationStatus !== "success" ? (
                                                                <ReprovisionTenantDatabaseButton tenantId={tenant.tenantId} />
                                                            ) : null}

                                                            <Link
                                                                href={`/t/${tenant.tenantSlug}/dashboard`}
                                                                className="inline-flex h-9 items-center rounded-md border px-3 text-sm"
                                                            >
                                                                Otwórz
                                                            </Link>
                                                        </>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">
                                                            Tenant nieaktywny
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}