import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL ?? "postgresql://talos:talos@localhost:5432/talos";
const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

export const sql = globalForDb.sql ?? postgres(connectionString, { max: 10 });
export const db = drizzle(sql, { schema });

if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export * from "./schema";
