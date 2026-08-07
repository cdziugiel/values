#!/usr/bin/env node
/**
 * HUMANET VALUES hotfix v5.1
 *
 * Fixes:
 * 1) PostgreSQL/Drizzle conflict target for partial unique index
 *    consultation_entitlements(order_id) WHERE order_id IS NOT NULL.
 * 2) Self-heals paid marketing orders on the order-success page, so an
 *    entitlement that failed to be created during the payment webhook can
 *    be recreated without another payment.
 *
 * No DB schema changes. No migration required.
 */

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const BACKUP_ROOT = path.join(
  ROOT,
  ".humanet-installer-backup",
  `values-hotfix-v5-1-${new Date().toISOString().replace(/[:.]/g, "-")}`,
);

function log(message) {
  console.log(`[humanet-values-hotfix-v5.1] ${message}`);
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function read(file) {
  return fs.readFile(path.join(ROOT, file), "utf8");
}

async function backup(file, content) {
  if (DRY_RUN) return;
  const destination = path.join(BACKUP_ROOT, file);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, content, "utf8");
}

async function writeChanged(file, before, after) {
  if (before === after) {
    log(`bez zmian: ${file}`);
    return false;
  }

  log(`${DRY_RUN ? "dry-run patch" : "patch"}: ${file}`);

  if (!DRY_RUN) {
    await backup(file, before);
    await fs.writeFile(path.join(ROOT, file), after, "utf8");
  }

  return true;
}

async function assertValuesRepo() {
  const packagePath = path.join(ROOT, "package.json");
  if (!(await exists(packagePath))) {
    throw new Error("Uruchom instalator w katalogu głównym repo humanet-values.");
  }

  const pkg = JSON.parse(await fs.readFile(packagePath, "utf8"));
  if (pkg.name !== "humanet-values") {
    throw new Error(
      `Oczekiwano package.json.name = "humanet-values", znaleziono ${JSON.stringify(pkg.name)}.`,
    );
  }
}

async function patchPurchaseFlowMutations() {
  const file = "features/purchase-flow/api/purchase-flow.mutations.ts";
  const before = await read(file);

  if (
    before.includes(
      "// @humanet-consultation-order-conflict-hotfix-v5-1",
    )
  ) {
    log(`bez zmian: ${file} (hotfix już obecny)`);
    return;
  }

  const problematic = /\.onConflictDoNothing\(\{\s*target:\s*consultationEntitlements\.orderId,\s*\}\);/g;
  const matches = [...before.matchAll(problematic)];

  if (matches.length !== 1) {
    throw new Error(
      `Oczekiwano dokładnie jednego ON CONFLICT na consultationEntitlements.orderId w ${file}, znaleziono ${matches.length}. ` +
      `Nie wykonano automatycznej zmiany.`,
    );
  }

  const after = before.replace(
    problematic,
    `.onConflictDoNothing();\n      // @humanet-consultation-order-conflict-hotfix-v5-1`,
  );

  await writeChanged(file, before, after);
}

async function patchOrderSuccessSelfHeal() {
  const file = "app/(protected)/my/orders/[orderId]/success/page.tsx";
  const before = await read(file);

  if (
    before.includes(
      "// @humanet-consultation-paid-order-self-heal-v5-1",
    )
  ) {
    log(`bez zmian: ${file} (self-heal już obecny)`);
    return;
  }

  let after = before;

  // Add finalizeMarketingPurchaseOrder to the existing purchase-flow import.
  if (!after.includes("finalizeMarketingPurchaseOrder")) {
    const importPattern =
      /import\s*\{\s*getOwnedMarketingOrder,\s*OrderSuccessPage,\s*\}\s*from\s*"@\/features\/purchase-flow";/m;

    if (!importPattern.test(after)) {
      throw new Error(
        `Nie znaleziono oczekiwanego importu purchase-flow w ${file}.`,
      );
    }

    after = after.replace(
      importPattern,
      `import {\n  finalizeMarketingPurchaseOrder,\n  getOwnedMarketingOrder,\n  OrderSuccessPage,\n} from "@/features/purchase-flow";`,
    );
  }

  const oldBlock = `  const data = await getOwnedMarketingOrder(orderId);

  if (!data) notFound();

  return <OrderSuccessPage data={data} />;`;

  const newBlock = `  let data = await getOwnedMarketingOrder(orderId);

  if (!data) notFound();

  /**
   * @humanet-consultation-paid-order-self-heal-v5-1
   *
   * Payment verification/report grant remains the source of truth.
   * This only retries idempotent marketing fulfillment for an order that
   * is already marked as paid. It never marks a pending order as paid.
   */
  if (data.order.status === "paid") {
    await finalizeMarketingPurchaseOrder({ orderId });
    data = (await getOwnedMarketingOrder(orderId)) ?? data;
  }

  return <OrderSuccessPage data={data} />;`;

  if (!after.includes(oldBlock)) {
    throw new Error(
      `Nie znaleziono oczekiwanego bloku getOwnedMarketingOrder w ${file}.`,
    );
  }

  after = after.replace(oldBlock, newBlock);

  await writeChanged(file, before, after);
}

async function main() {
  log("start");
  await assertValuesRepo();

  await patchPurchaseFlowMutations();
  await patchOrderSuccessSelfHeal();

  if (DRY_RUN) {
    log("dry-run zakończony — nic nie zapisano");
  } else {
    log(`backup zmienionych plików: ${path.relative(ROOT, BACKUP_ROOT)}`);
    log("gotowe");
  }

  log("brak migracji DB w tym hotfixie");
  log("uruchom: npm test && npm run lint && npm run build");
}

main().catch((error) => {
  console.error("[humanet-values-hotfix-v5.1] błąd:", error);
  process.exitCode = 1;
});
