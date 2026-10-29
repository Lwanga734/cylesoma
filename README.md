# CyleSoma
Simplifying School Management. Empowering Education. Powered by Cyle Technologies.

Monorepo: `web/` (Next.js) · `supabase/` (migrations, tests, Edge Functions, email templates) · `brand/` · `docs/` · `.github/`
(`archive/flutter-app/` is the retired Flutter client, kept for reference.)

## Stack
Next.js (App Router, TypeScript, Tailwind) on Vercel · Supabase (Postgres + RLS, Auth, Storage, Edge Functions) · GitHub Actions CI.
The browser never sees secrets: all data access runs on the server with the signed-in user's session, so row-level security
applies to every query.

## Quick start
Prerequisites: Node 20.9+ (22 recommended), Supabase CLI, Docker, Deno (for function tests), Git.

1. **Backend**
   ```bash
   supabase init            # creates supabase/config.toml; keeps existing migrations
   ```
   Add to `supabase/config.toml`:
   ```toml
   [auth]
   site_url = "http://localhost:3000"
   additional_redirect_urls = ["http://localhost:3000/**"]

   [auth.hook.custom_access_token]
   enabled = true
   uri = "pg-functions://postgres/public/custom_access_token_hook"

   [auth.email.template.invite]
   subject = "You are invited to CyleSoma"
   content_path = "./supabase/templates/invite.html"

   [auth.email.template.recovery]
   subject = "Reset your CyleSoma password"
   content_path = "./supabase/templates/recovery.html"
   ```
   ```bash
   supabase start
   supabase db reset        # migrations + seed
   supabase test db         # RLS tests
   supabase functions serve invite-user
   ```
2. **Create a test user** in Studio (Auth > Users), then link them to the demo school:
   ```sql
   insert into public.memberships (user_id, school_id, role)
   values ('<USER_UUID>', '11111111-1111-1111-1111-111111111111', 'head');
   ```
3. **Web app**
   ```bash
   cd web
   cp .env.example .env.local     # fill URL + anon key from `supabase status`
   npm install
   npm run dev                    # http://localhost:3000
   npm run typecheck && npm test && npm run build
   ```
   Invitation emails appear in Inbucket at http://127.0.0.1:54324.

## GitHub + Vercel
- Branches: `main` (prod), `develop` (staging), `feature/*`; PRs only; protect `main` and `develop`.
- Vercel: import the repo, set **Root Directory = `web`**, framework Next.js. Pushes deploy automatically; every PR gets a preview URL.
  Env vars per environment: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Preview and Development use the
  staging Supabase project; Production uses prod). **Never add the service-role key to Vercel or the web app.**
- Hosted Supabase: set the same Site URL, redirect URLs, auth hook and email templates in the dashboard
  (Authentication > URL Configuration / Email Templates / Hooks), then `supabase functions deploy invite-user`.

## Status
Sprint 1 foundation: sign-in, password reset, invitation links, role sections, school settings (name, motto, brand colour,
terms), user invitations, profile with school switching, per-school theme. See `docs/sprint1-checklist.md` and
`docs/plan-changes-nextjs.md`.
