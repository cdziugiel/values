// @humanet-respondent-directory-v1
// app/(protected)/dashboard/respondents/page.tsx

import { AdminRespondentsPage } from "@/features/respondents";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return <AdminRespondentsPage />;
}
