'use client';

import { useEffect, useRef, useState } from 'react';
import { cx } from '@/components/ui';

// Shows the same page on two kit versions: side by side, or overlaid with a
// before/after slider. Desktop or phone size.
const SIZES = { desktop: { w: 1280, h: 800 }, phone: { w: 390, h: 780 } } as const;

function Frame({ src, title, device, scaleTo }: { src: string; title: string; device: keyof typeof SIZES; scaleTo: number }) {
  const { w, h } = SIZES[device];
  const scale = Math.min(1, scaleTo / w);
  return (
    <div style={{ width: w * scale, height: h * scale }} className="overflow-hidden rounded-xl border border-line bg-white">
      <iframe src={src} title={title} style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: '0 0', border: 0 }} loading="lazy" />
    </div>
  );
}

export function KitCompare({ before, after, beforeLabel, afterLabel }: { before: string; after: string; beforeLabel: string; afterLabel: string }) {
  const [mode, setMode] = useState<'side' | 'slider'>('side');
  const [device, setDevice] = useState<keyof typeof SIZES>('desktop');
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  const toggle = (active: boolean) => cx('rounded-full px-4 py-2 text-sm font-medium', active ? 'bg-primary text-white' : 'border border-line bg-card');
  const paneWidth = mode === 'side' && width >= 700 ? (width - 16) / 2 : width;
  const { w, h } = SIZES[device];
  const scale = Math.min(1, paneWidth / w);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Comparison view">
        <button type="button" className={toggle(mode === 'side')} aria-pressed={mode === 'side'} onClick={() => setMode('side')}>Side by side</button>
        <button type="button" className={toggle(mode === 'slider')} aria-pressed={mode === 'slider'} onClick={() => setMode('slider')}>Before/after slider</button>
        <span className="mx-1 w-px bg-line" />
        <button type="button" className={toggle(device === 'desktop')} aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>Desktop</button>
        <button type="button" className={toggle(device === 'phone')} aria-pressed={device === 'phone'} onClick={() => setDevice('phone')}>Phone</button>
      </div>
      <div ref={box}>
        {mode === 'side' ? (
          <div className={cx('grid gap-4', width >= 700 && 'grid-cols-2')}>
            <figure><figcaption className="mb-2 text-sm font-semibold">{beforeLabel}</figcaption><Frame src={before} title={beforeLabel} device={device} scaleTo={paneWidth} /></figure>
            <figure><figcaption className="mb-2 text-sm font-semibold text-primary">{afterLabel}</figcaption><Frame src={after} title={afterLabel} device={device} scaleTo={paneWidth} /></figure>
          </div>
        ) : (
          <div>
            <div className="relative overflow-hidden rounded-xl border border-line bg-white" style={{ width: w * scale, height: h * scale }}>
              <iframe src={before} title={beforeLabel} className="absolute left-0 top-0" style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: '0 0', border: 0 }} />
              <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
                <iframe src={after} title={afterLabel} className="absolute left-0 top-0" style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: '0 0', border: 0 }} />
              </div>
              <div aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 bg-accent" style={{ left: `${pos}%` }} />
              <span className="absolute left-2 top-2 rounded-full bg-brand/85 px-2 py-1 text-xs text-white">{beforeLabel}</span>
              <span className="absolute right-2 top-2 rounded-full bg-primary/90 px-2 py-1 text-xs text-white">{afterLabel}</span>
            </div>
            <label className="mt-3 flex items-center gap-3 text-sm">
              Before
              <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} className="flex-1 accent-[var(--primary)]" aria-label="Move the before/after divider" />
              After
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
