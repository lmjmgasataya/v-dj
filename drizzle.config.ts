import { config } from "dotenv";
import type { Config } from "drizzle-kit";

config({ path: ".env.local" });

export default {
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Use direct (unpooled) connection for migrations — pooler doesn't support DDL
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
    ssl: process.env.NODE_ENV === "production" || !!process.env.DATABASE_URL_UNPOOLED,
  },
} satisfies Config;
