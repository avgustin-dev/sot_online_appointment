# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Цифровая платформа личного приёма граждан руководством Верховного суда КР (public appointment booking + a staff back-office). This is not an e-court / case-filing system. Frontend only — the Java backend is a separate service the frontend is contract-ready for but does not yet require.

## Commands

```bash
npm install
cp .env.example .env.local
npm run dev        # next dev --port 3000
npm run dev:alt     # next dev --port 3005
npm run build       # next build
npm run start        # next start --port 3000
npm run lint         # eslint src --ext .ts,.tsx
```

There is no unit test suite / `npm test` script. `scripts/e2e-admin-full.mjs` is a standalone Playwright script (not wired into `package.json`) that exercises the admin cabinet end-to-end against a running dev server on `:3000`; run it manually with `node scripts/e2e-admin-full.mjs` and it leaves 20 clean demo records in localStorage afterward. Screenshots land in `scripts/e2e-shots/`.

## Architecture

Full detail lives in [ARCHITECTURE.md](ARCHITECTURE.md) (backend contract, roles, appeal lifecycle, slot rules, routes) — read it before backend-integration work. Key points to know before touching code:

**Two data modes, one store.** `NEXT_PUBLIC_API_URL` unset → app runs on a local circuit: seed data from `content/` loaded into Zustand (`src/lib/store.ts`), nothing leaves the browser, and (in dev, unless `NEXT_PUBLIC_DEMO=false`) the store is pre-seeded with 20 training appeals. `NEXT_PUBLIC_API_URL` set → the app calls `GET /public/bootstrap` on load, keeps a JWT in `sessionStorage`, and routes all mutations through `src/lib/storeRemote.ts` → `src/api/client.ts` (paths in `src/api/paths.ts`, DTOs in `src/api/dto.ts`, all camelCase). Slot availability is always computed by the backend, never by the frontend, even in local mode (`content/calendar-rules.json` drives the local simulation). Staff passwords are never written to localStorage.

**Route groups mirror the two audiences.** `src/app/(public)/*` — the public booking flow: electronic appointment wizard, status/reschedule/cancel by code+PIN, service evaluation, rules. These paths (plus `/`) are the only ones that belong in citizen-facing letters/QR codes; legacy paths (`/book`, `/my-appointment`, `/feedback`, `/rules`, `/process`, and the old `/reception/*` tree) 301/302-redirect via `next.config.mjs`. `src/app/admin/*` — the staff cabinet, gated by role (`admin`, `reception`, `leadership`, `responsible`), each with a different post-login landing page (see ARCHITECTURE.md's role table). The admin area is intentionally not linked from the public nav — only reachable via `/admin/login`.

**One appointment can grow into one appeal card.** `appointment.id` ↔ `appeal.appointmentId`, sharing a citizen-facing `code` (`VS-YYYY-XXXX`). Appointment status (`pending_review → confirmed → completed`, etc.) and appeal stage (`registered → under_review → ready_for_reception → reception_done → in_control → answered → closed`) are separate state machines that move together through reception intake → protocol/поручение → control → citizen evaluation. PINs are only ever returned once, from `POST /public/appointments`; no GET endpoint returns them.

**`content/` is the seed of truth for static text and rules**, and is also what the backend serves back via `GET /public/bootstrap` — `content/site.json`, `ui.ru.json`/`ui.ky.json`, `calendar-rules.json`, `eligibility-tree.json`, `survey.json`, `booking-rules.json`. Default UI language is Kyrgyz; toggle persists as `vs-kr-lang`.

## Notes

- Timezone is fixed to `Asia/Bishkek`.
- Slots are 20 min + 5 min pause (08:00–08:20, 08:25–08:45, …); leadership has its own per-weekday window.
- `docs/backend/` (`openapi.yaml`, `ENDPOINTS.md`, `README.md`) is the contract to implement against if/when building the Java backend — `src/api/client.ts` already calls these methods.
