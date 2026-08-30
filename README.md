# Member Registration & Management

Next.js 14 (App Router) internal tool for registering and managing members, with a birthday-first dashboard and auditable unit assignments.

## Stack

- Next.js 14 + TypeScript + Tailwind CSS
- SQLite via Prisma
- Zod + react-hook-form
- date-fns
- sonner toasts

## Setup

```bash
npm install
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Main routes

| Path | Purpose |
|------|---------|
| `/` | Dashboard — birthdays, stats, units, members |
| `/members/new` | Register a member |
| `/members/[id]` | Profile / edit |
| `/attendance` | Calendar, daily marking, range report + PDF |

Default country is Kenya; minimum age warning threshold is 16 (`src/lib/org-settings.ts`).
