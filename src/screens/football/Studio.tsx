// The studio: the gremlin (orange, in a Brabo scarf) and the pundit (purple) argue in three lines (board 13).
export function Gremlin() {
  return (
    <svg className="fb-av grem" viewBox="0 0 120 120" aria-hidden="true">
      <g className="bob">
        <path d="M26 52 L18 22 L38 40 L46 14 L58 36 L70 12 L76 38 L98 20 L92 52" className="avs" />
        <path d="M24 54 Q20 96 60 100 Q100 96 96 54 Q60 40 24 54 Z" className="avs" />
        <g className="eye"><circle cx="45" cy="64" r="10" className="avs" /><circle cx="47" cy="66" r="3.5" className="avf" /><circle cx="75" cy="64" r="10" className="avs" /><circle cx="73" cy="66" r="3.5" className="avf" /></g>
        <path d="M40 82 Q60 96 80 82" className="avs" /><path d="M48 86 l3 -5 l3 6 l3 -6 l3 6 l3 -6 l3 5" className="avs th" />
        <path d="M30 100 Q60 108 90 100 L86 112 Q60 118 34 112 Z" className="avs scarf" />
        <path d="M96 80 Q112 84 108 100 q-2 6 6 6" className="avs" />
      </g>
    </svg>
  );
}
export function Pundit() {
  return (
    <svg className="fb-av pund" viewBox="0 0 120 120" aria-hidden="true">
      <path d="M34 44 Q36 18 62 18 Q88 18 88 46" className="avs" /><path d="M36 40 Q50 28 70 30 Q84 32 88 44" className="avs" />
      <path d="M34 46 Q32 84 60 86 Q88 84 86 46" className="avs" />
      <g className="eye p"><rect x="38" y="50" width="18" height="12" rx="3" className="avs" /><rect x="64" y="50" width="18" height="12" rx="3" className="avs" /><path d="M56 55 h8" className="avs" /><circle cx="47" cy="56" r="2.5" className="avf" /><circle cx="73" cy="56" r="2.5" className="avf" /></g>
      <path d="M50 74 Q60 79 70 74" className="avs" />
      <path d="M30 40 Q28 24 46 16 M90 40 Q92 24 74 16" className="avs thin" /><path d="M30 46 v10 M30 56 Q30 72 46 74" className="avs" /><circle cx="48" cy="74" r="3" className="avf" />
      <path d="M22 118 Q24 96 46 92 L60 104 L74 92 Q96 96 98 118" className="avs" /><path d="M60 104 l-5 14 h10 z" className="avs tie" />
    </svg>
  );
}

const WHO = ['grem', 'pund', 'grem'] as const;
export function Studio({ lines }: { lines: string[] }) {
  return (
    <section className="fb-studio" aria-label="In the studio">
      <span className="fb-lb">In the studio</span>
      <div className="fb-desk">
        <div className="fb-who"><Gremlin /><span className="fb-np g">The gremlin</span></div>
        <div className="fb-who"><Pundit /><span className="fb-np p">The pundit</span></div>
      </div>
      {lines.slice(0, 3).map((t, i) => (
        <p key={i} className={`fb-ln ${WHO[i]}`}><b>{WHO[i] === 'grem' ? 'Gremlin' : 'Pundit'}</b><span>{t}</span></p>
      ))}
    </section>
  );
}
