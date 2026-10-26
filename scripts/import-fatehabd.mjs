// Imports categories and products (with images) from the live fatehabd.com store.
// Usage: npm run import:store            → adds products that don't exist yet
//        npm run import:store -- --update → also refreshes price/stock/images of existing ones
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import mysql from "mysql2/promise";

const SOURCE = "https://fatehabd.com";
const UPDATE = process.argv.includes("--update");
const UPLOAD_DIR = resolve(process.cwd(), "storage", "uploads");
const UA = { "User-Agent": "Mozilla/5.0 (FatehaBD store import)" };

for (const file of [".env.local", ".env"]) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const db = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "fateha_landing",
  charset: "utf8mb4",
});

async function get(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30_000) });
      if (res.ok) return res;
      if (res.status === 404) return null;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
  throw new Error(`Could not fetch ${url}`);
}

const ALLOWED_TAGS = new Set(["p", "br", "ul", "ol", "li", "strong", "b", "em", "i", "h2", "h3", "h4", "table", "thead", "tbody", "tr", "td", "th"]);
/** Keeps only simple formatting tags, without attributes. */
function sanitize(html) {
  return html
    .replace(/<(script|style|iframe|object)[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (tag, name) => {
      const n = name.toLowerCase();
      if (!ALLOWED_TAGS.has(n)) return n === "div" ? (tag.startsWith("</") ? "</p>" : "<p>") : "";
      return tag.startsWith("</") ? `</${n}>` : `<${n}>`;
    })
    .replace(/<p>\s*<\/p>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseProduct(html, url) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => {
    try { return JSON.parse(m[1]); } catch { return null; }
  }).filter(Boolean);
  const ld = blocks.find((b) => b["@type"] === "Product");
  if (!ld) return null;
  const crumbs = blocks.find((b) => b["@type"] === "BreadcrumbList")?.itemListElement ?? [];
  const catCrumb = crumbs.find((c) => String(c.item).includes("/shop/category/"));
  const stockMatch = html.match(/\((\d+)\s+available\)/);
  const inStock = String(ld.offers?.availability ?? "").includes("InStock");

  let description = null;
  const start = html.indexOf(`x-show="tab === 'description'"`);
  if (start > 0) {
    const end = html.indexOf(`x-show="tab === 'reviews'"`, start);
    const chunk = html.slice(start, end > 0 ? end : start + 20000);
    const inner = chunk.slice(chunk.indexOf(">") + 1).replace(/^[\s\S]*?<div class="prose[^>]*>/, "").replace(/(<\/div>\s*)+<div\s*$/, "");
    const clean = sanitize(inner).replace(/(<\/p>\s*)+$/, "</p>");
    if (clean && !/No description available/i.test(clean)) description = clean;
  }

  const name = String(ld.name).trim();
  return {
    slug: url.split("/products/")[1],
    name,
    price: Number(ld.offers?.price ?? 0),
    stock: stockMatch ? Number(stockMatch[1]) : inStock ? 100 : 0,
    images: (Array.isArray(ld.image) ? ld.image : [ld.image]).filter(Boolean),
    brand: ((b) => (b ? b[0].toUpperCase() + b.slice(1).toLowerCase() : null))(name.split(/\s+/)[0].replace(/[^A-Za-z]/g, "")),
    category: catCrumb ? { name: String(catCrumb.name).trim(), slug: String(catCrumb.item).split("/shop/category/")[1] } : null,
    description,
    url,
  };
}

async function download(url, base) {
  const ext = (extname(new URL(url).pathname) || ".jpg").toLowerCase();
  const file = `${base}${[".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext.replace(".jpeg", ".jpg") : ".jpg"}`;
  const path = resolve(UPLOAD_DIR, file);
  if (!existsSync(path) || UPDATE) {
    const res = await get(url);
    if (!res) return null;
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  }
  return file;
}

mkdirSync(UPLOAD_DIR, { recursive: true });

// 1. Every product URL from the shop listing
const urls = new Set();
for (let page = 1; page < 50; page++) {
  const res = await get(`${SOURCE}/shop?page=${page}`);
  const html = res ? await res.text() : "";
  const found = [...html.matchAll(/https:\/\/fatehabd\.com\/products\/[a-z0-9-]+/g)].map((m) => m[0]);
  if (!found.length) break;
  found.forEach((u) => urls.add(u));
}
console.log(`Found ${urls.size} products on ${SOURCE}`);

// 2. Fetch, parse and store each one
let added = 0, updated = 0, skipped = 0;
const categoryIds = new Map();
let order = 0;
for (const url of [...urls].sort()) {
  const html = await (await get(url))?.text();
  const p = html && parseProduct(html, url);
  if (!p) { console.warn(`  ! could not read ${url}`); continue; }

  let categoryId = null;
  if (p.category) {
    if (!categoryIds.has(p.category.slug)) {
      await db.query(
        "INSERT INTO categories (name, slug, sort_order) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = IF(? , VALUES(name), name)",
        [p.category.name, p.category.slug, categoryIds.size + 1, UPDATE ? 1 : 0],
      );
      const [[row]] = await db.query("SELECT id FROM categories WHERE slug = ?", [p.category.slug]);
      categoryIds.set(p.category.slug, row.id);
    }
    categoryId = categoryIds.get(p.category.slug);
  }

  const [[existing]] = await db.query("SELECT id FROM products WHERE slug = ?", [p.slug]);
  if (existing && !UPDATE) { skipped++; continue; }

  const files = [];
  for (const [i, img] of p.images.entries()) {
    const file = await download(img, `p-${p.slug}${i ? `-${i + 1}` : ""}`).catch(() => null);
    if (file) files.push(file);
  }
  const values = [p.name, p.price, p.stock, files[0] ?? null, JSON.stringify(files), categoryId, p.brand, p.description, p.url];
  if (existing) {
    await db.query(
      "UPDATE products SET name = ?, price = ?, stock = ?, image = ?, images = ?, category_id = ?, brand = ?, description = ?, source_url = ? WHERE id = ?",
      [...values, existing.id],
    );
    updated++;
  } else {
    await db.query(
      `INSERT INTO products (name, price, stock, image, images, category_id, brand, description, source_url, slug, in_store, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)`,
      [...values, p.slug, ++order],
    );
    added++;
  }
  console.log(`  ✔ ${p.name} — ৳${p.price}, stock ${p.stock}, ${files.length} image(s)${p.category ? `, ${p.category.name}` : ""}`);
}

console.log(`\nDone: ${added} added, ${updated} updated, ${skipped} already existed. Categories: ${categoryIds.size}.`);
await db.end();
