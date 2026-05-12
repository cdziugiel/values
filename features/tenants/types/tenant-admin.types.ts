export type SystemTenantListItem = {
  id: string;
  slug: string;
  name: string;
  status: string;
  createdAt: Date;
  databaseName: string | null;
  migrationStatus: string | null;
  schemaVersion: number | null;
  lastMigratedAt: Date | null;
  ownerEmail: string | null;
};