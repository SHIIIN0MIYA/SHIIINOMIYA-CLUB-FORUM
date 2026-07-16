'use client';

import { usePathname } from 'next/navigation';
import WaveParticleCanvas from './WaveParticleCanvas';

export default function GlobalParticleBackground() {
  const pathname = usePathname();

  if (pathname === '/particle-lab') {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#04060b]"
    >
      <WaveParticleCanvas preset="midnight" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(7,12,22,0.08)_0%,rgba(4,6,11,0.28)_58%,rgba(4,6,11,0.72)_100%)]" />
    </div>
  );
}
