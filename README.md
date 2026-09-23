<a href="https://demo-nextjs-with-supabase.vercel.app/">
  <img alt="Next.js and Supabase Starter Kit - the fastest way to build apps with Next.js and Supabase" src="https://demo-nextjs-with-supabase.vercel.app/opengraph-image.png">
  <h1 align="center">Next.js and Supabase Starter Kit</h1>
</a>

<p align="center">
 The fastest way to build apps with Next.js and Supabase
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#demo"><strong>Demo</strong></a> ·
  <a href="#deploy-to-vercel"><strong>Deploy to Vercel</strong></a> ·
  <a href="#clone-and-run-locally"><strong>Clone and run locally</strong></a> ·
  <a href="#feedback-and-issues"><strong>Feedback and issues</strong></a>
  <a href="#more-supabase-examples"><strong>More Examples</strong></a>
</p>
<br/>

## How this repository works

This app is an FIU Citation Tracker built with Next.js (App Router), Supabase (Postgres + Auth), Mapbox for the campus map, and a small Python scraper that writes new citations into the database.

- Frontend (Next.js):

  - `app/page.tsx` renders the main UI: a sidebar with tabs and a Mapbox map (`components/tutorial/map.tsx`).
  - `components/latest-citation.tsx` uses SWR to call two API routes and shows the latest citation per officer prefix along with today’s total amount per prefix.
  - Tailwind and shadcn/ui handle styling.

- API routes (Next.js):

  - `GET /api/citations` (`app/api/citations/route.ts`): queries Supabase for the most recently scraped citation (`scraped_at`) and its `location` for each citation series in `lib/citation-series.ts` (currently `PAT2011`). It returns a list with a human-friendly “x min/hr ago” string and the raw ISO timestamp for sorting.
  - `GET /api/daily-totals` (`app/api/daily-totals/route.ts`): sums today’s `amount` (since midnight Miami time) per citation series.

- Data source (Supabase):

  - Table (expected): `citations(citation_number varchar primary key, citation_date timestamptz, violation text, location text, scraped_at timestamptz default now(), amount numeric)`. `violation` must allow nulls: the current portal doesn't show it.

- Scraper (Python):
  - `run_scraper.py` searches FIU’s T2 citation portal over plain HTTP (no browser). For each PAT series it counts up from the highest ID in the database, stops after 5 missing IDs in a row, then probes further ahead in case numbers were skipped. It upserts rows into the `citations` table using the Supabase Python client.
  - The portal only shows the issue date, not the time, so `citation_date` is stored as midnight Eastern. `scraped_at` (filled in by the database) records when the scraper found it, and the site uses it for "x min ago" and map pins.
  - If the portal's waiting room is active, the run stops and saves what it already found; the next run continues.
  - Intended to run on a schedule (e.g., GitHub Actions), but can also be run locally.

### Citation number formats

The scraper finds new citations by trying the next IDs in sequence, so it only works while citation numbers are predictable. FIU's portal has used three formats. These notes come from looking up citations by hand in September 2026; parts marked "likely" are inferred from a few examples.

- Numeric, 10 digits (2025): `73` `25` `145042`
  - The first 2 digits are the officer/device prefix (`73`, `11`, `04`, `72`).
  - The next 2 digits are likely the year (`25`), followed by a counter that goes up by one per ticket (about 150/day on `73`).
  - No numeric citations dated 2026 have been seen, so the scraper no longer checks them.
- `PAT` + 9 digits (2026): `PAT` `20` `11` `15060`
  - Counts up by one: `PAT201115059` and `PAT201115060` were both issued 09/11/2026, and `PAT201116000` on 09/23/2026 (about 78/day).
  - Likely `20` is fixed, the next 2 digits are a device/officer (`11`, `07`), and the last 5 digits are the counter. `PAT200700190` (03/11/2026) would be a separate `07` series.
  - This is the format the scraper and API routes use, grouping by the 2 digits after `PAT20`.
- `REV` + date + daily number (2026, all $15)
  - Typed by hand, so the format varies: `REVSEP1226-08`, `REVSEP142026-#51`, `REVSEP152026-#1`, `REV091526-2`, `REV091626-41`, `REV09232026-2`.
  - The date in the ID is when the ticket was written; the issue date can be up to 2 days later. The number after the dash restarts each day and covers all lots.
  - Because the format keeps changing, these can't be found reliably by guessing the next ID.

To check whether an ID exists, go to https://fiu.t2hosted.com/Account/Portal, enter it in the **Citation Number** field and click **Search Citations**. The search also works without a browser:

1. `GET /Account/Portal` to get the session cookie and the hidden `__RequestVerificationToken` from the `#citationSearch` form.
2. `POST /Account/Citations/Search` with `__RequestVerificationToken`, `CitationNumber` and an empty `PlateNumber`, keeping the same cookies. The response redirects to the results page.
3. `GET /Account/Citations/Results` returns a table with Citation #, Status, Balance, Issue Date, License Plate (masked) and Location.

### Environment variables

