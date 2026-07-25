# UX & UI Guidelines

Source of truth for UX and UI. Derived from the [PRD](./01-product-requirements.md); does not override it.

Tori should feel like a **calm operations assistant**, not a project-management system.

## Principles

- Clarity.
- One primary action per screen/card.
- Calm.
- No accusatory language.
- No leaderboard by default.

## State must never be carried by colour alone

Every status — above all **completed** — must be conveyed by at least three signals together:

1. a colour change,
2. an icon (a check for completed),
3. explicit text (**"בוצע"** for completed),

plus a programmatic accessible state (`aria-pressed` / `aria-checked` or an equivalent role), so a screen reader announces it and a colour-blind user can read it. A green card with no icon and no label is not an acceptable completed state.

## Weekly chores view (Family Pilot)

- The week runs **Sunday → Saturday**, grouped by day, with today clearly marked.
- Three perspectives: a **whole-family** view and a **per-child** view for each child — a child sees their own whole week at a glance, without opening every task.
- Every chore card shows the assignee unambiguously (avatar **and** name, never colour alone) and a status in words.
- **One primary action per card:** mark done. The whole card, or a large explicit control inside it, is the tap target — at least 44×44.
- All of `empty`, `loading`, `error` and `offline` states are designed, not afterthoughts; the design system already provides them.
- Layouts are verified at **360px and 390px**, fully RTL, and operable by keyboard with a visible focus ring.

## Mobile first

- Support 360px and 390px widths.
- No dense tables on mobile.
- Tap targets at least 44×44.
- Frequent actions reachable by thumb.
- A minimal Bottom Navigation.
- A Desktop Sidebar only on wide screens.

## RTL

- `dir="rtl"` at the application level.
- Logical CSS properties (`ms-*`, `me-*`, `start`/`end`).
- Adapt drawers, arrows, and breadcrumbs.
- An i18n layer.
- No Hebrew text inside domain logic.

## System states

Every data surface must handle:

- loading
- empty
- error
- offline
- pending sync
- sync failed
- conflict
- permission denied
- expired session

## Accessibility

- Keyboard navigation.
- Focus visible.
- Real labels.
- Errors linked to their fields.
- Screen-reader support.
- WCAG 2.2 AA where feasible.
- A button alternative for drag-and-drop.
- Honor `prefers-reduced-motion`.

## Today screen layout

See [PRD §3](./01-product-requirements.md#3-the-today-screen) for the section order. Empty sections are hidden. Cards are limited to title / assignee / time / status plus one primary action; transport cards add child, direction, place, approval state, and recommended departure time.
