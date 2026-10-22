<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 2.0.0
Modified principles:
  - IV. "Mock-First, Then Real Backend" → "API Contract & Ownership" (redefined: the
    backend is a Go API + PostgreSQL, not Supabase; the mock client was removed)
Modified sections:
  - Technology Stack Constraints: Backend, Auth
Templates reviewed:
  - .specify/templates/plan-template.md         ✅ compatible
  - .specify/templates/spec-template.md         ✅ compatible
  - .specify/templates/tasks-template.md        ✅ compatible
  - .specify/templates/agent-file-template.md   ✅ compatible
Follow-up TODOs: none
-->

# Travel Tracker App Constitution

## Core Principles

### I. Component-First

Every UI feature MUST be built as a self-contained component before being integrated into pages.
Components MUST be independently renderable and testable in isolation.
Components MUST NOT reach outside their props/context boundary for side effects
(no direct DOM manipulation, no global state mutations).
Shared UI primitives live in `front/components/ui/`; feature-specific components live in
`front/components/`.

**Rationale**: Enables independent development, easier refactoring, and prevents spaghetti
dependency graphs as the app grows.

### II. Type Safety (NON-NEGOTIABLE)

TypeScript strict mode MUST be enabled at all times — `"strict": true` in `tsconfig.json`.
All data shapes (entities, API responses, form values) MUST be declared as TypeScript types or
interfaces before use.
Runtime validation at system boundaries (form submission, API responses) MUST use Zod schemas.
`any` and type assertions (`as Foo`) MUST NOT appear in production code without an explanatory
comment justifying the exception.

**Rationale**: The domain (trips, places, geo-coordinates, expenses) is data-heavy.
Type errors caught at compile time prevent silent corruption of travel records.

### III. User Data Integrity

Trip and Place records MUST be validated by a Zod schema before being sent to the API,
and validated again by the API before persistence.
Delete operations on Trips MUST cascade-delete all child Places — no orphaned place records.
Latitude/longitude MUST be validated as numeric values within valid WGS-84 ranges
(lat: −90 to 90, lng: −180 to 180).
Expense values MUST be non-negative numbers.
Ratings MUST be integers in the range 1–5 or null (unrated).

**Rationale**: Corrupt or orphaned travel data silently degrades the user experience
(broken map pins, wrong expense totals). Validation MUST be explicit and centralized.

### IV. API Contract & Ownership

The frontend MUST only call endpoints that exist in the Go API (`back/`); a new data
feature is not done until both sides are implemented and the types in
`front/lib/api-client.ts` match the Go models.
Every API query on user data MUST filter by the authenticated `user_id` taken from the
access token — never from the request body. PostgreSQL RLS policies MUST also exist for
every user-data table as a second layer, but MUST NOT be the only protection.
Request bodies MUST be validated in the API (ranges, formats, sizes) even when the
frontend already validates them.

**Rationale**: This is a multi-user app. Client-side validation and RLS alone are easy to
bypass (RLS does not apply to superusers), so ownership is enforced explicitly at the API.

### V. Simplicity

Build the simplest thing that satisfies the current user story — YAGNI applies strictly.
New abstractions (hooks, context providers, utility functions) MUST serve at least two
call sites before being extracted; one-off helpers stay inline.
Third-party libraries MUST NOT be added for functionality already provided by the existing
stack (Next.js, React 19, Radix UI, Tailwind, Zod, date-fns).
Performance optimizations MUST be measured before being applied — no speculative caching
or memoization.

**Rationale**: This is a personal project. Over-engineering has a direct cost in velocity
and maintainability with no offsetting team benefit.

## Technology Stack Constraints

- **Framework**: Next.js App Router (current: 16.x) — use Server Components by default;
  add `"use client"` only when browser APIs or React state/effects are needed.
- **Language**: TypeScript 5 — strict mode, no `allowJs`.
- **Styling**: Tailwind CSS 4 + shadcn/ui (Radix UI primitives). Custom CSS MUST NOT be
  added unless Tailwind utilities are provably insufficient.
- **Forms**: React Hook Form + Zod resolvers. Do NOT use uncontrolled raw `<form>` elements
  for user-facing forms.
- **Maps**: Leaflet (`react-leaflet` or direct) for interactive maps;
  Google Maps types for geocoding/search only.
- **Backend**: Go API (`back/`, gorilla/mux) + PostgreSQL 17 (`db/`), orchestrated with
  Docker Compose.
- **Auth**: JWT access tokens (short-lived) + rotating refresh tokens; optional TOTP MFA.
  Tokens MUST NOT be accepted outside their audience (access vs. MFA challenge).
- **Date handling**: `date-fns` — no `moment.js`, no `dayjs`, no `new Date()` formatting
  in render paths.

## Development Workflow

- Features MUST have a spec (`/specs/<feature>/spec.md`) before implementation begins.
- The plan's **Constitution Check** section MUST be completed and pass before Phase 0
  research starts.
- Each user story MUST be independently testable at its completion checkpoint.
- UI changes MUST be visually verified in both light and dark themes
  (next-themes is configured).
- Before merging any feature: run `npm run build` and `npm run lint` with zero errors.
- Complexity violations (deviations from these principles) MUST be documented in the
  plan's **Complexity Tracking** table with explicit justification.

## Governance

This constitution supersedes all other development practices, README guidance, and
informal conventions. When a conflict arises, the constitution wins.

**Amendment procedure**:
1. Identify the principle or section to change.
2. Run `/speckit.constitution` with the proposed change described.
3. Increment version per semantic versioning rules (defined below).
4. Propagate changes to all affected templates and docs (Sync Impact Report generated
   automatically by the command).
5. Commit with message: `docs: amend constitution to vX.Y.Z (<summary>)`.

**Versioning policy**:
- MAJOR: Principle removed, redefined in a backward-incompatible way, or governance
  structure fundamentally changed.
- MINOR: New principle added, new mandatory section introduced, or existing principle
  materially expanded.
- PATCH: Clarifications, wording refinements, typo fixes, non-semantic changes.

**Compliance review**: Every feature plan's Constitution Check section serves as the
per-feature compliance review. No separate audit process is required at this project scale.

**Version**: 2.0.0 | **Ratified**: 2026-03-26 | **Last Amended**: 2026-10-22
