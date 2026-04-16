// ============================================================================
// FLOWGEN LEAD GENERATION SAAS - ROOT LAYOUT
// ============================================================================
// This is the root layout that wraps all pages in the application.
// It includes HTML structure, metadata, and global styles.
// ============================================================================

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FlowGen - Lead Generation & Outreach Platform',
  description: 'Automated lead generation and personalized outreach platform for agencies and businesses',
  keywords: ['lead generation', 'outreach', 'marketing automation', 'WhatsApp', 'email marketing'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
