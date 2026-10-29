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
