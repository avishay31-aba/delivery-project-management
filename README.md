# Delivery Project Management (MVP)

Salesforce-style delivery console — mock data first. See [DESIGN.md](./DESIGN.md) and [MVP-PLAN.md](./MVP-PLAN.md).

## Phase A status

Scaffold complete: Vite + React + TypeScript + Tailwind + React Router + Zustand + seed data + localStorage persistence foundation.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ (includes npm)

## Run locally

```bash
cd "Delivery Project Management"
npm install
npm run dev
```

Open the URL shown in the terminal (usually http://localhost:5173).

## Other scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

## Mock data & persistence

- Initial data: `src/data/seed.json`
- Store: `src/store/useAppStore.ts` (Zustand)
- Browser persistence key: `dpm-mvp-v1` (localStorage)
- Header actions: **Save to browser** · **Reset seed**

## Routes

| Path | Page |
|------|------|
| `/` | Redirects to `/projects` |
| `/projects` | Project list (placeholder) |
| `/projects/:pid` | Project form (placeholder) |
| `/systems` | System list (placeholder) |
| `/systems/:sid` | System form (placeholder) |
| `/tenants` | Tenant list (placeholder) |
| `/tenants/:tid` | Tenant form (placeholder) |

## Next phase

**Phase B** — shared `DataDashboard` + `EditableGrid` with TanStack Table (do not start until Phase A review is approved).
