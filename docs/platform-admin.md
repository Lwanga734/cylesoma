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
