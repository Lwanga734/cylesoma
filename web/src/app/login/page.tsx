import Link from 'next/link';
import { AuthShell } from '@/components/AuthShell';
import { LoginForm } from '@/components/LoginForm';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <AuthShell title="Sign in">
      {error === 'invalid-link' && (
        <p role="alert" className="mb-4 text-sm text-red-700">
          That link is invalid or has expired. Ask your administrator to send a new invitation, or reset your password.
        </p>
      )}
      <LoginForm />
      <p className="mt-4 text-center text-sm">
        <Link href="/forgot-password" className="text-accent underline">Forgot your password?</Link>
      </p>
    </AuthShell>
  );
}
