import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  rotation: number;
  vRot: number;
  gravity: number;
  drag: number;
  shape: 'star' | 'heart' | 'confetti' | 'dot';
}

type ParticleListener =
  | { type: 'burst'; x: number; y: number; color: string; count: number }
  | { type: 'victory' };

type Callback = (event: ParticleListener) => void;

const listeners = new Set<Callback>();

export const particleBus = {
  burstAt(x: number, y: number, color: string, count = 16): void {
    listeners.forEach((fn) => fn({ type: 'burst', x, y, color, count }));
  },
  burstElement(el: HTMLElement | null, color: string, count = 16): void {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    this.burstAt(rect.left + rect.width / 2, rect.top + rect.height / 2, color, count);
  },
  victoryFountain(): void {
    listeners.forEach((fn) => fn({ type: 'victory' }));
  },
};

export const MAX_ACTIVE_PARTICLES = 120;

export function pushCappedParticle(particles: Particle[], particle: Particle): boolean {
  if (particles.length >= MAX_ACTIVE_PARTICLES) return false;
  particles.push(particle);
  return true;
}

const PASTEL_CONFETTI = [
  '#FF8585',
  '#F4C553',
  '#86B4D0',
  '#9B86D4',
  '#79AE8D',
  '#E79A66',
  '#FFA6C1',
  '#FFFFFF',
];

function drawStar(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const nextAngle = angle + Math.PI / 4;
    if (i === 0) {
      ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
    } else {
      ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.lineTo(Math.cos(nextAngle) * r * 0.36, Math.sin(nextAngle) * r * 0.36);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHeart(ctx: CanvasRenderingContext2D, s: number): void {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(-s * 0.55, -s * 0.15, -s * 0.55, -s * 0.75, 0, -s * 0.35);
  ctx.bezierCurveTo(s * 0.55, -s * 0.75, s * 0.55, -s * 0.15, 0, s * 0.35);
  ctx.closePath();
  ctx.fill();
}

interface ParticleCanvasProps {
  enabled: boolean;
}

/**
 * Zero-DOM-mutation, 60/120fps HTML5 Canvas particle engine.
 * Sleeps at 0% CPU whenever no particles are active.
 */
export const ParticleCanvas: React.FC<ParticleCanvasProps> = ({ enabled }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const particles: Particle[] = [];
    let rafId: number | null = null;
    let lastTime = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000 || 0.016);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]!;
        p.life += dt;
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        p.vx *= Math.pow(p.drag, dt * 60);
        p.vy = p.vy * Math.pow(p.drag, dt * 60) + p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.vRot * dt;

        const progress = p.life / p.maxLife;
        p.alpha = progress < 0.15 ? progress / 0.15 : 1 - (progress - 0.15) / 0.85;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        if (p.shape === 'star') {
          drawStar(ctx, p.size);
        } else if (p.shape === 'heart') {
          drawHeart(ctx, p.size * 1.45);
        } else if (p.shape === 'confetti') {
          const wobble = Math.cos(p.life * 9 + i);
          ctx.fillRect(-p.size * 0.6, -p.size * 0.35 * wobble, p.size * 1.2, p.size * 0.7);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.55, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (particles.length > 0) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    };

    const wake = () => {
      if (rafId === null) {
        lastTime = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    };

    const onEvent: Callback = (ev) => {
      const parentRect = canvas.parentElement?.getBoundingClientRect();
      if (!parentRect) return;

      if (ev.type === 'burst') {
        const lx = ev.x - parentRect.left;
        const ly = ev.y - parentRect.top;
        for (let i = 0; i < ev.count; i++) {
          const angle = (Math.PI * 2 * i) / ev.count + (Math.random() - 0.5) * 0.45;
          const speed = 75 + Math.random() * 140;
          const added = pushCappedParticle(particles, {
            x: lx,
            y: ly,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 35,
            size: 4.5 + Math.random() * 4.5,
            color: i % 3 === 0 ? '#FFFFFF' : i % 3 === 1 ? ev.color : '#FFE082',
            alpha: 1,
            life: 0,
            maxLife: 0.55 + Math.random() * 0.35,
            rotation: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 8,
            gravity: 260,
            drag: 0.94,
            shape: i % 4 === 0 ? 'heart' : i % 2 === 0 ? 'star' : 'dot',
          });
          if (!added) break;
        }
        if (particles.length > 0) wake();
      } else if (ev.type === 'victory') {
        // Dual festive bursts from left & right + top shimmer shower
        const origins = [
          { x: width * 0.2, y: height * 0.58, angleBase: -Math.PI * 0.38 },
          { x: width * 0.8, y: height * 0.58, angleBase: -Math.PI * 0.62 },
          { x: width * 0.5, y: height * 0.42, angleBase: -Math.PI * 0.5 },
        ];
        for (const orig of origins) {
          for (let i = 0; i < 34; i++) {
            const angle = orig.angleBase + (Math.random() - 0.5) * 1.15;
            const speed = 180 + Math.random() * 340;
            const shapes: Particle['shape'][] = ['confetti', 'confetti', 'heart', 'star'];
            const added = pushCappedParticle(particles, {
              x: orig.x,
              y: orig.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 60,
              size: 6 + Math.random() * 6,
              color: PASTEL_CONFETTI[Math.floor(Math.random() * PASTEL_CONFETTI.length)]!,
              alpha: 1,
              life: 0,
              maxLife: 1.5 + Math.random() * 1.1,
              rotation: Math.random() * Math.PI * 2,
              vRot: (Math.random() - 0.5) * 10,
              gravity: 360,
              drag: 0.975,
              shape: shapes[i % shapes.length]!,
            });
            if (!added) break;
          }
          if (particles.length >= MAX_ACTIVE_PARTICLES) break;
        }
        if (particles.length > 0) wake();
      }
    };

    listeners.add(onEvent);

    return () => {
      listeners.delete(onEvent);
      ro.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none z-60"
    />
  );
};
