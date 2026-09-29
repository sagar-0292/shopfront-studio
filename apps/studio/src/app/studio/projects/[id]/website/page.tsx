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
import { buildSite, fillInBrief, generateWebsite, pasteFillIn, removeFile, saveBrief, saveWebsite, uploadFile, useLatestDesignKit } from './actions';
import { claudeConnected } from '@/lib/website/claude';
import { fillInPrompt } from '@/lib/website/autofill';
import { kitGuide } from '@/lib/website/render';

export const metadata: Metadata = { title: 'Website' };
// Claude takes 1–3 minutes to write a whole website (Vercel allows up to 5).
export const maxDuration = 300;

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
    }, await kitGuide(site.design_kit_version, direction))
    : null;
  const preview = `/studio/projects/${id}/website/preview/`;
  const website = site.website;
  const connected = claudeConnected();
  // Copy-and-paste fill-in: claude.ai visits the website itself and reads the attached documents.
  const fillDocs = documents.filter((f) => ['application/pdf', 'text/plain'].includes(f.mime)).map((f) => f.filename);
  const fillText = !connected && (brief.website || fillDocs.length)
    ? fillInPrompt({ name: site.name, url: brief.website || null, pages: null, documents: fillDocs })
    : null;
  const briefKey = String((site.website_brief as { filled_at?: string } | null)?.filled_at ?? 'typed');

  return (
    <div className="max-w-4xl space-y-6">
      <p className="text-sm"><Link className="text-muted underline" href={`/studio/projects/${id}`}>← {site.name}</Link></p>
      <PageHeader
        eyebrow={site.name}
        title="Website"
        description="Add what the business already has (logo, photos, current website, brochures), let Claude fill in the details, and Claude creates the website in the chosen look. Check the preview, then download it for Netlify."
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
          <CardTitle title={`Design kit ${latestDesign} is available`} description="It lets Claude art-direct each website: 21 font pairings, headline sizes, shapes, button styles and photo colour grading chosen for this business. This project stays on its version until the agency owner moves it." />
          {isOwner
            ? <ActionForm action={useLatestDesignKit} submitLabel={`Use design kit ${latestDesign}`}><input type="hidden" name="id" value={id} /></ActionForm>
            : <p className="text-sm text-muted">Ask the agency owner to move this project to {latestDesign}.</p>}
        </Card>
      )}

      <Step n={1} title="What they already have (optional)" done={files.length > 0 || !!brief.website}
        description="Their logo goes in the header and its colours become the website’s colours. Their photos are used alongside stock photos. Their current website, brochures, menus and price lists fill in step 2 for you.">
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

        <div className="mt-6 rounded-xl border border-line bg-accent-soft/40 p-4">
          <h3 className="font-semibold">Fill in the details for me</h3>
          <p className="mt-1 text-sm text-muted">
            Claude reads their current website (the home page and pages like About, Menu and Contact) and any PDF or text documents
            uploaded above, then fills in step 2. Anything you’ve already typed is kept. You check it before creating the website.
          </p>
          {connected ? (
            <ActionForm action={fillInBrief} submitLabel="Fill in the details for me" pendingLabel="Reading their website and documents… about 30 seconds" className="mt-4 space-y-4">
              <input type="hidden" name="id" value={id} />
              <Field label="Their current website (if they have one)" htmlFor="website" hint="Instagram and Facebook pages can’t be read: paste their bio into step 2 instead.">
                <Input id="website" name="website" inputMode="url" maxLength={300} defaultValue={brief.website} placeholder="mithaimarket.in" />
              </Field>
            </ActionForm>
          ) : (
            <div className="mt-4 space-y-4">
              <ActionForm action={saveWebsite} submitLabel="Use this address" variant="ghost">
                <input type="hidden" name="id" value={id} />
                <Field label="Their current website (if they have one)" htmlFor="website" hint="Instagram and Facebook pages can’t be read: paste their bio into step 2 instead.">
                  <Input id="website" name="website" inputMode="url" maxLength={300} defaultValue={brief.website} placeholder="mithaimarket.in" />
                </Field>
              </ActionForm>
              {fillText && (
                <>
                  <ol className="list-decimal space-y-1 pl-5 text-sm">
                    <li>Click <strong>Copy the request</strong>, then <strong>Open Claude</strong> (start a new chat).</li>
                    {documents.length > 0 && <li>Click <strong>Download material</strong> and attach the documents to the chat.</li>}
                    <li>Paste, send, then copy Claude’s whole reply and paste it below.</li>
                  </ol>
                  <div className="flex flex-wrap gap-3">
                    <CopyButton text={fillText} label="Copy the request" />
                    <a className="inline-flex items-center rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-primary/40" href="https://claude.ai/new" target="_blank" rel="noopener">Open Claude ↗</a>
                    {documents.length > 0 && <a className="inline-flex items-center rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-primary/40" href={`/studio/projects/${id}/website/material`}>Download material (.zip)</a>}
                  </div>
                  <ActionForm action={pasteFillIn} submitLabel="Fill in step 2">
                    <input type="hidden" name="id" value={id} />
                    <Field label="Claude’s reply with the details" htmlFor="fill-answer">
                      <Textarea id="fill-answer" name="answer" required rows={5} className="font-mono text-xs" placeholder='{"about": "…", "offer": "…"}' />
                    </Field>
                  </ActionForm>
                </>
              )}
            </div>
          )}
        </div>
      </Step>

      <Step n={2} title="About the business" done={!!brief.about} description="Check what was filled in and add facts only you know. Phone, WhatsApp and email come from the client details on the project page.">
        {/* Re-created after each fill-in, so the fields show what "Fill in the details for me" found. */}
        <ActionForm key={briefKey} action={saveBrief} submitLabel="Save">
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

      <Step n={3} title="Create the website" done={!!website}
        description="Claude art-directs and writes every page in the chosen look from the details above, the uploaded material and a finished example of the look: its own fonts, sizes, shapes and photo colours for this business. The studio then checks it, finds real photos and builds it.">
        {!briefText ? (
          <p className="text-sm text-muted">{direction ? 'Fill in step 2 first.' : 'Choose a design and fill in step 2 first.'}</p>
        ) : (
          <div className="space-y-5">
            {connected ? (
              <ActionForm action={generateWebsite} submitLabel={website ? 'Create it again automatically' : 'Create website automatically'}
                pendingLabel="Claude is writing the website… about 1–3 minutes, keep this page open">
                <input type="hidden" name="id" value={id} />
                <p className="text-sm text-muted">Uses your Anthropic API account (pay per use; the cost of each build is shown after it). Each click makes a fresh version.</p>
              </ActionForm>
            ) : (
              <Notice>
                <strong>Automatic creation isn’t connected yet.</strong> It needs an Anthropic API key (console.anthropic.com, pay per use),
                added as <code>ANTHROPIC_API_KEY</code> in the server settings. Until then, use the free copy-and-paste route below with your Claude subscription.
              </Notice>
            )}
            <details open={!connected} className="rounded-xl border border-line p-4">
              <summary className="cursor-pointer font-semibold">{connected ? 'Or do it yourself in claude.ai (free with your Claude subscription)' : 'Create it with your Claude subscription (copy and paste)'}</summary>
              <div className="mt-4 space-y-4">
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  <li>Click <strong>Copy the brief</strong>, then <strong>Open Claude</strong> (start a new chat).</li>
                  {documents.length + photos.length + (logo ? 1 : 0) > 0 && <li>Click <strong>Download material</strong> and attach those files to the chat (the paperclip button).</li>}
                  <li>Paste the brief and send it. Claude replies with a long block of text in about a minute.</li>
                  <li>Copy Claude’s whole reply (the copy button under it) and paste it below.</li>
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
                <ActionForm action={buildSite} submitLabel={website ? 'Rebuild the website' : 'Build the website'} pendingLabel="Building… finding photos">
                  <input type="hidden" name="id" value={id} />
                  <Field label="Claude’s answer" htmlFor="answer">
                    <Textarea id="answer" name="answer" required rows={8} className="font-mono text-xs" placeholder='{"tagline": "…", "pages": [ … ] }' />
                  </Field>
                </ActionForm>
              </div>
            </details>
          </div>
        )}
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
