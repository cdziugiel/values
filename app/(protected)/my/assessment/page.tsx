import { MyAssessmentPage } from "@/features/my-assessment";
import type { MyAssessmentTabKey } from "@/features/my-assessment/components/my-assessment-tabs";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const allowedTabs: MyAssessmentTabKey[] = [
  "todo",
  "in_progress",
  "invitations",
  "completed",
  "reports",
];

function resolveActiveTab(value: string | string[] | undefined): MyAssessmentTabKey | undefined {
  const tab = Array.isArray(value) ? value[0] : value;

  if (!tab) {
    return undefined;
  }

  if (allowedTabs.includes(tab as MyAssessmentTabKey)) {
    return tab as MyAssessmentTabKey;
  }

  return undefined;
}

type PageProps = {
  searchParams?: Promise<{
    tab?: string | string[];
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const activeTab = resolveActiveTab(resolvedSearchParams?.tab);

  return <MyAssessmentPage activeTab={activeTab} />;
}