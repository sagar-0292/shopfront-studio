import { ActionForm } from '@/components/action-form';
import { Badge, Card, CardTitle, Field, Input, Textarea } from '@/components/ui';
import type { Db } from '@/lib/db';
import { addReference, removeReference } from '@/app/site-settings/actions';

type Ref = { id: string; kind: 'inspiration' | 'competitor'; url: string; notes: string; added_by: string | null; by: string | null; mine: boolean };

export async function loadReferences(db: Db, siteId: string, userId: string) {
  return db.query<Ref>(
    `select r.id, r.kind, r.url, r.notes, r.added_by, coalesce(nullif(p.full_name, ''), p.email) as by, r.added_by = $2 as mine
       from site_references r left join profiles p on p.id = r.added_by
      where r.site_id = $1 order by r.kind, r.created_at`,
    [siteId, userId],
  );
}

export function ReferencesCard({ siteId, refs, canRemoveAll, audience }: { siteId: string; refs: Ref[]; canRemoveAll: boolean; audience: 'agency' | 'client' }) {
  const groups = [
    { kind: 'inspiration' as const, title: 'Inspiration — “make it like this”', empty: 'No inspiration websites yet.' },
    { kind: 'competitor' as const, title: 'Competitors', empty: 'No competitors added yet.' },
  ];
  return (
    <Card>
      <CardTitle
        title="Reference & competitor websites"
        description={audience === 'agency'
          ? 'Websites the client likes, and their competitors. The design agent borrows layout ideas from inspiration sites (never their words or photos); competitors are studied for the audit.'
          : 'Show your agency websites you like, and your competitors. We only borrow layout ideas — never anyone’s words or photos.'}
      />
      <div className="mb-6 grid gap-5 md:grid-cols-2">
        {groups.map((g) => {
          const list = refs.filter((r) => r.kind === g.kind);
          return (
            <section key={g.kind} aria-label={g.title}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                {g.title} <Badge tone={g.kind === 'competitor' ? 'warn' : 'accent'} dot={false}>{list.length}</Badge>
              </h3>
              {list.length ? (
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {list.map((r) => (
                    <li key={r.id} className="flex items-start justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <a href={r.url} target="_blank" rel="noopener noreferrer nofollow" className="block truncate text-sm font-medium text-primary underline">{r.url.replace(/^https?:\/\//, '')}</a>
                        {r.notes && <p className="mt-0.5 text-sm text-muted">{r.notes}</p>}
                        {r.by && <p className="mt-0.5 text-xs text-muted">Added by {r.mine ? 'you' : r.by}</p>}
                      </div>
                      {(canRemoveAll || r.mine) && (
                        <ActionForm action={removeReference} submitLabel="Remove" variant="ghost" className="shrink-0">
                          <input type="hidden" name="id" value={r.id} />
                        </ActionForm>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-line p-3 text-sm text-muted">{g.empty}</p>
              )}
            </section>
          );
        })}
      </div>
      <h3 className="mb-3 text-sm font-semibold">Add a website</h3>
      <ActionForm action={addReference} submitLabel="Add website" pendingLabel="Adding…" resetOnSuccess>
        <input type="hidden" name="site_id" value={siteId} />
        <fieldset>
          <legend className="mb-2 text-sm font-medium">This website is…</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" name="kind" value="inspiration" defaultChecked /> Inspiration (make it like this)</label>
            <label className="flex items-center gap-2"><input type="radio" name="kind" value="competitor" /> A competitor</label>
          </div>
        </fieldset>
        <Field label="Web address" htmlFor={`ref-url-${siteId}`}>
          <Input id={`ref-url-${siteId}`} name="url" inputMode="url" placeholder="e.g. rival-sweets.in" required maxLength={500} autoComplete="off" />
        </Field>
        <Field label="What do you like, or what should we watch? (optional)" htmlFor={`ref-notes-${siteId}`}>
          <Textarea id={`ref-notes-${siteId}`} name="notes" maxLength={1000} placeholder="e.g. the big photo menu, the festive offers banner" />
        </Field>
      </ActionForm>
    </Card>
  );
}
