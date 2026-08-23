import { getSystemNormativeProfilesPageData, NormativeProfilesAdminPage } from "@/features/normative-data";
export const dynamic = "force-dynamic"; export const revalidate = 0;
type PageProps = { searchParams: Promise<{ query?: string; consentStatus?: "all"|"active"|"withdrawn"; rewardStatus?: "all"|"pending"|"issued"|"redeemed"|"expired"|"revoked"; page?: string; }> };
export default async function Page({ searchParams }: PageProps) {
  const p = await searchParams;
  const filters = { query: p.query, consentStatus: p.consentStatus, rewardStatus: p.rewardStatus, page: Number(p.page || 1) };
  const data = await getSystemNormativeProfilesPageData({ filters });
  return <NormativeProfilesAdminPage data={data} filters={filters} />;
}
