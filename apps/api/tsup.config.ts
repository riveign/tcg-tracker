import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  sourcemap: true,
  external: [
    'drizzle-orm',
    'postgres',
    '@tcg-tracker/db',
    '@tcg-tracker/types',
    '@hono/node-server',
    '@trpc/server',
    'bcrypt',
    'hono',
    'jsonwebtoken',
    'zod',
  ],
});
