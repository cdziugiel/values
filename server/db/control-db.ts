import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/drizzle/schema";
import { env } from "@/shared/config/env";

const globalForControlDb = globalThis as unknown as {
  controlSql?: postgres.Sql;
};

const controlSql =
  globalForControlDb.controlSql ??
  postgres(env.CONTROL_DATABASE_URL, {
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForControlDb.controlSql = controlSql;
}

export const controlDb = drizzle(controlSql, { schema });

export type ControlDb = typeof controlDb;