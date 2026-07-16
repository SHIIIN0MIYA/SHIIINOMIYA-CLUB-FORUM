import type { Metadata } from 'next';
import './globals.css';
import NavbarServer from '../components/NavbarServer';
import GlobalParticleBackground from '../components/GlobalParticleBackground';

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
        <GlobalParticleBackground />
        <NavbarServer />
        <main className="relative z-10 pt-16">{children}</main>
      </body>
    </html>
  );
}
