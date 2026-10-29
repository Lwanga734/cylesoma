import { AuthShell } from '@/components/AuthShell';
import { PasswordForm } from '@/components/PasswordForm';
import { requireSession } from '@/lib/auth';

export const metadata = { title: 'Set your password' };

export default async function SetPasswordPage() {
  await requireSession();
  return (
    <AuthShell title="Set your password">
      <PasswordForm />
    </AuthShell>
  );
}
