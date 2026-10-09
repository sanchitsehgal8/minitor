'use client';

import { useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';

/**
 * The hero graphic: a dotted sphere of relays with onion-routed circuits
 * hopping across it, and tracker requests being cut off mid-flight.
 *
 * Plain canvas 2D rather than WebGL — ~1,100 points and a handful of arcs is
 * well within its budget, and it keeps the bundle free of a 3D engine. The
 * loop stops whenever the canvas is off-screen or the tab is hidden, and under
 * reduced motion a single composed frame is drawn instead of an animation.
 *
 * Purely decorative: the canvas is aria-hidden and carries no information the
 * surrounding copy does not.
 */

type Vec3 = { x: number; y: number; z: number };

type Circuit = {
  readonly hops: readonly number[];
  readonly start: number;
};

type Attempt = {
  readonly from: number;
  readonly to: number;
  readonly start: number;
};

const DOT_COUNT = 1100;
const RELAY_COUNT = 54;
const TRACKER_SHARE = 0.22;
const HOP_MS = 720;
const CIRCUIT_FADE_MS = 1600;
const ATTEMPT_MS = 1100;
const ATTEMPT_CUT = 0.56;
const BURST_MS = 800;

const VERDIGRIS = '138, 240, 214';
const AMBER = '245, 196, 107';

function fibonacciSphere(count: number): Vec3[] {
  const points: Vec3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let index = 0; index < count; index += 1) {
    const y = 1 - (index / (count - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = golden * index;
    points.push({ x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius });
  }
  return points;
}

/** Seeded so the relay layout is identical on every load. */
function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  const dot = Math.min(1, Math.max(-1, a.x * b.x + a.y * b.y + a.z * b.z));
  const omega = Math.acos(dot);
  if (omega < 1e-4) return a;
  const sin = Math.sin(omega);
  const k1 = Math.sin((1 - t) * omega) / sin;
  const k2 = Math.sin(t * omega) / sin;
  return { x: a.x * k1 + b.x * k2, y: a.y * k1 + b.y * k2, z: a.z * k1 + b.z * k2 };
}

/** A point along the great circle a→b, lifted off the surface mid-flight. */
function arcPoint(a: Vec3, b: Vec3, t: number): Vec3 {
  const point = slerp(a, b, t);
  const span = Math.acos(Math.min(1, Math.max(-1, a.x * b.x + a.y * b.y + a.z * b.z)));
  const lift = 1 + Math.sin(Math.PI * t) * (0.08 + span * 0.16);
  return { x: point.x * lift, y: point.y * lift, z: point.z * lift };
}

function makeGlowSprite(rgb: string, size: number): HTMLCanvasElement {
  const sprite = document.createElement('canvas');
  sprite.width = size;
  sprite.height = size;
  const context = sprite.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, `rgba(255,255,255,1)`);
    gradient.addColorStop(0.18, `rgba(${rgb},0.95)`);
    gradient.addColorStop(0.45, `rgba(${rgb},0.25)`);
    gradient.addColorStop(1, `rgba(${rgb},0)`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  return sprite;
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function NetworkGlobe({ className = '' }: { readonly className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const random = mulberry32(20_26);
    const dots = fibonacciSphere(DOT_COUNT);
    const relayIndices = Array.from({ length: RELAY_COUNT }, () => Math.floor(random() * DOT_COUNT));
    const isTracker = relayIndices.map(() => random() < TRACKER_SHARE);
    const relays = relayIndices.map((index) => dots[index]!);

    const rings = [
      { radius: 1.2, tilt: 1.15, roll: 0.35, speed: 0.00022, phase: 0 },
      { radius: 1.34, tilt: 1.32, roll: -0.5, speed: -0.00016, phase: 2.1 },
      { radius: 1.5, tilt: 1.05, roll: 0.9, speed: 0.00011, phase: 4.2 },
    ];

    const verdigrisGlow = makeGlowSprite(VERDIGRIS, 48);
    const amberGlow = makeGlowSprite(AMBER, 48);

    let width = 0;
    let height = 0;
    let radius = 0;
    let centreX = 0;
    let centreY = 0;

    let rotation = 0.6;
    let tilt = -0.32;
    let pointerX = 0;
    let pointerY = 0;
    let yawOffset = 0;

    let circuits: Circuit[] = [];
    let attempts: Attempt[] = [];
    let lastCircuitAt = -Infinity;
    let lastAttemptAt = -Infinity;
    let frame = 0;
    let lastTime = 0;
    let isVisible = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      radius = Math.min(width, height) * 0.34;
      centreX = width / 2;
      centreY = height / 2;
    };

    const project = (point: Vec3) => {
      const yaw = rotation + yawOffset;
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const x = point.x * cosY + point.z * sinY;
      const z = -point.x * sinY + point.z * cosY;
      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);
      const y = point.y * cosT - z * sinT;
      const depth = point.y * sinT + z * cosT;
      const scale = 1 / (1 - depth * 0.16);
      return { x: centreX + x * radius * scale, y: centreY - y * radius * scale, depth, scale };
    };

    /** Rings are fixed to the camera tilt, not the globe's spin. */
    const ringPoint = (ring: (typeof rings)[number], angle: number, time: number) => {
      const roll = ring.roll + time * ring.speed;
      let x = Math.cos(angle) * ring.radius;
      let y = 0;
      let z = Math.sin(angle) * ring.radius;
      const cosA = Math.cos(ring.tilt);
      const sinA = Math.sin(ring.tilt);
      [y, z] = [y * cosA - z * sinA, y * sinA + z * cosA];
      const cosR = Math.cos(roll);
      const sinR = Math.sin(roll);
      [x, y] = [x * cosR - y * sinR, x * sinR + y * cosR];
      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);
      const yy = y * cosT - z * sinT;
      const depth = y * sinT + z * cosT;
      const scale = 1 / (1 - depth * 0.16);
      return { x: centreX + x * radius * scale, y: centreY - yy * radius * scale, depth, scale };
    };

    const frontRelays = (wantTracker: boolean) =>
      relays
        .map((relay, index) => ({ index, depth: project(relay).depth }))
        .filter((entry) => entry.depth > 0.05 && isTracker[entry.index] === wantTracker)
        .map((entry) => entry.index);

    const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];

    const spawn = (time: number) => {
      if (time - lastCircuitAt > 1250 && circuits.length < 4) {
        const candidates = frontRelays(false);
        if (candidates.length >= 4) {
          const hops: number[] = [];
          while (hops.length < 4) {
            const next = pick(candidates)!;
            if (!hops.includes(next)) hops.push(next);
          }
          circuits.push({ hops, start: time });
          lastCircuitAt = time;
        }
      }
      if (time - lastAttemptAt > 1700 && attempts.length < 3) {
        const trackers = frontRelays(true);
        const targets = frontRelays(false);
        if (trackers.length > 0 && targets.length > 0) {
          attempts.push({ from: pick(trackers)!, to: pick(targets)!, start: time });
          lastAttemptAt = time;
        }
      }
    };

    const strokeArc = (
      from: Vec3,
      to: Vec3,
      tStart: number,
      tEnd: number,
      rgb: string,
      alpha: number,
      lineWidth: number,
    ) => {
      if (tEnd <= tStart || alpha <= 0.01) return;
      const steps = 28;
      let previous = project(arcPoint(from, to, tStart));
      for (let step = 1; step <= steps; step += 1) {
        const t = tStart + ((tEnd - tStart) * step) / steps;
        const next = project(arcPoint(from, to, t));
        const along = step / steps;
        const depthFade = Math.max(0.12, Math.min(1, (next.depth + 0.6) / 1.2));
        context.strokeStyle = `rgba(${rgb},${alpha * along * depthFade})`;
        context.lineWidth = lineWidth;
        context.beginPath();
        context.moveTo(previous.x, previous.y);
        context.lineTo(next.x, next.y);
        context.stroke();
        previous = next;
      }
    };

    const glow = (sprite: HTMLCanvasElement, x: number, y: number, size: number, alpha: number) => {
      context.globalAlpha = Math.max(0, Math.min(1, alpha));
      context.drawImage(sprite, x - size / 2, y - size / 2, size, size);
      context.globalAlpha = 1;
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);

      // Back halves of the orbit rings first, so the sphere occludes them.
      const drawRings = (front: boolean) => {
        for (const ring of rings) {
          const segments = 96;
          let previous = ringPoint(ring, 0, time);
          for (let step = 1; step <= segments; step += 1) {
            const next = ringPoint(ring, (step / segments) * Math.PI * 2, time);
            const isFront = next.depth >= 0;
            if (isFront === front) {
              const alpha = front ? 0.22 : 0.07;
              context.strokeStyle = `rgba(${VERDIGRIS},${alpha})`;
              context.lineWidth = 1;
              context.beginPath();
              context.moveTo(previous.x, previous.y);
              context.lineTo(next.x, next.y);
              context.stroke();
            }
            previous = next;
          }
          const rider = ringPoint(ring, ring.phase + time * ring.speed * 9, time);
          if ((rider.depth >= 0) === front) {
            glow(verdigrisGlow, rider.x, rider.y, 16 * rider.scale, front ? 0.9 : 0.3);
          }
        }
      };

      drawRings(false);

      // Sphere of dots.
      for (const dot of dots) {
        const point = project(dot);
        const front = (point.depth + 1) / 2;
        const alpha = point.depth < 0 ? 0.05 + front * 0.12 : 0.12 + front * 0.5;
        const size = 1.15 * point.scale;
        context.fillStyle = `rgba(196,199,204,${alpha})`;
        context.fillRect(point.x - size / 2, point.y - size / 2, size, size);
      }

      context.globalCompositeOperation = 'lighter';

      // Relays: verdigris for onion relays, amber for known trackers.
      relays.forEach((relay, index) => {
        const point = project(relay);
        if (point.depth < -0.2) return;
        const alpha = Math.min(1, (point.depth + 0.2) * 1.2);
        glow(isTracker[index] ? amberGlow : verdigrisGlow, point.x, point.y, 12 * point.scale, alpha * 0.75);
      });

      // Circuits: a packet hops guard → middle → exit → destination.
      circuits = circuits.filter((circuit) => {
        const elapsed = time - circuit.start;
        const travel = (circuit.hops.length - 1) * HOP_MS;
        if (elapsed > travel + CIRCUIT_FADE_MS) return false;
        const fade = elapsed > travel ? 1 - (elapsed - travel) / CIRCUIT_FADE_MS : 1;

        for (let hop = 0; hop < circuit.hops.length - 1; hop += 1) {
          const from = relays[circuit.hops[hop]!]!;
          const to = relays[circuit.hops[hop + 1]!]!;
          const local = (elapsed - hop * HOP_MS) / HOP_MS;
          if (local <= 0) continue;
          const head = easeInOut(Math.min(1, local));
          // The settled path stays as a faint trace; the comet rides on top.
          strokeArc(from, to, 0, head, VERDIGRIS, 0.32 * fade, 1);
          if (local < 1) {
            strokeArc(from, to, Math.max(0, head - 0.3), head, VERDIGRIS, 0.95, 1.8);
            const tip = project(arcPoint(from, to, head));
            glow(verdigrisGlow, tip.x, tip.y, 22 * tip.scale, 1);
          } else if (local < 1.6) {
            const arrived = project(to);
            const pulse = (local - 1) / 0.6;
            context.strokeStyle = `rgba(${VERDIGRIS},${(1 - pulse) * 0.8})`;
            context.lineWidth = 1.2;
            context.beginPath();
            context.arc(arrived.x, arrived.y, 3 + pulse * 14, 0, Math.PI * 2);
            context.stroke();
          }
        }
        return true;
      });

      // Tracker attempts: an amber request that is cut off before it lands.
      attempts = attempts.filter((attempt) => {
        const elapsed = time - attempt.start;
        if (elapsed > ATTEMPT_MS + BURST_MS) return false;
        const from = relays[attempt.from]!;
        const to = relays[attempt.to]!;
        const progress = Math.min(1, elapsed / ATTEMPT_MS);
        const head = easeInOut(progress) * ATTEMPT_CUT;
        const fade = elapsed > ATTEMPT_MS ? 1 - (elapsed - ATTEMPT_MS) / BURST_MS : 1;
        strokeArc(from, to, Math.max(0, head - 0.25), head, AMBER, 0.85 * fade, 1.4);

        if (progress < 1) {
          const tip = project(arcPoint(from, to, head));
          glow(amberGlow, tip.x, tip.y, 18 * tip.scale, 0.95);
        } else {
          const burstAt = project(arcPoint(from, to, ATTEMPT_CUT));
          const burst = (elapsed - ATTEMPT_MS) / BURST_MS;
          context.strokeStyle = `rgba(${AMBER},${(1 - burst) * 0.9})`;
          context.lineWidth = 1.3;
          context.beginPath();
          context.arc(burstAt.x, burstAt.y, 2 + burst * 18, 0, Math.PI * 2);
          context.stroke();
          // A small cross marks the request as stopped.
          const arm = 4 * (1 - burst * 0.5);
          context.beginPath();
          context.moveTo(burstAt.x - arm, burstAt.y - arm);
          context.lineTo(burstAt.x + arm, burstAt.y + arm);
          context.moveTo(burstAt.x + arm, burstAt.y - arm);
          context.lineTo(burstAt.x - arm, burstAt.y + arm);
          context.stroke();
        }
        return true;
      });

      context.globalCompositeOperation = 'source-over';
      drawRings(true);
    };

    const tick = (now: number) => {
      const delta = Math.min(64, now - (lastTime || now));
      lastTime = now;
      rotation += delta * 0.00009;
      yawOffset += (pointerX * 0.5 - yawOffset) * 0.04;
      tilt += (-0.32 + pointerY * 0.22 - tilt) * 0.04;
      spawn(now);
      draw(now);
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (frame || prefersReducedMotion) return;
      lastTime = 0;
      frame = requestAnimationFrame(tick);
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    resize();

    if (prefersReducedMotion) {
      // One composed still: two finished circuits and a stopped request.
      const now = 10_000;
      const travel = 3 * HOP_MS;
      const safe = frontRelays(false);
      const trackers = frontRelays(true);
      if (safe.length >= 8) {
        circuits = [
          { hops: safe.slice(0, 4), start: now - travel - 1 },
          { hops: safe.slice(4, 8), start: now - travel - 1 },
        ];
      }
      if (trackers[0] !== undefined && safe[0] !== undefined) {
        attempts = [{ from: trackers[0], to: safe[0], start: now - ATTEMPT_MS - BURST_MS * 0.3 }];
      }
      draw(now);
      const redraw = () => {
        resize();
        draw(now);
      };
      window.addEventListener('resize', redraw);
      return () => window.removeEventListener('resize', redraw);
    }

    const onPointerMove = (event: PointerEvent) => {
      pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
      pointerY = (event.clientY / window.innerHeight - 0.5) * 2;
    };

    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry?.isIntersecting ?? false;
      if (isVisible && !document.hidden) start();
      else stop();
    });
    observer.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) stop();
      else if (isVisible) start();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    start();

    return () => {
      stop();
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [prefersReducedMotion]);

  return <canvas ref={canvasRef} aria-hidden="true" className={`block h-full w-full ${className}`} />;
}
