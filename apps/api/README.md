# TCG Collection Tracker API

Backend API server for the TCG Collection Tracker application, built with Hono, tRPC, and Bun.

## Features

- Internal JWT-based authentication (no third-party auth providers)
- tRPC API with type-safe client/server communication
- PostgreSQL database with Drizzle ORM
- User authentication (signup, login)
- Collections management (CRUD operations)
- Soft delete support
- CORS enabled for frontend integration

## Prerequisites

- Bun runtime installed
- PostgreSQL database running
- Environment variables configured

## Setup

1. Install dependencies:

```bash
bun install
```

2. Configure environment variables:

```bash
cp .env.example .env
```

Edit `.env` and update the following:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Strong secret key for JWT signing (generate with `openssl rand -base64 32`)
- `PORT`: Server port (default: 3001)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:3000)

3. Run database migrations (from workspace root):

```bash
cd ../..
bun run db:push
```

## Development

Start the development server with auto-reload:

```bash
bun run dev
```

The API will be available at `http://localhost:3001`.

## Production

Build and run for production:

```bash
bun run build
bun run start
```

## API Documentation

### Base URL

- Development: `http://localhost:3001`
- tRPC endpoint: `/trpc`

### Authentication

All authentication routes are under `auth.*`:

#### Sign Up

```typescript
trpc.auth.signup.mutate({
  email: "user@example.com",
  username: "username",
  password: "securepassword123"
});

// Returns: { user: User, token: string }
```

#### Log In

```typescript
trpc.auth.login.mutate({
  emailOrUsername: "user@example.com", // or username
  password: "securepassword123"
});

// Returns: { user: User, token: string }
```

#### Get Current User

```typescript
// Requires Authorization header: Bearer <token>
trpc.auth.me.query();

// Returns: User
```

### Collections

All collection routes are under `collections.*` and require authentication:

#### List Collections

```typescript
trpc.collections.list.query();

// Returns: Collection[]
```

#### Get Collection

```typescript
trpc.collections.get.query({
  id: "collection-uuid"
});

// Returns: Collection
```

#### Create Collection

```typescript
trpc.collections.create.mutate({
  name: "My Pokemon Collection",
  description: "Collection of rare Pokemon cards",
  isPublic: false
});

// Returns: Collection
```

#### Update Collection

```typescript
trpc.collections.update.mutate({
  id: "collection-uuid",
  name: "Updated Collection Name", // optional
  description: "Updated description", // optional
  isPublic: true // optional
});

// Returns: Collection
```

#### Delete Collection

```typescript
trpc.collections.delete.mutate({
  id: "collection-uuid"
});

// Returns: { success: true }
```

### Authentication Flow

1. User signs up or logs in
2. Server returns a JWT token
3. Client stores the token (localStorage, sessionStorage, or cookie)
4. Client includes token in `Authorization` header for protected routes:
   ```
   Authorization: Bearer <token>
   ```

### Error Handling

tRPC errors follow this format:

```typescript
{
  error: {
    message: string;
    code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "INTERNAL_SERVER_ERROR";
    data: {
      zodError?: ZodIssue[]; // Validation errors
    }
  }
}
```

Common error codes:

- `UNAUTHORIZED`: Missing or invalid authentication
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource already exists (e.g., duplicate email)
- `BAD_REQUEST`: Invalid input data

### Health Check

```bash
curl http://localhost:3001/health
```

Returns:

```json
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## Project Structure

```
apps/api/
├── src/
│   ├── lib/
│   │   ├── auth.ts        # JWT & bcrypt utilities
│   │   └── trpc.ts        # tRPC setup & context
│   ├── router/
│   │   ├── index.ts       # Root router
│   │   ├── auth.ts        # Authentication routes
│   │   └── collections.ts # Collections routes
│   ├── index.ts           # Server entry point
│   └── server.ts          # Hono app configuration
├── package.json
├── tsconfig.json
└── .env.example
```

## Security

- Passwords are hashed with bcrypt (10 salt rounds)
- JWT tokens expire after 7 days
- Soft deletes prevent accidental data loss
- User ownership verification on all collection operations
- CORS configured to allow specific frontend origins

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

### Collections Table

```sql
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

## Type Safety

This API exports the `AppRouter` type for use in the frontend tRPC client:

```typescript
import type { AppRouter } from '@tcg-tracker/api';
```

This enables full end-to-end type safety between the API and frontend.
