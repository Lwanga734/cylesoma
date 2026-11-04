# Member management

**Where:** Administration > Members (`/admin/members`).

**Who can use it** (the database decides, on every call, from the person's current membership, not just their sign-in token):
| Manager | Sees and manages |
|---|---|
| Head teacher | everyone in the school, including other heads and themselves (view only for themselves) |
| Registrar | parents and students |
| HR officer | teachers and support staff (librarian, nurse, storekeeper, boarding, transport) |

**What you can do to a member**
- **Save role** - change their role (only to roles you are allowed to manage).
- **Suspend / Reactivate** - a suspended member loses access to the school's data straight away.
- **Remove** - removes them from your school. Their account stays (they may belong to other schools).
- **New setup link** - for someone who has never chosen a password (for example their invitation link was used up or
  lost). Produces a one-time link to send by WhatsApp. It is refused for anyone who has already chosen a password or who
  belongs to another school, so it can never be used to take over an account in use. Those people should use
  "Forgot your password?" instead.

**Safety rules (enforced in the database)**
- You cannot change, suspend or remove yourself.
- A school always keeps at least one active head teacher.
- A suspended or removed person cannot keep acting on a sign-in that is still open: every action re-checks the database.
- Heads can no longer edit membership rows directly; every change goes through these checked functions and is written to
  the audit log.

**Checking it yourself:** `supabase/tests/members_check.sql` runs 16 checks against your database in one go and rolls
everything back (nothing is kept). Run it in the Supabase SQL editor; the results appear in the error message at the end.
