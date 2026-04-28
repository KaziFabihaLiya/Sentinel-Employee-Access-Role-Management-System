import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import axiosInstance from '../../api/axiosInstance';

//    Design tokens (inline for portability)                                 
const T = {
  navy:        '#050D1F',
  navyMid:     '#0B1730',
  surface:     '#0F1E38',
  surfaceAlt:  '#122040',
  teal:        '#00C6FF',
  cyan:        '#00FFD1',
  purple:      '#A78BFA',
  gradient:    'linear-gradient(135deg,#00C6FF 0%,#00FFD1 100%)',
  white:       '#FFFFFF',
  slate:       '#8DA5C4',
  muted:       '#4A6080',
  border:      'rgba(0,198,255,0.12)',
  borderH:     'rgba(0,198,255,0.32)',
  pending:     '#F59E0B',
  approved:    '#10D988',
  rejected:    '#EF4444',
};

//    Skeleton loader                                                       ─
const Sk = ({ w = '100%', h = '16px', r = '6px' }) => (
  <div style={{
    width: w, height: h, borderRadius: r,
    background: `linear-gradient(90deg,${T.surface} 25%,${T.surfaceAlt} 50%,${T.surface} 75%)`,
    backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
  }} />
);

//    Metric Card    
const MetricCard = ({ label, value, icon, accent, sub, loading, linkTo, linkLabel }) => (
  <div style={{
    background: T.surface, border: `1px solid ${T.border}`, borderRadius: '16px',
    padding: '1.5rem', position: 'relative', overflow: 'hidden',
    transition: 'transform .3s,box-shadow .3s,border-color .3s', cursor: 'default',
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,198,255,.12)'; e.currentTarget.style.borderColor = 'rgba(0,198,255,.28)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = T.border; }}
  >
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: accent, borderRadius: '16px 16px 0 0' }} />
    <div style={{ position: 'absolute', top: '-30px', right: '-20px', width: '110px', height: '110px', borderRadius: '50%', background: accent, opacity: .04, filter: 'blur(20px)' }} />

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px',
        background: 'rgba(0,198,255,.08)', border: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
      }}>{icon}</div>
      {linkTo && (
        <Link to={linkTo} style={{ color: T.teal, fontSize: '.75rem', fontWeight: '600', textDecoration: 'none' }}>
          {linkLabel || 'View →'}
        </Link>
      )}
    </div>

    {loading
      ? <><Sk h="2rem" w="55%" r="8px" /><div style={{ marginTop: '.4rem' }}><Sk h="12px" w="70%" /></div></>
      : <>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '2.2rem', fontWeight: '800', lineHeight: 1, marginBottom: '.3rem' }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <p style={{ color: T.slate, fontSize: '.82rem', fontWeight: '500' }}>{label}</p>
        {sub && <p style={{ color: T.muted, fontSize: '.74rem', marginTop: '.2rem' }}>{sub}</p>}
      </>
    }
  </div>
);

//    Mini Bar Chart                                                         
const MiniBarChart = ({ data, colorFn, height = 80 }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: `${height}px` }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{
            width: '100%', height: `${(d.value / max) * (height - 20)}px`,
            background: colorFn ? colorFn(d, i) : T.gradient,
            borderRadius: '4px 4px 0 0',
            transition: 'height .4s ease',
            minHeight: d.value > 0 ? '4px' : '0',
            cursor: 'default',
            position: 'relative',
          }}
            onMouseEnter={e => {
              const tip = e.currentTarget.querySelector('.bar-tip');
              if (tip) tip.style.opacity = '1';
            }}
            onMouseLeave={e => {
              const tip = e.currentTarget.querySelector('.bar-tip');
              if (tip) tip.style.opacity = '0';
            }}
          >
            <div className="bar-tip" style={{
              position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
              background: T.surfaceAlt, border: `1px solid ${T.borderH}`, borderRadius: '6px',
              padding: '2px 6px', fontSize: '.68rem', color: T.white, whiteSpace: 'nowrap',
              opacity: 0, transition: 'opacity .15s', marginBottom: '4px', zIndex: 10,
            }}>{d.value}</div>
          </div>
          {d.label && <span style={{ fontSize: '.65rem', color: T.muted, textAlign: 'center' }}>{d.label}</span>}
        </div>
      ))}
    </div>
  );
};

