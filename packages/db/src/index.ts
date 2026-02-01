import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Database connection configuration
const connectionString = process.env.DATABASE_URL || "postgresql://mantis@localhost:5432/tcg_tracker";

// Create postgres client
const client = postgres(connectionString);

// Create drizzle instance with schema
export const db = drizzle(client, { schema });

// Re-export schema for convenience
export * from "./schema";

// Export types
export type Database = typeof db;
