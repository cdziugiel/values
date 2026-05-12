import type { Permission } from "./roles";

type PermissionContext = {
  permissions: Permission[];
};

export function requirePermission(
  ctx: PermissionContext,
  permission: Permission,
) {
  if (!ctx.permissions.includes(permission)) {
    throw new Error(`Missing permission: ${permission}`);
  }
}