-- NextAuth required tables
CREATE TABLE IF NOT EXISTS "users" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "name"          TEXT,
  "email"         TEXT UNIQUE,
  "emailVerified" TIMESTAMPTZ,
  "image"         TEXT,
  "stripe_customer_id" TEXT UNIQUE,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "accounts" (
  "userId"            TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type"              TEXT NOT NULL,
  "provider"          TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token"     TEXT,
  "access_token"      TEXT,
  "expires_at"        INTEGER,
  "token_type"        TEXT,
  "scope"             TEXT,
  "id_token"          TEXT,
  "session_state"     TEXT,
  CONSTRAINT "accounts_pkey" PRIMARY KEY ("provider", "providerAccountId")
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "sessionToken" TEXT NOT NULL PRIMARY KEY,
  "userId"       TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expires"      TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification_tokens" (
  "identifier" TEXT NOT NULL,
  "token"      TEXT NOT NULL,
  "expires"    TIMESTAMPTZ NOT NULL,
  CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("identifier", "token")
);

-- Products catalog
CREATE TABLE IF NOT EXISTS "products" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug"            TEXT UNIQUE NOT NULL,
  "name"            TEXT NOT NULL,
  "description"     TEXT,
  "stripe_price_id" TEXT,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customer subscriptions
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id"                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"                TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "product_id"             UUID REFERENCES "products"("id"),
  "stripe_subscription_id" TEXT UNIQUE,
  "status"                 TEXT NOT NULL DEFAULT 'inactive',
  "current_period_end"     TIMESTAMPTZ,
  "created_at"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS "subscriptions_user_id_idx" ON "subscriptions"("user_id");
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions"("status");

-- Seed product
INSERT INTO "products" ("slug", "name", "description")
VALUES ('stratus-platform', 'Stratus Platform', 'Full access to all Stratus tools.')
ON CONFLICT ("slug") DO NOTHING;
