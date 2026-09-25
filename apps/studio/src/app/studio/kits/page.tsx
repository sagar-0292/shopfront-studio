import type { Metadata } from 'next';
import { Badge, ButtonLink, Card, CardTitle, PageHeader } from '@/components/ui';
import { requireAgency } from '@/lib/context';
import { hooks, KIT_LABELS, KIT_NAMES, manifest, sampleUrl } from '@/lib/kits';
import { formatDate } from '@/lib/catalog';

export const metadata: Metadata = { title: 'Kits' };

export default async function KitsPage() {
  await requireAgency();
  const m = manifest();
  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Motion & commerce"
        title="Kits"
        description="Every client website is built from these two tested libraries. The AI only adds the hooks listed below; it never writes animation, cart or checkout code. Each website stays on its kit version until you upgrade it."
        action={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/kits/demo/showcase.html" target="_blank" variant="accent">Open showcase ↗</ButtonLink>
            <ButtonLink href="/kits/demo/sample.html" target="_blank" variant="ghost">Sample site ↗</ButtonLink>
          </div>
        }
      />
      {KIT_NAMES.map((kit) => {
        const k = m[kit];
        const list = hooks(kit, k.latest);
        return (
          <Card key={kit}>
            <CardTitle title={KIT_LABELS[kit]} description={`Latest version ${k.latest}`} action={<Badge tone="good">{k.versions.length} {k.versions.length === 1 ? 'release' : 'releases'}</Badge>} />
            <ol className="mb-6 space-y-3" aria-label={`${KIT_LABELS[kit]} releases`}>
              {k.versions.map((v) => (
                <li key={v.version} className="rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-brand">Version {v.version} <span className="font-normal text-muted">· {formatDate(v.released_at)}</span></p>
                    <a className="text-sm font-medium text-primary underline" target="_blank" href={sampleUrl(kit === 'motion' ? v.version : m.motion.latest, kit === 'commerce' ? v.version : m.commerce.latest, 'showcase.html')}>Showcase on {v.version} ↗</a>
                  </div>
                  <p className="mt-2 text-sm text-muted">{v.notes}</p>
                </li>
              ))}
            </ol>
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-primary">All {list.length} hooks in {k.latest}</summary>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-muted"><tr><th className="py-2 pr-4">Hook</th><th className="py-2 pr-4">Goes on</th><th className="py-2">What it does</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {list.map((h) => (
                      <tr key={h.attr}>
                        <td className="py-2 pr-4 align-top"><code className="rounded bg-page px-1.5 py-0.5 text-xs">{h.attr}</code>{h.values?.length && h.values[0] ? <p className="mt-1 text-xs text-muted">{h.values.join(' · ')}</p> : null}</td>
                        <td className="py-2 pr-4 align-top text-muted">{h.on}</td>
                        <td className="py-2 align-top">{h.does}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </Card>
        );
      })}
    </div>
  );
}
