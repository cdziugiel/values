import { z } from "zod";

export const tenantMemberRoleSchema = z.enum([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "TENANT_MEMBER",
  "CONSULTANT",
  "CLIENT_COMPANY_ADMIN",
  "CLIENT_MANAGER",
  "PSYCHOMETRIC_ADMIN",
  "BILLING_ADMIN",
]);

export const tenantMemberStatusSchema = z.enum([
  "active",
  "invited",
  "disabled",
  "removed",
]);

export const addTenantMemberSchema = z.object({
  tenantSlug: z.string().min(2),
  email: z.string().email(),
  name: z.string().max(160).optional().or(z.literal("")),
  role: tenantMemberRoleSchema,
});

export const updateTenantMemberSchema = z.object({
  tenantSlug: z.string().min(2),
  membershipId: z.string().uuid(),
  role: tenantMemberRoleSchema,
  status: tenantMemberStatusSchema,
});

export const archiveTenantMemberSchema = z.object({
  tenantSlug: z.string().min(2),
  membershipId: z.string().uuid(),
});

export type TenantMemberRole = z.infer<typeof tenantMemberRoleSchema>;
export type TenantMemberStatus = z.infer<typeof tenantMemberStatusSchema>;
export type AddTenantMemberInput = z.infer<typeof addTenantMemberSchema>;
export type UpdateTenantMemberInput = z.infer<typeof updateTenantMemberSchema>;
export type ArchiveTenantMemberInput = z.infer<typeof archiveTenantMemberSchema>;

export const TENANT_MEMBER_ROLE_OPTIONS: {
  value: TenantMemberRole;
  label: string;
  description: string;
}[] = [
  {
    value: "TENANT_OWNER",
    label: "Owner",
    description: "Pełna odpowiedzialność za tenanta.",
  },
  {
    value: "TENANT_ADMIN",
    label: "Admin",
    description: "Administracja tenantem i użytkownikami.",
  },
  {
    value: "TENANT_MEMBER",
    label: "Member",
    description: "Podstawowy dostęp do panelu tenanta.",
  },
  {
    value: "CONSULTANT",
    label: "Consultant",
    description: "Dostęp konsultanta do projektów, respondentów i raportów.",
  },
  {
    value: "CLIENT_COMPANY_ADMIN",
    label: "Client company admin",
    description: "Administrator po stronie klienta.",
  },
  {
    value: "CLIENT_MANAGER",
    label: "Client manager",
    description: "Menedżer po stronie klienta.",
  },
  {
    value: "PSYCHOMETRIC_ADMIN",
    label: "Psychometric admin",
    description: "Administracja psychometrią, wynikami i raportami.",
  },
  {
    value: "BILLING_ADMIN",
    label: "Billing admin",
    description: "Dostęp do obszarów rozliczeniowych.",
  },
];

export const TENANT_MEMBER_STATUS_OPTIONS: {
  value: TenantMemberStatus;
  label: string;
}[] = [
  { value: "active", label: "active" },
  { value: "invited", label: "invited" },
  { value: "disabled", label: "disabled" },
  { value: "removed", label: "removed" },
];