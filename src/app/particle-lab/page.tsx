import type { Metadata } from 'next';
import ParticleLab from './ParticleLab';

export const metadata: Metadata = {
  title: '粒子背景实验室 | SHIIIINOMIYA',
  description: 'SHIIIINOMIYA 动态粒子背景方案预览',
};

export default function ParticleLabPage() {
  return <ParticleLab />;
}
