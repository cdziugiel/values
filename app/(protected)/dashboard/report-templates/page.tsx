// app/(protected)/dashboard/report-templates/page.tsx
import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { ReportTemplateAdminListPage } from "@/features/report-builder/components/report-template-admin-list-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReportTemplatesPage() {
  await requireSuperAdmin();

  return <ReportTemplateAdminListPage />;
}