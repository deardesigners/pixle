import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { config } from 'dotenv';
import { sql } from '@vercel/postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env.local') });

const raw = readFileSync(join(__dirname, '..', 'lib', 'db', 'schema.sql'), 'utf8');

// 1. Убираем строковые комментарии целиком 2. Бьём по `;` — Neon HTTP не принимает мульти-стейтмент.
const schema = raw
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n');

const statements = schema
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

console.log(`Running ${statements.length} statements...`);
for (const stmt of statements) {
  const preview = stmt.replace(/\s+/g, ' ').slice(0, 80);
  try {
    await sql.query(stmt);
    console.log('  ✓', preview);
  } catch (err) {
    console.error('  ✗', preview);
    console.error('    ', err.message);
    process.exit(1);
  }
}
console.log('Schema applied.');
