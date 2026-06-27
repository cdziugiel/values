import { notFound } from "next/navigation";
import { getSystemNormativeProfileDetail, NormativeProfileAdminDetail } from "@/features/normative-data";
export const dynamic = "force-dynamic"; export const revalidate = 0;
type PageProps = { params: Promise<{ profileId: string }> };
export default async function Page({ params }: PageProps) { const { profileId } = await params; const profile = await getSystemNormativeProfileDetail({ profileId }); if (!profile) notFound(); return <NormativeProfileAdminDetail profile={profile} />; }
