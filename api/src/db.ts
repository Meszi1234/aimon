import pg from 'pg'

const { Pool } = pg

// One shared connection pool for the whole process. The always-on server (SPEC
// arch decision #7) holds a handful of warm connections and lends them out per
// query, so we never pay the TCP/TLS/auth handshake per request. Pool creation
// is lazy — it doesn't actually connect until the first query runs.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Local Docker Postgres speaks plain TCP; Railway-managed Postgres requires
  // SSL. Gate it on an explicit flag so the same code serves both environments
  // (set PGSSL=require on Railway in Slice 6). `rejectUnauthorized: false`
  // encrypts the link without verifying the provider's cert chain — the normal,
  // accepted pattern for managed Postgres at this scale.
  ssl: process.env.PGSSL === 'require' ? { rejectUnauthorized: false } : undefined,
})

// Thin query helper. It only accepts (text, params), which makes parameterized
// SQL the path of least resistance — there is no ergonomic way to splice user
// input into the query string (CLAUDE.md SQL rule; arch decision #9).
export const query = (text: string, params?: unknown[]) => pool.query(text, params)
