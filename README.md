# NikoHealth Operations Dashboard

An internal, data-first operations dashboard that shows live NikoHealth order
counts broken down by status. Four large tiles — **NEW**, **HOLD**,
**IN PROGRESS**, **COMPLETED** — with the count as the visual focus. Polls
every 30 seconds.

Built with Next.js 15 (App Router), TypeScript (strict), Tailwind CSS, and
shadcn/ui primitives.

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev
```

Open http://localhost:3000.

## Environment variables

Set these in `.env.local` (never committed). They are read **server-side only**
in the API route and are never exposed to the browser.

| Variable            | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `NIKO_API_KEY`      | NikoHealth API key / token used by the server-side route. |
| `NIKO_API_BASE_URL` | Base URL for the NikoHealth API (no trailing slash).      |

See `.env.example` for the template.

## How it works

- **`app/api/orders/counts/route.ts`** — server-side GET handler. Calls the
  NikoHealth orders endpoint, counts orders into the four buckets, and returns:

  ```json
  {
    "counts": { "new": 0, "hold": 0, "inProgress": 0, "completed": 0 },
    "total": 0,
    "lastFetched": "2026-05-16T12:00:00.000Z"
  }
  ```

  Status matching is case-insensitive and tolerant of separator/spacing
  variations (`in_progress`, `In Progress`, `InProgress` all → IN PROGRESS).
  Unrecognized statuses are logged server-side and excluded from the response.
  Responses are sent with `Cache-Control: no-store`. The API key is never
  logged or returned, even on error.

- **`lib/orders.ts`** — shared `StatusCounts` type and the
  `normalizeStatus` / `countByStatus` utilities (single source of truth for the
  bucketing rules).

- **`app/page.tsx`** — client component. Polls `/api/orders/counts` every 30s,
  has a manual **Refresh** button, shows a loading skeleton on first load, and
  on error keeps showing the last good counts behind a banner.

## TODOs — verify against NikoHealth's Swagger doc

The exact NikoHealth API shape was not available when this was built. The API
route makes defensive assumptions, all flagged with
`TODO(niko-swagger)` in `app/api/orders/counts/route.ts`:

- **Endpoint path** — assumed `${NIKO_API_BASE_URL}/orders`.
- **Auth scheme** — assumed `Authorization: Bearer <NIKO_API_KEY>`. May instead
  be an `x-api-key` header or a query parameter.
- **Response envelope** — handles a bare array or an object with the array under
  `data` / `orders` / `items` / `results`.
- **Status field** — reads `status`, then `orderStatus`, then `state`.
- **Pagination** — not yet handled; if the orders endpoint paginates, the route
  needs to follow pages to get an accurate total.

Once the Swagger doc is confirmed, tighten these in the route and update the
status synonyms in `lib/orders.ts` if NikoHealth uses different status labels.

## Scripts

| Command             | What it does                     |
| ------------------- | -------------------------------- |
| `npm run dev`       | Start the dev server.            |
| `npm run build`     | Production build.                |
| `npm run start`     | Run the production build.        |
| `npm run lint`      | ESLint.                          |
| `npm run typecheck` | `tsc --noEmit` (strict).         |

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, **New Project** → import the repo. Framework preset: **Next.js**
   (auto-detected). No build settings changes needed.
3. Add the environment variables under **Settings → Environment Variables**:
   - `NIKO_API_KEY`
   - `NIKO_API_BASE_URL`

   Add them to the **Production** (and **Preview**, if desired) environments.
4. Deploy. The API route runs server-side, so the key stays on the server.
5. (Later) Restrict access with Vercel password protection / SSO — there is no
   app-level auth by design for v1.

## Scope (v1)

Included: counts-only tiles, 30s polling, manual refresh, error resilience.

Deliberately **not** included: database, auth, individual order lists, history
or trends, webhooks. Polling only.
