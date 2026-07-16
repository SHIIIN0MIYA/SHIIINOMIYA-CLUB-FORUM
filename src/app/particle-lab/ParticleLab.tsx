'use client';

import { useState } from 'react';
import WaveParticleCanvas, {
  type ParticlePreset,
} from '../../components/WaveParticleCanvas';

const OPTIONS: Array<{
  id: ParticlePreset;
  number: string;
  name: string;
  description: string;
  tone: string;
}> = [
  {
    id: 'champagne',
    number: '01',
    name: '香槟丝网',
    description: '暖金与灰蓝，起伏最柔和，连线克制，适合作为长期首页背景。',
    tone: 'rgba(215, 187, 132, 0.95)',
  },
  {
    id: 'aurora',
    number: '02',
    name: '极光晶格',
    description: '青绿与紫蓝交错，双向波浪更活跃，科技感最明显。',
    tone: 'rgba(110, 229, 223, 0.95)',
  },
  {
    id: 'midnight',
    number: '03',
    name: '深夜脊线',
    description: '冷白与深蓝，斜向长波缓慢掠过，安静且空间纵深最强。',
    tone: 'rgba(188, 211, 237, 0.95)',
  },
  {
    id: 'ripple',
    number: '04',
    name: '暮色涟漪',
    description: '淡紫与蓝色，波纹从场地中央扩散，呼吸感和氛围感更强。',
    tone: 'rgba(213, 165, 250, 0.95)',
  },
];

export default function ParticleLab() {
  const [preset, setPreset] = useState<ParticlePreset>('champagne');
  const [paused, setPaused] = useState(false);
  const active = OPTIONS.find((option) => option.id === preset) ?? OPTIONS[0];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[#06070b]">
      <div className="absolute inset-0">
        <WaveParticleCanvas preset={preset} paused={paused} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_52%_44%,transparent_0%,rgba(3,4,8,0.08)_48%,rgba(3,4,8,0.72)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[#07080d]/80 to-transparent" />

      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] flex-col justify-between px-5 pb-6 pt-8 sm:px-8 lg:px-12">
        <header className="flex items-start justify-between gap-5">
          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.36em] text-white/40">
              Particle study / top view
            </p>
            <h1 className="text-2xl font-semibold tracking-[0.08em] text-white sm:text-3xl">
              动态粒子背景实验室
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs tracking-[0.16em] text-white/65 backdrop-blur-md transition hover:border-white/25 hover:text-white"
          >
            {paused ? '继续播放' : '暂停观察'}
          </button>
        </header>

        <div className="pointer-events-none mx-auto max-w-2xl text-center">
          <p
            className="mb-3 text-xs font-medium tracking-[0.32em]"
            style={{ color: active.tone }}
          >
            CONCEPT {active.number}
          </p>
          <h2 className="text-4xl font-semibold tracking-[0.16em] text-white drop-shadow-[0_8px_30px_rgba(0,0,0,0.65)] sm:text-6xl">
            {active.name}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/48 sm:text-base">
            {active.description}
          </p>
        </div>

        <div className="grid gap-2 rounded-2xl border border-white/[0.08] bg-black/25 p-2 backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-4">
          {OPTIONS.map((option) => {
            const selected = option.id === preset;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setPreset(option.id)}
                className={`group rounded-xl border px-4 py-4 text-left transition duration-300 ${
                  selected
                    ? 'border-white/20 bg-white/[0.09]'
                    : 'border-transparent bg-transparent hover:border-white/10 hover:bg-white/[0.04]'
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className="text-xs font-semibold tracking-[0.2em]"
                    style={{ color: selected ? option.tone : 'rgba(255,255,255,.32)' }}
                  >
                    {option.number}
                  </span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full transition ${
                      selected ? 'scale-100' : 'scale-0'
                    }`}
                    style={{
                      background: option.tone,
                      boxShadow: `0 0 14px ${option.tone}`,
                    }}
                  />
                </div>
                <h3 className="mb-1.5 text-sm font-medium tracking-[0.08em] text-white/90">
                  {option.name}
                </h3>
                <p className="line-clamp-2 text-xs leading-5 text-white/38">
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