Next.js app

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY` (this repo uses the new “publishable” key name)
- `NEXT_PUBLIC_MAPBOX_TOKEN` (Mapbox access token for the campus map)

Python scraper

Required:

- `SUPABASE_URL` (same as `NEXT_PUBLIC_SUPABASE_URL`)
- `SUPABASE_ANON_KEY` (anon key with insert permissions via RLS/policies as appropriate)

### Run the Next.js app locally

1. Install dependencies

```bash
npm install
```

2. Create `.env.local` with the variables above

```bash
echo "NEXT_PUBLIC_SUPABASE_URL=..." >> .env.local
echo "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=..." >> .env.local
echo "NEXT_PUBLIC_MAPBOX_TOKEN=..." >> .env.local
```

3. Start the dev server

```bash
npm run dev
```

Open http://localhost:3000. The sidebar should show the latest citation per prefix and today’s totals if your database has data.

### Run the scraper locally (optional)

1. Create and activate a virtual environment, then install Python deps

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Export the Supabase environment variables (zsh)

```bash
export SUPABASE_URL=...
export SUPABASE_ANON_KEY=...
```

3. Run:

```bash
python run_scraper.py
```

Newly found citations will be upserted into the `citations` table.

### Notes on Auth & Middleware

- Supabase SSR is set up in `lib/supabase/server.ts` and `lib/supabase/client.ts`.
- `middleware.ts` initializes the Supabase client so cookies/sessions stay in sync. A protected page example lives under `app/protected/` (redirects unauthenticated users).

If you need help wiring the `citations` table, ask and we can add the SQL scaffold directly to this repo.

## Features

- Works across the entire [Next.js](https://nextjs.org) stack
  - App Router
  - Pages Router
  - Middleware
  - Client
  - Server
  - It just works!
- supabase-ssr. A package to configure Supabase Auth to use cookies
- Password-based authentication block installed via the [Supabase UI Library](https://supabase.com/ui/docs/nextjs/password-based-auth)
- Styling with [Tailwind CSS](https://tailwindcss.com)
- Components with [shadcn/ui](https://ui.shadcn.com/)
- Optional deployment with [Supabase Vercel Integration and Vercel deploy](#deploy-your-own)
  - Environment variables automatically assigned to Vercel project

## Demo

You can view a fully working demo at [demo-nextjs-with-supabase.vercel.app](https://demo-nextjs-with-supabase.vercel.app/).

## Deploy to Vercel

Vercel deployment will guide you through creating a Supabase account and project.

After installation of the Supabase integration, all relevant environment variables will be assigned to the project so the deployment is fully functioning.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js%2Ftree%2Fcanary%2Fexamples%2Fwith-supabase&project-name=nextjs-with-supabase&repository-name=nextjs-with-supabase&demo-title=nextjs-with-supabase&demo-description=This+starter+configures+Supabase+Auth+to+use+cookies%2C+making+the+user%27s+session+available+throughout+the+entire+Next.js+app+-+Client+Components%2C+Server+Components%2C+Route+Handlers%2C+Server+Actions+and+Middleware.&demo-url=https%3A%2F%2Fdemo-nextjs-with-supabase.vercel.app%2F&external-id=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js%2Ftree%2Fcanary%2Fexamples%2Fwith-supabase&demo-image=https%3A%2F%2Fdemo-nextjs-with-supabase.vercel.app%2Fopengraph-image.png)

The above will also clone the Starter kit to your GitHub, you can clone that locally and develop locally.

If you wish to just develop locally and not deploy to Vercel, [follow the steps below](#clone-and-run-locally).

## Clone and run locally

1. You'll first need a Supabase project which can be made [via the Supabase dashboard](https://database.new)

2. Create a Next.js app using the Supabase Starter template npx command

   ```bash
   npx create-next-app --example with-supabase with-supabase-app
   ```

   ```bash
   yarn create next-app --example with-supabase with-supabase-app
   ```

   ```bash
   pnpm create next-app --example with-supabase with-supabase-app
   ```

3. Use `cd` to change into the app's directory

   ```bash
   cd with-supabase-app
   ```

4. Rename `.env.example` to `.env.local` and update the following:

   ```
   NEXT_PUBLIC_SUPABASE_URL=[INSERT SUPABASE PROJECT URL]
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[INSERT SUPABASE PROJECT API ANON KEY]
   ```

   Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` can be found in [your Supabase project's API settings](https://supabase.com/dashboard/project/_?showConnect=true)

5. You can now run the Next.js local development server:

   ```bash
   npm run dev
   ```

   The starter kit should now be running on [localhost:3000](http://localhost:3000/).

6. This template comes with the default shadcn/ui style initialized. If you instead want other ui.shadcn styles, delete `components.json` and [re-install shadcn/ui](https://ui.shadcn.com/docs/installation/next)

> Check out [the docs for Local Development](https://supabase.com/docs/guides/getting-started/local-development) to also run Supabase locally.

## Feedback and issues

Please file feedback and issues over on the [Supabase GitHub org](https://github.com/supabase/supabase/issues/new/choose).

## More Supabase examples

- [Next.js Subscription Payments Starter](https://github.com/vercel/nextjs-subscription-payments)
- [Cookie-based Auth and the Next.js 13 App Router (free course)](https://youtube.com/playlist?list=PL5S4mPUpp4OtMhpnp93EFSo42iQ40XjbF)
- [Supabase Auth and the Next.js App Router](https://github.com/supabase/supabase/tree/master/examples/auth/nextjs)

.
