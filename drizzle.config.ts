import { config } from "dotenv";
import { resolve } from "path";
import { defineConfig } from "drizzle-kit";

// 与 Next.js 一致：先读 .env，再由 .env.local 覆盖（npm run db:push 等 CLI 也会读到 DATABASE_URL）
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