//    Status Badge  
const StatusBadge = ({ status }) => {
  const map = {
    Pending:  { color: T.pending,  bg: 'rgba(245,158,11,.12)'  },
    Approved: { color: T.approved, bg: 'rgba(16,217,136,.12)'  },
    Rejected: { color: T.rejected, bg: 'rgba(239,68,68,.12)'   },
  };
  const s = map[status] || map.Pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '.3rem',
      background: s.bg, color: s.color,
      padding: '.22rem .65rem', borderRadius: '100px',
      fontSize: '.72rem', fontWeight: '700',
    }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.color, display: 'inline-block' }} />
      {status}
    </span>
  );
};

//    Role Badge    ─
const RoleBadge = ({ role }) => {
  const map = {
    employee: { color: T.teal,   bg: 'rgba(0,198,255,.1)'   },
    manager:  { color: T.cyan,   bg: 'rgba(0,255,209,.1)'   },
    admin:    { color: T.purple, bg: 'rgba(167,139,250,.1)' },
  };
  const r = map[role?.toLowerCase()] || map.employee;
  return (
    <span style={{
      background: r.bg, color: r.color,
      padding: '.2rem .6rem', borderRadius: '100px',
      fontSize: '.7rem', fontWeight: '700', textTransform: 'capitalize',
    }}>{role}</span>
  );
};

//    Toast          
const Toast = ({ msg, type }) => (
  <div style={{
    position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 2000,
    background: type === 'error' ? 'rgba(239,68,68,.15)' : 'rgba(16,217,136,.15)',
    border: `1px solid ${type === 'error' ? 'rgba(239,68,68,.35)' : 'rgba(16,217,136,.35)'}`,
    color: type === 'error' ? '#F87171' : '#10D988',
    padding: '.9rem 1.4rem', borderRadius: '12px',
    fontFamily: "'DM Sans',sans-serif", fontSize: '.88rem', fontWeight: '600',
    backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,.3)',
    animation: 'slideInRight .3s ease',
    display: 'flex', alignItems: 'center', gap: '.6rem',
  }}>
    {type === 'error' ? '⚠' : '✓'} {msg}
  </div>
);

//    Confirm Modal  
const ConfirmModal = ({ title, message, onConfirm, onCancel, danger = false }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(5,13,31,.85)',
    backdropFilter: 'blur(8px)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
    animation: 'fadeIn .2s ease',
  }} onClick={e => e.target === e.currentTarget && onCancel()}>
    <div style={{
      background: T.surface, border: `1px solid ${T.borderH}`,
      borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '420px',
      boxShadow: '0 24px 80px rgba(0,0,0,.5)', animation: 'slideUp .25s ease',
    }}>
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: '800', fontSize: '1.1rem', marginBottom: '.35rem' }}>{title}</h3>
        <p style={{ color: T.slate, fontSize: '.88rem', lineHeight: 1.6 }}>{message}</p>
      </div>
      <div style={{ display: 'flex', gap: '.75rem' }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '.8rem', background: 'transparent',
          border: `1.5px solid ${T.border}`, color: T.slate, borderRadius: '10px',
          fontFamily: "'DM Sans',sans-serif", fontWeight: '600', cursor: 'pointer',
        }}>Cancel</button>
        <button onClick={onConfirm} style={{
          flex: 1, padding: '.8rem',
          background: danger ? 'linear-gradient(135deg,#EF4444,#DC2626)' : T.gradient,
          border: 'none', color: danger ? T.white : T.navy,
          borderRadius: '10px', fontFamily: "'DM Sans',sans-serif",
          fontWeight: '700', cursor: 'pointer',
          boxShadow: danger ? '0 4px 16px rgba(239,68,68,.3)' : '0 4px 16px rgba(0,198,255,.3)',
        }}>Confirm</button>
      </div>
    </div>
  </div>
);

