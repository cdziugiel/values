import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell, EmptyState, PageHeader } from "@/shared/ui";

export default function PublicHomePage() {
  return (
    <AppShell>
      <PageHeader
        title="HUMANET VALUES"
        description="Fundament nowej platformy do obsługi psychometrii, diagnozy wartości, projektów badawczych, raportów i pracy wielu tenantów."
        actions={<Badge variant="secondary">v2 foundation</Badge>}
      />

      <main className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Architektura</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            Feature-oriented, multi-tenant, security-first.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Psychometria</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            Kwestionariusze, scoring i raporty będą wersjonowane oraz audytowalne.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Etap</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
            <p>Aktualnie budujemy fundament aplikacji.</p>
            <Button variant="outline">Panel w przygotowaniu</Button>
          </CardContent>
        </Card>
      </main>

      <section className="mt-8">
        <EmptyState
          title="Następny krok: layout publiczny i chroniony"
          description="Budujemy bazową strukturę aplikacji, zanim przejdziemy do tenantów, logowania i bazy danych."
        />
      </section>
    </AppShell>
  );
}