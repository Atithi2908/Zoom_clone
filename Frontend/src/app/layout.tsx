import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zoom - One platform to connect',
  description: 'Video conferencing, instant meetings, and scheduling platform built with Next.js, FastAPI, and WebRTC.',
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
