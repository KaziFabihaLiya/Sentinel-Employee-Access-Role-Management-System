import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#050D1F',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif",
        gap: '1.25rem',
      }}>
        {/* Sentinel logo */}
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          background: 'linear-gradient(135deg,#00C6FF 0%,#00FFD1 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Syne', sans-serif", fontWeight: '800',
          color: '#050D1F', fontSize: '1.5rem',
          boxShadow: '0 0 30px rgba(0,198,255,.4)',
          animation: 'sentinelPulse 2s ease-in-out infinite',
        }}>S</div>

        {/* Spinner */}
        <div style={{
          width: '28px', height: '28px',
          border: '2.5px solid rgba(0,198,255,.2)',
          borderTopColor: '#00C6FF',
          borderRadius: '50%',
          animation: 'sentinelSpin 0.8s linear infinite',
        }}/>

        <p style={{ color: '#8DA5C4', fontSize: '.85rem', letterSpacing: '.04em' }}>
          Verifying access…
        </p>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400&display=swap');
          @keyframes sentinelSpin  { to { transform: rotate(360deg); } }
          @keyframes sentinelPulse { 0%,100%{box-shadow:0 0 20px rgba(0,198,255,.3);} 50%{box-shadow:0 0 40px rgba(0,198,255,.6);} }
        `}</style>
      </div>
    );
  }

  // Not logged in → login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Wrong role → back to their dashboard root
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;