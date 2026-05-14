export type RespondentListItem = {
  id: string;
  externalCode: string | null;
  clientOrganizationId: string | null;
  clientOrganizationName: string | null;
  clientUnitId: string | null;
  clientUnitName: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RespondentOrganizationOption = {
  id: string;
  name: string;
};

export type RespondentUnitOption = {
  id: string;
  name: string;
  clientOrganizationId: string;
};