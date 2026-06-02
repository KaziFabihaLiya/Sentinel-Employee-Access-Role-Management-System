//                      
// Sentinel Design Tokens  |  Replace the old purple tokens.jsx with this file
// client/src/styles/tokens.jsx
//                      

export const COLORS = {
  //    Brand gradient (replaces old purple #667eea → #764ba2)               
  gradient:      'linear-gradient(135deg,#00C6FF 0%,#00FFD1 100%)',
  gradientR:     'linear-gradient(135deg,#00FFD1 0%,#00C6FF 100%)',
  gradientHover: 'linear-gradient(135deg,#00b0e0 0%,#00e8bc 100%)',

  //    Primary accent                                                         
  primary:       '#00C6FF',
  primaryDark:   '#0099CC',
  secondary:     '#00FFD1',

  //    Backgrounds  ─
  background:    '#050D1F',   // main page bg
  navyMid:       '#0B1730',   // slightly lighter navy (sidebar, panels)
  surface:       '#0F1E38',   // card / panel surface
  surfaceAlt:    '#122040',   // hover / focus surface

  //    Text          
  textPrimary:   '#FFFFFF',
  textSecondary: '#8DA5C4',
  textMuted:     '#4A6080',

  //    Borders      ─
  border:        'rgba(0,198,255,0.12)',
  borderHover:   'rgba(0,198,255,0.32)',

  //    Status colours                                                         
  // Used by StatusBadge, MetricCard, table rows
  pending:  { bg:'rgba(245,158,11,0.12)', text:'#F59E0B', dot:'#F59E0B', border:'rgba(245,158,11,0.25)' },
  approved: { bg:'rgba(16,217,136,0.12)', text:'#10D988', dot:'#10D988', border:'rgba(16,217,136,0.25)' },
  rejected: { bg:'rgba(239,68,68,0.12)',  text:'#EF4444', dot:'#EF4444', border:'rgba(239,68,68,0.25)'  },
  highRisk: { bg:'rgba(167,139,250,0.12)',text:'#A78BFA', dot:'#A78BFA', border:'rgba(167,139,250,0.25)'},

  //    Metric card accent gradients                                           
  metricDefault:  'linear-gradient(135deg,#00C6FF 0%,#00FFD1 100%)',
  metricPending:  'linear-gradient(135deg,#F59E0B,#D97706)',
  metricApproved: 'linear-gradient(135deg,#10D988,#059669)',
  metricRejected: 'linear-gradient(135deg,#EF4444,#DC2626)',
  metricPurple:   'linear-gradient(135deg,#A78BFA,#7C3AED)',
};

export const SHADOWS = {
  card:  '0 8px 40px rgba(0,198,255,0.08)',
  hover: '0 16px 60px rgba(0,198,255,0.20)',
  nav:   '0 4px 24px rgba(0,0,0,0.40)',
  glow:  '0 0 30px rgba(0,198,255,0.25)',
};

export const RADIUS = {
  sm: '8px',
  md: '14px',
  lg: '20px',
  xl: '28px',
};

export const FONTS = {
  heading: "'Syne', sans-serif",
  body:    "'DM Sans', sans-serif",
};