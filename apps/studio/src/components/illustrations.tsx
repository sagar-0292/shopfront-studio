// Small drawings for empty screens. They use the theme's colours, so they suit light and dark.
export type Art = 'projects' | 'activity' | 'products' | 'lock' | 'search';

const P = 'var(--primary)', A = 'var(--accent)', L = 'var(--line)', C = 'var(--card)', M = 'var(--muted)';

export function Illustration({ art, className }: { art: Art; className?: string }) {
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden="true" fill="none">
      <ellipse cx="100" cy="126" rx="70" ry="8" fill={L} />
      {art === 'projects' && (<>
        <rect x="38" y="22" width="124" height="88" rx="10" fill={C} stroke={L} strokeWidth="3" />
        <path d="M38 40h124" stroke={L} strokeWidth="3" />
        {[50, 60, 70].map((x) => <circle key={x} cx={x} cy="31" r="3" fill={L} />)}
        <rect x="52" y="52" width="46" height="8" rx="4" fill={P} opacity=".85" />
        <rect x="52" y="66" width="70" height="5" rx="2.5" fill={L} />
        <rect x="52" y="76" width="58" height="5" rx="2.5" fill={L} />
        <rect x="52" y="88" width="30" height="10" rx="5" fill={A} />
        <rect x="116" y="50" width="34" height="48" rx="6" fill={P} opacity=".15" />
        <path d="M160 14l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill={A} />
        <path d="M30 60l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill={P} opacity=".6" />
      </>)}
      {art === 'activity' && (<>
        <rect x="46" y="18" width="108" height="96" rx="10" fill={C} stroke={L} strokeWidth="3" />
        {[36, 58, 80].map((y, i) => (<g key={y}>
          <circle cx="66" cy={y} r="6" fill={i === 0 ? A : P} opacity={i === 0 ? 1 : 0.35} />
          <rect x="80" y={y - 6} width={i === 1 ? 44 : 58} height="5" rx="2.5" fill={L} />
          <rect x="80" y={y + 2} width="30" height="4" rx="2" fill={L} opacity=".7" />
        </g>))}
        <path d="M66 42v10M66 64v10" stroke={L} strokeWidth="2" strokeDasharray="2 3" />
        <circle cx="150" cy="30" r="16" fill={C} stroke={P} strokeWidth="3" />
        <path d="M150 21v10l6 4" stroke={P} strokeWidth="3" strokeLinecap="round" />
      </>)}
      {art === 'products' && (<>
        <path d="M60 50h80l-8 62H68z" fill={C} stroke={L} strokeWidth="3" strokeLinejoin="round" />
        <path d="M82 50v-8a18 18 0 0136 0v8" stroke={P} strokeWidth="4" strokeLinecap="round" />
        <circle cx="100" cy="80" r="14" fill={A} />
        <path d="M94 80h12M100 74v12" stroke="var(--on-accent)" strokeWidth="3" strokeLinecap="round" />
        <path d="M150 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill={P} opacity=".6" />
      </>)}
      {art === 'lock' && (<>
        <rect x="66" y="58" width="68" height="54" rx="10" fill={C} stroke={L} strokeWidth="3" />
        <path d="M80 58V46a20 20 0 0140 0v12" stroke={P} strokeWidth="5" strokeLinecap="round" />
        <circle cx="100" cy="82" r="7" fill={A} />
        <path d="M100 88v10" stroke={A} strokeWidth="4" strokeLinecap="round" />
      </>)}
      {art === 'search' && (<>
        <circle cx="90" cy="64" r="32" fill={C} stroke={P} strokeWidth="5" />
        <path d="M113 88l24 24" stroke={P} strokeWidth="8" strokeLinecap="round" />
        <path d="M78 58c3-8 12-12 20-9" stroke={L} strokeWidth="4" strokeLinecap="round" />
        <circle cx="150" cy="34" r="5" fill={A} />
        <circle cx="42" cy="40" r="3" fill={M} opacity=".5" />
      </>)}
    </svg>
  );
}
