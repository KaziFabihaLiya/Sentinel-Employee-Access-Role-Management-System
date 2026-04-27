// client/src/App.jsx
import { Routes, Route, Navigate } from 'react-router';
import PublicLayout    from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute  from './routes/ProtectedRoute';

// ── Public pages ──────────────────────────────────────────────────────────────
import LandingPage  from './pages/LandingPage';
import LoginPage    from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// ── Dashboard router (role-switcher) ─────────────────────────────────────────
import DashboardHome from './pages/DashboardHome';

// ── Employee pages ────────────────────────────────────────────────────────────
import SubmitRequestPage  from './pages/employee/SubmitRequestPage';
import MyRequestsPage     from './pages/employee/MyRequestsPage';
import RequestHistoryPage from './pages/employee/RequestHistoryPage';
import ProfilePage        from './pages/employee/ProfilePage';

// ── Manager pages ─────────────────────────────────────────────────────────────
import ReviewRequestsPage  from './pages/manager/ReviewRequestsPage';
import TeamRequestsPage    from './pages/manager/TeamRequestsPage';
import ApprovalHistoryPage from './pages/manager/ApprovalHistoryPage';

// ── Admin pages ───────────────────────────────────────────────────────────────
import ManageRolesPage  from './pages/admin/ManageRolesPage';
import ManageUsersPage  from './pages/admin/ManageUsersPage';
import AuditLogsPage    from './pages/admin/AuditLogsPage';
import AnalyticsPage    from './pages/admin/AnalyticsPage';
import RevokeAccessPage from './pages/admin/RevokeAccessPage';

// ── Shared placeholder (for pages not yet built) ──────────────────────────────
const Soon = ({ title }) => (
  <div style={{
    minHeight: '60vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', textAlign: 'center',
    fontFamily: "'DM Sans',sans-serif",
  }}>
    <div style={{
      width: '60px', height: '60px', borderRadius: '16px',
      background: 'linear-gradient(135deg,#00C6FF,#00FFD1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '1.4rem', marginBottom: '1.25rem',
      boxShadow: '0 0 28px rgba(0,198,255,.35)',
    }}>🔧</div>
    <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:'800', fontSize:'1.3rem', color:'#FFFFFF', marginBottom:'.4rem' }}>{title}</h2>
    <p style={{ color: '#8DA5C4', fontSize: '.9rem' }}>This page is under construction — coming soon.</p>
  </div>
);

// ── Static public pages ───────────────────────────────────────────────────────
const T = { surface:'#0F1E38', border:'rgba(0,198,255,0.12)', teal:'#00C6FF', slate:'#8DA5C4', gradient:'linear-gradient(135deg,#00C6FF,#00FFD1)', navy:'#050D1F' };

