import { Outlet, NavLink, useNavigate, useLocation } from 'react-router';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

const T = {
  navy:     '#050D1F', navyMid:'#0B1730', surface:'#0F1E38',
  teal:     '#00C6FF', cyan:'#00FFD1',    purple:'#A78BFA',
  gradient: 'linear-gradient(135deg,#00C6FF 0%,#00FFD1 100%)',
  white:    '#FFFFFF', slate:'#8DA5C4',   muted:'#4A6080',
  border:   'rgba(0,198,255,0.12)',       borderH:'rgba(0,198,255,0.32)',
  pending:  '#F59E0B', approved:'#10D988',
};

const FONT_URL = "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap";

const SIDEBAR_LINKS = {
  employee: [
    { label:'Home',            path:'/dashboard',                icon:'⊞', exact:true },
    { label:'Submit Request',  path:'/dashboard/submit-request', icon:'✦' },
    { label:'My Requests',     path:'/dashboard/my-requests',    icon:'◧' },
    { label:'Request History', path:'/dashboard/history',        icon:'◷' },
    { label:'Profile',         path:'/dashboard/profile',        icon:'◉' },
  ],
  manager: [
    { label:'Home',             path:'/dashboard',                  icon:'⊞', exact:true },
    { label:'Review Requests',  path:'/dashboard/review-requests',  icon:'✦' },
    { label:'Team Requests',    path:'/dashboard/team-requests',    icon:'◧' },
    { label:'Approval History', path:'/dashboard/approval-history', icon:'◷' },
    { label:'Profile',          path:'/dashboard/profile',          icon:'◉' },
  ],
  admin: [
    { label:'Admin Home',    path:'/dashboard',                icon:'⊞', exact:true },
    { label:'Manage Roles',  path:'/dashboard/manage-roles',   icon:'✦' },
    { label:'Manage Users',  path:'/dashboard/manage-users',   icon:'◧' },
    { label:'Audit Logs',    path:'/dashboard/audit-logs',     icon:'◷' },
    { label:'Analytics',     path:'/dashboard/analytics',      icon:'◈' },
    { label:'Revoke Access', path:'/dashboard/revoke-access',  icon:'⊗' },
  ],
};

const ROLE_META = {
  employee: { label:'Employee Portal', badge:'Employee', color:T.teal   },
  manager:  { label:'Manager Portal',  badge:'Manager',  color:T.cyan   },
  admin:    { label:'Admin Console',   badge:'Admin',    color:T.purple  },
};

const NOTIFS = [
  { id:1, msg:'Your Finance Role request was approved', time:'2m ago',  unread:true,  icon:'✅' },
  { id:2, msg:'New access request from Alex Kim',       time:'15m ago', unread:true,  icon:'📋' },
  { id:3, msg:'3 requests auto-escalated to admin',     time:'1h ago',  unread:false, icon:'⚠️' },
];

