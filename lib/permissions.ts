// Client-safe permission catalogue. Roles store a list of these keys; "*" means everything.

export const PERMISSION_GROUPS = [
  {
    module: "dashboard",
    label: "Dashboard",
    permissions: [{ key: "dashboard.view", label: "View dashboard & reports" }],
  },
  {
    module: "orders",
    label: "Orders",
    permissions: [
      { key: "orders.view", label: "View orders" },
      { key: "orders.edit", label: "Change status & edit orders" },
      { key: "orders.delete", label: "Delete orders" },
      { key: "orders.export", label: "Export CSV & print invoices" },
    ],
  },
  {
    module: "customers",
    label: "Customers",
    permissions: [
      { key: "customers.view", label: "View customers" },
      { key: "customers.block", label: "Block / unblock numbers" },
    ],
  },
  {
    module: "catalog",
    label: "Store",
    permissions: [
      { key: "products.manage", label: "Products, categories, price & stock" },
      { key: "content.manage", label: "Main site settings & landing pages (create, content, URL)" },
      { key: "checkout.manage", label: "Landing checkout forms & delivery zones" },
    ],
  },
  {
    module: "dealers",
    label: "Dealers",
    permissions: [
      { key: "dealers.view", label: "View dealers & targets" },
      { key: "dealers.manage", label: "Approve dealers & set targets" },
    ],
  },
  {
    module: "marketing",
    label: "Marketing",
    permissions: [{ key: "marketing.manage", label: "Facebook Pixel & Conversions API" }],
  },
  {
    module: "system",
    label: "System",
    permissions: [
      { key: "settings.manage", label: "Store settings & blocked numbers" },
      { key: "users.manage", label: "Staff users & roles" },
      { key: "logs.view", label: "View activity logs" },
    ],
  },
] as const;

export type Permission = (typeof PERMISSION_GROUPS)[number]["permissions"][number]["key"];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));

export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && (ALL_PERMISSIONS as string[]).includes(value);
}

/** True when a permission list grants `perm` ("*" grants everything). */
export function hasPermission(granted: readonly string[], perm: Permission): boolean {
  return granted.includes("*") || granted.includes(perm);
}

export const SUPER_ADMIN_SLUG = "super-admin";

export const PERMISSION_LABEL: Record<string, string> = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => [p.key, `${g.label}: ${p.label}`])),
);

/** Which permission each admin page needs (used for the menu and page guards). */
export const PAGE_PERMISSION: Record<string, Permission> = {
  "/admin": "dashboard.view",
  "/admin/orders": "orders.view",
  "/admin/customers": "customers.view",
  "/admin/products": "products.manage",
  "/admin/categories": "products.manage",
  "/admin/dealers": "dealers.view",
  "/admin/storefront": "content.manage",
  "/admin/payments": "settings.manage",
  "/admin/landings": "content.manage",
  "/admin/landing-settings": "settings.manage",
  "/admin/invoice-settings": "settings.manage",
  "/admin/notifications": "settings.manage",
  "/admin/pixel": "marketing.manage",
  "/admin/users": "users.manage",
  "/admin/activity": "logs.view",
  "/admin/settings": "settings.manage",
};
