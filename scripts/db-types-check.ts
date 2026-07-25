// Fail if the committed database.types.ts is out of date vs the local stack.
// Used by CI to guarantee generated types are committed. Line-ending agnostic.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateDatabaseTypes } from "./_supabase";

function main(): void {
  const out = resolve(process.cwd(), "src/infrastructure/supabase/database.types.ts");
  const current = readFileSync(out, "utf8").replace(/\r\n/g, "\n");
  const fresh = generateDatabaseTypes();
  if (current !== fresh) {
    console.error(
      "[db:types:check] database.types.ts is OUT OF DATE. Run `bun run db:types` and commit the result.",
    );
    process.exit(1);
  }
  console.log("[db:types:check] database.types.ts is up to date.");
}

main();
