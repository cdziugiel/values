import type { ClientUnitType } from "../forms/client-unit.schema";

export type ClientUnitListItem = {
  id: string;
  clientOrganizationId: string;
  clientOrganizationName: string;
  parentId: string | null;
  parentName: string | null;
  name: string;
  type: ClientUnitType;
  createdAt: Date;
  updatedAt: Date;
};

export type ClientUnitOrganizationOption = {
  id: string;
  name: string;
};

export type ClientUnitParentOption = {
  id: string;
  name: string;
  clientOrganizationId: string;
};