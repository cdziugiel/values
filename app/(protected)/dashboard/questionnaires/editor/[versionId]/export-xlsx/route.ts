// app/api/secure/questionnaire-versions/[versionId]/export-xlsx/route.ts

import { NextResponse } from "next/server";
import { buildQuestionnaireVersionXlsx } from "@/features/questionnaire-admin/api/questionnaire-xlsx.export";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ versionId: string }> },
) {
    const { versionId } = await params;

    const buffer = await buildQuestionnaireVersionXlsx(versionId);

    return new NextResponse(buffer, {
        headers: {
            "Content-Type":
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="questionnaire-${versionId}.xlsx"`,
            "Cache-Control": "no-store",
        },
    });
}