// HUMANET installer: report-builder-full-transfer-v1
import { NextResponse } from "next/server";

import { buildReportBuilderTransferPackage } from "@/features/report-builder/api/report-builder-transfer.queries";
import {
  ReportBuilderTransferError,
  sanitizeReportTransferFilenameSegment,
} from "@/features/report-builder/lib/report-builder-transfer";
import { assertReportBuilderTransferRateLimit } from "@/features/report-builder/lib/report-builder-transfer-rate-limit";
import { writeSystemAuditLog } from "@/server/audit/write-system-audit-log";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: Request,
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
      operation: "export",
    });

    const payload = await buildReportBuilderTransferPackage({
      reportTemplateVersionId,
    });

    if (!payload) {
      return NextResponse.json(
        {
          ok: false,
          message: "Nie znaleziono wersji raportu.",
        },
        { status: 404 },
      );
    }

    await writeSystemAuditLog({
      actorUserId: actor.id,
      actorRole: actor.globalRole,
      action: "report_builder_exported",
      entityType: "report_template_version",
      entityId: reportTemplateVersionId,
      after: {
        format: payload.format,
        formatVersion: payload.formatVersion,
        pageCount: payload.pages.length,
        sourceTemplateCode: payload.source.reportTemplate.code,
        sourceTemplateVersion: payload.source.reportTemplateVersion.version,
      },
    });

    const templateCode = sanitizeReportTransferFilenameSegment(
      payload.source.reportTemplate.code,
    );
    const version = sanitizeReportTransferFilenameSegment(
      payload.source.reportTemplateVersion.version,
    );

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="humanet-report-${templateCode}-${version}.json"`,
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof ReportBuilderTransferError) {
      return NextResponse.json(
        {
          ok: false,
          message: error.message,
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message: "Nie udało się przygotować eksportu raportu.",
      },
      { status: 500 },
    );
  }
}
