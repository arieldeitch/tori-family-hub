# Architecture

## Layering

Strict inward-pointing dependencies. Never import upward.

```
routes / features / components (UI)
        │
        ▼
   application  (use-cases, cross-repo services)
        │
        ▼
     data       (repositories — in-memory mocks + subscriptions)
        │
        ▼
    domain      (pure types + rules, no I/O, fully unit-tested)
```

- `domain/` — pure TypeScript. Types, state machines, validation, deterministic engines (recurrence, shifts). No React, no async, no storage. Every module has a `.test.ts` sibling.
- `data/` — in-memory repositories exposing typed CRUD + `subscribe()` callbacks. Consumed from React via `useSyncExternalStore` (never `useEffect` polling).
- `application/` — orchestration across repos (`todayService`, `shoppingService`). All mutations flow through here when multiple repos or domain rules are involved.
- `features/` — feature slices (screens, dialogs, forms). One folder per business module.
- `components/` — shared UI: `ui/` (shadcn), `design-system/` (Tori wrappers), `shell/` (AppShell, header, nav, QuickAdd).
- `routes/` — TanStack file-based routes. Never edit `routeTree.gen.ts`.
- `lib/`, `infrastructure/`, `hooks/`, `locales/`, `test/` — supporting utilities.

## Key patterns

- **State machines in domain.** Task status, follow-up status, transport status are pure `transition*` functions returning `{ ok, next } | { ok:false, error }`. UI never mutates status directly.
- **Repositories emit change events.** `todayRepo` re-derives its dataset when any upstream repo (`tasksRepo`, `transportRepo`, `followUpRepo`, …) emits.
- **People directory as the id source of truth.** `data/peopleDirectory.ts` + alias table bridges legacy transport ids to canonical household member ids.
- **Design tokens only.** Colors/spacing/radii come from CSS variables in `src/styles.css` (OKLCH). No hardcoded `text-white` / `bg-[#…]` in components.
- **RTL by default.** `<html lang="he" dir="rtl">`. Use logical properties (`ms-*`, `me-*`, `start`/`end`).
- **Accessibility invariants** enforced in DS wrappers: `IconButton` requires `aria-label` + 44×44 tap target; `StatusBadge` always ships a glyph (never color-only meaning); `FormField` wires `htmlFor` + `aria-describedby` + `aria-invalid`.

## Server boundary

TanStack Start supports `createServerFn` and `src/routes/api/*` server routes. **Currently unused** — no server functions, no API routes, no backend. All logic runs in the browser against mocks.

## Build target

Nitro output for Cloudflare Workers (`nodejs_compat`). PWA service worker generated via `vite-plugin-pwa` (`generateSW`).
