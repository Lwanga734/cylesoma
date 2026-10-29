import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'CyleSoma', template: '%s | CyleSoma' },
  description: 'Simplifying School Management. Empowering Education.',
  applicationName: 'CyleSoma',
};

export const viewport: Viewport = { themeColor: '#053065' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased">{children}</body>
    </html>
  );
}
