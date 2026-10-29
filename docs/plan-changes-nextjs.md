# What changes in the implementation plan after the Next.js decision

Unchanged: Supabase schema, RLS, audit log, invite Edge Function, sprint order, pilot goals, hardening gate.

| Area | Before (Flutter) | Now (Next.js) |
|---|---|---|
| Clients | Android/iOS apps + Flutter Web | One responsive web app, installable as a PWA on phones |
| Distribution | Play Store / TestFlight | Browser + "Add to Home screen". Play Store later via a Trusted Web Activity wrapper if wanted. No store review in the critical path |
| Offline (Sprint 2/3) | Drift + outbox | Service worker (e.g. Serwist) + IndexedDB (e.g. Dexie) outbox. Same pull-by-`updated_at` + push-outbox design |
| Sync triggers | Background + on connect | Background Sync only works in Chromium (Android Chrome). iOS Safari: sync on app open, on reconnect while open, and a visible "Sync now" button |
| QR scanning (e-ID, Sprint 5) | mobile_scanner | Browser camera: BarcodeDetector where available, otherwise a JS scanner library |
| PDFs (report cards, ID cards) | Dart pdf package | Server-side PDF (react-pdf or an Edge Function) |
| Photos | image_picker/cropper | Browser file/camera input + client-side compression before upload |
| Push notices | FCM | Web Push (works on Android; on iOS only for installed PWAs). SMS stays the universal fallback |
| Tests | flutter test | Vitest (unit), Playwright (end-to-end, add in Sprint 2), pgTAP, Deno |
| Deploy | Actions build + Vercel static | Vercel Git integration (preview per PR) |

Plan edits to make:
- Phase 0 / Buffer: drop "Google Play listing" and "Apple Developer account" from the critical path.
- Sprint 2: sync engine becomes the biggest risk (browser storage, service worker caching). Add a spike in week 1: attendance
  offline round-trip on a low-cost Android phone with Chrome.
- Add to hardening: confirm PWA install works on the phones teachers actually own, and that cached data is cleared on sign-out.
