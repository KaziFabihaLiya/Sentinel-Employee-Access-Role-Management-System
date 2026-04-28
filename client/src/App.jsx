// client/src/App.jsx
import { Routes, Route, Navigate } from 'react-router';
import PublicLayout    from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute  from './routes/ProtectedRoute';

import LandingPage  from './pages/LandingPage';
import LoginPage    from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardHome from './pages/DashboardHome';

// ProfilePage lives in shared — used by ALL roles
import ProfilePage from './pages/shared/ProfilePage';

// Employee
import SubmitRequestPage  from './pages/employee/SubmitRequestPage';
import MyRequestsPage     from './pages/employee/MyRequestsPage';
import RequestHistoryPage from './pages/employee/RequestHistoryPage';

// Manager
import ReviewRequestsPage  from './pages/manager/ReviewRequestsPage';
import TeamRequestsPage    from './pages/manager/TeamRequestsPage';
import ApprovalHistoryPage from './pages/manager/ApprovalHistoryPage';

// Admin
import ManageRolesPage  from './pages/admin/ManageRolesPage';
import ManageUsersPage  from './pages/admin/ManageUsersPage';
import AuditLogsPage    from './pages/admin/AuditLogsPage';
import AnalyticsPage    from './pages/admin/AnalyticsPage';
import RevokeAccessPage from './pages/admin/RevokeAccessPage';

