import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/action-form';
import { Badge, buttonClass, Card, CardTitle, Field, Input, Notice, PageHeader, Select, Textarea } from '@/components/ui';
import { CopyButton, MaterialUploader } from '@/components/studio/website-tools';
import { requireAgency } from '@/lib/context';
import { withUser } from '@/lib/db';
import { formatDate, INDIAN_STATES } from '@/lib/catalog';
import { compareVersions, manifest } from '@/lib/kits';
import { DESIGNS } from '@/lib/designs';
import { buildBrief } from '@/lib/website/brief';
import { exampleFor, loadProjectWebsite } from '@/lib/website/load';
import { buildSite, removeFile, saveBrief, uploadFile, useLatestDesignKit } from './actions';

export const metadata: Metadata = { title: 'Website' };

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function Step({ n, title, description, children, done }: { n: number; title: string; description?: React.ReactNode; children: React.ReactNode; done?: boolean }) {
  return (
    <Card>
      <div className="mb-5 flex items-start gap-4">
        <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${done ? 'bg-good text-white' : 'bg-primary text-on-primary'}`}>{done ? '✓' : n}</span>
        <div className="min-w-0"><h2 className="font-display text-xl text-brand">{title}</h2>{description && <div className="mt-1 text-sm text-muted">{description}</div>}</div>
      </div>
      {children}
    </Card>
  );
}

export default async function WebsitePage({ params }: PageProps<'/studio/projects/[id]/website'>) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { ctx, agency, isOwner } = await requireAgency();
  const p = await withUser(ctx.user, (db) => loadProjectWebsite(db, id, agency.organisation_id));
  if (!p) notFound();
  const { site, brief, files, facts } = p;
  const direction = site.design_direction;
  const latestDesign = manifest().design.latest;
  const behind = compareVersions(latestDesign, site.design_kit_version) > 0;
  const logo = files.find((f) => f.kind === 'logo');
  const photos = files.filter((f) => f.kind === 'photo');
  const documents = files.filter((f) => f.kind === 'document');
  const briefText = direction && brief.about
    ? buildBrief(direction, facts, brief, exampleFor(direction), {
      logoColours: logo?.colours ?? [],
      photos: photos.map((f) => ({ name: f.name, label: f.label })),
      documents: documents.map((f) => ({ filename: f.filename, label: f.label })),
    })
    : null;
  const preview = `/studio/projects/${id}/website/preview/`;
  const website = site.website;

  return (
    <div className="max-w-4xl space-y-6">
      <p className="text-sm"><Link className="text-muted underline" href={`/studio/projects/${id}`}>← {site.name}</Link></p>
      <PageHeader
        eyebrow={site.name}
        title="Website"
        description="Tell us about the business, let Claude write the site in the chosen look, check the preview, then download it for Netlify."
        action={website ? <Badge tone="good">Built {formatDate(site.website_built_at!)}</Badge> : <Badge tone="warn">Not built yet</Badge>}
      />

      {!direction && (
        <Notice tone="bad">Choose a design for this project first. <Link className="underline" href={`/studio/projects/${id}#design`}>Go to the Design card</Link>.</Notice>
      )}
      {direction && (
        <Notice>
          Look: <strong>{DESIGNS[direction].name}</strong> (design kit {site.design_kit_version}).{' '}
          <Link className="underline" href={`/studio/projects/${id}`}>Change it on the project page</Link>.
        </Notice>
      )}
      {behind && (
        <Card>
          <CardTitle title={`Design kit ${latestDesign} is available`} description="It adds the business’s own logo in the header. This project stays on its version until the agency owner moves it." />
          {isOwner
            ? <ActionForm action={useLatestDesignKit} submitLabel={`Use design kit ${latestDesign}`}><input type="hidden" name="id" value={id} /></ActionForm>
            : <p className="text-sm text-muted">Ask the agency owner to move this project to {latestDesign}.</p>}
        </Card>
      )}

      <Step n={1} title="About the business" done={!!brief.about} description="Facts only you know. Phone, WhatsApp and email come from the client details on the project page.">
        <ActionForm action={saveBrief} submitLabel="Save">
          <input type="hidden" name="id" value={id} />
          <Field label="What does the business do? What makes it special?" htmlFor="about">
            <Textarea id="about" name="about" required rows={4} maxLength={2000} defaultValue={brief.about}
              placeholder="e.g. Family sweet shop in Dadar since 1962. Everything made fresh each morning with pure ghee. Famous for kaju katli and Diwali gift boxes." />
          </Field>
          <Field label="What do they sell or offer? Prices if you know them" htmlFor="offer" hint="One per line is easiest. Upload a menu or price list below instead if you have one.">
            <Textarea id="offer" name="offer" rows={5} maxLength={4000} defaultValue={brief.offer} placeholder={'Kaju katli – ₹1,100 per kg\nMotichoor ladoo – ₹640 per kg\nDiwali gift box – from ₹999'} />
          </Field>
          <Field label="Who are their customers?" htmlFor="audience">
            <Input id="audience" name="audience" maxLength={600} defaultValue={brief.audience} placeholder="e.g. Families in Dadar and Matunga, office gifting at Diwali" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="sm:col-span-2"><Field label="Street address" htmlFor="street"><Input id="street" name="street" maxLength={120} defaultValue={brief.street} placeholder="12 Ranade Road" /></Field></div>
            <Field label="PIN code" htmlFor="pincode"><Input id="pincode" name="pincode" inputMode="numeric" maxLength={10} defaultValue={brief.pincode} placeholder="400028" /></Field>
            <Field label="Area" htmlFor="area"><Input id="area" name="area" maxLength={80} defaultValue={brief.area} placeholder="Dadar West" /></Field>
            <Field label="City" htmlFor="city"><Input id="city" name="city" maxLength={60} defaultValue={brief.city} placeholder="Mumbai" /></Field>
            <Field label="State" htmlFor="state">
              <Select id="state" name="state" defaultValue={brief.state || 'Maharashtra'}>
                {INDIAN_STATES.map((st) => <option key={st}>{st}</option>)}
              </Select>
            </Field>
            <div className="sm:col-span-3"><Field label="Instagram" htmlFor="instagram"><Input id="instagram" name="instagram" maxLength={200} defaultValue={brief.instagram} placeholder="@mithaimarket" /></Field></div>
          </div>
          <Field label="Opening hours" htmlFor="hours" hint="One line per group of days, e.g. “Mon – Sat 10am – 8:30pm”.">
            <Textarea id="hours" name="hours" rows={2} maxLength={500} defaultValue={brief.hours} placeholder={'Mon – Sat 10am – 8:30pm\nSun 11am – 2pm'} />
          </Field>
          <Field label="Real customer reviews (optional)" htmlFor="reviews" hint="Copy them word for word with the person’s name and where it was posted. The website never invents reviews.">
            <Textarea id="reviews" name="reviews" rows={3} maxLength={4000} defaultValue={brief.reviews} placeholder="“Best kaju katli in Mumbai.” – Priya S., Google review" />
          </Field>
          <Field label="Anything else Claude should know" htmlFor="notes">
            <Textarea id="notes" name="notes" rows={3} maxLength={4000} defaultValue={brief.notes} placeholder="Offers, delivery areas, what to highlight, words to avoid…" />
          </Field>
        </ActionForm>
      </Step>

      <Step n={2} title="The business’s own material (optional)" done={files.length > 0}
        description="Their logo goes in the header and its colours become the website’s colours. Their photos are used alongside stock photos. Brochures, menus and price lists are read by Claude for facts and wording.">
        <MaterialUploader siteId={id} action={uploadFile} />
        {files.length > 0 && (
          <ul className="mt-5 divide-y divide-line rounded-xl border border-line" aria-label="Uploaded material">
            {files.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-4 p-3">
                {f.kind !== 'document'
                  // eslint-disable-next-line @next/next/no-img-element -- private preview thumbnail, served by the studio
                  ? <img src={`${preview}img/own/${f.name}.webp`} alt="" width={56} height={56} className="size-14 rounded-lg border border-line bg-card object-contain" />
                  : <span aria-hidden className="grid size-14 place-items-center rounded-lg border border-line text-xs font-bold text-muted">{f.filename.split('.').pop()?.toUpperCase()}</span>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.kind === 'logo' ? 'Logo' : f.kind === 'photo' ? `Photo “${f.name}”` : f.filename}</p>
                  <p className="truncate text-xs text-muted">{[f.label, kb(f.size), f.width ? `${f.width}×${f.height}` : ''].filter(Boolean).join(' · ')}</p>
                  {f.colours.length > 0 && f.kind === 'logo' && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted">Colours:{f.colours.map((c) => <span key={c} title={c} className="inline-block size-4 rounded-full border border-line" style={{ background: c }} />)}</p>
                  )}
                </div>
                <ActionForm action={removeFile} submitLabel="Remove" variant="ghost" className="flex items-center gap-2">
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="file_id" value={f.id} />
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
      </Step>

      <Step n={3} title="Ask Claude" done={!!website} description="Uses your own Claude subscription: nothing extra to pay.">
        {!briefText ? (
          <p className="text-sm text-muted">{direction ? 'Fill in step 1 first. The brief appears here.' : 'Choose a design and fill in step 1 first.'}</p>
        ) : (
          <div className="space-y-4">
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              <li>Click <strong>Copy the brief</strong>, then <strong>Open Claude</strong> (start a new chat).</li>
              {documents.length + photos.length + (logo ? 1 : 0) > 0 && <li>Click <strong>Download material</strong> and attach those files to the chat (the paperclip button).</li>}
              <li>Paste the brief and send it. Claude replies with a long block of text in about a minute.</li>
              <li>Copy Claude’s whole reply (the copy button under it) and paste it into step 4.</li>
            </ol>
            <div className="flex flex-wrap gap-3">
              <CopyButton text={briefText} label="Copy the brief" />
              <a className="inline-flex items-center rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-primary/40" href="https://claude.ai/new" target="_blank" rel="noopener">Open Claude ↗</a>
              {files.length > 0 && <a className="inline-flex items-center rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-primary/40" href={`/studio/projects/${id}/website/material`}>Download material (.zip)</a>}
            </div>
            <details className="rounded-xl border border-line p-3 text-sm">
              <summary className="cursor-pointer font-medium">See the brief ({Math.round(briefText.length / 1000)}k characters)</summary>
              <Textarea readOnly rows={12} className="mt-3 font-mono text-xs" value={briefText} aria-label="The brief for Claude" />
            </details>
          </div>
        )}
      </Step>

      <Step n={4} title="Paste Claude’s answer" done={!!website} description="The studio checks it, finds the photos and builds every page. Anything that needs fixing is explained here.">
        <ActionForm action={buildSite} submitLabel={website ? 'Rebuild the website' : 'Build the website'} pendingLabel="Building… finding photos">
          <input type="hidden" name="id" value={id} />
          <Field label="Claude’s answer" htmlFor="answer">
            <Textarea id="answer" name="answer" required rows={8} className="font-mono text-xs" placeholder='{"tagline": "…", "pages": [ … ] }' />
          </Field>
        </ActionForm>
      </Step>

      {website && (
        <Card>
          <CardTitle title="Your website" description={`Built ${formatDate(site.website_built_at!)}. Check it on a computer and a phone, then download it.`}
            action={<a className="text-sm font-semibold text-primary underline" href={preview} target="_blank" rel="noopener">Open full preview ↗</a>} />
          {website.notes.length > 0 && (
            <div className="mb-5 space-y-2">{website.notes.map((n) => <Notice key={n}>{n}</Notice>)}</div>
          )}
          <div className="grid items-start gap-4 lg:grid-cols-[1fr_260px]">
            <div className="overflow-hidden rounded-xl border border-line bg-card" style={{ height: 520 }}>
              <iframe title="Website on a computer" src={preview} className="block origin-top-left border-0" style={{ width: '200%', height: 1040, transform: 'scale(0.5)' }} loading="lazy" />
            </div>
            <div className="mx-auto overflow-hidden rounded-[28px] border-[6px] border-brand bg-card" style={{ width: 272, height: 520 }}>
              <iframe title="Website on a phone" src={preview} className="block origin-top-left border-0" style={{ width: 390, height: 745, transform: 'scale(0.6667)' }} loading="lazy" />
            </div>
          </div>
          <div className="mt-6 space-y-3 rounded-xl border border-line bg-accent-soft/50 p-4">
            <h3 className="font-semibold">Put it online</h3>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              <li>Download the website below and unzip it.</li>
              <li>Open <a className="underline" href="https://app.netlify.com/drop" target="_blank" rel="noopener">Netlify Drop</a> (a free account is fine) and drag the unzipped folder onto the page.</li>
              <li>It’s live in seconds. To use the business’s own domain: Netlify → Domain management → Add a domain.</li>
            </ol>
            <a className={buttonClass('primary')} href={`/studio/projects/${id}/website/download`} download>Download website for Netlify (.zip)</a>
          </div>
        </Card>
      )}
    </div>
  );
}
