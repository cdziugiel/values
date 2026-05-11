import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/shared/ui";

type TenantDashboardPageProps = {
  params: Promise<{
    tenantSlug: string;
  }>;
};

export default async function TenantDashboardPage({
  params,
}: TenantDashboardPageProps) {
  const { tenantSlug } = await params;

  return (
    <>
      <PageHeader
        title={`Tenant: ${tenantSlug}`}
        description="Bazowy widok roboczy tenanta. Docelowo dane będą pobierane przez TenantContext."
      />

      <main className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Klienci</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Organizacje badane przez tego tenanta.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Respondenci</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Uczestnicy badań, z separacją danych identyfikujących od wyników.
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