import "server-only";
import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

const globalForDb = globalThis as unknown as { __dbPool?: Pool };

function createPool() {
  const p = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "fateha_landing",
    connectionLimit: 10,
    waitForConnections: true,
    charset: "utf8mb4",
    decimalNumbers: true,
    dateStrings: false,
    timezone: "+06:00",
  });
  // NOW(), CURDATE() and DEFAULT CURRENT_TIMESTAMP must be Bangladesh time on every server (a VPS is usually UTC).
  // Same SQL rules on MariaDB (local XAMPP) and MySQL 8 (VPS) — MySQL's default ONLY_FULL_GROUP_BY rejects report queries.
  p.on("connection", (conn) => {
    conn.query("SET time_zone = '+06:00', sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
  });
  return p;
}

export const pool: Pool = globalForDb.__dbPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.__dbPool = pool;

type Params = (string | number | boolean | null | Date)[];

export async function query<T>(sql: string, params: Params = []): Promise<T[]> {
  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return rows as T[];
}

export async function queryOne<T>(sql: string, params: Params = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params: Params = []): Promise<ResultSetHeader> {
  const [result] = await pool.query<ResultSetHeader>(sql, params);
  return result;
}

export async function transaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
