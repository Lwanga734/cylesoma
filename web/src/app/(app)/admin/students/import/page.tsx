import Link from 'next/link';
import { redirect } from 'next/navigation';
import { StudentImport } from '@/components/StudentImport';
import { requireSection } from '@/lib/auth';
import { canManageStudents } from '@/lib/roles';

export const metadata = { title: 'Import students' };

export default async function ImportStudentsPage() {
  const session = await requireSection('admin');
  if (!canManageStudents(session.role)) redirect('/admin/students');
  return (
    <>
      <section className="card">
        <Link href="/admin/students" className="text-sm text-accent underline">&larr; All students</Link>
        <h1 className="mt-2 text-xl font-semibold">Import students from a CSV file</h1>
        <p className="mt-1 text-sm text-slate-600">
          Export your class list from Excel or Google Sheets as <strong>CSV</strong>. The first row must name the columns.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li><strong>Required:</strong> admission_no, first_name, last_name</li>
          <li><strong>Optional:</strong> class, date_of_birth (dd/mm/yyyy), boarding (yes or no)</li>
          <li>Common alternatives such as &quot;Surname&quot;, &quot;DOB&quot; and &quot;Adm No&quot; are understood.</li>
          <li>Up to 2,000 students per import. A student whose admission number already exists is skipped, never overwritten.</li>
          <li>You see a preview first, and nothing is saved until you confirm.</li>
        </ul>
        <p className="mt-3 text-sm">
          <a href="/sample-students.csv" download className="text-accent underline">Download a sample file</a>
        </p>
      </section>
      <section className="card">
        <StudentImport />
      </section>
    </>
  );
}
