import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const DB_PATH = process.env.DATABASE_PATH ?? "data/ygg.db";

// Reuse the connection across Next.js hot reloads in dev.
const globalForDb = globalThis as unknown as {
  __yggDb?: BetterSQLite3Database<typeof schema>;
};

function createDb() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

export const db = globalForDb.__yggDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__yggDb = db;

export * as tables from "./schema";
