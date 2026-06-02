// client/src/layouts/DashboardLayout.jsx
// Functional notifications, profile picture display, sidebar badge for pending
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../api/axiosInstance';
import ChatbotWidget from '../components/ChatbotWidget';

const T = {
  navy:'#050D1F',navyMid:'#0B1730',surface:'#0F1E38',
  teal:'#00C6FF',cyan:'#00FFD1',purple:'#A78BFA',
  gradient:'linear-gradient(135deg,#00C6FF 0%,#00FFD1 100%)',
  white:'#FFFFFF',slate:'#8DA5C4',muted:'#4A6080',
  border:'rgba(0,198,255,0.12)',borderH:'rgba(0,198,255,0.32)',
  pending:'#F59E0B',approved:'#10D988',rejected:'#EF4444',
};

const FONT = "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap";

const SIDEBAR_LINKS = {
  employee:[
    {label:'Home',           path:'/dashboard',               icon:'⊞',exact:true},
    {label:'Submit Request', path:'/dashboard/submit-request',icon:'✦'},
    {label:'My Requests',    path:'/dashboard/my-requests',   icon:'◧'},
    {label:'Request History',path:'/dashboard/history',       icon:'◷'},
    {label:'Profile',        path:'/dashboard/profile',       icon:'◉'},
  ],
  manager:[
    {label:'Home',            path:'/dashboard',                 icon:'⊞',exact:true},
    {label:'Review Requests', path:'/dashboard/review-requests', icon:'✦'},
    {label:'Team Requests',   path:'/dashboard/team-requests',   icon:'◧'},
    {label:'Approval History',path:'/dashboard/approval-history',icon:'◷'},
    {label:'Profile',         path:'/dashboard/profile',         icon:'◉'},
  ],
  admin:[
    {label:'Approval Queue',path:'/dashboard/approval-queue',icon:'⏳'},
    {label:'Admin Home',   path:'/dashboard',               icon:'⊞',exact:true},
    {label:'Manage Roles', path:'/dashboard/manage-roles',  icon:'✦'},
    {label:'Manage Users', path:'/dashboard/manage-users',  icon:'◧'},
    {label:'Audit Logs',   path:'/dashboard/audit-logs',    icon:'◷'},
    {label:'Analytics',    path:'/dashboard/analytics',     icon:'◈'},
    {label:'Revoke Access',path:'/dashboard/revoke-access', icon:'⊗'},
    {label:'Profile',      path:'/dashboard/profile',       icon:'◉'},
  ],
};

const ROLE_META = {
  employee:{label:'Employee Portal',badge:'Employee',color:T.teal},
  manager: {label:'Manager Portal', badge:'Manager', color:T.cyan},
  admin:   {label:'Admin Console',  badge:'Admin',   color:T.purple},
};

const NOTIF_STYLE = {
  success:{bg:'rgba(16,217,136,.1)',  color:'#10D988', dot:'#10D988', icon:'✅'},
  error:  {bg:'rgba(239,68,68,.12)', color:'#F87171', dot:'#EF4444', icon:'❌'},
  warning:{bg:'rgba(245,158,11,.1)', color:'#F59E0B', dot:'#F59E0B', icon:'⚠️'},
  info:   {bg:'rgba(0,198,255,.08)', color:T.teal,    dot:T.teal,    icon:'🔔'},
};

