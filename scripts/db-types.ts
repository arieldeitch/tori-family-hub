// Regenerate src/infrastructure/supabase/database.types.ts from the local stack.
// Usage: bun run db:types  (requires `bun run supabase:start` first)
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateDatabaseTypes } from "./_supabase";

function main(): void {
  const out = resolve(process.cwd(), "src/infrastructure/supabase/database.types.ts");
  writeFileSync(out, generateDatabaseTypes(), "utf8");
  console.log(`[db:types] wrote ${out}`);
}

main();
