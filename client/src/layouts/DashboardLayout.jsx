import { Outlet, NavLink, useNavigate } from 'react-router';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SHADOWS } from '../styles/tokens';

const SIDEBAR_LINKS = {
  employee: [
    { label: 'Home',           path: '/dashboard',                icon: '⊞' },
    { label: 'Submit Request', path: '/dashboard/submit-request', icon: '✦' },
    { label: 'My Requests',    path: '/dashboard/my-requests',    icon: '◧' },
    { label: 'Request History',path: '/dashboard/history',        icon: '◷' },
    { label: 'Profile',        path: '/dashboard/profile',        icon: '◉' },
  ],
  manager: [
    { label: 'Home',             path: '/dashboard',                    icon: '⊞' },
    { label: 'Review Requests',  path: '/dashboard/review-requests',    icon: '✦' },
    { label: 'Team Requests',    path: '/dashboard/team-requests',      icon: '◧' },
    { label: 'Approval History', path: '/dashboard/approval-history',   icon: '◷' },
    { label: 'Profile',          path: '/dashboard/profile',            icon: '◉' },
  ],
  admin: [
    { label: 'Admin Home',     path: '/dashboard',                  icon: '⊞' },
    { label: 'Manage Roles',   path: '/dashboard/manage-roles',     icon: '✦' },
    { label: 'Manage Users',   path: '/dashboard/manage-users',     icon: '◧' },
    { label: 'Audit Logs',     path: '/dashboard/audit-logs',       icon: '◷' },
    { label: 'Analytics',      path: '/dashboard/analytics',        icon: '◈' },
    { label: 'Revoke Access',  path: '/dashboard/revoke-access',    icon: '⊗' },
  ],
};

// Role labels shown in the sidebar header
const ROLE_LABELS = {
  employee: 'Employee Portal',
  manager:  'Manager Portal',
  admin:    'Admin Portal',
};

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);

  const links = SIDEBAR_LINKS[user?.role] || [];
  const roleLabel = ROLE_LABELS[user?.role] || '';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: "'Poppins', sans-serif" }}>

      {/* ── TOP NAVIGATION BAR ────────────────────────────── */}
      <header style={{
        background: COLORS.gradient,
        padding: '0 1.75rem',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: SHADOWS.nav,
        position: 'sticky',
        top: 0,
        zIndex: 200,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.3rem' }}>🔐</span>
          <span style={{ color: 'white', fontWeight: '700', fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
            AccessManager
          </span>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                width: '36px', height: '36px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: '1.05rem', color: 'white',
              }}
            >
              🔔
            </button>
            {/* Notification dot */}
            <span style={{
              position: 'absolute', top: '6px', right: '6px',
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#F59E0B', border: '2px solid transparent',
            }} />
          </div>

          {/* User info pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px', padding: '0.35rem 0.75rem',
          }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: '700', color: 'white',
            }}>
              {user?.fullName?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p style={{ color: 'white', fontSize: '0.82rem', fontWeight: '600', lineHeight: 1.2 }}>
                {user?.fullName}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem', lineHeight: 1, textTransform: 'capitalize' }}>
                {user?.role}
              </p>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              padding: '0.4rem 0.9rem',
              color: 'white', fontSize: '0.82rem', fontWeight: '500',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── BODY ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1 }}>

        {/* ── SIDEBAR ───────────────────────────────────── */}
        <aside style={{
          width: '240px',
          background: COLORS.surface,
          borderRight: `1px solid ${COLORS.border}`,
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}>
          {/* Sidebar portal label */}
          <div style={{
            padding: '1.25rem 1.5rem 0.75rem',
            borderBottom: `1px solid ${COLORS.border}`,
          }}>
            <p style={{
              fontSize: '0.7rem', fontWeight: '600', color: COLORS.textMuted,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {roleLabel}
            </p>
          </div>

          {/* Navigation links */}
          <nav style={{ padding: '0.75rem 0', flex: 1 }}>
            {links.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.path === '/dashboard'}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.6rem 1.25rem',
                  margin: '0.1rem 0.75rem',
                  borderRadius: '8px',
                  color: isActive ? COLORS.primary : COLORS.textSecondary,
                  fontWeight: isActive ? '600' : '400',
                  fontSize: '0.88rem',
                  background: isActive ? `rgba(102,126,234,0.08)` : 'transparent',
                  borderLeft: isActive ? `3px solid ${COLORS.primary}` : '3px solid transparent',
                  transition: 'all 0.15s',
                })}
                onMouseEnter={e => {
                  if (!e.currentTarget.style.background.includes('0.08')) {
                    e.currentTarget.style.background = 'rgba(102,126,234,0.04)';
                  }
                }}
                onMouseLeave={e => {
                  if (!e.currentTarget.style.background.includes('0.08')) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: '1rem', opacity: 0.8 }}>{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Sidebar footer info */}
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: `1px solid ${COLORS.border}`,
            fontSize: '0.75rem', color: COLORS.textMuted,
          }}>
            <p>{user?.department}</p>
            <p>{user?.jobTitle}</p>
          </div>
        </aside>

        {/* ── MAIN CONTENT AREA ─────────────────────────── */}
        <main style={{
          flex: 1,
          background: COLORS.background,
          padding: '2rem',
          minWidth: 0, // prevents flex overflow
        }}>
          <Outlet />
        </main>
      </div>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer style={{
        background: COLORS.surface,
        borderTop: `1px solid ${COLORS.border}`,
        padding: '0.75rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.78rem',
        color: COLORS.textMuted,
      }}>
        <span>© 2025 AccessManager — ERP Access Control</span>
        <div style={{ display: 'flex', gap: '1.25rem' }}>
          <a href="/support" style={{ color: COLORS.textMuted }}>Support</a>
          <a href="/about"   style={{ color: COLORS.textMuted }}>About</a>
        </div>
      </footer>
    </div>
  );
};

export default DashboardLayout;