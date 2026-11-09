# Decision log
| Date | Decision | Why |
|---|---|---|
| 2026-10-15 | Product name: CyleSoma | Brand supplied; see /brand |
| 2026-10-15 | Flutter for all clients (mobile + web admin) | One codebase, offline-capable mobile |
| 2026-10-15 | Supabase (Postgres + RLS) backend | Relational multi-tenant data; RLS by school_id |
| 2026-10-15 | GitHub for code/CI, Vercel for web hosting | Preview deploys per PR; Flutter Web built in Actions |
| 2026-10-15 | JWT claim `user_role` (not `role`) | `role` is reserved by Supabase for the Postgres role |
| 2026-10-15 | Payments/SMS/QR signing in Edge Functions only | Keep secrets out of clients |
| 2026-10-15 | School for invitations always comes from the caller's JWT, never the request body | Prevents inviting into another school |
| 2026-10-15 | Invite rules: head any role; registrar parent/student; hr staff roles | Least privilege; enforced in Edge Function, mirrored in UI |
| 2026-10-15 | Schools can set their own brand colour; app theme follows the active school | Per-school branding without per-school builds |
| 2026-10-17 | Frontend switched from Flutter to Next.js (App Router, TypeScript, Tailwind) | Owner decision; native fit with Vercel; one web codebase for all roles. Backend unchanged |
| 2026-10-17 | Email invite/reset links use `/auth/confirm?token_hash=...` (server-side verifyOtp) | Avoids URL-fragment problems; same flow on desktop and phones |
| 2026-10-17 | Offline strategy becomes PWA: service worker + IndexedDB outbox (Sprint 2) | Replaces Drift/SQLite; iOS lacks background sync so sync also runs on open/foreground |
| 2026-10-17 | Flutter code archived in /archive/flutter-app | Reference only |
| 2026-10-29 | Platform super admin = row in `platform_admins`, checked live in the database (not a JWT claim) | Instant revocation; no dependency on the login hook |
| 2026-10-29 | Super admins create schools via SECURITY DEFINER functions and may only invite a school's head/owner | Super admin manages the platform but does not read school data (students, marks, fees) |
| 2026-11-02 | Platform admins can create invitation links (no email) for head teachers | Email sending is restricted on new Supabase projects; WhatsApp is how schools here communicate. Links are platform-admin only because whoever holds one can set that account's password |
| 2026-11-02 | Shareable invitation links are available to every permitted inviter, for NEW accounts only | Email sending is not set up yet and schools use WhatsApp; existing accounts never get a link, so no takeover of someone's existing account is possible |
| 2026-11-03 | Member changes only through SECURITY DEFINER functions (`update_member`, `remove_member`); direct membership writes by heads removed | Enforces "keep one head", "not yourself", per-role limits, and re-checks the live membership instead of trusting an old token |
| 2026-11-03 | Setup links can be re-issued only while `profiles.password_set_at` is empty and the person belongs to no other school | Helps stuck invitees without allowing takeover of accounts in use |
| 2026-11-03 | School suspension is enforced in `current_school()` (returns null for a non-active school) | One change blocks every row-level-security rule for that school at once, without touching each policy |
| 2026-11-03 | Schools can be deleted only when suspended and free of student records, with the web name typed | Prevents accidental permanent data loss |
| 2026-11-04 | CSV import is validated in the browser (preview) AND again on the server, then done by one database function in a single transaction | Fast feedback for the user; the server never trusts the browser; all-or-nothing writes |
| 2026-11-04 | Write policies must check the role in WITH CHECK (migration 8) and a role x table matrix script guards it | INSERT is governed by WITH CHECK only; found by testing before any real data existed |
