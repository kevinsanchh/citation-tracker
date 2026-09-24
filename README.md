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
  - `components/latest-citation.tsx` uses SWR to call two API routes and shows the latest citation per officer along with today’s total amount per officer.
  - Officers are the series in `lib/citation-series.ts`, labeled by `prefixMap` in `components/latest-citation.tsx` and `components/tutorial/map.tsx`:

    | Officer | Series | Example |
    |---|---|---|
    | 01 | `PAT2011` | `PAT201116072` |
    | 02 | `REV` | `REV09232026-2` |

  - The map shows a pin at each officer's latest location for 10 hours after the scraper found it. Locations need coordinates in `LOCATION_COORDINATES` (`components/tutorial/map.tsx`) to get a pin.
  - Tailwind and shadcn/ui handle styling.

- API routes (Next.js):

  - `GET /api/citations` (`app/api/citations/route.ts`): queries Supabase for the most recently scraped citation (`scraped_at`) and its `location` for each citation series in `lib/citation-series.ts` (currently `PAT2011` as Officer 01 and `REV` as Officer 02). It returns a list with a human-friendly “x min/hr ago” string and the raw ISO timestamp for sorting.
  - `GET /api/daily-totals` (`app/api/daily-totals/route.ts`): sums today’s `amount` (since midnight Miami time) per citation series.

- Data source (Supabase):

  - Table (expected): `citations(citation_number varchar primary key, citation_date timestamptz, violation text, location text, scraped_at timestamptz default now(), amount numeric)`. `violation` must allow nulls: the current portal doesn't show it.

- Scraper (Python):
  - `run_scraper.py` searches FIU’s T2 citation portal over plain HTTP (no browser). For each PAT series it counts up from the highest ID in the database, stops after 5 missing IDs in a row, then probes further ahead in case numbers were skipped. About once an hour (or with `--rev`) it also checks REV citations for the last 3 days: for each day it counts up from the highest known number, trying both `REVMMDDYY-N` and `REVMMDDYYYY-N`, until 5 in a row are missing. It upserts rows into the `citations` table using the Supabase Python client.
  - The portal only shows the issue date, not the time, so `citation_date` is stored as midnight Eastern. `scraped_at` (filled in by the database) records when the scraper found it, and the site uses it for "x min ago" and map pins.
  - If the portal's waiting room is active, the run stops and saves what it already found; the next run continues.
  - Paid or closed citations don't appear on the portal, so they look the same as numbers that don't exist. The results page also sometimes bounces back to the portal right after a search; the scraper retries once with a fresh session before counting it as missing.
  - The scraper is not in this repo yet. It lives in its own folder (`parking_citation_scrapper/`, with `run_scraper.py`, `requirements.txt`, `.env` and `.venv`). The GitHub Action in `.github/workflows/scraper.yml` expects `run_scraper.py` at the repo root, so it won't work until the file is added here.
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
  - A sweep of every series `00`–`99` on 09/23/2026 found only two others, both inactive: `07` (`PAT200700190`–`PAT200700260`, Mar 11 – Apr 23, 2026) and `13` (`PAT201300050`, `PAT201300075`, Feb 4–5, 2026). `11` is the only active series (about 78 citations a day).
- `REV` + date + daily number (2026, all $15)
  - Typed by hand, so the format varies: `REVSEP1226-08`, `REVSEP142026-#51`, `REVSEP152026-#1`, `REV091526-2`, `REV091626-41`, `REV09232026-2`.
  - The date in the ID is when the ticket was written; the issue date can be up to 2 days later. The number after the dash restarts each day and covers all lots.
  - The scraper only checks the two numeric-date styles, `REVMMDDYY-N` and `REVMMDDYYYY-N` (the one used as of 09/23/2026). Other styles, like `REVSEP152026-#1`, are skipped.

To check whether an ID exists, go to https://fiu.t2hosted.com/Account/Portal, enter it in the **Citation Number** field and click **Search Citations**. The search also works without a browser:

1. `GET /Account/Portal` to get the session cookie and the hidden `__RequestVerificationToken` from the `#citationSearch` form.
2. `POST /Account/Citations/Search` with `__RequestVerificationToken`, `CitationNumber` and an empty `PlateNumber`, keeping the same cookies. The response redirects to the results page.
3. `GET /Account/Citations/Results` returns a table with Citation #, Status, Balance, Issue Date, License Plate (masked) and Location.

### Adding a new series

If a new officer/series shows up (e.g. a plate lookup shows a `PAT20xx` with a new `xx`):

1. Scraper: add it to `citation_series` in `run_scraper.py` with the counter to start after, e.g. `"13": 75`.
2. Site: add it to `CITATION_SERIES` in `lib/citation-series.ts`.
3. Site: give it an officer number in `prefixMap` in both `components/latest-citation.tsx` and `components/tutorial/map.tsx`, e.g. `"13": "03"`.

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

### Run the scraper locally

From the scraper's folder, using the Python in its `.venv` (it already has `httpx`, `supabase` and `python-dotenv` installed):

```bash
cd ~/Documents/parking_citation_scrapper
.venv/bin/python run_scraper.py          # PAT citations (plus REV during the first 10 minutes of each hour)
.venv/bin/python run_scraper.py --rev    # always include the REV check
```

It reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` from the `.env` file in that folder, so run it from inside the folder. To set it up from scratch:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt   # httpx, supabase, python-dotenv
```

A run takes about 1–2 minutes. Output to expect:

- `Starting after last known ID: PAT2011…`: where the PAT check starts (the highest saved ID).
- `--- Checking REV citations after REV…-N ---`: one line per day and date format checked (N is the highest saved count for that day, 0 if none).
- `Found a total of N unique new citations… Successfully inserted new citations.` or `No new citations found across all series.`
- `Stopping early, portal unavailable`: the portal's waiting room is active. What was found so far is saved; try again later.

### Dependencies

- Next.js is pinned to `15.5.26`. Versions before 15.5.7 are affected by CVE-2025-66478, and Vercel refuses to deploy them. Keep it pinned (not `latest`) so installs don't jump to Next 16, which has breaking changes.

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
