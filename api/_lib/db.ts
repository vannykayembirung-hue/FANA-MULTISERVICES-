import postgres from 'postgres';

let client: ReturnType<typeof postgres> | null = null;
let schemaPromise: Promise<void> | null = null;

export class DatabaseNotConfiguredError extends Error {
  statusCode = 503;
  constructor() {
    super('La base Neon n’est pas configurée. Ajoutez DATABASE_URL dans les variables d’environnement de Vercel.');
    this.name = 'DatabaseNotConfiguredError';
  }
}

export function getDb(): ReturnType<typeof postgres> {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;
  if (!connectionString) throw new DatabaseNotConfiguredError();

  if (!client) {
    client = postgres(connectionString, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : 'require',
    });
  }
  return client;
}

/**
 * Creates the small application schema on first use. No sample records are inserted.
 * Keeping this idempotent means a new Neon database is ready on the first registration.
 */
export async function ensureSchema(): Promise<ReturnType<typeof postgres>> {
  const db = getDb();
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await db`
        CREATE TABLE IF NOT EXISTS fana_organizations (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          settings jsonb NOT NULL DEFAULT '{"currency":"CDF","usdRate":null}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await db`
        CREATE TABLE IF NOT EXISTS fana_users (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id uuid NOT NULL REFERENCES fana_organizations(id) ON DELETE CASCADE,
          name text NOT NULL,
          email text NOT NULL UNIQUE,
          password_hash text NOT NULL,
          role text NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('ADMIN', 'GERANT', 'CAISSIER')),
          is_active boolean NOT NULL DEFAULT true,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await db`
        CREATE TABLE IF NOT EXISTS fana_sessions (
          token_hash text PRIMARY KEY,
          user_id uuid NOT NULL REFERENCES fana_users(id) ON DELETE CASCADE,
          expires_at timestamptz NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await db`
        CREATE TABLE IF NOT EXISTS fana_records (
          organization_id uuid NOT NULL REFERENCES fana_organizations(id) ON DELETE CASCADE,
          collection text NOT NULL,
          id text NOT NULL,
          data jsonb NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (organization_id, collection, id)
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS fana_records_collection_date_idx ON fana_records (organization_id, collection, created_at DESC)`;
      await db`CREATE INDEX IF NOT EXISTS fana_product_ean_idx ON fana_records (organization_id, (data->>'ean')) WHERE collection = 'products'`;
      await db`CREATE INDEX IF NOT EXISTS fana_sessions_expiry_idx ON fana_sessions (expires_at)`;
      await db`
        CREATE TABLE IF NOT EXISTS fana_product_images (
          organization_id uuid NOT NULL REFERENCES fana_organizations(id) ON DELETE CASCADE,
          product_id text NOT NULL,
          mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
          image_data bytea NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (organization_id, product_id)
        )
      `;
      await db`
        CREATE TABLE IF NOT EXISTS fana_auth_rate_limits (
          bucket_hash text PRIMARY KEY,
          window_started_at timestamptz NOT NULL,
          attempts integer NOT NULL DEFAULT 0
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS fana_open_cash_session_lookup_idx ON fana_records (organization_id, created_at DESC) WHERE collection = 'cash_sessions' AND data->>'statut' = 'OUVERTE'`;
    })().catch(error => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
  return db;
}
