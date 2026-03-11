import { COLORS } from '../styles/tokens';

const StatusBadge = ({ status }) => {
  const map = {
    Pending:  COLORS.pending,
    Approved: COLORS.approved,
    Rejected: COLORS.rejected,
  };
  const style = map[status] || COLORS.pending;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      padding: '0.25rem 0.75rem',
      borderRadius: '999px',
      fontSize: '0.78rem',
      fontWeight: '600',
      background: style.bg,
      color: style.text,
    }}>
      <span style={{
        width: '6px', height: '6px',
        borderRadius: '50%',
        background: style.dot,
        display: 'inline-block',
      }} />
      {status}
    </span>
  );
};

export default StatusBadge;