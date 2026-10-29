-- Local dev seed. After creating a user in Studio (Auth > Users), link them:
--   insert into public.memberships (user_id, school_id, role)
--   values ('<USER_UUID>', '11111111-1111-1111-1111-111111111111', 'head');
insert into public.schools (id, name, slug, motto)
values ('11111111-1111-1111-1111-111111111111', 'Demo School', 'demo', 'Learning for life')
on conflict do nothing;
