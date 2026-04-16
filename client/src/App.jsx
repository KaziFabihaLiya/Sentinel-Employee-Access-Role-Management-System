import { Routes, Route, Navigate } from 'react-router';
import PublicLayout    from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute  from './routes/ProtectedRoute';

// Public pages
import LandingPage  from './pages/LandingPage';
import LoginPage    from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Dashboard home (role-router)
import DashboardHome from './pages/DashboardHome';

const App = () => {
  return (
    <Routes>

      {/* ── PUBLIC ROUTES ──────────────────────────────────── */}
      <Route element={<PublicLayout />}>
        {/* BUG FIX: "/" was Navigate to /login — now shows the Landing Page */}
        <Route path="/"         element={<LandingPage />} />
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/about"    element={<AboutPage />} />
        <Route path="/support"  element={<SupportPage />} />
      </Route>

      {/* ── PROTECTED DASHBOARD ROUTES ─────────────────────── */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Role-based home — DashboardHome renders Employee/Manager/Admin home */}
        <Route index element={<DashboardHome />} />

        {/* Employee */}
        <Route path="submit-request" element={<PlaceholderPage title="Submit Request" />} />
        <Route path="my-requests"    element={<PlaceholderPage title="My Requests" />} />
        <Route path="history"        element={<PlaceholderPage title="Request History" />} />
        <Route path="profile"        element={<PlaceholderPage title="Profile" />} />

        {/* Manager */}
        <Route path="review-requests"  element={<PlaceholderPage title="Review Requests" />} />
        <Route path="team-requests"    element={<PlaceholderPage title="Team Requests" />} />
        <Route path="approval-history" element={<PlaceholderPage title="Approval History" />} />

        {/* Admin */}
        <Route path="manage-roles"  element={<PlaceholderPage title="Manage Roles" />} />
        <Route path="manage-users"  element={<PlaceholderPage title="Manage Users" />} />
        <Route path="audit-logs"    element={<PlaceholderPage title="Audit Logs" />} />
        <Route path="analytics"     element={<PlaceholderPage title="Analytics" />} />
        <Route path="revoke-access" element={<PlaceholderPage title="Revoke Access" />} />

        {/* Catch-all */}
        <Route path="*" element={<PlaceholderPage title="Page not found" />} />
      </Route>

      {/* Any unknown route → login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

// ── Placeholder for pages not yet built ───────────────────────────────────
const PlaceholderPage = ({ title }) => (
  <div style={{
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    minHeight: '60vh', textAlign: 'center',
    fontFamily: "'DM Sans', sans-serif",
  }}>
    <div style={{
      width: '64px', height: '64px', borderRadius: '18px',
      background: 'linear-gradient(135deg,#00C6FF,#00FFD1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '1.6rem', marginBottom: '1.25rem',
      boxShadow: '0 0 30px rgba(0,198,255,.35)',
    }}>🔧</div>
    <h2 style={{
      fontFamily: "'Syne', sans-serif", fontWeight: '800',
      fontSize: '1.4rem', color: '#FFFFFF', marginBottom: '.5rem',
    }}>{title}</h2>
    <p style={{ color: '#8DA5C4', fontSize: '.9rem' }}>
      This page is under construction — coming soon.
    </p>
  </div>
);

// ── About / Support static pages ──────────────────────────────────────────
const T = {
  navy: '#050D1F', surface: '#0F1E38', teal: '#00C6FF',
  slate: '#8DA5C4', muted: '#4A6080', border: 'rgba(0,198,255,0.12)',
  gradient: 'linear-gradient(135deg,#00C6FF 0%,#00FFD1 100%)',
};

const AboutPage = () => (
  <div style={{ maxWidth: '800px', margin: '0 auto', padding: '6rem 2rem' }}>
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '.5rem',
      background: 'rgba(0,198,255,.08)', border: `1px solid ${T.border}`,
      color: T.teal, fontSize: '.72rem', fontWeight: '600', letterSpacing: '.1em',
      textTransform: 'uppercase', padding: '.3rem .8rem', borderRadius: '100px',
      marginBottom: '1.5rem',
    }}>About Sentinel</div>
    <h1 style={{
      fontFamily: "'Syne', sans-serif", fontSize: '2.5rem', fontWeight: '800',
      letterSpacing: '-.03em', lineHeight: 1.15, marginBottom: '1.25rem',
    }}>
      Guard Every Gateway.<br />
      <span style={{
        background: T.gradient, WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent', backgroundClip: 'text',
      }}>Grant with Confidence.</span>
    </h1>
    <p style={{ color: T.slate, lineHeight: 1.8, fontSize: '1rem', marginBottom: '1.5rem' }}>
      Sentinel is an enterprise ERP access management platform built to replace
      manual, error-prone workflows with an automated, AI-powered system. Employees
      request access, managers approve with full context, and admins govern with
      complete audit visibility.
    </p>
    {[
      { icon: '🔐', title: 'Zero-Trust Security', desc: 'Every access grant is logged, reviewed, and reversible. JWT-based sessions, bcrypt password hashing, and HTTPS-only communication.' },
      { icon: '🤖', title: 'AI Role Suggestion', desc: 'The AI engine recommends ERP roles based on department, job title, and peer patterns — reducing manual selection errors.' },
      { icon: '⚡', title: 'Auto Escalation', desc: 'Requests idle for 48+ hours auto-escalate to higher authority, ensuring nothing falls through the cracks.' },
    ].map(f => (
      <div key={f.title} style={{
        display: 'flex', gap: '1rem', padding: '1.25rem',
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: '14px', marginBottom: '1rem',
      }}>
        <div style={{
          width: '44px', height: '44px', minWidth: '44px', borderRadius: '12px',
          background: 'rgba(0,198,255,.1)', border: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
        }}>{f.icon}</div>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: '700', marginBottom: '.3rem' }}>{f.title}</div>
          <div style={{ color: T.slate, fontSize: '.88rem', lineHeight: 1.6 }}>{f.desc}</div>
        </div>
      </div>
    ))}
  </div>
);

const SupportPage = () => (
  <div style={{ maxWidth: '700px', margin: '0 auto', padding: '6rem 2rem' }}>
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '.5rem',
      background: 'rgba(0,198,255,.08)', border: `1px solid ${T.border}`,
      color: T.teal, fontSize: '.72rem', fontWeight: '600', letterSpacing: '.1em',
      textTransform: 'uppercase', padding: '.3rem .8rem', borderRadius: '100px',
      marginBottom: '1.5rem',
    }}>Support</div>
    <h1 style={{
      fontFamily: "'Syne', sans-serif", fontSize: '2.2rem', fontWeight: '800',
      letterSpacing: '-.03em', marginBottom: '1rem',
    }}>How can we help?</h1>
    <p style={{ color: T.slate, lineHeight: 1.75, marginBottom: '2rem' }}>
      Reach out to the Sentinel team for technical support, onboarding assistance,
      or compliance questions.
    </p>
    {[
      { icon: '📧', label: 'Email Support',    value: 'support@sentinel.io'   },
      { icon: '📖', label: 'Documentation',    value: 'docs.sentinel.io'       },
      { icon: '🐛', label: 'Report a Bug',     value: 'github.com/sentinel'   },
    ].map(item => (
      <div key={item.label} style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
        padding: '1.1rem 1.25rem',
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: '12px', marginBottom: '.75rem',
      }}>
        <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
        <div>
          <div style={{ fontSize: '.78rem', color: T.muted, marginBottom: '.1rem' }}>{item.label}</div>
          <div style={{ color: T.teal, fontWeight: '600', fontSize: '.9rem' }}>{item.value}</div>
        </div>
      </div>
    ))}
  </div>
);

export default App;