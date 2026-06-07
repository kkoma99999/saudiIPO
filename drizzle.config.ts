import { defineConfig } from "drizzle-kit";
import "dotenv/config";

// Drizzle is the single source of truth for the database schema. The Python
// ingester never creates or alters tables; it connects by DATABASE_URL and uses
// raw SQL against the tables defined here.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
