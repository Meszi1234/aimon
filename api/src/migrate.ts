import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { pool } from './db.js'

// Resolve migrations/ relative to this file: src/migrate.ts -> ../migrations.
const here = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(here, '..', 'migrations')

async function main() {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort() // lexical sort keeps 001, 002, ... in order

  if (files.length === 0) {
    console.log('no migrations found')
    return
  }

  const client = await pool.connect()
  try {
    for (const file of files) {
      const sql = readFileSync(join(migrationsDir, file), 'utf8')
      // One transaction per file: a partial failure rolls back cleanly, leaving
      // no half-applied schema. There is deliberately no `IF NOT EXISTS` and no
      // schema_migrations tracking table yet (a tracking table arrives with the
      // 2nd migration). So re-running on an already-migrated DB fails loudly;
      // to start fresh, reset the dev DB with `docker compose down -v`.
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query('COMMIT')
        console.log(`applied ${file}`)
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      }
    }
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('migration failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
