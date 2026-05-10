// client/src/styles/darkTokens.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Sentinel shared design primitives — imported by all dashboard pages
// Usage: import { T, Sk, StatusBadge, RiskBadge, Toast, PageHeader, TABLE_TH, GLOBAL_CSS } from '../../styles/darkTokens';
// ─────────────────────────────────────────────────────────────────────────────

// ── Color tokens ─────────────────────────────────────────────────────────────
export const T = {
  navy:        '#050D1F',
  navyMid:     '#0B1730',
  surface:     '#0F1E38',
  surfaceAlt:  '#122040',
  teal:        '#00C6FF',
  cyan:        '#00FFD1',
  purple:      '#A78BFA',
  gradient:    'linear-gradient(135deg,#00C6FF 0%,#00FFD1 100%)',
  gradientG:   'linear-gradient(135deg,#10D988,#059669)',   // green
  gradientA:   'linear-gradient(135deg,#F59E0B,#D97706)',   // amber
  gradientR:   'linear-gradient(135deg,#EF4444,#DC2626)',   // red
  white:       '#FFFFFF',
  slate:       '#8DA5C4',
  muted:       '#4A6080',
  border:      'rgba(0,198,255,0.12)',
  borderH:     'rgba(0,198,255,0.32)',
  approved:    '#10D988',
  pending:     '#F59E0B',
  rejected:    '#EF4444',
};

// ── TABLE_TH style object ─────────────────────────────────────────────────────
export const TABLE_TH = {
  padding:        '.7rem 1.25rem',
  textAlign:      'left',
  fontSize:       '.7rem',
  fontWeight:     '700',
  color:          '#4A6080',
  textTransform:  'uppercase',
  letterSpacing:  '.06em',
  borderBottom:   'rgba(0,198,255,0.12)',
  whiteSpace:     'nowrap',
  borderBottomWidth: '1px',
  borderBottomStyle: 'solid',
  borderBottomColor: 'rgba(0,198,255,0.12)',
};

// ── Global CSS ────────────────────────────────────────────────────────────────
export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
  @keyframes fadeUp       { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn       { from{opacity:0} to{opacity:1} }
  @keyframes slideUp      { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideInRight { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:translateX(0)} }
  @keyframes shimmer      { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes spin         { to{transform:rotate(360deg)} }
  @keyframes pulse        { 0%,100%{opacity:.5} 50%{opacity:1} }
  textarea::placeholder,input::placeholder { color:#4A6080; }
  select option { background:#0F1E38; color:#FFFFFF; }
  @media(max-width:900px){
    .emp-bottom-grid  { grid-template-columns:1fr!important; }
    .admin-mid-grid   { grid-template-columns:1fr!important; }
    .form-two-col     { grid-template-columns:1fr!important; }
  }
`;

// ── Skeleton loader ───────────────────────────────────────────────────────────
export const Sk = ({ w = '100%', h = '16px', r = '6px' }) => (
  <div style={{
    width: w, height: h, borderRadius: r,
    background: `linear-gradient(90deg,#0F1E38 25%,#122040 50%,#0F1E38 75%)`,
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  }} />
);

// ── Status Badge ──────────────────────────────────────────────────────────────
export const StatusBadge = ({ status }) => {
  const map = {
    Pending:  { color: '#F59E0B', bg: 'rgba(245,158,11,.12)',  label: 'Pending'  },
    Approved: { color: '#10D988', bg: 'rgba(16,217,136,.12)',  label: 'Approved' },
    Rejected: { color: '#EF4444', bg: 'rgba(239,68,68,.12)',   label: 'Rejected' },
    pending:  { color: '#F59E0B', bg: 'rgba(245,158,11,.12)',  label: 'Pending'  },
    approved: { color: '#10D988', bg: 'rgba(16,217,136,.12)',  label: 'Approved' },
    rejected: { color: '#EF4444', bg: 'rgba(239,68,68,.12)',   label: 'Rejected' },
  };
  const s = map[status] || map.Pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '.32rem',
      background: s.bg, color: s.color,
      padding: '.23rem .7rem', borderRadius: '100px',
      fontSize: '.74rem', fontWeight: '700',
      border: `1px solid ${s.color}25`,
    }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.color, display: 'inline-block' }} />
      {s.label}
    </span>
  );
};

// ── Risk Badge ────────────────────────────────────────────────────────────────
export const RiskBadge = ({ level }) => {
  const map = {
    low:    { color: '#10D988', bg: 'rgba(16,217,136,.1)'  },
    medium: { color: '#F59E0B', bg: 'rgba(245,158,11,.1)'  },
    high:   { color: '#EF4444', bg: 'rgba(239,68,68,.1)'   },
    Low:    { color: '#10D988', bg: 'rgba(16,217,136,.1)'  },
    Medium: { color: '#F59E0B', bg: 'rgba(245,158,11,.1)'  },
    High:   { color: '#EF4444', bg: 'rgba(239,68,68,.1)'   },
  };
  const r = map[level] || map.low;
  const label = level ? level.charAt(0).toUpperCase() + level.slice(1).toLowerCase() : 'Low';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '.32rem',
      background: r.bg, color: r.color,
      padding: '.2rem .62rem', borderRadius: '100px',
      fontSize: '.72rem', fontWeight: '700',
    }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: r.color, display: 'inline-block' }} />
      {label}
    </span>
  );
};

