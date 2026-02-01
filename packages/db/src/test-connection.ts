#!/usr/bin/env bun
/**
 * Test script to verify database connection and schema
 * Run with: bun run src/test-connection.ts
 */
import { db, users, cards, collections } from "./index";
import { sql } from "drizzle-orm";

async function testConnection() {
  try {
    console.log("Testing database connection...");

    // Test basic query
    const result = await db.execute(sql`SELECT current_database(), current_user, version()`);
    console.log("✓ Database connection successful");
    console.log(`  Database: ${result[0]?.current_database}`);
    console.log(`  User: ${result[0]?.current_user}`);
    console.log(`  Version: ${result[0]?.version?.split(" ")[0]}`);

    // Test schema queries
    console.log("\nTesting schema queries...");

    const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
    console.log(`✓ Users table accessible (${userCount[0]?.count} rows)`);

    const cardCount = await db.select({ count: sql<number>`count(*)` }).from(cards);
    console.log(`✓ Cards table accessible (${cardCount[0]?.count} rows)`);

    const collectionCount = await db.select({ count: sql<number>`count(*)` }).from(collections);
    console.log(`✓ Collections table accessible (${collectionCount[0]?.count} rows)`);

    console.log("\n✓ All tests passed!");
    process.exit(0);
  } catch (error) {
    console.error("✗ Connection test failed:");
    console.error(error);
    process.exit(1);
  }
}

testConnection();
