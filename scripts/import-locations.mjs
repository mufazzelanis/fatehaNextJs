// Imports Bangladesh districts, thanas and unions from the old fatehabd.com (same ids).
// Usage: npm run import:locations
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import mysql from "mysql2/promise";

const SOURCE = "https://fatehabd.com";
for (const file of [".env.local", ".env"]) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const db = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "fateha_landing", charset: "utf8mb4", multipleStatements: true,
});

async function json(url) {
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (FatehaBD location import)", Accept: "application/json" }, signal: AbortSignal.timeout(30_000) });
      if (res.ok) return await res.json();
    } catch {}
    await new Promise((r) => setTimeout(r, 800 * (i + 1)));
  }
  throw new Error(`Failed: ${url}`);
}

/** Runs tasks with limited concurrency so the old server isn't hammered. */
async function pool(items, limit, fn) {
  const out = [];
  let next = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}

const page = await (await fetch(`${SOURCE}/business/register`, { headers: { "User-Agent": "Mozilla/5.0" } })).text();
const select = page.match(/<select[^>]*name="district_id"[^>]*>([\s\S]*?)<\/select>/)?.[1] ?? "";
const districts = [...select.matchAll(/<option value="(\d+)"[^>]*>([^<]+)<\/option>/g)].map((m) => {
  const [name, bn] = m[2].split("·").map((s) => s.trim());
  return { id: Number(m[1]), name, bn_name: bn ?? null };
});
console.log(`Districts: ${districts.length}`);
for (const d of districts) {
  await db.query("INSERT INTO districts (id, name, bn_name) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), bn_name = VALUES(bn_name)", [d.id, d.name, d.bn_name]);
}

const thanaLists = await pool(districts, 6, (d) => json(`${SOURCE}/business/locations/districts/${d.id}/thanas`));
const thanas = thanaLists.flatMap((list, i) => list.map((t) => ({ ...t, district_id: districts[i].id })));
for (const t of thanas) {
  await db.query("INSERT INTO thanas (id, district_id, name, bn_name) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE district_id = VALUES(district_id), name = VALUES(name), bn_name = VALUES(bn_name)", [t.id, t.district_id, t.name, t.bn_name]);
}
console.log(`Thanas: ${thanas.length}`);

let unionCount = 0;
await pool(thanas, 6, async (t, i) => {
  const unions = await json(`${SOURCE}/business/locations/thanas/${t.id}/unions`);
  for (const u of unions) {
    await db.query("INSERT INTO unions (id, thana_id, name, bn_name) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE thana_id = VALUES(thana_id), name = VALUES(name), bn_name = VALUES(bn_name)", [u.id, t.id, u.name, u.bn_name]);
  }
  unionCount += unions.length;
  if ((i + 1) % 50 === 0) console.log(`  …${i + 1}/${thanas.length} thanas`);
});
console.log(`Unions: ${unionCount}`);
// The old site has no city (metropolitan) thanas — add the Dhaka & Chattogram city thanas.
await db.query(readFileSync(resolve(process.cwd(), "database/city-thanas.sql"), "utf8"));
console.log("City thanas added.\nDone.");
await db.end();
