import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/shared/ui";

export default function AssessmentProjectsPage() {
  return (
    <>
      <PageHeader
        title="Projekty badawcze"
        description="Zarządzanie badaniami realizowanymi dla klientów tenanta."
        actions={<Button>Nowy projekt</Button>}
      />

      <EmptyState
        title="Brak projektów badawczych"
        description="Po podłączeniu bazy danych tutaj pojawi się lista projektów badawczych."
      />
    </>
  );
}