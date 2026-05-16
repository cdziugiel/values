"use server";

import crypto from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
    reportAccessCodes,
    reportAccessProducts,
} from "@/drizzle/schema";

import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { controlDb } from "@/server/db/control-db";

export type ReportAccessAdminActionState = {
    status: "idle" | "success" | "error";
    message: string;
    generatedCodes?: string[];
};

const REPORT_ACCESS_ADMIN_PATH = "/dashboard/report-access";

function ok(
    message: string,
    generatedCodes?: string[],
): ReportAccessAdminActionState {
    return {
        status: "success",
        message,
        generatedCodes,
    };
}

function fail(message: string): ReportAccessAdminActionState {
    return {
        status: "error",
        message,
    };
}

function stringValue(formData: FormData, key: string) {
    return String(formData.get(key) ?? "").trim();
}

function nullableStringValue(formData: FormData, key: string) {
    const value = stringValue(formData, key);
    return value || null;
}

function numberValue(formData: FormData, key: string, fallback: number) {
    const value = stringValue(formData, key);

    if (!value) {
        return fallback;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : fallback;
}

function moneyValue(formData: FormData, key: string, fallback = "0.00") {
    const value = stringValue(formData, key).replace(",", ".");

    if (!value) {
        return fallback;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return parsed.toFixed(2);
}

function vatValue(formData: FormData, key: string, fallback = "23.00") {
    const value = stringValue(formData, key).replace(",", ".");

    if (!value) {
        return fallback;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return parsed.toFixed(2);
}

function normalizeCode(value: string) {
    return value
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9_/-]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function createAccessCode() {
    const raw = crypto.randomBytes(12).toString("hex").toUpperCase();

    return `HV-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(
        8,
        12,
    )}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20, 24)}`;
}

function hashAccessCode(code: string) {
    return crypto.createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

function previewAccessCode(code: string) {
    const normalized = code.trim().toUpperCase();

    return `${normalized.slice(0, 7)}…${normalized.slice(-4)}`;
}

export async function createReportAccessProductAction(
    _previousState: ReportAccessAdminActionState,
    formData: FormData,
): Promise<ReportAccessAdminActionState> {
    const actor = await requireSuperAdmin();

    const reportTemplateId = stringValue(formData, "reportTemplateId");
    const code = normalizeCode(stringValue(formData, "code"));
    const name = stringValue(formData, "name");

    if (!reportTemplateId) {
        return fail("Wybierz template raportu.");
    }

    if (!code) {
        return fail("Podaj kod produktu.");
    }

    if (!name) {
        return fail("Podaj nazwę produktu.");
    }

    const now = new Date();

    await controlDb.insert(reportAccessProducts).values({
        reportTemplateId,

        code,
        name,
        description: nullableStringValue(formData, "description"),

        status: stringValue(formData, "status") || "draft",
        accessCount: numberValue(formData, "accessCount", 1),

        currency: stringValue(formData, "currency") || "PLN",
        priceNet: moneyValue(formData, "priceNet"),
        vatRate: vatValue(formData, "vatRate"),
        priceGross: moneyValue(formData, "priceGross"),

        config: {},

        createdAt: now,
        updatedAt: now,
        createdBy: actor.id,
        updatedBy: actor.id,
    });

    revalidatePath(REPORT_ACCESS_ADMIN_PATH);

    return ok("Produkt raportowy został utworzony.");
}

export async function updateReportAccessProductAction(
    _previousState: ReportAccessAdminActionState,
    formData: FormData,
): Promise<ReportAccessAdminActionState> {
    const actor = await requireSuperAdmin();

    const productId = stringValue(formData, "productId");
    const code = normalizeCode(stringValue(formData, "code"));
    const name = stringValue(formData, "name");

    if (!productId) {
        return fail("Brakuje ID produktu.");
    }

    if (!code) {
        return fail("Podaj kod produktu.");
    }

    if (!name) {
        return fail("Podaj nazwę produktu.");
    }

    const existing = await controlDb.query.reportAccessProducts.findFirst({
        where: and(
            eq(reportAccessProducts.id, productId),
            isNull(reportAccessProducts.deletedAt),
        ),
    });

    if (!existing) {
        return fail("Nie znaleziono produktu.");
    }

    await controlDb
        .update(reportAccessProducts)
        .set({
            code,
            name,
            description: nullableStringValue(formData, "description"),

            status: stringValue(formData, "status") || "draft",
            accessCount: numberValue(formData, "accessCount", 1),

            currency: stringValue(formData, "currency") || "PLN",
            priceNet: moneyValue(formData, "priceNet"),
            vatRate: vatValue(formData, "vatRate"),
            priceGross: moneyValue(formData, "priceGross"),

            updatedAt: new Date(),
            updatedBy: actor.id,
        })
        .where(eq(reportAccessProducts.id, productId));

    revalidatePath(REPORT_ACCESS_ADMIN_PATH);

    return ok("Produkt raportowy został zapisany.");
}

export async function archiveReportAccessProductAction(
    _previousState: ReportAccessAdminActionState,
    formData: FormData,
): Promise<ReportAccessAdminActionState> {
    const actor = await requireSuperAdmin();

    const productId = stringValue(formData, "productId");

    if (!productId) {
        return fail("Brakuje ID produktu.");
    }

    await controlDb
        .update(reportAccessProducts)
        .set({
            status: "archived",
            deletedAt: new Date(),
            updatedAt: new Date(),
            updatedBy: actor.id,
        })
        .where(eq(reportAccessProducts.id, productId));

    revalidatePath(REPORT_ACCESS_ADMIN_PATH);

    return ok("Produkt został zarchiwizowany.");
}

export async function generateReportAccessCodesAction(
    _previousState: ReportAccessAdminActionState,
    formData: FormData,
): Promise<ReportAccessAdminActionState> {
    const actor = await requireSuperAdmin();

    const productId = stringValue(formData, "productId");
    const tenantSlug = nullableStringValue(formData, "tenantSlug");

    const assignedToEmail = nullableStringValue(formData, "assignedToEmail");
    const assignedToUserId = nullableStringValue(formData, "assignedToUserId");

    const assessmentProjectId = nullableStringValue(formData, "assessmentProjectId");
    const assessmentSessionId = nullableStringValue(formData, "assessmentSessionId");
    const assessmentAccessLinkId = nullableStringValue(
    formData,
    "assessmentAccessLinkId",
    );

    const quantity = Math.min(Math.max(numberValue(formData, "quantity", 1), 1), 100);

    if (!productId) {
        return fail("Wybierz produkt.");
    }

    const product = await controlDb.query.reportAccessProducts.findFirst({
        where: and(
            eq(reportAccessProducts.id, productId),
            isNull(reportAccessProducts.deletedAt),
        ),
    });

    if (!product) {
        return fail("Nie znaleziono produktu.");
    }

    const now = new Date();
    const generatedCodes: string[] = [];

    for (let index = 0; index < quantity; index += 1) {
        let code = createAccessCode();
        let codeHash = hashAccessCode(code);

        let exists = await controlDb.query.reportAccessCodes.findFirst({
            where: and(
                eq(reportAccessCodes.codeHash, codeHash),
                isNull(reportAccessCodes.deletedAt),
            ),
        });

        while (exists) {
            code = createAccessCode();
            codeHash = hashAccessCode(code);

            exists = await controlDb.query.reportAccessCodes.findFirst({
                where: and(
                    eq(reportAccessCodes.codeHash, codeHash),
                    isNull(reportAccessCodes.deletedAt),
                ),
            });
        }
        const validUntil =
            typeof product.validityDays === "number" && product.validityDays > 0
                ? new Date(now.getTime() + product.validityDays * 24 * 60 * 60 * 1000)
                : null;
await controlDb.insert(reportAccessCodes).values({
  tenantSlug,
  productId,

  codeHash,
  codePreview: previewAccessCode(code),

  status:
    assignedToEmail ||
    assignedToUserId ||
    assessmentProjectId ||
    assessmentSessionId ||
    assessmentAccessLinkId
      ? "assigned"
      : "available",

  assignedToEmail,
  assignedToUserId,

  assessmentProjectId,
  assessmentSessionId,
  assessmentAccessLinkId,

  validFrom: now,
  validUntil,

  metadata: {
    generatedFrom: "admin_panel",
    assignment: {
      tenantSlug,
      assignedToEmail,
      assignedToUserId,
      assessmentProjectId,
      assessmentSessionId,
      assessmentAccessLinkId,
    },
  },

  createdAt: now,
  updatedAt: now,
  createdBy: actor.id,
  updatedBy: actor.id,
});

        generatedCodes.push(code);
    }

    revalidatePath(REPORT_ACCESS_ADMIN_PATH);

    return ok(`Wygenerowano kodów: ${generatedCodes.length}.`, generatedCodes);
}

export async function revokeReportAccessCodeAction(
    _previousState: ReportAccessAdminActionState,
    formData: FormData,
): Promise<ReportAccessAdminActionState> {
    const actor = await requireSuperAdmin();

    const codeId = stringValue(formData, "codeId");

    if (!codeId) {
        return fail("Brakuje ID kodu.");
    }

    await controlDb
        .update(reportAccessCodes)
        .set({
            status: "cancelled",
            updatedAt: new Date(),
            updatedBy: actor.id,
        })
        .where(eq(reportAccessCodes.id, codeId));

    revalidatePath(REPORT_ACCESS_ADMIN_PATH);

    return ok("Kod został unieważniony.");
}