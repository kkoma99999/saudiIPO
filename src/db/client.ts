import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// One postgres-js client for both local Docker and Neon. A global singleton keeps
// dev hot-reload from opening a new pool on every change. prepare:false is safe
// behind a pooler (Neon pgBouncer).
const globalForDb = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
};

const connectionString = process.env.DATABASE_URL ?? "";

const client =
  globalForDb.pgClient ?? postgres(connectionString, { prepare: false });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });
