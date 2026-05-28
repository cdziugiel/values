// features/report-access/api/tenant-report-access-orders.queries.ts
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";

import {
  billingProfiles,
  reportAccessCodes,
  reportAccessOrderItems,
  reportAccessOrders,
  reportAccessProducts,
} from "@/drizzle/schema";

import { controlDb } from "@/server/db/control-db";
import { requirePermission } from "@/server/permissions/require-permission";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

export async function getTenantReportAccessOrdersPageData({
  tenantSlug,
}: {
  tenantSlug: string;
}) {
  const ctx = await requireTenantContext({ tenantSlug });

  requirePermission(ctx, "assessment_project:read");

  const billingProfile = await controlDb.query.billingProfiles.findFirst({
    where: and(
      eq(billingProfiles.ownerType, "tenant"),
      eq(billingProfiles.tenantSlug, tenantSlug),
      isNull(billingProfiles.deletedAt),
    ),
    orderBy: (profiles, { desc }) => [desc(profiles.updatedAt)],
  });

  const orderRows = await controlDb
    .select({
      orderId: reportAccessOrders.id,
      status: reportAccessOrders.status,

      buyerType: reportAccessOrders.buyerType,
      tenantSlug: reportAccessOrders.tenantSlug,

      currency: reportAccessOrders.currency,
      totalNet: reportAccessOrders.totalNet,
      totalVat: reportAccessOrders.totalVat,
      totalGross: reportAccessOrders.totalGross,

      invoiceRequested: reportAccessOrders.invoiceRequested,
      billingProfileId: reportAccessOrders.billingProfileId,
      billingSnapshot: reportAccessOrders.billingSnapshot,

      paymentProvider: reportAccessOrders.paymentProvider,
      paidAt: reportAccessOrders.paidAt,
      cancelledAt: reportAccessOrders.cancelledAt,
      createdAt: reportAccessOrders.createdAt,

      metadata: reportAccessOrders.metadata,
    })
    .from(reportAccessOrders)
    .where(
      and(
        eq(reportAccessOrders.tenantSlug, tenantSlug),
        isNull(reportAccessOrders.deletedAt),
      ),
    )
    .orderBy(desc(reportAccessOrders.createdAt))
    .limit(100);

  const orderIds = orderRows.map((order) => order.orderId);

  const orderItemRows =
    orderIds.length > 0
      ? await controlDb
        .select({
          orderId: reportAccessOrderItems.orderId,
          itemId: reportAccessOrderItems.id,

          productId: reportAccessOrderItems.productId,
          quantity: reportAccessOrderItems.quantity,

          unitNet: reportAccessOrderItems.unitNet,
          unitVat: reportAccessOrderItems.unitVat,
          unitGross: reportAccessOrderItems.unitGross,

          totalNet: reportAccessOrderItems.totalNet,
          totalVat: reportAccessOrderItems.totalVat,
          totalGross: reportAccessOrderItems.totalGross,

          productCode: reportAccessProducts.code,
          productName: reportAccessProducts.name,
        })
        .from(reportAccessOrderItems)
        .innerJoin(
          reportAccessProducts,
          eq(reportAccessProducts.id, reportAccessOrderItems.productId),
        )
        .where(
          and(
            inArray(reportAccessOrderItems.orderId, orderIds),
            isNull(reportAccessOrderItems.deletedAt),
            isNull(reportAccessProducts.deletedAt),
          ),
        )
      : [];

  const orderCodeStatsRows =
    orderIds.length > 0
      ? await controlDb
        .select({
          orderId: reportAccessCodes.orderId,
          status: reportAccessCodes.status,
          count: count(reportAccessCodes.id),
        })
        .from(reportAccessCodes)
        .where(
          and(
            inArray(reportAccessCodes.orderId, orderIds),
            isNull(reportAccessCodes.deletedAt),
          ),
        )
        .groupBy(reportAccessCodes.orderId, reportAccessCodes.status)
      : [];

  const poolStatsRows = await controlDb
    .select({
      productId: reportAccessCodes.productId,
      status: reportAccessCodes.status,
      count: count(reportAccessCodes.id),

      productCode: reportAccessProducts.code,
      productName: reportAccessProducts.name,
      currency: reportAccessProducts.currency,
      priceGross: reportAccessProducts.priceGross,
    })
    .from(reportAccessCodes)
    .innerJoin(
      reportAccessProducts,
      eq(reportAccessProducts.id, reportAccessCodes.productId),
    )
    .where(
      and(
        eq(reportAccessCodes.tenantSlug, tenantSlug),
        isNull(reportAccessCodes.deletedAt),
        isNull(reportAccessProducts.deletedAt),
      ),
    )
    .groupBy(
      reportAccessCodes.productId,
      reportAccessCodes.status,
      reportAccessProducts.code,
      reportAccessProducts.name,
      reportAccessProducts.currency,
      reportAccessProducts.priceGross,
    );

  const itemsByOrderId = new Map<string, typeof orderItemRows>();

  for (const item of orderItemRows) {
    const existing = itemsByOrderId.get(item.orderId) ?? [];
    existing.push(item);
    itemsByOrderId.set(item.orderId, existing);
  }

  const codeStatsByOrderId = new Map<
    string,
    {
      available: number;
      assigned: number;
      redeemed: number;
      expired: number;
      cancelled: number;
      total: number;
    }
  >();

  for (const row of orderCodeStatsRows) {
    if (!row.orderId) continue;

    const current =
      codeStatsByOrderId.get(row.orderId) ?? {
        available: 0,
        assigned: 0,
        redeemed: 0,
        expired: 0,
        cancelled: 0,
        total: 0,
      };

    const value = Number(row.count ?? 0);

    current.total += value;

    if (row.status === "available") current.available += value;
    if (row.status === "assigned") current.assigned += value;
    if (row.status === "redeemed") current.redeemed += value;
    if (row.status === "expired") current.expired += value;
    if (row.status === "cancelled") current.cancelled += value;

    codeStatsByOrderId.set(row.orderId, current);
  }

  const orders = orderRows.map((order) => {
    const metadata =
      typeof order.metadata === "object" &&
        order.metadata !== null &&
        !Array.isArray(order.metadata)
        ? (order.metadata as Record<string, unknown>)
        : {};

    return {
      ...order,
      projectId: typeof metadata.projectId === "string" ? metadata.projectId : null,
      source: typeof metadata.source === "string" ? metadata.source : null,
      placeholderPayment: Boolean(metadata.placeholderPayment),
      items: itemsByOrderId.get(order.orderId) ?? [],
      codeStats:
        codeStatsByOrderId.get(order.orderId) ?? {
          available: 0,
          assigned: 0,
          redeemed: 0,
          expired: 0,
          cancelled: 0,
          total: 0,
        },
    };
  });

  const poolByProductId = new Map<
    string,
    {
      productId: string;
      productCode: string;
      productName: string;
      currency: string;
      priceGross: string | number;
      available: number;
      assigned: number;
      redeemed: number;
      expired: number;
      cancelled: number;
      total: number;
    }
  >();

  for (const row of poolStatsRows) {
    const current =
      poolByProductId.get(row.productId) ?? {
        productId: row.productId,
        productCode: row.productCode,
        productName: row.productName,
        currency: row.currency,
        priceGross: row.priceGross,
        available: 0,
        assigned: 0,
        redeemed: 0,
        expired: 0,
        cancelled: 0,
        total: 0,
      };

    const value = Number(row.count ?? 0);

    current.total += value;

    if (row.status === "available") current.available += value;
    if (row.status === "assigned") current.assigned += value;
    if (row.status === "redeemed") current.redeemed += value;
    if (row.status === "expired") current.expired += value;
    if (row.status === "cancelled") current.cancelled += value;

    poolByProductId.set(row.productId, current);
  }

  const activeProducts = await controlDb
  .select({
    id: reportAccessProducts.id,
    reportTemplateId: reportAccessProducts.reportTemplateId,
    code: reportAccessProducts.code,
    name: reportAccessProducts.name,
    description: reportAccessProducts.description,
    accessCount: reportAccessProducts.accessCount,
    validityDays: reportAccessProducts.validityDays,
    currency: reportAccessProducts.currency,
    priceNet: reportAccessProducts.priceNet,
    vatRate: reportAccessProducts.vatRate,
    priceGross: reportAccessProducts.priceGross,
  })
  .from(reportAccessProducts)
  .where(
    and(
      eq(reportAccessProducts.status, "active"),
      isNull(reportAccessProducts.deletedAt),
    ),
  )
  .orderBy(reportAccessProducts.name);

const pool = Array.from(poolByProductId.values()).sort((left, right) =>
  left.productName.localeCompare(right.productName, "pl", {
    sensitivity: "base",
    numeric: true,
  }),
);

const products = activeProducts.map((product) => {
  const poolItem = poolByProductId.get(product.id);

  return {
    id: product.id,
    reportTemplateId: product.reportTemplateId,
    code: product.code,
    name: product.name,
    description: product.description,
    accessCount: product.accessCount,
    validityDays: product.validityDays,
    currency: product.currency,
    priceNet: product.priceNet,
    vatRate: product.vatRate,
    priceGross: product.priceGross,
    availableCount: poolItem?.available ?? 0,
  };
});

  return {
    tenant: {
      id: ctx.tenantId,
      slug: ctx.tenantSlug,
      name: ctx.tenantSlug,
    },
    billingProfile,
    products,
    orders,
    pool,
  };
}