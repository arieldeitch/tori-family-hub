# Decisions (ADRs)

Approved decisions and their history. Every decision below has status **Accepted** unless marked otherwise. A future decision that replaces an earlier one is not deleted — it is marked **Superseded**. Do not modify an existing business ADR to match the code.

This is the canonical decision log. The prototype-era `LOVABLE_DECISIONS.md` records implementation-level ADRs (D1–D13) for the as-built app and does not override these.

| ADR | Decision | Status |
| --- | --- | --- |
| ADR-001 | Tori is a Family Operations Hub. | Accepted |
| ADR-002 | The PRD ([`01-product-requirements.md`](./01-product-requirements.md)) is the single business source of truth. | Accepted |
| ADR-003 | The Today screen is the default. | Accepted |
| ADR-004 | Template and instance are separate entities. | Accepted |
| ADR-005 | An active task needs responsibility, a due time, or a follow-up. | Accepted |
| ADR-006 | Rotation is deterministic and explained. | Accepted |
| ADR-007 | Soft delete with 48 hours of restore. | Accepted |
| ADR-008 | Hebrew and RTL from day one. | Accepted |
| ADR-009 | Supabase is the default backend. | Accepted |
| ADR-010 | PostgreSQL is the source of truth. | Accepted |
| ADR-011 | Multiple critical changes are atomic. | Accepted |
| ADR-012 | Permissions are enforced on the server and in RLS. | Accepted |
| ADR-013 | A child does not require email; PIN is limited access. | Accepted |
| ADR-014 | Transport is an independent module. | Accepted |
| ADR-015 | `waiting_external` requires a next follow-up or an opt-out. | Accepted |
| ADR-016 | Notifications are intent-based with dedupe and escalation. | Accepted |
| ADR-017 | Full offline is not a condition for MVP. | Accepted |
| ADR-018 | Points and competition are not the core of the product. | Accepted |
| ADR-019 | Development starts only with product-owner approval. | Accepted |
| ADR-020 | A coding agent works in a closed task and updates the handover. | Accepted |

## Notes

- **ADR-006 (rotation determinism)** is reinforced by the WP0 timezone fix: date-only rotation logic must not depend on the runtime timezone. This did not require a new ADR — it is an implementation correction under an existing accepted decision (see [`08-rotation-engine.md`](./08-rotation-engine.md)).
- WP0 changes (typecheck via `tsc`, `.gitattributes` LF policy, PWA precache glob) are simple build/script corrections and do **not** warrant new ADRs.
