
import { MyAssessmentPage } from "@/features/my-assessment";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default function Page() {
  return <MyAssessmentPage />;
}