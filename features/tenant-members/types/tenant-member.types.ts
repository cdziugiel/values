import type {
  TenantMemberRole,
  TenantMemberStatus,
} from "../forms/tenant-member.schema";

export type TenantMemberListItem = {
  membershipId: string;
  userId: string;
  email: string;
  name: string | null;
  role: TenantMemberRole;
  status: TenantMemberStatus;
  createdAt: Date;
  updatedAt: Date;
};