import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type DB = ReturnType<typeof drizzle<typeof schema>>;

declare global {
  var __oc_db: DB | undefined;
}

export function getDb(): DB {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("缺少环境变量 DATABASE_URL");
  }
  if (!globalThis.__oc_db) {
    globalThis.__oc_db = drizzle(neon(url), { schema });
  }
  return globalThis.__oc_db;
}
