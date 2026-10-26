// Creates the database, tables and seed data.
// Usage: npm run db:setup
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  }
}

loadEnv();

const config = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
};
const database = process.env.DB_NAME || "fateha_landing";

const adminEmail = process.env.ADMIN_EMAIL || "admin@fatehabd.com";
const adminPassword = process.env.ADMIN_PASSWORD || "admin12345";

const conn = await mysql.createConnection({ ...config, multipleStatements: true });
await conn.query(
  `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
);
await conn.query(`USE \`${database}\``);
// MySQL 8 has no "ADD COLUMN/INDEX IF NOT EXISTS" (MariaDB only), so those are checked here instead.
const schema = readFileSync(resolve(process.cwd(), "database/schema.sql"), "utf8")
  .split(/\r?\n/).filter((l) => !/^\s*--/.test(l)).join("\n");
for (const sql of schema.split(/;\s*(?:\n|$)/).map((s) => s.trim()).filter(Boolean)) {
  const m = sql.match(/^ALTER TABLE (\w+) ADD (COLUMN|INDEX) IF NOT EXISTS (\w+)/i);
  if (m) {
    const [, table, kind, name] = m;
    const [found] = kind.toUpperCase() === "COLUMN"
      ? await conn.query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?", [database, table, name])
      : await conn.query("SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?", [database, table, name]);
    if (found.length) continue;
    await conn.query(sql.replace(/ IF NOT EXISTS/i, ""));
  } else {
    await conn.query(sql);
  }
}
console.log(`✔ Database "${database}" and tables ready`);
// City (metropolitan) thanas — only inserted once the districts exist (after `npm run import:locations`).
await conn.query(readFileSync(resolve(process.cwd(), "database/city-thanas.sql"), "utf8"));

const [admins] = await conn.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
if (admins.length === 0) {
  const hash = await bcrypt.hash(adminPassword, 10);
  await conn.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
    ["Super Admin", adminEmail, hash],
  );
  console.log(`✔ Admin created  →  ${adminEmail} / ${adminPassword}`);
} else {
  console.log("• Admin already exists, skipped");
}

// Built-in roles (kept in sync with lib/permissions.ts). Existing roles are never overwritten.
const ROLES = [
  { slug: "super-admin", name: "Super Admin", system: 1, description: "Full access to everything, including staff and roles", permissions: ["*"] },
  { slug: "manager", name: "Manager", system: 0, description: "Runs the store day to day — everything except staff & roles",
    permissions: ["dashboard.view","orders.view","orders.edit","orders.delete","orders.export","customers.view","customers.block","products.manage","content.manage","checkout.manage","dealers.view","dealers.manage","marketing.manage","settings.manage","logs.view"] },
  { slug: "order-manager", name: "Order Manager", system: 0, description: "Confirms and ships orders, handles customers",
    permissions: ["dashboard.view","orders.view","orders.edit","orders.export","customers.view","customers.block"] },
  { slug: "content-editor", name: "Content Editor", system: 0, description: "Edits the landing page, product and checkout",
    permissions: ["dashboard.view","products.manage","content.manage","checkout.manage"] },
  { slug: "marketer", name: "Marketer", system: 0, description: "Facebook Pixel and read-only orders",
    permissions: ["dashboard.view","orders.view","marketing.manage"] },
];
for (const r of ROLES) {
  await conn.query(
    "INSERT IGNORE INTO roles (name, slug, description, permissions, is_system) VALUES (?, ?, ?, ?, ?)",
    [r.name, r.slug, r.description, JSON.stringify(r.permissions), r.system],
  );
}
const [[superRole]] = await conn.query("SELECT id FROM roles WHERE slug = 'super-admin'");
await conn.query("UPDATE users SET role_id = ? WHERE role = 'admin' AND role_id IS NULL", [superRole.id]);
// Orders from before delivery zones became editable keep a readable label.
await conn.query("UPDATE orders SET shipping_label = CASE shipping_zone WHEN 'inside' THEN 'Inside Dhaka' WHEN 'outside' THEN 'Outside Dhaka' ELSE shipping_zone END WHERE shipping_label IS NULL");
console.log("✔ Roles ready");

const [products] = await conn.query("SELECT id FROM products LIMIT 1");
if (products.length === 0) {
  await conn.query(
    `INSERT INTO products (name, slug, weight, price, regular_price, stock, image)
     VALUES (?, ?, ?, ?, ?, ?, NULL)`,
    ["মাশরুম ডেন্টোকেয়ার প্লাস", "mashroom-dentocare-plus", "100 gm", 750, 1200, 500],
  );
  console.log("✔ Product seeded");
}

const defaults = {
  site_name: "মাশরুম ডেন্টোকেয়ার প্লাস",
  brand_name: "Fateha BD",
  shipping_inside: "50",
  shipping_outside: "100",
  contact_phone: "01700000000",
  whatsapp_number: "8801700000000",
  duplicate_block_minutes: "30",
  landing_product_slug: "mashroom-dentocare-plus",
  announcement: "সারা বাংলাদেশে ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে টাকা পরিশোধ করুন",
};
for (const [key, value] of Object.entries(defaults)) {
  await conn.query("INSERT IGNORE INTO settings (`key`, `value`) VALUES (?, ?)", [key, value]);
}
console.log("✔ Default settings ready");

// Landing pages: the original single landing (settings-based) becomes landing page #1 at /fatehalanding.
const [[landingCount]] = await conn.query("SELECT COUNT(*) AS n FROM landing_pages");
if (Number(landingCount.n) === 0) {
  const [rows] = await conn.query(
    "SELECT `key`, `value` FROM settings WHERE `key` IN ('landing_content', 'checkout_config', 'banner_image', 'landing_product_slug')",
  );
  const v = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const [[product]] = await conn.query("SELECT id FROM products WHERE slug = ? LIMIT 1", [v.landing_product_slug || "mashroom-dentocare-plus"]);
  await conn.query(
    `INSERT INTO landing_pages (slug, name, status, product_id, content, checkout, banner_image, seo_title, order_prefix, footer_name)
     VALUES ('fatehalanding', 'মাশরুম ডেন্টোকেয়ার প্লাস', 'published', ?, ?, ?, ?, 'মাশরুম ডেন্টোকেয়ার প্লাস — দাঁত ও মাড়ির প্রাকৃতিক যত্ন', 'DC', 'Masroom Dentocare Plus')`,
    [product?.id ?? null, v.landing_content ?? null, v.checkout_config ?? null, v.banner_image || null],
  );
  console.log("✔ Landing page /fatehalanding created from the old settings");
}
// Older landing orders belong to the first landing page.
await conn.query(
  "UPDATE orders SET landing_id = (SELECT id FROM landing_pages ORDER BY id LIMIT 1) WHERE source = 'landing' AND landing_id IS NULL",
);

await conn.end();
console.log("\nAll done. Run `npm run dev` and open http://localhost:3000");
