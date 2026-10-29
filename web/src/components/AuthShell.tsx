import Image from 'next/image';

/** Centered card used by sign-in, password reset and set-password pages. */
export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <Image
        src="/logo/cylesoma-logo-horizontal.png"
        alt="CyleSoma"
        width={1150}
        height={380}
        priority
        className="mx-auto mb-6 h-auto w-64"
      />
      <div className="card">
        <h1 className="mb-4 text-xl font-semibold">{title}</h1>
        {children}
      </div>
    </main>
  );
}
