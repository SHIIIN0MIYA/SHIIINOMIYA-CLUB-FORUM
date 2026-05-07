// src/app/page.tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <div
      style={{
        position: 'relative',
        zIndex: 10,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 16px',
        textAlign: 'center',
        color: 'white',
      }}
    >
      <h1 style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '1rem' }}>
        SHIII<span style={{ color: '#c9a96e', textShadow: '0 0 60px rgba(201,169,110,0.5)' }}>N</span>OMIYA
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#aaaaaa', marginBottom: '2rem' }}>
        小圈子论坛 · 自由讨论 · 分享知识
      </p>
      <Link
        href="/posts"
        style={{
          display: 'inline-block',
          padding: '12px 30px',
          borderRadius: '50px',
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(255,255,255,0.05)',
          color: 'white',
          fontWeight: 500,
          letterSpacing: '0.05em',
          textDecoration: 'none',
        }}
      >
        进入论坛 →
      </Link>
    </div>
  );
}