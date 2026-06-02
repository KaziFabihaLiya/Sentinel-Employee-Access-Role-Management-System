// client/src/components/Admin/ApprovalMetricsCard.jsx
import { T } from '../../styles/darkTokens';

// ── Tiny inline SVG bar chart ─────────────────────────────────────────────────
const MiniBarChart = ({ data = [], color = T.teal }) => {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 120, H = 36;
  const bw = Math.floor((W - (data.length - 1) * 3) / data.length);

  return (
    <svg width={W} height={H} style={{ overflow:'visible' }}>
      {data.map((d, i) => {
        const bh = Math.max(2, Math.round((d.value / max) * H));
        return (
          <rect key={i}
            x={i * (bw + 3)} y={H - bh} width={bw} height={bh}
            rx={2}
            fill={color}
            opacity={i === data.length - 1 ? 1 : 0.4}
          >
            <title>{d.label}: {d.value}</title>
          </rect>
        );
      })}
    </svg>
  );
};

// ── Circular progress ring ────────────────────────────────────────────────────
const Ring = ({ pct = 0, color = '#10D988', size = 52 }) => {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={5}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transform:'rotate(-90deg)', transformOrigin:'50% 50%', transition:'stroke-dashoffset .6s ease' }}/>
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill={color} fontSize={size * .22} fontWeight="700">
        {pct}%
      </text>
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const ApprovalMetricsCard = ({
  title,
  value,
  sub,
  icon,
  accent = T.teal,
  loading = false,
  trend = [],          // [{ label, value }] for mini chart
  ringPct = null,      // 0-100 for ring display
  ringColor,
  highlight = false,   // show accent border
  onClick,
}) => (
  <div
    onClick={onClick}
    style={{
      background: T.surface,
      border: `1px solid ${highlight ? accent + '50' : T.border}`,
      borderRadius: '16px', padding: '1.25rem',
      position: 'relative', overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform .2s, box-shadow .2s, border-color .2s',
    }}
    onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow=`0 12px 36px ${accent}18`; e.currentTarget.style.borderColor=`${accent}40`; }}}
    onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor=highlight ? `${accent}50` : T.border; }}
  >
    {/* Top accent bar */}
    <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background:accent, borderRadius:'16px 16px 0 0' }}/>

    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'.75rem' }}>
      <div style={{ flex:1, minWidth:0 }}>
        {/* Icon + title */}
        <div style={{ display:'flex', alignItems:'center', gap:'.55rem', marginBottom:'.6rem' }}>
          <div style={{ width:'34px', height:'34px', borderRadius:'9px', background:'rgba(0,198,255,.07)', border:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.95rem', minWidth:'34px' }}>
            {icon}
          </div>
          <span style={{ fontSize:'.75rem', fontWeight:'600', color:T.muted, textTransform:'uppercase', letterSpacing:'.05em' }}>{title}</span>
        </div>

        {/* Value */}
        {loading
          ? <div style={{ width:'60%', height:'2rem', borderRadius:'8px', background:'linear-gradient(90deg,#0F1E38 25%,#122040 50%,#0F1E38 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite' }}/>
          : <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'2rem', fontWeight:'800', color:T.white, lineHeight:1 }}>{value ?? '—'}</div>
        }

        {sub && <p style={{ fontSize:'.75rem', color:T.muted, marginTop:'.3rem', lineHeight:1.4 }}>{sub}</p>}
        {onClick && <span style={{ fontSize:'.72rem', color:accent, fontWeight:'600', marginTop:'.5rem', display:'block' }}>View details →</span>}
      </div>

      {/* Right side: ring or chart */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'.5rem' }}>
        {ringPct !== null && <Ring pct={ringPct} color={ringColor || accent} />}
        {trend.length > 0 && !ringPct && <MiniBarChart data={trend} color={accent} />}
      </div>
    </div>
  </div>
);

export default ApprovalMetricsCard;