const Breadcrumb = ({ links }) => {
  const { pathname } = useLocation();
  const cur = links.find(l => l.path === pathname);
  if (!cur || cur.path === '/dashboard') return null;
  return (
    <div style={{ display:'flex',alignItems:'center',gap:'.45rem',marginBottom:'1.5rem',fontSize:'.8rem',color:T.muted }}>
      Dashboard <span style={{ color:T.border }}>›</span>
      <span style={{ color:T.slate, fontWeight:'500' }}>{cur.label}</span>
    </div>
  );
};

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const notifRef   = useRef(null);
  const profileRef = useRef(null);

  const links    = SIDEBAR_LINKS[user?.role] || [];
  const roleMeta = ROLE_META[user?.role]     || ROLE_META.employee;
  const initials = user?.fullName?.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase() || 'U';
  const unread   = NOTIFS.filter(n=>n.unread).length;

  useEffect(() => {
    const h = e => {
      if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <>
      <style>{`
        @import url('${FONT_URL}');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'DM Sans',sans-serif;background:${T.navy};color:${T.white};overflow-x:hidden;}
        ::selection{background:${T.teal};color:${T.navy};}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-track{background:${T.navy};}
        ::-webkit-scrollbar-thumb{background:rgba(0,198,255,.4);border-radius:3px;}
        @keyframes fadeIn  {from{opacity:0}to{opacity:1}}
        @keyframes pulse   {0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes fadeUp  {from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer {0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes slideInRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes spin    {to{transform:rotate(360deg)}}

        /*    Sidebar nav: Sentinel teal (no purple!)    */
        .d-nav{display:flex;align-items:center;gap:.65rem;padding:.62rem 1rem;margin:.1rem .6rem;border-radius:9px;color:${T.slate};font-size:.87rem;font-weight:500;text-decoration:none;transition:all .2s;border-left:2.5px solid transparent;}
        .d-nav:hover{background:rgba(0,198,255,.06);color:${T.white};}
        .d-nav.active{background:rgba(0,198,255,.10);color:${T.teal};font-weight:600;border-left-color:${T.teal};}

        .notif-row{padding:.85rem 1.1rem;border-bottom:1px solid ${T.border};cursor:pointer;transition:background .15s;}
        .notif-row:hover{background:rgba(0,198,255,.05);}
        .pdrop-btn{width:100%;background:none;border:none;display:flex;align-items:center;gap:.6rem;padding:.8rem 1.1rem;color:${T.slate};cursor:pointer;font-size:.85rem;transition:background .15s;text-align:left;font-family:'DM Sans',sans-serif;}
        .pdrop-btn:hover{background:rgba(0,198,255,.05);}
        .pdrop-btn.red{color:#F87171;}
        .pdrop-btn.red:hover{background:rgba(239,68,68,.06);}

        input,select,textarea{font-family:'DM Sans',sans-serif;background:${T.surface};border:1px solid ${T.border};color:${T.white};border-radius:10px;padding:.75rem 1rem;font-size:.93rem;outline:none;width:100%;box-sizing:border-box;transition:border-color .2s,box-shadow .2s;}
        input:focus,select:focus,textarea:focus{border-color:${T.teal};box-shadow:0 0 0 3px rgba(0,198,255,.1);}
        input::placeholder,textarea::placeholder{color:${T.muted};}
        select option{background:${T.surface};color:${T.white};}

        @media(max-width:900px){
          #d-sidebar{transform:translateX(-100%);position:fixed!important;top:60px;bottom:0;z-index:300;transition:transform .3s ease;}
          #d-sidebar.open{transform:translateX(0);}
          #d-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:299;}
          #d-overlay.open{display:block;}
          #d-ham{display:flex!important;}
          .search-hint{display:none!important;}
        }
      `}</style>

      <div style={{ display:'flex',flexDirection:'column',minHeight:'100vh' }}>

        {/*    TOP NAV    */}
        <header style={{
          background:T.navyMid, borderBottom:`1px solid ${T.border}`,
          padding:'0 1.5rem', height:'60px',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          position:'sticky', top:0, zIndex:200,
          boxShadow:'0 4px 24px rgba(0,0,0,.3)', flexShrink:0,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
            <button id="d-ham" onClick={()=>setSidebarOpen(o=>!o)} style={{
              display:'none', background:'none', border:'none',
              color:T.slate, fontSize:'1.2rem', cursor:'pointer',
              alignItems:'center', justifyContent:'center',
            }}>☰</button>
            <div style={{ display:'flex', alignItems:'center', gap:'.6rem' }}>
              <div style={{
                width:'32px', height:'32px', borderRadius:'8px',
                background:T.gradient, display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:"'Syne',sans-serif", fontWeight:'800', color:T.navy, fontSize:'.9rem',
                boxShadow:'0 0 14px rgba(0,198,255,.35)',
              }}>S</div>
              <div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:'800', fontSize:'.95rem', color:T.white, lineHeight:1 }}>Sentinel</div>
                <div style={{ fontSize:'.58rem', color:T.muted, letterSpacing:'.04em', lineHeight:1, marginTop:'1px' }}>GUARD EVERY GATEWAY</div>
              </div>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:'.6rem' }}>
            {/* Search hint */}
            <div className="search-hint" style={{
              display:'flex', alignItems:'center', gap:'.6rem',
              background:T.surface, border:`1px solid ${T.border}`,
              borderRadius:'8px', padding:'.4rem .8rem',
              color:T.muted, fontSize:'.78rem', cursor:'pointer',
            }}>
              <span>🔍</span><span>Quick search…</span>
              <span style={{ background:'rgba(0,198,255,.1)', border:`1px solid ${T.border}`, borderRadius:'4px', padding:'0 .3rem', fontSize:'.65rem', color:T.teal }}>⌘K</span>
            </div>

            {/* Notifs */}
            <div ref={notifRef} style={{ position:'relative' }}>
              <button onClick={()=>{ setNotifOpen(o=>!o); setProfileOpen(false); }} style={{
                width:'38px', height:'38px', borderRadius:'9px',
                background: notifOpen ? 'rgba(0,198,255,.12)' : T.surface,
                border:`1px solid ${notifOpen ? T.borderH : T.border}`,
                color:T.slate, fontSize:'1rem', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                transition:'all .2s', position:'relative',
              }}>
                🔔
                {unread > 0 && (
                  <span style={{
                    position:'absolute', top:'7px', right:'7px',
                    width:'7px', height:'7px', borderRadius:'50%',
                    background:T.pending, border:`2px solid ${T.navyMid}`,
                    animation:'pulse 2s infinite',
                  }}/>
                )}
              </button>

              {notifOpen && (
                <div style={{
                  position:'absolute', top:'calc(100% + 8px)', right:0,
                  width:'305px', background:T.surface,
                  border:`1px solid ${T.borderH}`, borderRadius:'14px',
                  boxShadow:'0 16px 48px rgba(0,0,0,.4)',
                  animation:'fadeIn .15s ease', overflow:'hidden', zIndex:500,
                }}>
                  <div style={{ padding:'.85rem 1.1rem', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:'700', fontSize:'.9rem' }}>Notifications</span>
                    <span style={{ background:'rgba(245,158,11,.12)', color:T.pending, fontSize:'.7rem', fontWeight:'700', padding:'.15rem .5rem', borderRadius:'100px' }}>{unread} new</span>
                  </div>
                  {NOTIFS.map(n => (
                    <div key={n.id} className="notif-row" style={{ background:n.unread ? 'rgba(0,198,255,.03)' : 'transparent' }}>
                      <div style={{ display:'flex', gap:'.75rem', alignItems:'flex-start' }}>
                        <span style={{ fontSize:'.85rem', marginTop:'1px' }}>{n.icon}</span>
                        <div style={{ flex:1 }}>
                          <p style={{ fontSize:'.82rem', color:n.unread ? T.white : T.slate, lineHeight:1.4 }}>{n.msg}</p>
                          <p style={{ fontSize:'.72rem', color:T.muted, marginTop:'.15rem' }}>{n.time}</p>
                        </div>
                        {n.unread && <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:T.teal, marginTop:'4px', minWidth:'6px' }}/>}
                      </div>
                    </div>
                  ))}
                  <div style={{ padding:'.7rem', borderTop:`1px solid ${T.border}`, textAlign:'center' }}>
                    <button style={{ background:'none', border:'none', color:T.teal, fontSize:'.8rem', fontWeight:'600', cursor:'pointer' }}>View all</button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div ref={profileRef} style={{ position:'relative' }}>
              <button onClick={()=>{ setProfileOpen(o=>!o); setNotifOpen(false); }} style={{
                display:'flex', alignItems:'center', gap:'.55rem',
                background: profileOpen ? 'rgba(0,198,255,.1)' : T.surface,
                border:`1px solid ${profileOpen ? T.borderH : T.border}`,
                borderRadius:'9px', padding:'.38rem .65rem',
                cursor:'pointer', transition:'all .2s',
              }}>
                <div style={{
                  width:'28px', height:'28px', borderRadius:'50%',
                  background:T.gradient, display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:"'Syne',sans-serif", fontWeight:'700', color:T.navy, fontSize:'.72rem',
                }}>{initials}</div>
                <div style={{ textAlign:'left' }}>
                  <p style={{ fontSize:'.78rem', fontWeight:'600', color:T.white, lineHeight:1 }}>{user?.fullName}</p>
                  <p style={{ fontSize:'.63rem', color:T.muted, lineHeight:1, marginTop:'2px', textTransform:'capitalize' }}>{user?.role}</p>
                </div>
                <span style={{ color:T.muted, fontSize:'.65rem' }}>▾</span>
              </button>

              {profileOpen && (
                <div style={{
                  position:'absolute', top:'calc(100% + 8px)', right:0,
                  width:'210px', background:T.surface,
                  border:`1px solid ${T.borderH}`, borderRadius:'12px',
                  boxShadow:'0 16px 48px rgba(0,0,0,.4)',
                  animation:'fadeIn .15s ease', overflow:'hidden', zIndex:500,
                }}>
                  <div style={{ padding:'.9rem 1.1rem', borderBottom:`1px solid ${T.border}`, background:'rgba(0,198,255,.04)' }}>
                    <p style={{ fontWeight:'600', fontSize:'.88rem' }}>{user?.fullName}</p>
                    <p style={{ color:T.muted, fontSize:'.76rem', marginTop:'.1rem' }}>{user?.email}</p>
                    <div style={{
                      display:'inline-block', marginTop:'.4rem',
                      background:'rgba(0,198,255,.1)', border:`1px solid ${T.border}`,
                      color:T.teal, fontSize:'.67rem', fontWeight:'700',
                      letterSpacing:'.06em', padding:'.12rem .55rem',
                      borderRadius:'100px', textTransform:'uppercase',
                    }}>{user?.role}</div>
                  </div>
                  <button className="pdrop-btn" onClick={()=>{ navigate('/dashboard/profile'); setProfileOpen(false); }}>
                    <span style={{ opacity:.7 }}>◉</span> Profile Settings
                  </button>
                  <button className="pdrop-btn" onClick={()=>{ navigate('/dashboard/history'); setProfileOpen(false); }}>
                    <span style={{ opacity:.7 }}>◷</span> Activity History
                  </button>
                  <div style={{ borderTop:`1px solid ${T.border}` }}>
                    <button className="pdrop-btn red" onClick={()=>{ logout(); navigate('/login'); }}>
                      <span>⎋</span> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/*    BODY    */}
        <div style={{ display:'flex', flex:1, minHeight:0 }}>
          <div id="d-overlay" className={sidebarOpen ? 'open' : ''} onClick={()=>setSidebarOpen(false)}/>

          {/*    SIDEBAR    */}
          <aside id="d-sidebar" style={{
            width:'232px', background:T.navyMid,
            borderRight:`1px solid ${T.border}`,
            display:'flex', flexDirection:'column',
            flexShrink:0,
          }}>
            <div style={{ padding:'1rem 1.25rem .75rem', borderBottom:`1px solid ${T.border}` }}>
              <div style={{
                display:'inline-flex', alignItems:'center', gap:'.4rem',
                background:`${roleMeta.color}15`, border:`1px solid ${roleMeta.color}30`,
                borderRadius:'100px', padding:'.25rem .7rem',
              }}>
                <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:roleMeta.color, boxShadow:`0 0 5px ${roleMeta.color}` }}/>
                <span style={{ fontSize:'.67rem', fontWeight:'700', color:roleMeta.color, letterSpacing:'.08em', textTransform:'uppercase' }}>
                  {roleMeta.badge}
                </span>
              </div>
              <p style={{ fontSize:'.71rem', color:T.muted, marginTop:'.4rem' }}>{roleMeta.label}</p>
            </div>

            <nav style={{ padding:'.6rem 0', flex:1, overflowY:'auto' }}>
              {links.map(link => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  end={!!link.exact}
                  className={({ isActive }) => `d-nav${isActive ? ' active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span style={{ fontSize:'1rem', opacity:.8, minWidth:'18px', textAlign:'center' }}>{link.icon}</span>
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <div style={{ padding:'.9rem 1.1rem', borderTop:`1px solid ${T.border}`, background:'rgba(0,198,255,.02)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'.6rem' }}>
                <div style={{
                  width:'30px', height:'30px', borderRadius:'50%',
                  background:T.gradient, display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:"'Syne',sans-serif", fontWeight:'700', color:T.navy, fontSize:'.72rem', minWidth:'30px',
                }}>{initials}</div>
                <div style={{ overflow:'hidden' }}>
                  <p style={{ fontSize:'.8rem', fontWeight:'600', color:T.white, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.fullName}</p>
                  <p style={{ fontSize:'.7rem', color:T.muted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.department} · {user?.jobTitle}</p>
                </div>
              </div>
            </div>
          </aside>

          {/*    MAIN CONTENT    */}
          <main style={{ flex:1, background:T.navy, padding:'2rem', minWidth:0, overflowY:'auto' }}>
            <Breadcrumb links={links}/>
            <Outlet/>
          </main>
        </div>

        {/*    FOOTER    */}
        <footer style={{
          background:T.navyMid, borderTop:`1px solid ${T.border}`,
          padding:'.65rem 1.75rem',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          fontSize:'.74rem', color:T.muted, flexWrap:'wrap', gap:'.5rem', flexShrink:0,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.5rem' }}>
            <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:T.approved, display:'inline-block', boxShadow:`0 0 5px ${T.approved}` }}/>
            All systems operational
            <span style={{ color:T.border }}>·</span>
            Sentinel — Guard Every Gateway. Grant with Confidence.
          </div>
          <div style={{ display:'flex', gap:'1.1rem' }}>
            <a href="/support" style={{ color:T.muted, textDecoration:'none' }}>Support</a>
            <a href="/about"   style={{ color:T.muted, textDecoration:'none' }}>About</a>
            <span>© 2026 Sentinel by Kazi Fabiha Golam Liya</span>
          </div>
        </footer>
      </div>
    </>
  );
};

export default DashboardLayout;