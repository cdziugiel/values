import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/shared/ui";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Bazowy widok panelu administracyjnego HUMANET VALUES."
      />

      <main className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Tenanty</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            W kolejnym etapie pojawi się lista tenantów dostępnych dla użytkownika.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projekty badawcze</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Po dodaniu bazy danych podłączymy projekty badawcze.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Raporty</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Raporty będą dostępne wyłącznie z kontrolą dostępu i audytem.
          </CardContent>
        </Card>
      </main>
    </>
  );
}