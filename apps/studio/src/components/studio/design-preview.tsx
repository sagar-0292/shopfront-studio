import { cx } from '@/components/ui';

// A live, scaled-down view of a sample website: a computer screen with a phone in front.
// The frames are for looking only (no tabbing into them); the "Open" links go to the real site.
export function DesignPreview({ url, name, className }: { url: string; name: string; className?: string }) {
  return (
    <div className={cx('relative', className)}>
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-line bg-page shadow-sm">
        <iframe
          src={url}
          title={`${name} on a computer`}
          loading="lazy"
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 h-[300%] w-[300%] origin-top-left scale-[0.3334] border-0"
        />
      </div>
      <div className="absolute -bottom-4 right-3 h-[218px] w-[104px] overflow-hidden rounded-[18px] border-4 border-brand bg-page shadow-xl shadow-brand/25 sm:h-[250px] sm:w-[118px]">
        <iframe
          src={url}
          title={`${name} on a phone`}
          loading="lazy"
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 h-[780px] w-[360px] origin-top-left scale-[0.267] border-0 sm:scale-[0.306]"
        />
      </div>
    </div>
  );
}

export function Swatches({ colours, label }: { colours: string[]; label: string }) {
  return (
    <ul className="flex" aria-label={label}>
      {colours.map((c) => (
        <li key={c} className="-mr-1.5 h-6 w-6 rounded-full border-2 border-card shadow-sm" style={{ background: c }} title={c}><span className="sr-only">{c}</span></li>
      ))}
    </ul>
  );
}