const AboutPage = () => (
  <div style={{ maxWidth:'780px', margin:'0 auto', padding:'6rem 2rem', fontFamily:"'DM Sans',sans-serif" }}>
    <div style={{ display:'inline-flex',alignItems:'center',gap:'.5rem',background:'rgba(0,198,255,.08)',border:`1px solid ${T.border}`,color:T.teal,fontSize:'.72rem',fontWeight:'600',letterSpacing:'.1em',textTransform:'uppercase',padding:'.3rem .8rem',borderRadius:'100px',marginBottom:'1.5rem' }}>About Sentinel</div>
    <h1 style={{ fontFamily:"'Syne',sans-serif",fontSize:'2.4rem',fontWeight:'800',letterSpacing:'-.03em',lineHeight:1.15,marginBottom:'1.25rem',color:'#FFFFFF' }}>
      Guard Every Gateway.<br/>
      <span style={{ background:T.gradient,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>Grant with Confidence.</span>
    </h1>
    <p style={{ color:T.slate,lineHeight:1.8,fontSize:'1rem',marginBottom:'2rem' }}>
      Sentinel is an enterprise ERP access management platform built to replace manual, error-prone workflows with an automated, AI-powered system.
    </p>
    {[
      { icon:'🔐', title:'Zero-Trust Security',  desc:'Every grant is logged, reviewed, and reversible. JWT sessions, bcrypt hashing, HTTPS-only.' },
      { icon:'🤖', title:'AI Role Suggestion',   desc:'The engine recommends ERP roles based on your department, job title, and peer patterns.' },
      { icon:'⚡', title:'Auto Escalation',      desc:'Requests idle for 48h auto-escalate to higher authority — nothing falls through the cracks.' },
    ].map(f => (
      <div key={f.title} style={{ display:'flex',gap:'1rem',padding:'1.25rem',background:T.surface,border:`1px solid ${T.border}`,borderRadius:'14px',marginBottom:'1rem' }}>
        <div style={{ width:'44px',height:'44px',minWidth:'44px',borderRadius:'12px',background:'rgba(0,198,255,.1)',border:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem' }}>{f.icon}</div>
        <div>
          <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:'700',marginBottom:'.3rem',color:'#FFFFFF' }}>{f.title}</div>
          <div style={{ color:T.slate,fontSize:'.88rem',lineHeight:1.6 }}>{f.desc}</div>
        </div>
      </div>
    ))}
  </div>
);

const SupportPage = () => (
  <div style={{ maxWidth:'680px', margin:'0 auto', padding:'6rem 2rem', fontFamily:"'DM Sans',sans-serif" }}>
    <div style={{ display:'inline-flex',alignItems:'center',gap:'.5rem',background:'rgba(0,198,255,.08)',border:`1px solid ${T.border}`,color:T.teal,fontSize:'.72rem',fontWeight:'600',letterSpacing:'.1em',textTransform:'uppercase',padding:'.3rem .8rem',borderRadius:'100px',marginBottom:'1.5rem' }}>Support</div>
    <h1 style={{ fontFamily:"'Syne',sans-serif",fontSize:'2.2rem',fontWeight:'800',letterSpacing:'-.03em',marginBottom:'1rem',color:'#FFFFFF' }}>How can we help?</h1>
    <p style={{ color:T.slate,lineHeight:1.75,marginBottom:'2rem' }}>Reach out to the Sentinel team for technical support or onboarding assistance.</p>
    {[
      { icon:'📧', label:'Email',         value:'support@sentinel.io' },
      { icon:'📖', label:'Documentation', value:'docs.sentinel.io'    },
      { icon:'🐛', label:'Report a Bug',  value:'github.com/sentinel' },
    ].map(item => (
      <div key={item.label} style={{ display:'flex',alignItems:'center',gap:'1rem',padding:'1.1rem 1.25rem',background:T.surface,border:`1px solid ${T.border}`,borderRadius:'12px',marginBottom:'.75rem' }}>
        <span style={{ fontSize:'1.2rem' }}>{item.icon}</span>
        <div>
          <div style={{ fontSize:'.78rem',color:'#4A6080',marginBottom:'.1rem' }}>{item.label}</div>
          <div style={{ color:T.teal,fontWeight:'600',fontSize:'.9rem' }}>{item.value}</div>
        </div>
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────────────────────────────────────
const App = () => (
  <Routes>

    {/* ── PUBLIC ─────────────────────────────────────────────────────────────── */}
    <Route element={<PublicLayout />}>
      <Route path="/"         element={<LandingPage />} />
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/about"    element={<AboutPage />} />
      <Route path="/support"  element={<SupportPage />} />
    </Route>

    {/* ── PROTECTED DASHBOARD ────────────────────────────────────────────────── */}
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }
    >
      {/* Home — renders Employee/Manager/Admin based on role */}
      <Route index element={<DashboardHome />} />

      {/* ── Employee routes ─────────────────────────────── */}
      <Route path="submit-request" element={
        <ProtectedRoute allowedRoles={['employee']}>
          <SubmitRequestPage />
        </ProtectedRoute>
      }/>
      <Route path="my-requests" element={
        <ProtectedRoute allowedRoles={['employee']}>
          <MyRequestsPage />
        </ProtectedRoute>
      }/>
      <Route path="history" element={
        <ProtectedRoute allowedRoles={['employee']}>
          <RequestHistoryPage />
        </ProtectedRoute>
      }/>
      <Route path="profile" element={<ProfilePage />} />

      {/* ── Manager routes ──────────────────────────────── */}
      <Route path="review-requests" element={
        <ProtectedRoute allowedRoles={['manager']}>
          <ReviewRequestsPage />
        </ProtectedRoute>
      }/>
      <Route path="team-requests" element={
        <ProtectedRoute allowedRoles={['manager']}>
          <TeamRequestsPage />
        </ProtectedRoute>
      }/>
      <Route path="approval-history" element={
        <ProtectedRoute allowedRoles={['manager']}>
          <ApprovalHistoryPage />
        </ProtectedRoute>
      }/>

      {/* ── Admin routes ────────────────────────────────── */}
      <Route path="manage-roles" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <ManageRolesPage />
        </ProtectedRoute>
      }/>
      <Route path="manage-users" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <ManageUsersPage />
        </ProtectedRoute>
      }/>
      <Route path="audit-logs" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AuditLogsPage />
        </ProtectedRoute>
      }/>
      <Route path="analytics" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AnalyticsPage />
        </ProtectedRoute>
      }/>
      <Route path="revoke-access" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <RevokeAccessPage />
        </ProtectedRoute>
      }/>

      {/* Catch-all inside dashboard */}
      <Route path="*" element={<Soon title="Page not found" />} />
    </Route>

    {/* Global catch-all */}
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);

export default App;