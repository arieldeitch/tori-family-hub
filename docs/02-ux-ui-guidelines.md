# UX & UI Guidelines

Source of truth for UX and UI. Derived from the [PRD](./01-product-requirements.md); does not override it.

Tori should feel like a **calm operations assistant**, not a project-management system.

## Principles

- Clarity.
- One primary action per screen/card.
- Calm.
- No accusatory language.
- No leaderboard by default.

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
