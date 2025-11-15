import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Analytics Chat',
  description: 'Query your analytics database with natural language',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90" font-weight="bold" fill="url(%23grad)"><tspan>💬</tspan></text><defs><linearGradient id="grad"><stop offset="0%25" style="stop-color:%233b82f6;stop-opacity:1" /><stop offset="100%25" style="stop-color:%238b5cf6;stop-opacity:1" /></linearGradient></defs></svg>',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
