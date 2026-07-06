import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { db, closeDb } from "./index";

async function main() {
  if (process.env.DATABASE_URL) {
    await migratePostgres(db, { migrationsFolder: "drizzle" });
  } else {
    await migratePglite(db as unknown as PgliteDatabase, { migrationsFolder: "drizzle" });
  }
  console.log(
    `Migrations applied to ${process.env.DATABASE_URL ? "DATABASE_URL database" : "local PGlite (data/pgdata)"}.`,
  );
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
