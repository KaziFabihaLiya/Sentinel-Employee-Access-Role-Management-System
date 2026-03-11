import { COLORS, SHADOWS, RADIUS } from '../styles/tokens';

const MetricCard = ({ label, value, icon, accentColor, loading }) => {
  return (
    <div style={{
      background: COLORS.surface,
      borderRadius: RADIUS.md,
      boxShadow: SHADOWS.card,
      padding: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      transition: 'box-shadow 0.2s, transform 0.2s',
      cursor: 'default',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.boxShadow = SHADOWS.hover;
      e.currentTarget.style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.boxShadow = SHADOWS.card;
      e.currentTarget.style.transform = 'translateY(0)';
    }}
    >
      {/* Icon circle */}
      <div style={{
        width: '52px',
        height: '52px',
        borderRadius: '50%',
        background: accentColor || COLORS.gradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.4rem',
        flexShrink: 0,
      }}>
        {icon}
      </div>

      {/* Text */}
      <div>
        <p style={{ fontSize: '0.8rem', color: COLORS.textSecondary, marginBottom: '0.2rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </p>
        <p style={{ fontSize: '1.8rem', fontWeight: '700', color: COLORS.textPrimary, lineHeight: 1 }}>
          {loading ? '—' : value}
        </p>
      </div>
    </div>
  );
};

export default MetricCard;