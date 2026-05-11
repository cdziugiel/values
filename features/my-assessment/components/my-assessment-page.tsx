import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/shared/ui";

const defaultQuestionnaires = [
  {
    code: "VALUES",
    name: "HUMANET Values",
    description: "Kwestionariusz dotyczący stylów wartości i sposobu funkcjonowania.",
    status: "available",
  },
  {
    code: "CHANGE",
    name: "HUMANET Change",
    description: "Kwestionariusz dotyczący gotowości, warunków i faz zmiany.",
    status: "available",
  },
  {
    code: "SAV",
    name: "Style Adaptacyjno-Wartościowe",
    description: "Kwestionariusz stylów adaptacyjno-wartościowych.",
    status: "soon",
  },
];

export function MyAssessmentPage() {
  return (
    <>
      <PageHeader
        title="Twoje badanie"
        description="Wybierz kwestionariusz, który chcesz wypełnić w ramach domyślnego badania HUMANET VALUES."
        actions={<Badge variant="secondary">Domyślne badanie</Badge>}
      />

      <main className="grid gap-6 md:grid-cols-3">
        {defaultQuestionnaires.map((questionnaire) => (
          <Card key={questionnaire.code}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <CardTitle>{questionnaire.name}</CardTitle>
                <Badge
                  variant={
                    questionnaire.status === "available"
                      ? "default"
                      : "secondary"
                  }
                >
                  {questionnaire.status === "available"
                    ? "Dostępny"
                    : "Wkrótce"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <p className="text-sm leading-6 text-muted-foreground">
                {questionnaire.description}
              </p>

              <Button
                className="w-full"
                disabled={questionnaire.status !== "available"}
              >
                Wybierz kwestionariusz
              </Button>
            </CardContent>
          </Card>
        ))}
      </main>

      <section className="mt-8">
        <EmptyState
          title="To jest widok dla użytkownika bez panelu administracyjnego"
          description="Po podłączeniu logowania system automatycznie przekieruje tutaj osoby, które nie są tenant adminem, konsultantem ani administratorem globalnym."
        />
      </section>
    </>
  );
}