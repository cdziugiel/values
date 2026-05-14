import type { ClientOrganizationStatus } from "../forms/client-organization.schema";

export type ClientOrganizationListItem = {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  status: ClientOrganizationStatus;
  createdAt: Date;
  updatedAt: Date;
};