export const dynamic = "force-dynamic";
export const revalidate = 0;

import { QuestionnairesAdminPage } from "@/features/questionnaire-admin/components/questionnaires-admin-page";

type PageProps = {
  searchParams: Promise<{
    archived?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { archived } = await searchParams;

  return <QuestionnairesAdminPage showArchivedOnly={archived === "1"} />;
}