import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlFile = join(__dirname, "../drizzle/0002_magical_spacker_dave.sql");
const sql = readFileSync(sqlFile, "utf8");
const statements = sql.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);

const conn = await createConnection(process.env.DATABASE_URL);
console.log(`Running ${statements.length} statements...`);

let ok = 0, skip = 0, fail = 0;
for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  try {
    await conn.execute(stmt);
    console.log(`  [${i + 1}/${statements.length}] OK`);
    ok++;
  } catch (err) {
    if (err.code === "ER_DUP_FIELDNAME" || err.code === "ER_TABLE_EXISTS_ERROR") {
      console.log(`  [${i + 1}/${statements.length}] SKIP (already exists): ${err.message.slice(0, 80)}`);
      skip++;
    } else {
      console.error(`  [${i + 1}/${statements.length}] FAIL: ${err.message}`);
      fail++;
    }
  }
}

await conn.end();
console.log(`\nDone: ${ok} ok, ${skip} skipped, ${fail} failed`);
if (fail > 0) process.exit(1);
