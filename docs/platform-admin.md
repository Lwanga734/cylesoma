# Platform super admin

A platform super admin can add schools from the web app (`/platform`) and invite each school's head teacher.
They do NOT automatically see student, marks or fee data: that stays private to each school (row-level security).

## Add or remove a super admin (Supabase SQL editor)
```sql
-- add (the person must already have an account under Authentication > Users)
insert into public.platform_admins (user_id)
select id from auth.users where email = 'person@example.com' on conflict do nothing;

-- remove
delete from public.platform_admins
where user_id = (select id from auth.users where email = 'person@example.com');
```
Changes take effect immediately (no sign-out needed).

## How it works
- `public.platform_admins` has row-level security with no policies, so apps cannot read or write it directly.
- `is_platform_admin()`, `platform_create_school()` and `platform_school_overview()` are SECURITY DEFINER functions that
  re-check the caller on every call. `anon` cannot run them.
- Every school created is written to `audit_logs` (`PLATFORM_CREATE_SCHOOL`).
- `invite-user` accepts a `school_id` ONLY from a platform admin, and then only for the `head` or `owner` role.

## Inviting a head teacher
On `/platform` you choose how to deliver each invitation:
- **Make a link I can share (WhatsApp)** - no email needed. The app shows a one-time link; send it to the head teacher yourself.
  They open it, choose their own password, and land in their school. Only platform admins can create links.
- **Send an email invitation** - needs email sending set up in Supabase (custom SMTP; the built-in sender is limited).

Before the first head teacher signs in, enable the login hook in Supabase (Authentication > Hooks > Custom Access Token >
`public.custom_access_token_hook`). Without it a new user has no school or role and sees "No access".
In Authentication > Sign In / Providers > Email, raise the email OTP expiry (for example to 86400 seconds = 24 hours)
so a link sent on WhatsApp is still valid when it is opened.

## Staff and parent invitations (school heads)
Heads, registrars and HR officers can also choose "Make a link I can share (WhatsApp)" on the Invite users page. Links are
created only for brand-new accounts; existing accounts are simply added to the school. See `docs/email-setup.md` to set up
email delivery.

## Managing schools (super admin)
Open **Platform**, then click a school's name to manage it (`/platform/schools/<id>`):
- **School details** - rename, change the web name, motto and brand colour.
- **Head teachers and owners** - see them, suspend/reactivate, remove, create a **New setup link** for someone who never chose a
  password, or invite another head teacher. The head teacher manages everyone else in their school (Members page).
- **Access** - **Suspend** a school: everyone in it immediately loses access to its data (the database rule
  `current_school()` stops matching), but nothing is deleted. **Reactivate** restores it. A banner tells suspended
  members what happened.
- **Delete school** - permanent. Only for a SUSPENDED school with NO student records, and you must type its web name.
  Accounts stay; the school and its memberships go. When new modules store school data, extend the check in
  `platform_delete_school`.

Safety rules: a school always keeps one active head teacher; every action re-checks that you are a platform admin and is
written to the audit log (`PLATFORM_UPDATE_SCHOOL`, `PLATFORM_SET_SCHOOL_STATUS`, `PLATFORM_DELETE_SCHOOL`).
You manage a school's leadership and settings, not its students, marks or fees.

`supabase/tests/platform_check.sql` runs 14 checks against your database and rolls everything back.
