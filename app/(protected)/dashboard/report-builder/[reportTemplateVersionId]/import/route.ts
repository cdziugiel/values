// HUMANET installer: report-builder-full-transfer-v1
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { importReportBuilderTransferPackageAsSuperAdmin } from "@/features/report-builder/api/report-builder-transfer.mutations";
import { reportBuilderTransferPackageSchema } from "@/features/report-builder/forms/report-builder-transfer.schema";
import { ReportBuilderTransferError } from "@/features/report-builder/lib/report-builder-transfer";
import { assertReportBuilderTransferRateLimit } from "@/features/report-builder/lib/report-builder-transfer-rate-limit";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_IMPORT_FILE_SIZE = 20 * 1024 * 1024;

function validationIssues(
  issues: Array<{
    path: PropertyKey[];
    message: string;
  }>,
) {
  return issues.slice(0, 20).map((issue) => ({
    path: issue.path.map(String).join("."),
    message: issue.message,
  }));
}

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      reportTemplateVersionId: string;
    }>;
  },
) {
  const actor = await requireSuperAdmin();
  const { reportTemplateVersionId } = await params;

  try {
    assertReportBuilderTransferRateLimit({
      actorUserId: actor.id,
      operation: "import",
    });

    const formData = await request.formData();
    const fileValue = formData.get("file");

    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Nie przesłano pliku importu.",
        },
        { status: 400 },
      );
    }

    if (fileValue.size <= 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "Plik importu jest pusty.",
        },
        { status: 400 },
      );
    }

    if (fileValue.size > MAX_IMPORT_FILE_SIZE) {
      return NextResponse.json(
        {
          ok: false,
          message: "Plik jest zbyt duży. Maksymalny rozmiar importu to 20 MB.",
        },
        { status: 413 },
      );
    }

    const rawText = await fileValue.text();

    let rawPayload: unknown;

    try {
      rawPayload = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        {
          ok: false,
          message: "Plik nie zawiera poprawnego JSON.",
        },
        { status: 422 },
      );
    }

    const parsed = reportBuilderTransferPackageSchema.safeParse(rawPayload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Plik nie jest prawidłowym eksportem HUMANET Report Builder v1.",
          issues: validationIssues(parsed.error.issues),
        },
        { status: 422 },
      );
    }

    const payloadSha256 = createHash("sha256")
      .update(rawText, "utf8")
      .digest("hex");

    const result = await importReportBuilderTransferPackageAsSuperAdmin({
      actorUserId: actor.id,
      reportTemplateVersionId,
      payload: parsed.data,
      payloadSha256,
    });

    return NextResponse.json({
      ok: true,
      message: `Import zakończony. Zaimportowano ${result.importedPageCount} stron.`,
      importedPageCount: result.importedPageCount,
      replacedPageCount: result.replacedPageCount,
    });
  } catch (error) {
    if (error instanceof ReportBuilderTransferError) {
      return NextResponse.json(
        {
          ok: false,
          message: error.message,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message:
          "Nie udało się zaimportować raportu. Zawartość docelowej wersji nie została częściowo zmieniona.",
      },
      { status: 500 },
    );
  }
}
