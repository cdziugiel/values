import {
  listSystemNormativeProfilesForExport,
} from "@/features/normative-data";
import {
  buildNormativeProfilesXlsx,
} from "@/features/normative-data/lib/normative-profile-xlsx";

// @humanet-normative-admin-v1_1_2-r2-route

export const dynamic =
  "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  const rows =
    await listSystemNormativeProfilesForExport();

  const workbook =
    await buildNormativeProfilesXlsx(
      rows,
    );

  const date =
    new Date()
      .toISOString()
      .slice(0, 10);

  return new Response(
    new Uint8Array(workbook),
    {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          `attachment; filename="humanet-normative-data-${date}.xlsx"`,
        "Cache-Control":
          "private, no-store, max-age=0",
        "X-Content-Type-Options":
          "nosniff",
      },
    },
  );
}