const timeAgo = (d) => {
  const s = Math.floor((Date.now()-new Date(d))/1000);
  if(s<60) return 'just now';
  if(s<3600) return `${Math.floor(s/60)}m ago`;
  if(s<86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
};

const Breadcrumb = ({ links }) => {
  const { pathname } = useLocation();
  const cur = links.find(l => l.path === pathname);
  if (!cur || cur.path === '/dashboard') return null;
  return (
    <div style={{ display:'flex',alignItems:'center',gap:'.45rem',marginBottom:'1.5rem',fontSize:'.8rem',color:T.muted }}>
      Dashboard <span style={{ color:T.border }}>›</span>
      <span style={{ color:T.slate,fontWeight:'500' }}>{cur.label}</span>
    </div>
  );
};

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifs,      setNotifs]      = useState([]);
  const [unread,      setUnread]      = useState(0);
  const [notifLoad,   setNotifLoad]   = useState(false);
  const notifRef   = useRef(null);
  const profileRef = useRef(null);

  const links    = SIDEBAR_LINKS[user?.role] || [];
  const roleMeta = ROLE_META[user?.role] || ROLE_META.employee;
  const initials = user?.fullName?.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()||'U';

  const fetchNotifications = useCallback(() => {
    setNotifLoad(true);
    axiosInstance.get('/notifications')
      .then(res => { setNotifs(res.data.notifications||[]); setUnread(res.data.unreadCount||0); })
      .catch(()=>{})
      .finally(()=>setNotifLoad(false));
  }, []);

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 60000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  useEffect(() => {
    const h = e => {
      if (notifRef.current && !notifRef.current.contains(e.target))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const Avatar = ({ size=28, style={} }) => (
    <div style={{ width:size,height:size,borderRadius:'50%',background:T.gradient,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Syne',sans-serif",fontWeight:'700',color:T.navy,fontSize:size*.28+'px',minWidth:size,overflow:'hidden',...style }}>
      {user?.avatarUrl ? <img src={user.avatarUrl} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/> : initials}
    </div>
  );

  return (
    <>
      <style>{`
        @import url('${FONT}');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'DM Sans',sans-serif;background:${T.navy};color:${T.white};overflow-x:hidden;}
        ::selection{background:${T.teal};color:${T.navy};}
        ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:${T.navy};}::-webkit-scrollbar-thumb{background:rgba(0,198,255,.4);border-radius:3px;}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideInRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes notifPulse{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.5)}50%{box-shadow:0 0 0 5px rgba(245,158,11,0)}}

        .d-nav{display:flex;align-items:center;gap:.65rem;padding:.62rem 1rem;margin:.1rem .6rem;border-radius:9px;color:${T.slate};font-size:.87rem;font-weight:500;text-decoration:none;transition:all .2s;border-left:2.5px solid transparent;}
        .d-nav:hover{background:rgba(0,198,255,.06);color:${T.white};}
        .d-nav.active{background:rgba(0,198,255,.10);color:${T.teal};font-weight:600;border-left-color:${T.teal};}
        .notif-row{padding:.85rem 1.1rem;border-bottom:1px solid ${T.border};cursor:pointer;transition:background .15s;}
        .notif-row:hover{background:rgba(0,198,255,.05);}
        .pdrop-btn{width:100%;background:none;border:none;display:flex;align-items:center;gap:.6rem;padding:.8rem 1.1rem;color:${T.slate};cursor:pointer;font-size:.85rem;transition:background .15s;text-align:left;font-family:'DM Sans',sans-serif;}
        .pdrop-btn:hover{background:rgba(0,198,255,.05);}
        .pdrop-btn.red{color:#F87171;}.pdrop-btn.red:hover{background:rgba(239,68,68,.06);}
        input,select,textarea{font-family:'DM Sans',sans-serif;background:#0F1E38;border:1px solid rgba(0,198,255,0.12);color:#fff;border-radius:10px;padding:.75rem 1rem;font-size:.93rem;outline:none;width:100%;box-sizing:border-box;transition:border-color .2s,box-shadow .2s;}
        input:focus,select:focus,textarea:focus{border-color:#00C6FF;box-shadow:0 0 0 3px rgba(0,198,255,.1);}
        input::placeholder,textarea::placeholder{color:#4A6080;}
        select option{background:#0F1E38;color:#fff;}
        @media(max-width:900px){#d-sidebar{transform:translateX(-100%);position:fixed!important;top:60px;bottom:0;z-index:300;transition:transform .3s ease;}#d-sidebar.open{transform:translateX(0);}#d-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:299;}#d-overlay.open{display:block;}#d-ham{display:flex!important;}.search-hint{display:none!important;}}
        @media(max-width:768px){.form-two-col,.emp-bottom-grid,.admin-mid-grid,.analytics-grid{grid-template-columns:1fr!important;}}
      `}</style>

      <div style={{ display:'flex',flexDirection:'column',minHeight:'100vh' }}>
        {/* TOP NAV */}
        <header style={{ background:T.navyMid,borderBottom:`1px solid ${T.border}`,padding:'0 1.5rem',height:'60px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:200,boxShadow:'0 4px 24px rgba(0,0,0,.3)',flexShrink:0 }}>
          <div style={{ display:'flex',alignItems:'center',gap:'1rem' }}>
            <button id="d-ham" onClick={()=>setSidebarOpen(o=>!o)} style={{ display:'none',background:'none',border:'none',color:T.slate,fontSize:'1.2rem',cursor:'pointer',alignItems:'center',justifyContent:'center' }}>☰</button>
            <div style={{ display:'flex',alignItems:'center',gap:'.6rem' }}>
              <div style={{ width:'32px',height:'32px',borderRadius:'8px',background:T.gradient,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Syne',sans-serif",fontWeight:'800',color:T.navy,fontSize:'.9rem',boxShadow:'0 0 14px rgba(0,198,255,.35)' }}>S</div>
              <div><div style={{ fontFamily:"'Syne',sans-serif",fontWeight:'800',fontSize:'.95rem',color:T.white,lineHeight:1 }}>Sentinel</div><div style={{ fontSize:'.58rem',color:T.muted,letterSpacing:'.04em',lineHeight:1,marginTop:'1px' }}>GUARD EVERY GATEWAY</div></div>
            </div>
          </div>

          <div style={{ display:'flex',alignItems:'center',gap:'.6rem' }}>
            {/* Search hint */}
            <div className="search-hint" style={{ display:'flex',alignItems:'center',gap:'.6rem',background:T.surface,border:`1px solid ${T.border}`,borderRadius:'8px',padding:'.4rem .8rem',color:T.muted,fontSize:'.78rem',cursor:'pointer' }}>
              <span>🔍</span><span>Quick search…</span>
              <span style={{ background:'rgba(0,198,255,.1)',border:`1px solid ${T.border}`,borderRadius:'4px',padding:'0 .3rem',fontSize:'.65rem',color:T.teal }}>⌘K</span>
            </div>

            {/* Notifications bell */}
            <div ref={notifRef} style={{ position:'relative' }}>
              <button onClick={()=>{ setNotifOpen(o=>!o); setProfileOpen(false); if(!notifOpen) fetchNotifications(); }} style={{ width:'38px',height:'38px',borderRadius:'9px',background:notifOpen?'rgba(0,198,255,.12)':T.surface,border:`1px solid ${notifOpen?T.borderH:T.border}`,color:T.slate,fontSize:'1rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s',position:'relative' }}>
                🔔
                {unread>0 && <span style={{ position:'absolute',top:'7px',right:'7px',width:'8px',height:'8px',borderRadius:'50%',background:T.pending,border:`2px solid ${T.navyMid}`,animation:'notifPulse 2s infinite' }}/>}
              </button>

              {notifOpen && (
                <div style={{ position:'absolute',top:'calc(100% + 8px)',right:0,width:'340px',background:T.surface,border:`1px solid ${T.borderH}`,borderRadius:'14px',boxShadow:'0 16px 48px rgba(0,0,0,.4)',animation:'fadeIn .15s ease',overflow:'hidden',zIndex:500 }}>
                  <div style={{ padding:'.85rem 1.1rem',borderBottom:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                    <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:'700',fontSize:'.9rem' }}>Notifications</span>
                    <div style={{ display:'flex',gap:'.75rem',alignItems:'center' }}>
                      {unread>0 && <span style={{ background:'rgba(245,158,11,.12)',color:T.pending,fontSize:'.7rem',fontWeight:'700',padding:'.15rem .5rem',borderRadius:'100px' }}>{unread} new</span>}
                      <button onClick={fetchNotifications} style={{ background:'none',border:'none',color:T.muted,cursor:'pointer',fontSize:'.85rem' }}>↻</button>
                    </div>
                  </div>

                  {notifLoad ? (
                    <div style={{ padding:'2rem',textAlign:'center',color:T.muted,fontSize:'.85rem' }}>Loading…</div>
                  ) : notifs.length===0 ? (
                    <div style={{ padding:'2.5rem',textAlign:'center' }}>
                      <p style={{ fontSize:'1.5rem',marginBottom:'.5rem' }}>🔔</p>
                      <p style={{ color:T.muted,fontSize:'.85rem' }}>No notifications right now</p>
                    </div>
                  ) : (
                    <div style={{ maxHeight:'340px',overflowY:'auto' }}>
                      {notifs.map(n => {
                        const ns = NOTIF_STYLE[n.type]||NOTIF_STYLE.info;
                        return (
                          <div key={n.id} className="notif-row"
                            onClick={()=>{ setNotifOpen(false); if(n.link) navigate(n.link); }}
                            style={{ background:n.urgent?ns.bg:'transparent' }}>
                            <div style={{ display:'flex',gap:'.75rem',alignItems:'flex-start' }}>
                              <div style={{ width:'32px',height:'32px',minWidth:'32px',borderRadius:'9px',background:ns.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.9rem' }}>{ns.icon}</div>
                              <div style={{ flex:1 }}>
                                <p style={{ fontSize:'.83rem',fontWeight:'600',color:T.white,lineHeight:1.3,marginBottom:'.15rem' }}>{n.title}</p>
                                <p style={{ fontSize:'.78rem',color:T.slate,lineHeight:1.4 }}>{n.msg}</p>
                                <p style={{ fontSize:'.7rem',color:T.muted,marginTop:'.2rem' }}>{timeAgo(n.time)}</p>
                              </div>
                              {n.urgent && <div style={{ width:'7px',height:'7px',borderRadius:'50%',background:ns.dot,marginTop:'4px',minWidth:'7px',boxShadow:`0 0 5px ${ns.dot}` }}/>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ padding:'.65rem 1.1rem',borderTop:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                    <span style={{ color:T.muted,fontSize:'.76rem' }}>{notifs.length} notification{notifs.length!==1?'s':''}</span>
                    <button onClick={()=>{ setUnread(0); setNotifOpen(false); }} style={{ background:'none',border:'none',color:T.teal,fontSize:'.78rem',fontWeight:'600',cursor:'pointer' }}>Mark all read</button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div ref={profileRef} style={{ position:'relative' }}>
              <button onClick={()=>{ setProfileOpen(o=>!o); setNotifOpen(false); }} style={{ display:'flex',alignItems:'center',gap:'.55rem',background:profileOpen?'rgba(0,198,255,.1)':T.surface,border:`1px solid ${profileOpen?T.borderH:T.border}`,borderRadius:'9px',padding:'.38rem .65rem',cursor:'pointer',transition:'all .2s' }}>
                <Avatar size={28}/>
                <div style={{ textAlign:'left' }}>
                  <p style={{ fontSize:'.78rem',fontWeight:'600',color:T.white,lineHeight:1 }}>{user?.fullName}</p>
                  <p style={{ fontSize:'.63rem',color:T.muted,lineHeight:1,marginTop:'2px',textTransform:'capitalize' }}>{user?.role}</p>
                </div>
                <span style={{ color:T.muted,fontSize:'.65rem' }}>▾</span>
              </button>

              {profileOpen && (
                <div style={{ position:'absolute',top:'calc(100% + 8px)',right:0,width:'215px',background:T.surface,border:`1px solid ${T.borderH}`,borderRadius:'12px',boxShadow:'0 16px 48px rgba(0,0,0,.4)',animation:'fadeIn .15s ease',overflow:'hidden',zIndex:500 }}>
                  <div style={{ padding:'.9rem 1.1rem',borderBottom:`1px solid ${T.border}`,background:'rgba(0,198,255,.04)',display:'flex',alignItems:'center',gap:'.75rem' }}>
                    <Avatar size={38} style={{ border:`2px solid rgba(0,198,255,.3)` }}/>
                    <div>
                      <p style={{ fontWeight:'600',fontSize:'.88rem' }}>{user?.fullName}</p>
                      <p style={{ color:T.muted,fontSize:'.73rem',marginTop:'.1rem' }}>{user?.email}</p>
                      <div style={{ display:'inline-block',marginTop:'.3rem',background:'rgba(0,198,255,.1)',border:`1px solid ${T.border}`,color:T.teal,fontSize:'.65rem',fontWeight:'700',letterSpacing:'.06em',padding:'.1rem .5rem',borderRadius:'100px',textTransform:'uppercase' }}>{user?.role}</div>
                    </div>
                  </div>
                  <button className="pdrop-btn" onClick={()=>{ navigate('/dashboard/profile'); setProfileOpen(false); }}><span style={{ opacity:.7 }}>◉</span> Profile & Avatar</button>
                  <button className="pdrop-btn" onClick={()=>{ navigate('/dashboard/history'); setProfileOpen(false); }}><span style={{ opacity:.7 }}>◷</span> Activity History</button>
                  <div style={{ borderTop:`1px solid ${T.border}` }}>
                    <button className="pdrop-btn red" onClick={()=>{ logout(); navigate('/login'); }}><span>⎋</span> Sign Out</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* BODY */}
        <div style={{ display:'flex',flex:1,minHeight:0 }}>
          <div id="d-overlay" className={sidebarOpen?'open':''} onClick={()=>setSidebarOpen(false)}/>

          {/* SIDEBAR */}
          <aside id="d-sidebar" style={{ width:'232px',background:T.navyMid,borderRight:`1px solid ${T.border}`,display:'flex',flexDirection:'column',flexShrink:0 }}>
            <div style={{ padding:'1rem 1.25rem .75rem',borderBottom:`1px solid ${T.border}` }}>
              <div style={{ display:'inline-flex',alignItems:'center',gap:'.4rem',background:`${roleMeta.color}15`,border:`1px solid ${roleMeta.color}30`,borderRadius:'100px',padding:'.25rem .7rem' }}>
                <div style={{ width:'6px',height:'6px',borderRadius:'50%',background:roleMeta.color,boxShadow:`0 0 5px ${roleMeta.color}` }}/>
                <span style={{ fontSize:'.67rem',fontWeight:'700',color:roleMeta.color,letterSpacing:'.08em',textTransform:'uppercase' }}>{roleMeta.badge}</span>
              </div>
              <p style={{ fontSize:'.71rem',color:T.muted,marginTop:'.4rem' }}>{roleMeta.label}</p>
            </div>

            <nav style={{ padding:'.6rem 0',flex:1,overflowY:'auto' }}>
              {links.map(link => (
                <NavLink key={link.path} to={link.path} end={!!link.exact}
                  className={({isActive})=>`d-nav${isActive?' active':''}`}
                  onClick={()=>setSidebarOpen(false)}>
                  <span style={{ fontSize:'1rem',opacity:.8,minWidth:'18px',textAlign:'center' }}>{link.icon}</span>
                  {link.label}
                  {/* Badge for pending count on review-requests link */}
                  {['Review Requests', 'Approval Queue'].includes(link.label) && unread>0 && (
                    <span style={{ marginLeft:'auto',background:T.pending,color:T.navy,fontSize:'.65rem',fontWeight:'800',padding:'.1rem .45rem',borderRadius:'100px',minWidth:'18px',textAlign:'center' }}>{unread}</span>
                  )}
                </NavLink>
              ))}
            </nav>

            <div style={{ padding:'.9rem 1.1rem',borderTop:`1px solid ${T.border}`,background:'rgba(0,198,255,.02)' }}>
              <div style={{ display:'flex',alignItems:'center',gap:'.6rem' }}>
                <Avatar size={30}/>
                <div style={{ overflow:'hidden' }}>
                  <p style={{ fontSize:'.8rem',fontWeight:'600',color:T.white,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{user?.fullName}</p>
                  <p style={{ fontSize:'.7rem',color:T.muted,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{user?.department} · {user?.jobTitle}</p>
                </div>
              </div>
            </div>
          </aside>

          {/* MAIN */}
          <main style={{ flex:1,background:T.navy,padding:'2rem',minWidth:0,overflowY:'auto' }}>
            <Breadcrumb links={links}/>
            <Outlet/>
          </main>
          <ChatbotWidget />
        </div>

        {/* FOOTER */}
        <footer style={{ background:T.navyMid,borderTop:`1px solid ${T.border}`,padding:'.65rem 1.75rem',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'.74rem',color:T.muted,flexWrap:'wrap',gap:'.5rem',flexShrink:0 }}>
          <div style={{ display:'flex',alignItems:'center',gap:'.5rem' }}>
            <span style={{ width:'6px',height:'6px',borderRadius:'50%',background:T.approved,display:'inline-block',boxShadow:`0 0 5px ${T.approved}` }}/>
            All systems operational · Sentinel — Guard Every Gateway
          </div>
          <div style={{ display:'flex',gap:'1.1rem' }}>
            <a href="/support" style={{ color:T.muted,textDecoration:'none' }}>Support</a>
            <a href="/about"   style={{ color:T.muted,textDecoration:'none' }}>About</a>
            <span>© 2025 Sentinel</span>
          </div>
        </footer>
      </div>
    </>
  );
};
export default DashboardLayout;
