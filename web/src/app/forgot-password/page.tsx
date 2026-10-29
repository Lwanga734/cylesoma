import Link from 'next/link';
import { AuthShell } from '@/components/AuthShell';
import { ForgotPasswordForm } from '@/components/ForgotPasswordForm';

export const metadata = { title: 'Reset password' };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password">
      <ForgotPasswordForm />
      <p className="mt-4 text-center text-sm">
        <Link href="/login" className="text-accent underline">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}
