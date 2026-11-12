# Manual database diagnostics

These SQL scripts are interactive diagnostics intended to be run individually in the Supabase SQL Editor using the postgres role. They deliberately raise an exception at the end so the diagnostic output is visible and the fixture transaction is rolled back.

They are kept outside `supabase/tests/` because `supabase test db` treats every SQL file in that directory as an automated pgTAP test.

For automated CI coverage, add proper pgTAP assertions under `supabase/tests/` and finish each test with `select * from finish(); rollback;`.
