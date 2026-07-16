'use client';

import { useEffect, useRef } from 'react';

export type ParticlePreset = 'champagne' | 'aurora' | 'midnight' | 'ripple';

type PresetConfig = {
  background: [number, number, number];
  colorNear: [number, number, number];
  colorFar: [number, number, number];
  columns: number;
  rows: number;
  spacing: number;
  amplitude: number;
  frequencyX: number;
  frequencyZ: number;
  speed: number;
  cameraHeight: number;
  cameraDistance: number;
  focalLength: number;
  lineAlpha: number;
  pointAlpha: number;
  pointSize: number;
  diagonalLinks: boolean;
  wave: 'silk' | 'cross' | 'ridge' | 'ripple';
};

const PRESETS: Record<ParticlePreset, PresetConfig> = {
  champagne: {
    background: [7, 8, 13],
    colorNear: [232, 205, 151],
    colorFar: [108, 119, 145],
    columns: 34,
    rows: 26,
    spacing: 27,
    amplitude: 42,
    frequencyX: 0.018,
    frequencyZ: 0.023,
    speed: 0.00055,
    cameraHeight: 330,
    cameraDistance: 640,
    focalLength: 560,
    lineAlpha: 0.42,
    pointAlpha: 0.94,
    pointSize: 1.95,
    diagonalLinks: false,
    wave: 'silk',
  },
  aurora: {
    background: [4, 8, 16],
    colorNear: [120, 237, 231],
    colorFar: [128, 105, 238],
    columns: 36,
    rows: 27,
    spacing: 25,
    amplitude: 54,
    frequencyX: 0.021,
    frequencyZ: 0.017,
    speed: 0.00072,
    cameraHeight: 350,
    cameraDistance: 650,
    focalLength: 570,
    lineAlpha: 0.36,
    pointAlpha: 0.96,
    pointSize: 1.9,
    diagonalLinks: true,
    wave: 'cross',
  },
  midnight: {
    background: [4, 6, 11],
    colorNear: [199, 218, 239],
    colorFar: [51, 77, 112],
    columns: 38,
    rows: 28,
    spacing: 24,
    amplitude: 64,
    frequencyX: 0.013,
    frequencyZ: 0.029,
    speed: 0.00042,
    cameraHeight: 390,
    cameraDistance: 700,
    focalLength: 600,
    lineAlpha: 0.31,
    pointAlpha: 0.88,
    pointSize: 1.7,
    diagonalLinks: false,
    wave: 'ridge',
  },
  ripple: {
    background: [8, 6, 14],
    colorNear: [218, 168, 255],
    colorFar: [88, 124, 190],
    columns: 35,
    rows: 27,
    spacing: 26,
    amplitude: 58,
    frequencyX: 0.018,
    frequencyZ: 0.018,
    speed: 0.00062,
    cameraHeight: 360,
    cameraDistance: 660,
    focalLength: 570,
    lineAlpha: 0.35,
    pointAlpha: 0.92,
    pointSize: 1.85,
    diagonalLinks: true,
    wave: 'ripple',
  },
};

interface WaveParticleCanvasProps {
  preset: ParticlePreset;
  paused?: boolean;
}

type ProjectedPoint = {
  x: number;
  y: number;
  depth: number;
  waveHeight: number;
  visible: boolean;
};

const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function getWaveHeight(
  x: number,
  z: number,
  time: number,
  config: PresetConfig
) {
  if (config.wave === 'cross') {
    return (
      Math.sin(x * config.frequencyX + time) * config.amplitude * 0.62 +
      Math.cos(z * config.frequencyZ - time * 0.78) * config.amplitude * 0.42
    );
  }

  if (config.wave === 'ridge') {
    const diagonal = x * 0.72 + z * 0.42;
    return (
      Math.sin(diagonal * config.frequencyX + time) * config.amplitude * 0.74 +
      Math.sin(z * config.frequencyZ - time * 0.35) * config.amplitude * 0.22
    );
  }

  if (config.wave === 'ripple') {
    const distance = Math.sqrt(x * x + z * z);
    return (
      Math.sin(distance * config.frequencyX - time) *
        config.amplitude *
        Math.exp(-distance / 1100) +
      Math.cos(x * 0.009 + time * 0.45) * config.amplitude * 0.16
    );
  }

  return (
    Math.sin(x * config.frequencyX + time) *
      Math.cos(z * config.frequencyZ - time * 0.55) *
      config.amplitude +
    Math.sin((x + z) * 0.008 - time * 0.4) * config.amplitude * 0.18
  );
}