// ── Toast notification ────────────────────────────────────────────────────────
export const Toast = ({ msg, type = 'success' }) => (
  <div style={{
    position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 2000,
    background: type === 'error' ? 'rgba(239,68,68,.15)' : 'rgba(16,217,136,.15)',
    border: `1px solid ${type === 'error' ? 'rgba(239,68,68,.35)' : 'rgba(16,217,136,.35)'}`,
    color: type === 'error' ? '#F87171' : '#10D988',
    padding: '.9rem 1.4rem', borderRadius: '12px',
    fontFamily: "'DM Sans',sans-serif", fontSize: '.88rem', fontWeight: '600',
    backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,.3)',
    animation: 'slideInRight .3s ease',
    display: 'flex', alignItems: 'center', gap: '.5rem',
    maxWidth: '360px',
  }}>
    <span style={{ fontSize: '1rem' }}>{type === 'error' ? '⚠' : '✓'}</span>
    {msg}
  </div>
);

// ── Page Header ───────────────────────────────────────────────────────────────
export const PageHeader = ({ badge = 'Employee', badgeColor = 'teal', title, sub, action }) => {
  const colorMap = {
    teal:   { color: '#00C6FF', bg: 'rgba(0,198,255,.08)',   border: 'rgba(0,198,255,.2)'   },
    cyan:   { color: '#00FFD1', bg: 'rgba(0,255,209,.08)',   border: 'rgba(0,255,209,.2)'   },
    purple: { color: '#A78BFA', bg: 'rgba(167,139,250,.08)', border: 'rgba(167,139,250,.2)' },
    amber:  { color: '#F59E0B', bg: 'rgba(245,158,11,.08)',  border: 'rgba(245,158,11,.2)'  },
  };
  const c = colorMap[badgeColor] || colorMap.teal;

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'flex-start', marginBottom: '1.75rem',
      flexWrap: 'wrap', gap: '1rem',
    }}>
      <div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '.45rem',
          background: c.bg, border: `1px solid ${c.border}`,
          color: c.color, fontSize: '.72rem', fontWeight: '600',
          letterSpacing: '.1em', textTransform: 'uppercase',
          padding: '.28rem .75rem', borderRadius: '100px', marginBottom: '.75rem',
        }}>
          <span style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background: c.color, display: 'inline-block',
            animation: 'pulse 2s infinite',
          }} />
          {badge}
        </div>
        <h1 style={{
          fontFamily: "'Syne',sans-serif", fontSize: '1.55rem',
          fontWeight: '800', letterSpacing: '-.02em', marginBottom: '.3rem',
          color: '#FFFFFF',
        }}>{title}</h1>
        {sub && <p style={{ color: '#8DA5C4', fontSize: '.9rem' }}>{sub}</p>}
      </div>
      {action && action}
    </div>
  );
};

// ── Metric Card ───────────────────────────────────────────────────────────────
export const MetricCard = ({ label, value, icon, accent, sub, loading, linkTo, linkLabel }) => (
  <div style={{
    background: '#0F1E38', border: '1px solid rgba(0,198,255,0.12)',
    borderRadius: '16px', padding: '1.5rem',
    position: 'relative', overflow: 'hidden',
    transition: 'transform .3s,box-shadow .3s,border-color .3s',
  }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,198,255,.12)';
      e.currentTarget.style.borderColor = 'rgba(0,198,255,.28)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.borderColor = 'rgba(0,198,255,.12)';
    }}
  >
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: accent, borderRadius: '16px 16px 0 0' }} />
    <div style={{ position: 'absolute', top: '-30px', right: '-20px', width: '110px', height: '110px', borderRadius: '50%', background: accent, opacity: .04, filter: 'blur(20px)' }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px',
        background: 'rgba(0,198,255,.08)', border: '1px solid rgba(0,198,255,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
      }}>{icon}</div>
    </div>
    {loading
      ? <div style={{ width: '55%', height: '2rem', borderRadius: '8px', background: 'linear-gradient(90deg,#0F1E38 25%,#122040 50%,#0F1E38 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
      : <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '2.2rem', fontWeight: '800', lineHeight: 1, marginBottom: '.3rem', color: '#FFFFFF' }}>
          {value}
        </div>
    }
    <p style={{ color: '#8DA5C4', fontSize: '.82rem', fontWeight: '500', marginTop: '.3rem' }}>{label}</p>
    {sub && <p style={{ color: '#4A6080', fontSize: '.74rem', marginTop: '.2rem' }}>{sub}</p>}
  </div>
);