import fs from "node:fs";
import { drizzle as drizzlePostgres, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import postgres from "postgres";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";

// Postgres everywhere. With DATABASE_URL set (Supabase in production) we
// connect over the wire; without it, PGlite runs an embedded Postgres that
// persists to data/pgdata — so local dev needs zero setup and uses the exact
// same dialect and migrations as production.
export type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __yggDb?: Db;
  __yggClose?: () => Promise<void>;
};

function createDb(): { db: Db; close: () => Promise<void> } {
  const url = process.env.DATABASE_URL;
  if (url) {
    if (url.includes("[YOUR-PASSWORD]") || url.includes("YOUR-PASSWORD")) {
      throw new Error(
        "DATABASE_URL still contains the [YOUR-PASSWORD] placeholder — replace it with the database password you chose when creating the Supabase project.",
      );
    }
    // prepare:false keeps this compatible with Supabase's transaction pooler.
    const client = postgres(url, { prepare: false });
    return { db: drizzlePostgres(client, { schema }), close: () => client.end() };
  }
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    // Without DATABASE_URL we'd fall back to the embedded local database,
    // which is wrong (and read-only) on serverless hosts — fail with a clear
    // message instead of a cryptic filesystem error.
    throw new Error(
      "DATABASE_URL is not set. Add it in your host's environment variables (Vercel: Project → Settings → Environment Variables) and redeploy.",
    );
  }
  const dataDir = process.env.PGLITE_PATH ?? "data/pgdata";
  fs.mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  // PGlite's drizzle instance exposes the same query API; unify on one type.
  return { db: drizzlePglite(client, { schema }) as unknown as Db, close: () => client.close() };
}

// Always cache on globalThis: Next.js instantiates this module once per route
// bundle, and PGlite must be a single instance per data directory. globalThis
// is shared across bundles within the one server process.
const instance = globalForDb.__yggDb
  ? { db: globalForDb.__yggDb, close: globalForDb.__yggClose! }
  : createDb();
globalForDb.__yggDb = instance.db;
globalForDb.__yggClose = instance.close;

export const db = instance.db;
/** For scripts (migrate/seed) — the Next.js server never calls this. */
export const closeDb = instance.close;

export * as tables from "./schema";
