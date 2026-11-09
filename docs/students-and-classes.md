# Students and classes (Sprint 2)

**Where:** Administration > Students and Classes.

| Role | Students | Classes |
|---|---|---|
| Head teacher, Registrar | view, add, edit, change status, import CSV | add, rename, archive, restore |
| Deputy | view | add, rename, archive, restore |
| Owner, Head of department, Bursar | view | view |
| Teachers | (later) only the classes they are assigned to | |

## Classes
- Names must be unique per school. **Archive** hides a class; it is refused while active students are in it. **Restore** brings it back.

## Students
- Search by name or admission number, filter by class and status (Active by default), 25 per page.
- Status: Active, Withdrawn, Transferred, Graduated. Nothing is deleted: withdrawing keeps the history.
- Admission numbers are unique per school.

## CSV import
1. Export your class list from Excel or Google Sheets as CSV. First row = column names.
2. Required columns: `admission_no`, `first_name`, `last_name`. Optional: `class`, `date_of_birth` (dd/mm/yyyy or yyyy-mm-dd), `boarding` (yes/no).
   Common names such as `Surname`, `DOB`, `Adm No` are recognised. A sample file is on the import page.
3. You get a preview: how many rows are ready, and every problem row with its line number. Problem rows are left out.
4. Confirm to import up to 2,000 students. It is all-or-nothing for the database step: if anything unexpected fails, nothing is saved.
5. A student whose admission number already exists is skipped, never overwritten. Missing classes can be created automatically
   (names match without regard to capital letters); archived classes are restored.

## Security notes
- All of this runs as the signed-in person, so the database's row-level security decides what they may do.
- A bug was found and fixed while building this: write rules checked the school but not the role on INSERT (migration 8).
  `supabase/tests/write_policy_matrix.sql` now checks every role against every table (expect `MISMATCHES: none`), and a
  unit test keeps the app's role lists in step with the policies. Re-run the matrix whenever you add tables.
- `supabase/tests/students_import_check.sql` runs 15 checks on import, classes and visibility (rolls back).
