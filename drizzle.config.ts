import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // Only used by drizzle-kit's own db commands; migrations are applied via
    // npm run db:migrate, which also works against the local PGlite database.
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/ygg",
  },
});
