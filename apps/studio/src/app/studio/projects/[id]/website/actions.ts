'use server';

import { revalidatePath } from 'next/cache';
import { requireAgency } from '@/lib/context';
import { withUser } from '@/lib/db';
import { safe, text, UserError } from '@/lib/action';
import { slugify } from '@/lib/slug';
import { manifest } from '@/lib/kits';
import { buildWebsite, parseAnswer } from '@/lib/website/build';
import { renderPages } from '@/lib/website/render';
import { loadProjectWebsite } from '@/lib/website/load';

const idOf = (form: FormData) => {
  const id = String(form.get('id') ?? '');
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new UserError('This project could not be found.');
  return id;
};
const back = (id: string) => revalidatePath(`/studio/projects/${id}/website`);

/** Step 1: what the team knows about the business. */
export const saveBrief = safe(async (form) => {
  const { ctx, agency } = await requireAgency();
  const id = idOf(form);
  const pincode = text(form, 'pincode', { label: 'the PIN code', max: 10 }).replace(/\s/g, '');
  if (pincode && !/^\d{6}$/.test(pincode)) throw new UserError('The PIN code should be 6 digits, like 400028.');
  const brief = {
    about: text(form, 'about', { required: true, label: 'what the business does', max: 2000 }),
    offer: text(form, 'offer', { label: 'what they sell', max: 4000 }),
    audience: text(form, 'audience', { label: 'who their customers are', max: 600 }),
    street: text(form, 'street', { label: 'the street address', max: 120 }),
    area: text(form, 'area', { label: 'the area', max: 80 }),
    city: text(form, 'city', { label: 'the city', max: 60 }),
    state: text(form, 'state', { label: 'the state', max: 60 }),
    pincode,
    hours: text(form, 'hours', { label: 'opening hours', max: 500 }),
    instagram: text(form, 'instagram', { label: 'Instagram', max: 200 }),
    reviews: text(form, 'reviews', { label: 'reviews', max: 4000 }),
    notes: text(form, 'notes', { label: 'other notes', max: 4000 }),
  };
  await withUser(ctx.user, async (db) => {
    const r = await db.query(`update sites set website_brief = $2 where id = $1 and organisation_id = $3 returning id`, [id, JSON.stringify(brief), agency.organisation_id]);
    if (!r.length) throw new UserError('This project could not be found, or you no longer have access to it.');
  });
  back(id);
  return { ok: true, message: 'Saved. The brief for Claude below now includes these details.' };
});

/** Step 3: Claude's answer becomes the website. */
export const buildSite = safe(async (form) => {
  const { ctx, agency } = await requireAgency();
  const id = idOf(form);
  const answer = parseAnswer(String(form.get('answer') ?? ''));
  await withUser(ctx.user, async (db) => {
    const p = await loadProjectWebsite(db, id, agency.organisation_id);
    if (!p) throw new UserError('This project could not be found, or you no longer have access to it.');
    if (!p.site.design_direction) throw new UserError('Choose a design for this project first (on the project page).');
    const website = await buildWebsite({
      answer, direction: p.site.design_direction, site: { id: p.site.id, name: p.site.name },
      facts: p.facts, input: p.brief, own: p.own, payments: p.payments,
    });
    // The design kit checks every page; anything it can't build is explained in plain words.
    await renderPages(website, { motion: p.site.motion_kit_version, commerce: p.site.commerce_kit_version, design: p.site.design_kit_version }, { base: '', noindex: true });
    await db.query(`update sites set website = $2, website_built_at = now(), status = case when status = 'draft' then 'building'::site_status else status end where id = $1`, [id, JSON.stringify(website)]);
  });
  back(id);
  revalidatePath(`/studio/projects/${id}`);
  return { ok: true, message: 'Website built. Check the preview below, then download it for Netlify.' };
});

/** Uploads one file of the business's own material (images arrive already resized to WebP by the browser). */
export const uploadFile = safe(async (form) => {
  const { ctx, agency } = await requireAgency();
  const id = idOf(form);
  const kind = String(form.get('kind'));
  if (!['logo', 'photo', 'document'].includes(kind)) throw new UserError('Please choose what kind of file this is.');
  const file = form.get('file');
  if (!(file instanceof Blob) || !file.size) throw new UserError('Please choose a file.');
  const filename = String(form.get('filename') || (file as File).name || 'file').slice(0, 200);
  const label = text(form, 'label', { label: 'the description', max: 200 });
  let mime = file.type;
  const DOCS: Record<string, string> = {
    pdf: 'application/pdf', txt: 'text/plain', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
  if (kind === 'document') {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    mime = DOCS[ext] ?? mime;
    if (!Object.values(DOCS).includes(mime)) throw new UserError('Documents can be PDF, Word, PowerPoint or plain text. For images, choose “Photo” or “Logo”.');
    if (file.size > 4 * 1024 * 1024) throw new UserError('That document is over 4 MB. Please save a smaller copy (for PDFs, “Reduce file size”) and try again.');
  } else if (mime !== 'image/webp') {
    throw new UserError('That image could not be prepared. Please try a JPG or PNG.');
  }
  const small = form.get('small');
  const width = Number(form.get('width')) || null;
  const height = Number(form.get('height')) || null;
  const colours = String(form.get('colours') ?? '').split(',').filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 6);
  const data = Buffer.from(await file.arrayBuffer());
  const smallData = small instanceof Blob && small.size ? Buffer.from(await small.arrayBuffer()) : null;
  await withUser(ctx.user, async (db) => {
    const site = await db.one(`select id from sites where id = $1 and organisation_id = $2`, [id, agency.organisation_id]);
    if (!site) throw new UserError('This project could not be found, or you no longer have access to it.');
    let name = kind === 'logo' ? 'logo' : slugify(label || filename.replace(/\.[^.]+$/, '')) || 'file';
    if (kind === 'logo') await db.query(`delete from site_files where site_id = $1 and kind = 'logo'`, [id]);
    for (let i = 2; await db.one(`select 1 from site_files where site_id = $1 and name = $2`, [id, name]); i++) name = `${name.replace(/-\d+$/, '')}-${i}`;
    await db.query(
      `insert into site_files (site_id, kind, name, label, filename, mime, data, small, width, height, colours)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [id, kind, name, label, filename, mime, data, smallData, width, height, colours]);
  });
  back(id);
  return { ok: true, message: kind === 'logo' ? 'Logo added.' : `${filename} added.` };
});

export const removeFile = safe(async (form) => {
  const { ctx, agency } = await requireAgency();
  const id = idOf(form);
  const fileId = String(form.get('file_id') ?? '');
  await withUser(ctx.user, async (db) => {
    const r = await db.query(`delete from site_files where id = $1 and site_id = $2 and organisation_id = $3 returning id`, [fileId, id, agency.organisation_id]);
    if (!r.length) throw new UserError('That file has already been removed.');
  });
  back(id);
  return { ok: true, message: 'Removed. Build the website again to take it out of the pages.' };
});

/** The agency owner moves the project to the newest design kit (adds features like logos). */
export const useLatestDesignKit = safe(async (form) => {
  const { ctx, agency, isOwner } = await requireAgency();
  const id = idOf(form);
  if (!isOwner) throw new UserError('Only the agency owner can change which kit version a website uses.');
  const latest = manifest().design.latest;
  await withUser(ctx.user, async (db) => {
    await db.query(`update sites set design_kit_version = $2 where id = $1 and organisation_id = $3`, [id, latest, agency.organisation_id]);
  });
  back(id);
  return { ok: true, message: `Now on design kit ${latest}. Build the website again to use it.` };
});
