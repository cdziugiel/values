import { requireSuperAdmin } from "@/server/auth/require-super-admin";

import { getReportAccessAdminData } from "@/features/report-access/api/report-access-admin.queries";
import { ReportAccessAdminPage } from "@/features/report-access/components/report-access-admin-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReportAccessDashboardPage() {
  await requireSuperAdmin();

  const data = await getReportAccessAdminData();

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
      <ReportAccessAdminPage data={data} />
    </main>
  );
}