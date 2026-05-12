export function normalizeTenantDatabaseName(tenantSlug: string) {
  const normalizedSlug = tenantSlug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);

  if (!normalizedSlug) {
    throw new Error("Invalid tenant slug for database name.");
  }

  return `humanet_tenant_${normalizedSlug}`;
}