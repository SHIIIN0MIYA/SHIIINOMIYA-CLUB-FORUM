import type { Metadata } from 'next';
import './globals.css';
import NavbarServer from '../components/NavbarServer';

export const metadata: Metadata = {
  title: 'SHIIIINOMIYA 论坛',
  description: '小圈子讨论社区',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-[#0a0a0f] text-white antialiased">
        <NavbarServer />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}