// Static public pages
const Tc = {
  surface:'#0F1E38', border:'rgba(0,198,255,0.12)',
  teal:'#00C6FF', slate:'#8DA5C4', muted:'#4A6080',
  gradient:'linear-gradient(135deg,#00C6FF 0%,#00FFD1 100%)',
};
const AboutPage = () => (
  <div style={{ maxWidth:'780px',margin:'0 auto',padding:'6rem 2rem',fontFamily:"'DM Sans',sans-serif" }}>
    <div style={{ display:'inline-flex',alignItems:'center',gap:'.5rem',background:'rgba(0,198,255,.08)',border:`1px solid ${Tc.border}`,color:Tc.teal,fontSize:'.72rem',fontWeight:'600',letterSpacing:'.1em',textTransform:'uppercase',padding:'.3rem .8rem',borderRadius:'100px',marginBottom:'1.5rem' }}>About Sentinel</div>
    <h1 style={{ fontFamily:"'Syne',sans-serif",fontSize:'2.4rem',fontWeight:'800',letterSpacing:'-.03em',lineHeight:1.15,marginBottom:'1.25rem',color:'#FFF' }}>Guard Every Gateway.<br/><span style={{ background:Tc.gradient,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>Grant with Confidence.</span></h1>
    <p style={{ color:Tc.slate,lineHeight:1.8,fontSize:'1rem',marginBottom:'2rem' }}>Sentinel is an enterprise ERP access management platform built to replace manual workflows with an automated, AI-powered system.</p>
    {[{icon:'🔐',title:'Zero-Trust Security',desc:'JWT sessions, bcrypt hashing, HTTPS-only. Every grant logged and reversible.'},{icon:'🤖',title:'AI Role Suggestion',desc:'Recommends ERP roles based on department, job title, and peer patterns.'},{icon:'⚡',title:'Auto Escalation',desc:'Requests idle 48h auto-escalate — nothing falls through the cracks.'}].map(f=>(
      <div key={f.title} style={{ display:'flex',gap:'1rem',padding:'1.25rem',background:Tc.surface,border:`1px solid ${Tc.border}`,borderRadius:'14px',marginBottom:'1rem' }}>
        <div style={{ width:'44px',height:'44px',minWidth:'44px',borderRadius:'12px',background:'rgba(0,198,255,.1)',border:`1px solid ${Tc.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem' }}>{f.icon}</div>
        <div><div style={{ fontFamily:"'Syne',sans-serif",fontWeight:'700',marginBottom:'.3rem',color:'#FFF' }}>{f.title}</div><div style={{ color:Tc.slate,fontSize:'.88rem',lineHeight:1.6 }}>{f.desc}</div></div>
      </div>
    ))}
  </div>
);
const SupportPage = () => (
  <div style={{ maxWidth:'680px',margin:'0 auto',padding:'6rem 2rem',fontFamily:"'DM Sans',sans-serif" }}>
    <div style={{ display:'inline-flex',alignItems:'center',gap:'.5rem',background:'rgba(0,198,255,.08)',border:`1px solid ${Tc.border}`,color:Tc.teal,fontSize:'.72rem',fontWeight:'600',letterSpacing:'.1em',textTransform:'uppercase',padding:'.3rem .8rem',borderRadius:'100px',marginBottom:'1.5rem' }}>Support</div>
    <h1 style={{ fontFamily:"'Syne',sans-serif",fontSize:'2.2rem',fontWeight:'800',letterSpacing:'-.03em',marginBottom:'1rem',color:'#FFF' }}>How can we help?</h1>
    <p style={{ color:Tc.slate,lineHeight:1.75,marginBottom:'2rem' }}>Reach out for technical support or onboarding assistance.</p>
    {[{icon:'📧',label:'Email',value:'support@earms.io'},{icon:'📖',label:'Documentation',value:'docs.earms.io'},{icon:'🐛',label:'Report a Bug',value:'github.com/earms'}].map(item=>(
      <div key={item.label} style={{ display:'flex',alignItems:'center',gap:'1rem',padding:'1.1rem 1.25rem',background:Tc.surface,border:`1px solid ${Tc.border}`,borderRadius:'12px',marginBottom:'.75rem' }}>
        <span style={{ fontSize:'1.2rem' }}>{item.icon}</span>
        <div><div style={{ fontSize:'.78rem',color:Tc.muted,marginBottom:'.1rem' }}>{item.label}</div><div style={{ color:Tc.teal,fontWeight:'600',fontSize:'.9rem' }}>{item.value}</div></div>
      </div>
    ))}
  </div>
);

const App = () => (
  <Routes>
    {/* PUBLIC */}
    <Route element={<PublicLayout />}>
      <Route path="/"         element={<LandingPage />} />
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/about"    element={<AboutPage />} />
      <Route path="/support"  element={<SupportPage />} />
    </Route>

    {/* PROTECTED DASHBOARD */}
    <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
      <Route index element={<DashboardHome />} />

      {/* Shared - all roles */}
      <Route path="profile" element={<ProfilePage />} />

      {/* Employee */}
      <Route path="submit-request" element={<ProtectedRoute allowedRoles={['employee']}><SubmitRequestPage /></ProtectedRoute>} />
      <Route path="my-requests"    element={<ProtectedRoute allowedRoles={['employee']}><MyRequestsPage /></ProtectedRoute>} />
      <Route path="history"        element={<ProtectedRoute allowedRoles={['employee']}><RequestHistoryPage /></ProtectedRoute>} />

      {/* Manager */}
      <Route path="review-requests"  element={<ProtectedRoute allowedRoles={['manager']}><ReviewRequestsPage /></ProtectedRoute>} />
      <Route path="team-requests"    element={<ProtectedRoute allowedRoles={['manager']}><TeamRequestsPage /></ProtectedRoute>} />
      <Route path="approval-history" element={<ProtectedRoute allowedRoles={['manager']}><ApprovalHistoryPage /></ProtectedRoute>} />

      {/* Admin */}
      <Route path="manage-roles"  element={<ProtectedRoute allowedRoles={['admin']}><ManageRolesPage /></ProtectedRoute>} />
      <Route path="manage-users"  element={<ProtectedRoute allowedRoles={['admin']}><ManageUsersPage /></ProtectedRoute>} />
      <Route path="audit-logs"    element={<ProtectedRoute allowedRoles={['admin']}><AuditLogsPage /></ProtectedRoute>} />
      <Route path="analytics"     element={<ProtectedRoute allowedRoles={['admin']}><AnalyticsPage /></ProtectedRoute>} />
      <Route path="revoke-access" element={<ProtectedRoute allowedRoles={['admin']}><RevokeAccessPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Route>

    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);

export default App;