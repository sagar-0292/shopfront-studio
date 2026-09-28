'use client';

import { useRef, useState, useTransition } from 'react';
import { Button, Field, Input, Notice, Select } from '@/components/ui';
import type { ActionState } from '@/lib/action';

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button type="button" onClick={async () => { await navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 2500); }}>
      {done ? 'Copied ✓' : label}
    </Button>
  );
}

/** Main colours of an image, ignoring transparent and near-white pixels (for logos: the brand colours). */
function mainColours(bitmap: ImageBitmap): string[] {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(bitmap, 0, 0, 64, 64);
  const px = g.getImageData(0, 0, 64, 64).data;
  const counts = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < px.length; i += 4) {
    const [r, gg, b, a] = [px[i], px[i + 1], px[i + 2], px[i + 3]];
    if (a < 200 || (r > 235 && gg > 235 && b > 235)) continue;
    const k = `${r >> 5},${gg >> 5},${b >> 5}`;
    const e = counts.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += r; e.g += gg; e.b += b;
    counts.set(k, e);
  }
  const picked: [number, number, number][] = [];
  for (const e of [...counts.values()].sort((x, y) => y.n - x.n)) {
    const col: [number, number, number] = [e.r / e.n, e.g / e.n, e.b / e.n].map(Math.round) as [number, number, number];
    if (picked.every((p) => Math.hypot(p[0] - col[0], p[1] - col[1], p[2] - col[2]) > 60)) picked.push(col);
    if (picked.length === 4) break;
  }
  return picked.map((p) => `#${p.map((v) => v.toString(16).padStart(2, '0')).join('')}`);
}

async function toWebp(bitmap: ImageBitmap, maxW: number, maxH: number) {
  const scale = Math.min(1, maxW / bitmap.width, maxH / bitmap.height);
  const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/webp', 0.82));
  if (!blob || blob.type !== 'image/webp') throw new Error('This browser can’t prepare photos. Please use Chrome, Edge or Firefox to upload.');
  return { blob, w, h };
}

/**
 * Uploads the business's own logo, photos and documents, one at a time. Photos are resized in the
 * browser first (fast websites, small uploads); the logo's colours are read so Claude can use them.
 */
export function MaterialUploader({ siteId, action }: { siteId: string; action: (prev: ActionState, form: FormData) => Promise<ActionState> }) {
  const [kind, setKind] = useState<'photo' | 'logo' | 'document'>('photo');
  const [status, setStatus] = useState<{ tone: 'good' | 'bad' | 'neutral'; text: string } | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const labelRef = useRef<HTMLInputElement>(null);

  const upload = () => start(async () => {
    const files = [...(fileRef.current?.files ?? [])];
    if (!files.length) { setStatus({ tone: 'bad', text: 'Choose a file first.' }); return; }
    let ok = 0;
    for (const [i, file] of files.entries()) {
      setStatus({ tone: 'neutral', text: `Uploading ${i + 1} of ${files.length}: ${file.name}…` });
      try {
        const form = new FormData();
        form.set('id', siteId);
        form.set('kind', kind);
        form.set('filename', file.name);
        form.set('label', files.length === 1 ? (labelRef.current?.value ?? '') : file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
        if (kind === 'document') {
          form.set('file', file);
        } else {
          if (!file.type.startsWith('image/')) throw new Error(`${file.name} isn’t an image. Choose “Document” for PDFs and Word files.`);
          const bitmap = await createImageBitmap(file);
          const main = kind === 'logo' ? await toWebp(bitmap, 800, 400) : await toWebp(bitmap, 1920, 1920);
          form.set('file', main.blob, 'image.webp');
          form.set('width', String(main.w));
          form.set('height', String(main.h));
          if (kind === 'photo' && main.w > 800) form.set('small', (await toWebp(bitmap, 800, 800)).blob, 'small.webp');
          form.set('colours', mainColours(bitmap).join(','));
        }
        const r = await action({}, form);
        if (r.error) throw new Error(r.error);
        ok++;
      } catch (e) {
        setStatus({ tone: 'bad', text: e instanceof Error ? e.message : 'That file could not be uploaded.' });
        return;
      }
    }
    setStatus({ tone: 'good', text: ok === 1 ? 'Uploaded.' : `${ok} files uploaded.` });
    if (fileRef.current) fileRef.current.value = '';
    if (labelRef.current) labelRef.current.value = '';
  });

  return (
    <div role="group" aria-label="Upload material" className="space-y-4 rounded-xl border border-dashed border-line p-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="What is it?" htmlFor="upload-kind">
          <Select id="upload-kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="photo">Photo (shop, products, team…)</option>
            <option value="logo">Logo</option>
            <option value="document">Document (brochure, menu, price list)</option>
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label={kind === 'photo' ? 'Describe the photo (helps Claude place it)' : 'Short description (optional)'} htmlFor="upload-label">
            <Input id="upload-label" ref={labelRef} maxLength={200} placeholder={kind === 'photo' ? 'e.g. Our shop front on Ranade Road' : kind === 'document' ? 'e.g. 2026 price list' : ''} />
          </Field>
        </div>
      </div>
      <Field label="File" htmlFor="upload-file" hint={kind === 'document' ? 'PDF, Word, PowerPoint or text, up to 4 MB each.' : 'JPG, PNG or WebP. Resized automatically before upload. You can pick several photos at once.'}>
        <input id="upload-file" ref={fileRef} type="file" multiple={kind !== 'logo'} className="block w-full text-sm"
          accept={kind === 'document' ? '.pdf,.doc,.docx,.pptx,.txt' : 'image/*'} />
      </Field>
      {status && <Notice tone={status.tone} role="status">{status.text}</Notice>}
      <Button type="button" onClick={upload} disabled={pending} aria-busy={pending}>{pending ? 'Uploading…' : 'Upload'}</Button>
    </div>
  );
}
