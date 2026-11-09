'use client';

import Papa from 'papaparse';
import { useActionState, useState } from 'react';
import { importStudents } from '@/app/(app)/admin/students/import/actions';
import { FormMessage } from '@/components/FormMessage';
import { parseStudentRecords, type ImportResult } from '@/lib/student-import';

export function StudentImport() {
  const [state, action, pending] = useActionState(importStudents, {});
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  function onFile(file: File | undefined) {
    setResult(null);
    setReadError(null);
    setFileName(file?.name ?? null);
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        if (!res.meta.fields || res.meta.fields.length === 0) {
          setReadError('That file has no header row. The first line must name the columns.');
          return;
        }
        setResult(parseStudentRecords(res.meta.fields, res.data));
      },
      error: () => setReadError('That file could not be read. Save it as CSV and try again.'),
    });
  }

  const ready = result && result.missingColumns.length === 0 && result.rows.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="csv">CSV file</label>
        <input
          id="csv"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => onFile(e.target.files?.[0])}
          className="input"
        />
        {fileName && <p className="mt-1 text-xs text-slate-600">{fileName}</p>}
      </div>

      {readError && <p role="alert" className="text-sm text-red-700">{readError}</p>}

      {result && result.missingColumns.length > 0 && (
        <p role="alert" className="text-sm text-red-700">
          The file is missing these required columns: {result.missingColumns.join(', ')}. Compare it with the sample file.
        </p>
      )}

      {result && result.missingColumns.length === 0 && (
        <div className="space-y-3">
          <p className="text-sm">
            <strong>{result.rows.length}</strong> {result.rows.length === 1 ? 'row is' : 'rows are'} ready to import
            {result.issues.length > 0 && <>, <strong className="text-amber-800">{result.issues.length}</strong> will be left out</>}.
          </p>

          {result.issues.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="mb-1 font-semibold">These rows have problems and will NOT be imported:</p>
              <ul className="list-disc space-y-1 pl-5">
                {result.issues.slice(0, 20).map((i) => (
                  <li key={`${i.line}-${i.message}`}>{i.line > 0 ? `Line ${i.line}: ` : ''}{i.message}</li>
                ))}
              </ul>
              {result.issues.length > 20 && <p className="mt-1">…and {result.issues.length - 20} more.</p>}
              <p className="mt-2">Fix them in your file and choose it again, or import the good rows now and add the rest later.</p>
            </div>
          )}

          {result.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr><th className="py-1 pr-3">Adm. no.</th><th className="pr-3">Name</th><th className="pr-3">Class</th><th className="pr-3">Born</th><th>Boarding</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.rows.slice(0, 8).map((r) => (
                    <tr key={r.admission_no}>
                      <td className="py-1 pr-3">{r.admission_no}</td>
                      <td className="pr-3">{r.last_name}, {r.first_name}</td>
                      <td className="pr-3">{r.class_name ?? '-'}</td>
                      <td className="pr-3">{r.date_of_birth ?? '-'}</td>
                      <td>{r.boarding ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.rows.length > 8 && <p className="mt-1 text-xs text-slate-600">Showing the first 8 of {result.rows.length}.</p>}
            </div>
          )}
        </div>
      )}

      <form action={action} className="space-y-3">
        <input type="hidden" name="payload" value={ready ? JSON.stringify(result.rows) : ''} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="create_classes" defaultChecked className="h-4 w-4" />
          Create classes that do not exist yet
        </label>
        <FormMessage state={state} />
        <button type="submit" disabled={!ready || pending} className="btn">
          {pending ? 'Importing…' : ready ? `Import ${result.rows.length} students` : 'Import'}
        </button>
      </form>
    </div>
  );
}
