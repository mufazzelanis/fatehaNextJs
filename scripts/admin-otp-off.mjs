// Emergency switch: turns off the admin sign-in email code (use when email stopped working and nobody can sign in).
// Usage on the server:  npm run admin:otp-off
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import mysql from "mysql2/promise";

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
  user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", database: process.env.DB_NAME || "fateha_landing",
});
const [[row]] = await db.query("SELECT `value` FROM settings WHERE `key` = 'notify_config'");
if (!row?.value) {
  console.log("Admin sign-in codes were not configured — nothing to change.");
} else {
  const cfg = JSON.parse(row.value);
  cfg.security = { ...(cfg.security ?? {}), adminOtp: false };
  await db.query("UPDATE settings SET `value` = ? WHERE `key` = 'notify_config'", [JSON.stringify(cfg)]);
  await db.query(
    "INSERT INTO activity_logs (action, module, description) VALUES ('notify.security', 'settings', 'Admin sign-in code turned OFF from the server command line')",
  );
  console.log("✔ Admin sign-in email code is now OFF. Sign in with email + password, fix Email settings, then turn it on again.");
}
await db.end();