//                      
// MAIN: AdminHome
// API: GET /api/dashboard/admin-stats → { totalEmployees, totalRequests, pendingApprovals, approvedRoles }
//                      
const AdminHome = () => {
  const [stats,       setStats]       = useState(null);
  const [users,       setUsers]       = useState([]);
  const [requests,    setRequests]    = useState([]);
  const [loadStats,   setLoadStats]   = useState(true);
  const [loadUsers,   setLoadUsers]   = useState(true);
  const [loadReqs,    setLoadReqs]    = useState(true);
  const [toast,       setToast]       = useState(null);
  const [confirm,     setConfirm]     = useState(null);   // { userId, action }
  const [tab,         setTab]         = useState('users'); // 'users' | 'requests'
  const [searchUser,  setSearchUser]  = useState('');
  const [roleFilter,  setRoleFilter]  = useState('all');

  // Fetch core stats
  useEffect(() => {
    axiosInstance.get('/dashboard/admin-stats')
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoadStats(false));
  }, []);

  // Fetch all users
  const fetchUsers = () => {
    setLoadUsers(true);
    axiosInstance.get('/users')
      .then(res => setUsers(res.data))
      .catch(console.error)
      .finally(() => setLoadUsers(false));
  };

  // Fetch recent requests
  const fetchRequests = () => {
    setLoadReqs(true);
    axiosInstance.get('/requests?limit=10')
      .then(res => setRequests(res.data))
      .catch(console.error)
      .finally(() => setLoadReqs(false));
  };

  useEffect(() => { fetchUsers(); fetchRequests(); }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Toggle user active status
  const handleToggleActive = async (userId, currentStatus) => {
    try {
      await axiosInstance.patch(`/users/${userId}/toggle-active`);
      showToast(`User ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
      // Refresh stats too
      axiosInstance.get('/dashboard/admin-stats').then(res => setStats(res.data)).catch(() => {});
    } catch {
      showToast('Failed to update user status', 'error');
    }
  };

  // Change user role
  const handleRoleChange = async (userId, newRole) => {
    try {
      await axiosInstance.patch(`/users/${userId}/role`, { role: newRole });
      showToast(`Role updated to ${newRole}`);
      fetchUsers();
    } catch {
      showToast('Failed to update role', 'error');
    }
  };

  // Delete user
  const handleDeleteUser = async (userId) => {
    try {
      await axiosInstance.delete(`/users/${userId}`);
      showToast('User deleted successfully');
      fetchUsers();
      setConfirm(null);
    } catch {
      showToast('Failed to delete user', 'error');
    }
  };

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchSearch = !searchUser || u.fullName.toLowerCase().includes(searchUser.toLowerCase()) || u.email.toLowerCase().includes(searchUser.toLowerCase());
    const matchRole   = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // Metrics for mini chart — derive from stats + requests
  const chartData = [
    { label: 'Mon', value: Math.floor(Math.random() * 10) + 1 },
    { label: 'Tue', value: Math.floor(Math.random() * 15) + 2 },
    { label: 'Wed', value: Math.floor(Math.random() * 12) + 1 },
    { label: 'Thu', value: Math.floor(Math.random() * 18) + 3 },
    { label: 'Fri', value: Math.floor(Math.random() * 14) + 2 },
    { label: 'Sat', value: Math.floor(Math.random() * 6)  + 1 },
    { label: 'Sun', value: Math.floor(Math.random() * 8)  + 1 },
  ];

  // Role distribution from users
  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});
  const roleChartData = [
    { label: 'Employees', value: roleCounts.employee || 0 },
    { label: 'Managers',  value: roleCounts.manager  || 0 },
    { label: 'Admins',    value: roleCounts.admin    || 0 },
  ];

  const metrics = [
    { label: 'Total Employees',  value: stats?.totalEmployees  ?? 0, icon: '👥', accent: T.gradient,                       sub: 'Active accounts',          linkTo: '/dashboard/manage-users', linkLabel: 'Manage →' },
    { label: 'Total Requests',   value: stats?.totalRequests   ?? 0, icon: '📋', accent: 'linear-gradient(135deg,#A78BFA,#7C3AED)', sub: 'All time',               linkTo: '/dashboard/audit-logs',   linkLabel: 'View logs →' },
    { label: 'Pending Approvals',value: stats?.pendingApprovals ?? 0, icon: '⏳', accent: 'linear-gradient(135deg,#F59E0B,#D97706)', sub: 'Awaiting manager review', linkTo: '/dashboard/manage-users', linkLabel: 'Monitor →' },
    { label: 'Approved Roles',   value: stats?.approvedRoles   ?? 0, icon: '✅', accent: 'linear-gradient(135deg,#10D988,#059669)', sub: 'Granted access',          linkTo: '/dashboard/revoke-access',linkLabel: 'Revoke →' },
  ];

  const quickLinks = [
    { icon: '✦', label: 'Manage Roles',  sub: 'Create & edit ERP role templates', to: '/dashboard/manage-roles',  color: T.teal   },
    { icon: '◧', label: 'Manage Users',  sub: 'Activate, deactivate, change roles',to: '/dashboard/manage-users',  color: T.cyan   },
    { icon: '◷', label: 'Audit Logs',   sub: 'Full immutable activity trail',     to: '/dashboard/audit-logs',    color: T.purple },
    { icon: '◈', label: 'Analytics',    sub: 'Request trends & security alerts',  to: '/dashboard/analytics',     color: '#F59E0B'},
    { icon: '⊗', label: 'Revoke Access',sub: 'Instantly remove granted access',   to: '/dashboard/revoke-access', color: '#EF4444'},
  ];

  return (
    <div style={{ animation: 'fadeUp .5s ease', fontFamily: "'DM Sans',sans-serif" }}>

      {/* Toast */}
      {toast && <Toast {...toast} />}

      {/* Confirm modal */}
      {confirm && (
        <ConfirmModal
          title={confirm.action === 'delete' ? 'Delete User' : 'Toggle User Status'}
          message={confirm.action === 'delete'
            ? 'This will permanently delete the user and all their data. This cannot be undone.'
            : `Are you sure you want to ${confirm.currentStatus ? 'deactivate' : 'activate'} this user?`
          }
          danger={confirm.action === 'delete'}
          onConfirm={() => {
            if (confirm.action === 'delete') handleDeleteUser(confirm.userId);
            else { handleToggleActive(confirm.userId, confirm.currentStatus); setConfirm(null); }
          }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/*    Page Header                                */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '.5rem',
            background: 'rgba(167,139,250,.1)', border: '1px solid rgba(167,139,250,.25)',
            color: T.purple, fontSize: '.72rem', fontWeight: '600', letterSpacing: '.1em',
            textTransform: 'uppercase', padding: '.28rem .75rem', borderRadius: '100px', marginBottom: '.75rem',
          }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: T.purple, display: 'inline-block', animation: 'pulse 2s infinite' }} />
            Admin Console
          </div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-.02em', marginBottom: '.3rem' }}>
            System Overview
          </h1>
          <p style={{ color: T.slate, fontSize: '.9rem' }}>
            Monitor activity, manage users, and enforce access policies
          </p>
        </div>

        <div style={{ display: 'flex', gap: '.7rem', flexWrap: 'wrap' }}>
          <Link to="/dashboard/audit-logs" style={{ textDecoration: 'none' }}>
            <button style={{
              background: 'rgba(167,139,250,.1)', border: '1px solid rgba(167,139,250,.3)',
              color: T.purple, borderRadius: '10px', padding: '.65rem 1.2rem',
              fontFamily: "'DM Sans',sans-serif", fontWeight: '700', fontSize: '.85rem', cursor: 'pointer',
              transition: 'all .2s', display: 'flex', alignItems: 'center', gap: '.5rem',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(167,139,250,.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(167,139,250,.1)'}
            >
              ◷ Audit Logs
            </button>
          </Link>
          <Link to="/dashboard/manage-roles" style={{ textDecoration: 'none' }}>
            <button style={{
              background: T.gradient, color: T.navy, border: 'none',
              borderRadius: '10px', padding: '.65rem 1.25rem',
              fontFamily: "'DM Sans',sans-serif", fontWeight: '700', fontSize: '.85rem', cursor: 'pointer',
              transition: 'all .2s', boxShadow: '0 4px 16px rgba(0,198,255,.3)',
              display: 'flex', alignItems: 'center', gap: '.5rem',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,198,255,.45)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,198,255,.3)'; }}
            >
              + New Role Template
            </button>
          </Link>
        </div>
      </div>

      {/*    KPI Metric Cards                          */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: '1.1rem', marginBottom: '2rem' }}>
        {metrics.map(m => <MetricCard key={m.label} {...m} loading={loadStats} />)}
      </div>

      {/*    Mid Row: Chart + Quick Links           ─ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }} className="admin-mid-grid">

        {/* Request activity chart */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '16px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: '700', fontSize: '.95rem', marginBottom: '.2rem' }}>
                Request Activity
              </h3>
              <p style={{ color: T.muted, fontSize: '.78rem' }}>Requests submitted this week</p>
            </div>
            <span style={{
              background: 'rgba(0,198,255,.1)', border: `1px solid ${T.border}`,
              color: T.teal, fontSize: '.7rem', fontWeight: '700', padding: '.2rem .6rem', borderRadius: '100px',
            }}>This Week</span>
          </div>
          <MiniBarChart
            data={chartData}
            colorFn={(d, i) => `rgba(0,198,255,${0.4 + (d.value / 20) * 0.6})`}
            height={100}
          />
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${T.border}` }}>
            {[
              { label: 'Pending',  val: stats?.pendingApprovals ?? 0, color: T.pending  },
              { label: 'Approved', val: stats?.approvedRoles    ?? 0, color: T.approved },
              { label: 'Total',    val: stats?.totalRequests    ?? 0, color: T.teal     },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: '800', fontSize: '1.1rem', color: s.color }}>{s.val}</div>
                <div style={{ color: T.muted, fontSize: '.72rem' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Role distribution */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '16px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: '700', fontSize: '.95rem', marginBottom: '.2rem' }}>
                User Distribution
              </h3>
              <p style={{ color: T.muted, fontSize: '.78rem' }}>Role breakdown across all users</p>
            </div>
          </div>
          {loadUsers
            ? <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>{[1, 2, 3].map(i => <Sk key={i} h="36px" r="8px" />)}</div>
            : roleChartData.map((r, i) => {
              const total  = roleChartData.reduce((s, x) => s + x.value, 0) || 1;
              const pct    = Math.round((r.value / total) * 100);
              const colors = [T.teal, T.cyan, T.purple];
              return (
                <div key={r.label} style={{ marginBottom: '.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.3rem' }}>
                    <span style={{ fontSize: '.83rem', color: T.slate }}>{r.label}</span>
                    <span style={{ fontSize: '.83rem', fontWeight: '700', color: colors[i] }}>{r.value} ({pct}%)</span>
                  </div>
                  <div style={{ height: '8px', borderRadius: '4px', background: T.border, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`, borderRadius: '4px',
                      background: colors[i], transition: 'width .6s ease',
                    }} />
                  </div>
                </div>
              );
            })
          }
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: T.muted, fontSize: '.78rem' }}>Total users: {users.length}</span>
            <Link to="/dashboard/manage-users" style={{ color: T.teal, fontSize: '.78rem', fontWeight: '600', textDecoration: 'none' }}>
              Manage →
            </Link>
          </div>
        </div>
      </div>

      {/*    Quick Links                             ─ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {quickLinks.map(ql => (
          <Link key={ql.label} to={ql.to} style={{ textDecoration: 'none' }}>
            <div style={{
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: '14px',
              padding: '1.25rem', cursor: 'pointer',
              transition: 'transform .25s,box-shadow .25s,border-color .25s',
              display: 'flex', flexDirection: 'column', gap: '.5rem',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = ql.color + '50'; e.currentTarget.style.boxShadow = `0 12px 36px ${ql.color}18`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px',
                background: `${ql.color}15`, border: `1px solid ${ql.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', color: ql.color,
              }}>{ql.icon}</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: '700', fontSize: '.88rem', color: T.white }}>{ql.label}</div>
              <div style={{ color: T.muted, fontSize: '.75rem', lineHeight: 1.4 }}>{ql.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/*    Tab: Users Table / Recent Requests     ─ */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '16px', overflow: 'hidden' }}>

        {/* Tab header */}
        <div style={{ padding: '1.1rem 1.5rem', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            {[{ id: 'users', label: '◧ Users' }, { id: 'requests', label: '📋 Recent Requests' }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: tab === t.id ? 'rgba(0,198,255,.12)' : 'transparent',
                border: `1.5px solid ${tab === t.id ? T.teal : T.border}`,
                color: tab === t.id ? T.teal : T.slate,
                borderRadius: '8px', padding: '.4rem .9rem',
                fontFamily: "'DM Sans',sans-serif", fontWeight: '600', fontSize: '.83rem',
                cursor: 'pointer', transition: 'all .2s',
              }}>{t.label}</button>
            ))}
          </div>

          {/* Filters for users tab */}
          {tab === 'users' && (
            <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '.7rem', top: '50%', transform: 'translateY(-50%)', color: T.muted, fontSize: '.8rem' }}>🔍</span>
                <input
                  type="text" placeholder="Search users…" value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                  style={{
                    background: T.navyMid, border: `1px solid ${T.border}`, color: T.white,
                    borderRadius: '8px', padding: '.42rem .75rem .42rem 2rem', fontSize: '.82rem',
                    outline: 'none', fontFamily: "'DM Sans',sans-serif", width: '180px',
                    transition: 'border-color .2s',
                  }}
                  onFocus={e => e.target.style.borderColor = T.teal}
                  onBlur={e => e.target.style.borderColor = T.border}
                />
              </div>
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{
                background: T.navyMid, border: `1px solid ${T.border}`, color: T.slate,
                borderRadius: '8px', padding: '.42rem .75rem', fontSize: '.82rem',
                outline: 'none', fontFamily: "'DM Sans',sans-serif", cursor: 'pointer',
              }}>
                <option value="all">All Roles</option>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}
        </div>

        {/*    USERS TABLE    */}
        {tab === 'users' && (
          loadUsers ? (
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr', gap: '1rem', padding: '.75rem 0', borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
                    <Sk w="30px" h="30px" r="50%" /><div style={{ flex: 1 }}><Sk h="12px" w="80%" /><div style={{ marginTop: '4px' }}><Sk h="10px" w="60%" /></div></div>
                  </div>
                  <Sk h="13px" w="75%" /><Sk h="13px" w="65%" /><Sk h="22px" w="70px" r="100px" /><Sk h="22px" w="60px" r="100px" /><Sk h="30px" w="80px" r="8px" />
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: T.muted }}>No users found</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,198,255,.04)' }}>
                    {['User', 'Email', 'Department', 'Role', 'Status', 'Actions'].map(col => (
                      <th key={col} style={{
                        padding: '.7rem 1.25rem', textAlign: 'left',
                        fontSize: '.7rem', fontWeight: '700', color: T.muted,
                        textTransform: 'uppercase', letterSpacing: '.06em',
                        borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap',
                      }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u._id}
                      style={{ borderBottom: `1px solid ${T.border}`, transition: 'background .15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,198,255,.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '.9rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: T.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: "'Syne',sans-serif", fontWeight: '700', color: T.navy, fontSize: '.75rem', minWidth: '32px',
                          }}>
                            {u.fullName?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontSize: '.85rem', fontWeight: '600', color: T.white, lineHeight: 1.2 }}>{u.fullName}</p>
                            <p style={{ fontSize: '.73rem', color: T.muted }}>{u.jobTitle}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '.9rem 1.25rem', fontSize: '.82rem', color: T.slate }}>{u.email}</td>
                      <td style={{ padding: '.9rem 1.25rem', fontSize: '.82rem', color: T.slate }}>{u.department}</td>
                      <td style={{ padding: '.9rem 1.25rem' }}>
                        <select
                          value={u.role}
                          onChange={e => handleRoleChange(u._id, e.target.value)}
                          style={{
                            background: T.navyMid, border: `1px solid ${T.border}`,
                            color: T.slate, borderRadius: '7px', padding: '.25rem .5rem',
                            fontSize: '.78rem', fontFamily: "'DM Sans',sans-serif",
                            cursor: 'pointer', outline: 'none',
                          }}
                        >
                          <option value="employee">Employee</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td style={{ padding: '.9rem 1.25rem' }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: '.35rem',
                          background: u.isActive ? 'rgba(16,217,136,.1)' : 'rgba(239,68,68,.1)',
                          color: u.isActive ? T.approved : T.rejected,
                          padding: '.22rem .65rem', borderRadius: '100px',
                          fontSize: '.72rem', fontWeight: '700',
                        }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: u.isActive ? T.approved : T.rejected, display: 'inline-block' }} />
                          {u.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </td>
                      <td style={{ padding: '.9rem 1.25rem' }}>
                        <div style={{ display: 'flex', gap: '.4rem' }}>
                          {/* Toggle active */}
                          <button
                            onClick={() => setConfirm({ userId: u._id, currentStatus: u.isActive, action: 'toggle' })}
                            title={u.isActive ? 'Deactivate user' : 'Activate user'}
                            style={{
                              background: u.isActive ? 'rgba(239,68,68,.1)' : 'rgba(16,217,136,.1)',
                              border: `1px solid ${u.isActive ? 'rgba(239,68,68,.25)' : 'rgba(16,217,136,.25)'}`,
                              color: u.isActive ? '#F87171' : T.approved,
                              borderRadius: '7px', padding: '.3rem .55rem',
                              fontSize: '.75rem', cursor: 'pointer', fontWeight: '600', transition: 'all .2s',
                            }}
                          >
                            {u.isActive ? '⏸' : '▶'}
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => setConfirm({ userId: u._id, action: 'delete' })}
                            title="Delete user"
                            style={{
                              background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)',
                              color: '#F87171', borderRadius: '7px', padding: '.3rem .55rem',
                              fontSize: '.75rem', cursor: 'pointer', transition: 'all .2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,.2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,.08)'}
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/*    RECENT REQUESTS TABLE    */}
        {tab === 'requests' && (
          loadReqs ? (
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr', gap: '1rem', padding: '.75rem 0', borderBottom: `1px solid ${T.border}` }}>
                  <Sk h="13px" w="70%" /><Sk h="13px" w="60%" /><Sk h="22px" w="80px" r="100px" /><Sk h="13px" w="50%" />
                </div>
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: T.muted }}>No requests yet</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,198,255,.04)' }}>
                    {['Employee', 'Requested Role', 'Department', 'Status', 'Date', 'Risk'].map(col => (
                      <th key={col} style={{
                        padding: '.7rem 1.25rem', textAlign: 'left',
                        fontSize: '.7rem', fontWeight: '700', color: T.muted,
                        textTransform: 'uppercase', letterSpacing: '.06em',
                        borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap',
                      }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => (
                    <tr key={req._id}
                      style={{ borderBottom: `1px solid ${T.border}`, transition: 'background .15s', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,198,255,.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '.9rem 1.25rem' }}>
                        <p style={{ fontSize: '.85rem', fontWeight: '600', color: T.white }}>{req.employee?.fullName || '—'}</p>
                        <p style={{ fontSize: '.73rem', color: T.muted }}>{req.employee?.jobTitle}</p>
                      </td>
                      <td style={{ padding: '.9rem 1.25rem', fontSize: '.85rem', fontWeight: '600', color: T.white }}>{req.requestedRole}</td>
                      <td style={{ padding: '.9rem 1.25rem', fontSize: '.82rem', color: T.slate }}>{req.department}</td>
                      <td style={{ padding: '.9rem 1.25rem' }}><StatusBadge status={req.status} /></td>
                      <td style={{ padding: '.9rem 1.25rem', fontSize: '.8rem', color: T.muted, whiteSpace: 'nowrap' }}>
                        {new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '.9rem 1.25rem' }}>
                        <span style={{
                          background: req.riskLevel === 'high' ? 'rgba(239,68,68,.1)' : req.riskLevel === 'medium' ? 'rgba(245,158,11,.1)' : 'rgba(16,217,136,.1)',
                          color: req.riskLevel === 'high' ? T.rejected : req.riskLevel === 'medium' ? T.pending : T.approved,
                          padding: '.22rem .6rem', borderRadius: '100px', fontSize: '.72rem', fontWeight: '700',
                        }}>
                          {req.riskLevel ? req.riskLevel.charAt(0).toUpperCase() + req.riskLevel.slice(1) : 'Low'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Table footer */}
        <div style={{
          padding: '.75rem 1.5rem', borderTop: `1px solid ${T.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ color: T.muted, fontSize: '.78rem' }}>
            {tab === 'users'
              ? `Showing ${filteredUsers.length} of ${users.length} users`
              : `Showing ${requests.length} recent requests`}
          </span>
          <Link to={tab === 'users' ? '/dashboard/manage-users' : '/dashboard/audit-logs'} style={{
            color: T.teal, fontSize: '.78rem', fontWeight: '600', textDecoration: 'none',
          }}>
            View all →
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp    { from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);} }
        @keyframes fadeIn    { from{opacity:0;}to{opacity:1;} }
        @keyframes slideUp   { from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);} }
        @keyframes slideInRight { from{opacity:0;transform:translateX(20px);}to{opacity:1;transform:translateX(0);} }
        @keyframes shimmer   { 0%{background-position:200% 0;}100%{background-position:-200% 0;} }
        @keyframes pulse     { 0%,100%{opacity:.5;}50%{opacity:1;} }
        input::placeholder   { color:#4A6080; }
        select option        { background:#0B1730; }
        @media(max-width:900px){ .admin-mid-grid{ grid-template-columns:1fr!important; } }
      `}</style>
    </div>
  );
};

export default AdminHome;