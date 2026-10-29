# Sprint 1 checklist (2 Nov - 13 Nov)

Verified in the build sandbox (2026-10-17): `npm run typecheck`, `npm test` (8 tests), `npm run build`, production server
smoke test (signed-out redirects, public pages, security headers), `deno test` (6 tests), SQL syntax check.

Run on your machine:
- [ ] `supabase db reset` applies all 3 migrations
- [ ] `supabase test db` passes (rls_basic: 6, sprint1: 7)
- [ ] `cd web && npm ci && npm run typecheck && npm test && npm run build`

Verify by hand (needs the local Supabase stack, hook and email templates enabled per README):
- [ ] Head signs in, opens School settings, changes name and colour: header colour changes
- [ ] Head adds a term and sets it current; setting another current unsets the first
- [ ] Head invites a teacher; email shows in Inbucket; link opens /set-password; teacher sets password and lands on /teacher
- [ ] Teacher visiting /admin is redirected to /teacher; registrar can invite parents but not teachers
- [ ] Forgot password email works end to end
- [ ] User with two schools switches school from Profile
- [ ] Open the app on a real Android phone over the network and on an iPhone; install to home screen

Still to do:
- [ ] Error reporting (Sentry for Next.js): needs your DSN
- [ ] Vercel project + staging Supabase project and env vars
- [ ] School logo upload (storage bucket + policy)
- [ ] Generate typed DB access: `supabase gen types typescript --local > web/src/lib/database.types.ts`, then use it in `lib/data.ts`
