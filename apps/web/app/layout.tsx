import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Survey Quote System',
  description: '설문 기반 맞춤 견적 시스템',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
