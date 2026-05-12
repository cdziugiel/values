import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/shared/ui";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

type TenantDashboardPageProps = {
  params: Promise<{
    tenantSlug: string;
  }>;
};

export default async function TenantDashboardPage({
  params,
}: TenantDashboardPageProps) {
  const { tenantSlug } = await params;

  const ctx = await requireTenantContext({
    tenantSlug,
  });

  return (
    <>
      <PageHeader
        title={`Tenant: ${ctx.tenantName}`}
        description="Bazowy widok roboczy tenanta. Dostęp jest już sprawdzany przez TenantContext."
      />

      <main className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Klienci</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Organizacje badane przez tenanta {ctx.tenantSlug}.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Respondenci</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Uczestnicy badań z kontrolą dostępu tenantowego.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sesje badawcze</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Wypełnienia kwestionariuszy i statusy respondentów.
          </CardContent>
        </Card>
      </main>
    </>
  );
}