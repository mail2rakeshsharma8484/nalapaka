# Nalapaka — your kitchen, always stocked

A warm, mobile-first web app for managing a household kitchen: pantry
inventory, grocery shopping list, recipes with pantry-availability checks,
and weekly meal planning. The frontend talks to a Supabase Postgres backend
(full RPC contract in `~/workspace/skills/supabase-pantry/SKILL.md`).

> **Why Nalapaka?** In the Indian epics, King Nala was the legendary master
> cook — no one could season a dish like him, and no pantry of his ever ran
> dry. *Nala paka* means "Nala's cooking." This app borrows his name as an
> aspiration: a kitchen that never runs out, where what's on the shelf, what's
> on the list, and what's for dinner all know about each other.

## Stack

- Next.js 16 (App Router, TypeScript) + Tailwind CSS v4
- `@supabase/supabase-js` + `@supabase/ssr` — auth via Google/Facebook
  OAuth (email OTP as fallback);
  every request carries the signed-in user's JWT, and all writes go through
  household-scoped RPCs (`p_household_id` first). **No service_role key is
  used anywhere.**

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment — copy `.env.example` to `.env.local` and fill in
   the values:

   | Variable | Where to find it |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → **anon public** key |

   Never put a `service_role` key in this repo or in any committed file.

3. In the Supabase Dashboard → Authentication → URL Configuration, add
   your redirect URLs, e.g. for local dev:

   - `http://localhost:3000/auth/confirm` (email magic links)
   - `http://localhost:3000/auth/callback` (Google/Facebook OAuth)

   Add the matching `https://<your-domain>/auth/confirm` and
   `https://<your-domain>/auth/callback` URLs in production. Make sure Email
   OTP / magic-link sign-in is enabled.

### Enabling Google / Facebook sign-in (one-time setup)

The login page shows "Continue with Google" and "Continue with Facebook"
buttons, but they only work once the providers are configured in Supabase:

1. **Google:** in the [Google Cloud Console](https://console.cloud.google.com),
   create an OAuth 2.0 Client ID (Web application) for your app's domain,
   authorizing the Supabase callback URL
   `https://<your-project-ref>.supabase.co/auth/v1/callback`.
2. **Facebook:** in [Meta for Developers](https://developers.facebook.com),
   create an app, add the Facebook Login product, and note the App ID / App
   Secret.
3. In the Supabase Dashboard → Authentication → Providers, enable Google and
   Facebook and paste in the client ID/secret values.

Until a provider is enabled, its button shows a friendly note ("isn't
available yet") and email sign-in keeps working — the page never crashes.

4. Run it:

   ```bash
   npm run dev      # local dev server
   npm run build    # production build (must pass cleanly)
   npm start        # serve the production build
   ```

## Deploying to Vercel

1. Push this repo to GitHub
   ([`mail2rakeshsharma8484/nalapaka`](https://github.com/mail2rakeshsharma8484/nalapaka)).
2. Import it in Vercel and set the two `NEXT_PUBLIC_SUPABASE_*` environment
   variables in the project settings.
3. Add `https://<your-domain>/auth/confirm` (email) and
   `https://<your-domain>/auth/callback` (OAuth) to the Supabase redirect URLs
   (see above) and deploy.

## Project structure

```
app/
  page.tsx            Dashboard — inventory snapshot, week meals, activity
  login/page.tsx      Sign-in — Google/Facebook OAuth + email OTP fallback
  auth/confirm/route.ts  Magic-link callback
  auth/callback/route.ts OAuth callback (code exchange, routes to onboarding)
  onboarding/       First-sign-in setup — household name + currency
  inventory/page.tsx  Pantry items: add stock, record use, undo, new item
  shopping/page.tsx   Grocery list: approve proposals, mark purchased, undo
  recipes/page.tsx    Recipe cards
  recipes/[id]/page.tsx  Ingredients + pantry-availability check
  plan/page.tsx       Weekly meal planner
  loading.tsx (+ per-route)  Skeleton loading states
proxy.ts              Session refresh + auth gating (Next 16 proxy convention)
components/           Nav, Toast, Logo, ui primitives, page clients
lib/
  supabase/           Browser + server Supabase clients (@supabase/ssr)
  household.ts        getHouseholdId() / requireHouseholdId() — resolves the
                    household, redirecting to /onboarding when none exists
  actions.ts          Server actions wrapping the backend RPCs
  types.ts            Shared TypeScript types
```

## Backend notes

- New sign-ins with no `household_members` row are routed to `/onboarding`,
  where they pick a household name (prefilled "My Kitchen") and currency, and
  the household is created via the authenticated-granted `create_household`
  RPC.
- Planning and shopping actions never change inventory — the backend
  enforces this, and the UI says so where it matters.
- The UI only ever displays data returned by the backend; nothing is
  invented client-side.
