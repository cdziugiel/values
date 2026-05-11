import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/shared/ui";
import { getMyDefaultAssessment } from "../api/my-assessment.queries";
import { QuestionnaireSelectionCard } from "./questionnaire-selection-card";

export async function MyAssessmentPage() {
  const assessment = await getMyDefaultAssessment();

  return (
    <>
      <PageHeader
        title={assessment.name}
        description={assessment.description}
        actions={<Badge variant="secondary">Domyślne badanie</Badge>}
      />

      <main className="grid gap-6 md:grid-cols-3">
        {assessment.questionnaires.map((questionnaire) => (
          <QuestionnaireSelectionCard
            key={questionnaire.code}
            questionnaire={questionnaire}
          />
        ))}
      </main>

      <section className="mt-8">
        <EmptyState
          title="Widok użytkownika końcowego"
          description="Ten ekran jest przeznaczony dla osób, które nie mają dostępu do panelu administracyjnego. Docelowo pokażemy tu dostępne badania, rozpoczęte sesje i odblokowane raporty."
        />
      </section>
    </>
  );
}