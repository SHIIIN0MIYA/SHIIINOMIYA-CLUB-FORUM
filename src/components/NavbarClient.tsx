'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

interface NavbarProps {
  user: { name: string | null } | null;
}

const NavbarClient = ({ user }: NavbarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 w-full z-50 px-6 md:px-10 h-16 flex items-center justify-between transition-all duration-300 ${
          scrolled
            ? 'bg-[rgba(10,10,15,0.9)] shadow-[0_1px_20px_rgba(0,0,0,0.5)] border-b border-white/10'
            : 'bg-[rgba(10,10,15,0.65)] border-b border-white/5'
        } backdrop-blur-xl`}
      >
        <Link href="/" className="text-lg font-bold tracking-widest text-white no-underline">
          SHIIIINO<span className="text-[var(--accent)]">M</span>IYA
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] ml-1 align-middle relative -top-0.5 shadow-[0_0_10px_var(--accent-glow)]"></span>
        </Link>

        <button
          className="flex flex-col gap-1.5 p-2 bg-none border-none md:hidden focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="菜单"
        >
          <span className={`block w-6 h-0.5 bg-white rounded transition-all duration-300 origin-center ${
            menuOpen ? 'translate-y-[7px] rotate-45' : ''
          }`} />
          <span className={`block w-6 h-0.5 bg-white rounded transition-all duration-300 ${
            menuOpen ? 'opacity-0 scale-x-0' : ''
          }`} />
          <span className={`block w-6 h-0.5 bg-white rounded transition-all duration-300 origin-center ${
            menuOpen ? '-translate-y-[7px] -rotate-45' : ''
          }`} />
        </button>

        <ul
          className={`${
            menuOpen
              ? 'fixed top-0 right-0 w-64 h-full flex-col bg-[rgba(10,10,15,0.96)] backdrop-blur-2xl pt-20 px-6 gap-3 border-l border-white/5 shadow-2xl'
              : 'hidden md:flex items-center gap-2'
          } list-none`}
        >
          <li>
            <Link
              href="/"
              onClick={closeMenu}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                pathname === '/' ? 'text-[var(--accent)] bg-[rgba(201,169,110,0.1)]' : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              首页
            </Link>
          </li>
          <li>
            <Link
              href="/posts"
              onClick={closeMenu}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                pathname.startsWith('/posts') ? 'text-[var(--accent)] bg-[rgba(201,169,110,0.1)]' : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              帖子广场
            </Link>
          </li>
          <li>
            <Link
              href="/create"
              onClick={closeMenu}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                pathname === '/create' ? 'text-[var(--accent)] bg-[rgba(201,169,110,0.1)]' : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              发帖
            </Link>
          </li>
          
          {user ? (
            <>
              <li>
                <Link
                  href="/profile"
                  onClick={closeMenu}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-300"
                >
                  {user.name ?? '用户'}
                </Link>
              </li>
              <li>
                <Link
                  href="/notifications"
                  onClick={closeMenu}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-300"
                >
                  🔔 通知
                </Link>
              </li>
              <li>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  退出
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-300"
                >
                  登录
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  onClick={closeMenu}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-300"
                >
                  注册
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>

      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={closeMenu}
        />
      )}
    </>
  );
};

export default NavbarClient;