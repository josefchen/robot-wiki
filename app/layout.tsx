import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Geist, JetBrains_Mono, Source_Serif_4 } from 'next/font/google';
import { SkipLink } from '@/components/ui/skip-link';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  variable: '--font-source-serif',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'robot-atlas',
  description:
    'An encyclopedic interactive guide to modern robotics for ML engineers.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <SkipLink />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
      </body>
    </html>
  );
}
