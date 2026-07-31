// Prove the built client cannot depend on this developer's machine.
//
// A localhost URL baked into a published bundle fails only for other people, on
// their devices, in a way that looks exactly like "no internet" — which is the
// class of bug this check exists to make unshippable.
//
// WHAT IS AUTHORITATIVE: the value Vite inlines for `VITE_SUPABASE_URL`. That
// single string decides where every browser request goes. Loopback strings also
// appear inside supabase-js (its GoTrue default and its own allowlist) and inside
// our loopback DETECTOR in runtimeConfig.ts; those are not endpoints the app
// calls, so they are reported as context rather than treated as failures.
//
// Run after `bun run build`.
//   default        the bundle must point at a remote https origin
//   --allow-local  a developer build against the local Supabase stack
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const CLIENT_DIRS = [".output/public", "dist/client", "dist"];
const SCAN_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".css", ".html", ".json", ".webmanifest"]);
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

const allowLocal = process.argv.includes("--allow-local");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else if (SCAN_EXTENSIONS.has(extname(entry))) out.push(full);
  }
  return out;
}

/** Every value Vite inlined for a given VITE_ variable, across quoting styles. */
function inlinedValues(content: string, name: string): string[] {
  const found = new Set<string>();
  const pattern = new RegExp(`${name}\\s*:\\s*(\`|"|')([^\`"']*)\\1`, "g");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) found.add(match[2]);
  return [...found];
}

function hostnameOf(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function main(): void {
  const roots = CLIENT_DIRS.filter((dir) => existsSync(dir));
  if (roots.length === 0) {
    console.error("[check:bundle-endpoints] FAILED — no client output. Run `bun run build` first.");
    process.exit(1);
  }

  const files = roots.flatMap(walk);
  if (files.length === 0) {
    console.error("[check:bundle-endpoints] FAILED — client output contains no scannable files.");
    process.exit(1);
  }

  const supabaseUrls = new Set<string>();
  let filesWithLoopbackText = 0;

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    for (const value of inlinedValues(content, "VITE_SUPABASE_URL")) supabaseUrls.add(value);
    if (/localhost|127\.0\.0\.1|host\.docker\.internal|:553\d{2}\b/.test(content)) {
      filesWithLoopbackText += 1;
    }
  }

  if (supabaseUrls.size === 0) {
    console.error(
      "[check:bundle-endpoints] FAILED — no inlined VITE_SUPABASE_URL found in the client bundle.\n" +
        "A published build that carries no Supabase URL renders the missing-configuration screen (ADR-038).",
    );
    process.exit(1);
  }

  const problems: string[] = [];
  for (const url of supabaseUrls) {
    const host = hostnameOf(url);
    if (host === null) {
      problems.push(`VITE_SUPABASE_URL is not a valid URL: ${url}`);
      continue;
    }
    if (LOOPBACK_HOSTS.has(host)) {
      problems.push(`VITE_SUPABASE_URL points at this machine (${host}) — unusable once published`);
      continue;
    }
    if (!url.startsWith("https://")) {
      problems.push(`VITE_SUPABASE_URL is not https: ${url}`);
    }
  }

  if (problems.length > 0 && !allowLocal) {
    console.error(
      "[check:bundle-endpoints] FAILED — the client bundle depends on a local endpoint:",
    );
    for (const p of problems) console.error(`  ${p}`);
    console.error(
      "\nThis happens when a build picks up .env.local. A published build must use the tracked\n" +
        ".env (ADR-038). Re-run without .env.local, or pass --allow-local for a deliberate local build.",
    );
    process.exit(1);
  }

  if (problems.length > 0) {
    console.log(
      `[check:bundle-endpoints] OK (--allow-local) — local build detected: ${[...supabaseUrls].join(", ")}`,
    );
    return;
  }

  console.log(
    `[check:bundle-endpoints] OK — scanned ${files.length} client files across ${roots.join(", ")}. ` +
      `Supabase endpoint is remote and https: ${[...supabaseUrls].join(", ")}. ` +
      `(${filesWithLoopbackText} file(s) contain loopback text from supabase-js internals and our own ` +
      `loopback detector; neither is an endpoint the app calls.)`,
  );
}

main();
