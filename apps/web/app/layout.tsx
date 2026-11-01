import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Athena',
  description: 'Learn one idea a day from the news, in short videos.',
  appleWebApp: { capable: true, title: 'Athena', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = { themeColor: '#0b0b12', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