export default function WaveParticleCanvas({
  preset,
  paused = false,
}: WaveParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const config = PRESETS[preset];
    const projected: ProjectedPoint[] = [];
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let animationFrame = 0;
    let elapsedBeforePause = 0;
    let lastTimestamp = performance.now();
    let lastDrawTimestamp = 0;
    let pointerX = 0;
    let pointerY = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const projectPoint = (
      worldX: number,
      worldY: number,
      worldZ: number
    ): ProjectedPoint => {
      const waveDrift = worldY * 0.34;
      const depth = config.cameraDistance + worldZ * 0.08;

      return {
        x:
          width * (0.5 + pointerX * 0.018) +
          worldX +
          waveDrift * 0.16,
        y:
          height * (0.5 + pointerY * 0.014) +
          worldZ +
          waveDrift,
        depth,
        waveHeight: worldY,
        visible: true,
      };
    };

    const draw = (timestamp: number) => {
      if (timestamp - lastDrawTimestamp < 32) {
        animationFrame = requestAnimationFrame(draw);
        return;
      }
      lastDrawTimestamp = timestamp;

      if (!paused) {
        elapsedBeforePause += timestamp - lastTimestamp;
      }
      lastTimestamp = timestamp;
      const time = elapsedBeforePause * config.speed;
      const breathing = 0.72 + Math.sin(time * 1.8) * 0.18;

      const background = context.createRadialGradient(
        width * 0.52,
        height * 0.48,
        0,
        width * 0.52,
        height * 0.48,
        Math.max(width, height) * 0.76
      );
      background.addColorStop(
        0,
        `rgb(${config.background[0] + 13}, ${config.background[1] + 15}, ${config.background[2] + 22})`
      );
      background.addColorStop(
        1,
        `rgb(${config.background.join(',')})`
      );
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      projected.length = 0;
      const halfColumns = (config.columns - 1) / 2;
      const halfRows = (config.rows - 1) / 2;
      const horizontalCoverage = Math.max(
        1.15,
        (width * 1.15) / ((config.columns - 1) * config.spacing)
      );
      const depthCoverage = Math.max(
        1.15,
        (height * 1.2) / ((config.rows - 1) * config.spacing)
      );

      for (let row = 0; row < config.rows; row += 1) {
        for (let column = 0; column < config.columns; column += 1) {
          const worldX =
            (column - halfColumns) * config.spacing * horizontalCoverage;
          const worldZ =
            (row - halfRows) * config.spacing * depthCoverage;
          const worldY = getWaveHeight(worldX, worldZ, time, config);
          projected.push(projectPoint(worldX, worldY, worldZ));
        }
      }

      const drawConnection = (fromIndex: number, toIndex: number) => {
        const from = projected[fromIndex];
        const to = projected[toIndex];
        if (!from?.visible || !to?.visible) return;

        const averageDepth = (from.depth + to.depth) * 0.5;
        const depthFade = clamp(
          1 - (averageDepth - 300) / 760,
          0.16,
          1
        );
        const crest = clamp(
          (Math.abs(from.waveHeight) + Math.abs(to.waveHeight)) /
            (config.amplitude * 2),
          0,
          1
        );
        const shimmer =
          0.58 +
          Math.sin(time * 2.2 + fromIndex * 0.17 + toIndex * 0.09) * 0.42;
        const alpha =
          config.lineAlpha *
          depthFade *
          (0.48 + crest * 0.52) *
          shimmer *
          breathing;

        if (alpha < 0.012) return;
        const colorAmount = clamp(depthFade * 0.8 + crest * 0.2, 0, 1);
        const red = Math.round(
          mix(config.colorFar[0], config.colorNear[0], colorAmount)
        );
        const green = Math.round(
          mix(config.colorFar[1], config.colorNear[1], colorAmount)
        );
        const blue = Math.round(
          mix(config.colorFar[2], config.colorNear[2], colorAmount)
        );

        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.strokeStyle = `rgba(${red},${green},${blue},${alpha})`;
        context.lineWidth = 0.65;
        context.stroke();
      };

      for (let row = 0; row < config.rows; row += 1) {
        for (let column = 0; column < config.columns; column += 1) {
          const index = row * config.columns + column;
          if (column < config.columns - 1) {
            drawConnection(index, index + 1);
          }
          if (row < config.rows - 1) {
            drawConnection(index, index + config.columns);
          }
          if (
            config.diagonalLinks &&
            row < config.rows - 1 &&
            column < config.columns - 1 &&
            (row + column) % 2 === 0
          ) {
            drawConnection(index, index + config.columns + 1);
          }
        }
      }

      for (let index = projected.length - 1; index >= 0; index -= 1) {
        const point = projected[index];
        if (!point.visible) continue;

        const depthFade = clamp(
          1 - (point.depth - 260) / 800,
          0.2,
          1
        );
        const crest = clamp(
          (point.waveHeight / config.amplitude + 1) * 0.5,
          0,
          1
        );
        const colorAmount = clamp(depthFade * 0.72 + crest * 0.28, 0, 1);
        const red = Math.round(
          mix(config.colorFar[0], config.colorNear[0], colorAmount)
        );
        const green = Math.round(
          mix(config.colorFar[1], config.colorNear[1], colorAmount)
        );
        const blue = Math.round(
          mix(config.colorFar[2], config.colorNear[2], colorAmount)
        );
        const radius =
          config.pointSize * (0.58 + depthFade * 0.82 + crest * 0.18);
        const alpha =
          config.pointAlpha *
          depthFade *
          (0.7 + Math.sin(time * 2 + index * 0.31) * 0.18);

        if (depthFade > 0.5 && crest > 0.54) {
          context.beginPath();
          context.arc(point.x, point.y, radius * 3.1, 0, Math.PI * 2);
          context.fillStyle = `rgba(${red},${green},${blue},${alpha * 0.08})`;
          context.fill();
        }

        context.beginPath();
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(${red},${green},${blue},${alpha})`;
        context.fill();
      }

      animationFrame = requestAnimationFrame(draw);
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointerX = event.clientX / Math.max(window.innerWidth, 1) - 0.5;
      pointerY = event.clientY / Math.max(window.innerHeight, 1) - 0.5;
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', handlePointerMove, {
      passive: true,
    });
    animationFrame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [paused, preset]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
    />
  );
}
