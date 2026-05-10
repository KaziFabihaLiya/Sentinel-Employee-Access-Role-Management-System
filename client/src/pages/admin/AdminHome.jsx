// client/src/pages/admin/AdminHome.jsx
// FIX: All cards use <Link> — fully clickable navigation
import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import axiosInstance from '../../api/axiosInstance';
import { T, Sk, StatusBadge, RiskBadge, Toast, PageHeader, GLOBAL_CSS } from '../../styles/darkTokens';

const KpiCard = ({ label, value, icon, accent, sub, loading, to }) => {
  const inner = (
    <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:'16px',padding:'1.4rem',position:'relative',overflow:'hidden',transition:'transform .25s,box-shadow .25s,border-color .25s',cursor:to?'pointer':'default',textDecoration:'none' }}
      onMouseEnter={e=>{ if(to){e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='0 16px 48px rgba(0,198,255,.14)';e.currentTarget.style.borderColor='rgba(0,198,255,.3)';}}}
      onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';e.currentTarget.style.borderColor=T.border;}}>
      <div style={{ position:'absolute',top:0,left:0,right:0,height:'2px',background:accent,borderRadius:'16px 16px 0 0' }}/>
      <div style={{ width:'42px',height:'42px',borderRadius:'12px',background:'rgba(0,198,255,.08)',border:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem',marginBottom:'1rem' }}>{icon}</div>
      {loading ? <div style={{ width:'55%',height:'2rem',borderRadius:'8px',background:'linear-gradient(90deg,#0F1E38 25%,#122040 50%,#0F1E38 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.5s infinite' }}/> : <div style={{ fontFamily:"'Syne',sans-serif",fontSize:'2.1rem',fontWeight:'800',lineHeight:1,color:T.white }}>{typeof value==='number'?value.toLocaleString():value}</div>}
      <p style={{ color:T.slate,fontSize:'.82rem',fontWeight:'500',marginTop:'.3rem' }}>{label}</p>
      {sub && <p style={{ color:T.muted,fontSize:'.73rem',marginTop:'.15rem' }}>{sub}</p>}
      {to && <div style={{ fontSize:'.75rem',color:T.teal,marginTop:'.6rem',fontWeight:'600' }}>View →</div>}
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration:'none' }}>{inner}</Link> : inner;
};

const QuickTile = ({ icon, label, sub, to, color }) => (
  <Link to={to} style={{ textDecoration:'none' }}>
    <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:'14px',padding:'1.25rem',transition:'transform .25s,box-shadow .25s,border-color .25s',cursor:'pointer' }}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.borderColor=`${color}50`;e.currentTarget.style.boxShadow=`0 12px 36px ${color}18`;}}
      onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.borderColor=T.border;e.currentTarget.style.boxShadow='none';}}>
      <div style={{ width:'38px',height:'38px',borderRadius:'10px',background:`${color}18`,border:`1px solid ${color}35`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem',color,marginBottom:'.65rem' }}>{icon}</div>
      <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:'700',fontSize:'.9rem',color:T.white,marginBottom:'.25rem' }}>{label}</div>
      <div style={{ color:T.muted,fontSize:'.75rem',lineHeight:1.4 }}>{sub}</div>
    </div>
  </Link>
);

const AdminHome = () => {
  const [stats,   setStats]   = useState(null);
  const [users,   setUsers]   = useState([]);
  const [reqs,    setReqs]    = useState([]);
  const [loadS,   setLoadS]   = useState(true);
  const [loadU,   setLoadU]   = useState(true);
  const [loadR,   setLoadR]   = useState(true);
  const [toast,   setToast]   = useState(null);
  const [tab,     setTab]     = useState('users');
  const [search,  setSearch]  = useState('');
  const [roleF,   setRoleF]   = useState('all');
  const [confirm, setConfirm] = useState(null);

  const showToast = (msg,type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const fetchAll = () => {
    setLoadS(true); setLoadU(true); setLoadR(true);
    axiosInstance.get('/dashboard/admin-stats').then(r=>setStats(r.data)).catch(console.error).finally(()=>setLoadS(false));
    axiosInstance.get('/users').then(r=>setUsers(r.data)).catch(console.error).finally(()=>setLoadU(false));
    axiosInstance.get('/requests?limit=15').then(r=>setReqs(r.data.requests||[])).catch(console.error).finally(()=>setLoadR(false));
  };
  useEffect(fetchAll, []);

  const handleToggle = async (id, cur) => {
    try { await axiosInstance.patch(`/users/${id}/toggle-active`); showToast(`User ${cur?'deactivated':'activated'}`); fetchAll(); }
    catch { showToast('Failed to update','error'); }
  };
  const handleRole = async (id, role) => {
    try { await axiosInstance.patch(`/users/${id}/role`,{role}); showToast(`Role changed to ${role}`); fetchAll(); }
    catch { showToast('Failed to update role','error'); }
  };
  const handleDelete = async (id) => {
    try { await axiosInstance.delete(`/users/${id}`); showToast('User deleted'); setConfirm(null); fetchAll(); }
    catch { showToast('Delete failed','error'); }
  };

  const filteredUsers = users.filter(u => {
    const ms = !search || u.fullName?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    return ms && (roleF==='all'||u.role===roleF);
  });

  const roleCounts = users.reduce((a,u)=>({...a,[u.role]:(a[u.role]||0)+1}),{});
  const totalU = users.length||1;

  const kpis = [
    {label:'Active Employees',  value:stats?.totalEmployees??0,   icon:'👥',accent:T.gradient,                         sub:'Currently active',         to:'/dashboard/manage-users'},
    {label:'Total Requests',    value:stats?.totalRequests??0,    icon:'📋',accent:'linear-gradient(135deg,#A78BFA,#7C3AED)',sub:'All time',              to:'/dashboard/audit-logs'},
    {label:'Pending Approvals', value:stats?.pendingApprovals??0, icon:'⏳',accent:'linear-gradient(135deg,#F59E0B,#D97706)',sub:'Awaiting action',       to:'/dashboard/analytics'},
    {label:'Approved Roles',    value:stats?.approvedRoles??0,    icon:'✅',accent:'linear-gradient(135deg,#10D988,#059669)',sub:'Active grants',         to:'/dashboard/revoke-access'},
    {label:'High-Risk Pending', value:stats?.highRiskPending??0,  icon:'🔴',accent:'linear-gradient(135deg,#EF4444,#DC2626)',sub:'Require attention',    to:'/dashboard/analytics'},
  ];

  const quickLinks = [
    {icon:'✦',label:'Manage Roles',   sub:'Create & edit ERP role templates',   to:'/dashboard/manage-roles',  color:T.teal},
    {icon:'◧',label:'Manage Users',   sub:'Activate, deactivate, change roles', to:'/dashboard/manage-users',  color:T.cyan},
    {icon:'◷',label:'Audit Logs',     sub:'Full immutable activity trail',       to:'/dashboard/audit-logs',    color:'#A78BFA'},
    {icon:'◈',label:'Analytics',      sub:'Request trends & risk overview',      to:'/dashboard/analytics',     color:'#F59E0B'},
    {icon:'⊗',label:'Revoke Access',  sub:'Instantly remove granted access',     to:'/dashboard/revoke-access', color:'#EF4444'},
  ];

  return (
    <div style={{ animation:'fadeUp .5s ease', fontFamily:"'DM Sans',sans-serif" }}>
      {toast && <Toast {...toast}/>}

      {/* Delete confirm modal */}
      {confirm && (
        <div style={{ position:'fixed',inset:0,background:'rgba(5,13,31,.88)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem',animation:'fadeIn .2s ease' }} onClick={e=>e.target===e.currentTarget&&setConfirm(null)}>
          <div style={{ background:T.surface,border:'1px solid rgba(239,68,68,.4)',borderRadius:'16px',padding:'2rem',maxWidth:'380px',width:'100%',animation:'slideUp .2s ease' }}>
            <h3 style={{ fontFamily:"'Syne',sans-serif",fontWeight:'800',marginBottom:'.5rem' }}>Delete User?</h3>
            <p style={{ color:T.slate,fontSize:'.88rem',lineHeight:1.6,marginBottom:'1.5rem' }}>Permanently delete this account. This cannot be undone.</p>
            <div style={{ display:'flex',gap:'.75rem' }}>
              <button onClick={()=>setConfirm(null)} style={{ flex:1,padding:'.75rem',background:'transparent',border:`1.5px solid ${T.border}`,color:T.slate,borderRadius:'10px',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",fontWeight:'600' }}>Cancel</button>
              <button onClick={()=>handleDelete(confirm)} style={{ flex:1,padding:'.75rem',background:'linear-gradient(135deg,#EF4444,#DC2626)',border:'none',color:'#fff',borderRadius:'10px',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",fontWeight:'700' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <PageHeader badge="Admin Console" badgeColor="purple" title="System Overview"
        sub="Monitor, manage and enforce access policies across the entire organization"
        action={
          <div style={{ display:'flex',gap:'.7rem',flexWrap:'wrap' }}>
            <Link to="/dashboard/audit-logs" style={{ textDecoration:'none' }}>
              <button style={{ background:'rgba(167,139,250,.1)',border:'1px solid rgba(167,139,250,.3)',color:'#A78BFA',borderRadius:'10px',padding:'.6rem 1.1rem',fontFamily:"'DM Sans',sans-serif",fontWeight:'700',fontSize:'.85rem',cursor:'pointer' }}>◷ Audit Logs</button>
            </Link>
            <Link to="/dashboard/manage-roles" style={{ textDecoration:'none' }}>
              <button style={{ background:T.gradient,color:T.navy,border:'none',borderRadius:'10px',padding:'.6rem 1.25rem',fontFamily:"'DM Sans',sans-serif",fontWeight:'700',fontSize:'.85rem',cursor:'pointer',boxShadow:'0 4px 16px rgba(0,198,255,.3)' }}>+ New Role</button>
            </Link>
          </div>
        }
      />

      {/* High-risk alert */}
      {!loadS && (stats?.highRiskPending||0)>0 && (
        <div style={{ background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.25)',borderRadius:'12px',padding:'1rem 1.25rem',display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem',flexWrap:'wrap',gap:'.75rem' }}>
          <div style={{ display:'flex',alignItems:'center',gap:'.75rem' }}>
            <span>🔴</span>
            <div>
              <p style={{ fontSize:'.85rem',fontWeight:'600',color:'#F87171' }}>{stats.highRiskPending} high-risk request{stats.highRiskPending>1?'s':''} need immediate attention</p>
              <p style={{ fontSize:'.78rem',color:T.muted,marginTop:'.1rem' }}>These require additional admin approval after manager review</p>
            </div>
          </div>
          <Link to="/dashboard/analytics" style={{ textDecoration:'none' }}>
            <button style={{ background:'rgba(239,68,68,.15)',border:'1px solid rgba(239,68,68,.3)',color:'#F87171',padding:'.4rem .9rem',borderRadius:'8px',fontFamily:"'DM Sans',sans-serif",fontWeight:'700',fontSize:'.82rem',cursor:'pointer',whiteSpace:'nowrap' }}>Review →</button>
          </Link>
        </div>
      )}

      {/* KPI cards */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(185px,1fr))',gap:'1rem',marginBottom:'2rem' }}>
        {kpis.map(k=><KpiCard key={k.label} {...k} loading={loadS}/>)}
      </div>

      {/* Charts */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.25rem',marginBottom:'2rem' }} className="admin-mid-grid">
        <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:'16px',padding:'1.5rem' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.25rem' }}>
            <div><h3 style={{ fontFamily:"'Syne',sans-serif",fontWeight:'700',fontSize:'.95rem',marginBottom:'.2rem' }}>User Distribution</h3><p style={{ color:T.muted,fontSize:'.78rem' }}>{users.length} total accounts</p></div>
            <Link to="/dashboard/manage-users" style={{ color:T.teal,fontSize:'.78rem',fontWeight:'600',textDecoration:'none' }}>Manage →</Link>
          </div>
          {[{label:'Employees',count:roleCounts.employee||0,color:T.teal},{label:'Managers',count:roleCounts.manager||0,color:T.cyan},{label:'Admins',count:roleCounts.admin||0,color:'#A78BFA'}].map(r=>{
            const pct=Math.round((r.count/totalU)*100);
            return (<div key={r.label} style={{ marginBottom:'.85rem' }}>
              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:'.3rem' }}><span style={{ fontSize:'.83rem',color:T.slate }}>{r.label}</span><span style={{ fontSize:'.83rem',fontWeight:'700',color:r.color }}>{r.count} ({pct}%)</span></div>
              <div style={{ height:'7px',background:'rgba(255,255,255,.05)',borderRadius:'100px',overflow:'hidden' }}><div style={{ height:'100%',width:`${pct}%`,background:r.color,borderRadius:'100px',transition:'width .6s ease' }}/></div>
            </div>);
          })}
        </div>
        <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:'16px',padding:'1.5rem' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.25rem' }}>
            <div><h3 style={{ fontFamily:"'Syne',sans-serif",fontWeight:'700',fontSize:'.95rem',marginBottom:'.2rem' }}>Request Status</h3><p style={{ color:T.muted,fontSize:'.78rem' }}>{stats?.totalRequests||0} total requests</p></div>
            <Link to="/dashboard/analytics" style={{ color:T.teal,fontSize:'.78rem',fontWeight:'600',textDecoration:'none' }}>Analytics →</Link>
          </div>
          {[{label:'Pending',val:stats?.pendingApprovals??0,color:T.pending},{label:'Approved',val:stats?.approvedRoles??0,color:T.approved}].map(s=>{
            const pct=Math.round((s.val/(stats?.totalRequests||1))*100);
            return (<div key={s.label} style={{ marginBottom:'.85rem' }}>
              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:'.3rem' }}><span style={{ fontSize:'.83rem',color:T.slate }}>{s.label}</span><span style={{ fontSize:'.83rem',fontWeight:'700',color:s.color }}>{s.val} ({pct}%)</span></div>
              <div style={{ height:'7px',background:'rgba(255,255,255,.05)',borderRadius:'100px',overflow:'hidden' }}><div style={{ height:'100%',width:`${pct}%`,background:s.color,borderRadius:'100px',transition:'width .6s ease' }}/></div>
            </div>);
          })}
          <div style={{ paddingTop:'.85rem',borderTop:`1px solid ${T.border}`,display:'flex',gap:'1.5rem' }}>
            {[{label:'Total',val:stats?.totalRequests??0},{label:'High Risk',val:stats?.highRiskPending??0}].map(s=>(
              <div key={s.label}><div style={{ fontFamily:"'Syne',sans-serif",fontWeight:'800',fontSize:'1.2rem',color:T.white }}>{s.val}</div><div style={{ color:T.muted,fontSize:'.72rem' }}>{s.label}</div></div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick links — all clickable via Link */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))',gap:'1rem',marginBottom:'2rem' }}>
        {quickLinks.map(ql=><QuickTile key={ql.label} {...ql}/>)}
      </div>

      {/* Tabbed table */}
      <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:'16px',overflow:'hidden' }}>
        <div style={{ padding:'1rem 1.5rem',borderBottom:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'1rem' }}>
          <div style={{ display:'flex',gap:'.5rem' }}>
            {[{id:'users',label:'◧ Users'},{id:'requests',label:'📋 Recent Requests'}].map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{ background:tab===t.id?'rgba(0,198,255,.12)':'transparent',border:`1.5px solid ${tab===t.id?T.teal:T.border}`,color:tab===t.id?T.teal:T.slate,borderRadius:'8px',padding:'.4rem .9rem',fontFamily:"'DM Sans',sans-serif",fontWeight:'600',fontSize:'.83rem',cursor:'pointer',transition:'all .2s' }}>{t.label}</button>
            ))}
          </div>
          {tab==='users' && (
            <div style={{ display:'flex',gap:'.6rem',alignItems:'center',flexWrap:'wrap' }}>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute',left:'.7rem',top:'50%',transform:'translateY(-50%)',color:T.muted,fontSize:'.8rem' }}>🔍</span>
                <input type="text" placeholder="Search users…" value={search} onChange={e=>setSearch(e.target.value)} style={{ background:T.navyMid,border:`1px solid ${T.border}`,color:T.white,borderRadius:'8px',padding:'.42rem .75rem .42rem 2rem',fontSize:'.82rem',outline:'none',fontFamily:"'DM Sans',sans-serif",width:'180px',transition:'border-color .2s' }} onFocus={e=>e.target.style.borderColor=T.teal} onBlur={e=>e.target.style.borderColor=T.border}/>
              </div>
              <select value={roleF} onChange={e=>setRoleF(e.target.value)} style={{ background:T.navyMid,border:`1px solid ${T.border}`,color:T.slate,borderRadius:'8px',padding:'.42rem .75rem',fontSize:'.82rem',outline:'none',cursor:'pointer',fontFamily:"'DM Sans',sans-serif" }}>
                <option value="all">All Roles</option>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}
        </div>

        {tab==='users' && (
          loadU ? (
            <div style={{ padding:'1.5rem',display:'flex',flexDirection:'column',gap:'.75rem' }}>{[1,2,3,4,5].map(i=>(<div key={i} style={{ display:'grid',gridTemplateColumns:'2fr 1.5fr 1fr 1fr 1fr',gap:'1rem',padding:'.75rem 0',borderBottom:`1px solid ${T.border}` }}><Sk h="13px" w="70%"/><Sk h="13px" w="60%"/><Sk h="22px" w="80px" r="100px"/><Sk h="22px" w="60px" r="100px"/><Sk h="30px" w="80px" r="8px"/></div>))}</div>
          ) : filteredUsers.length===0 ? (
            <div style={{ padding:'4rem',textAlign:'center',color:T.muted }}>No users found</div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%',borderCollapse:'collapse' }}>
                <thead><tr style={{ background:'rgba(0,198,255,.04)' }}>{['User','Department','Role','Status','Actions'].map(c=><th key={c} style={{ padding:'.7rem 1.25rem',textAlign:'left',fontSize:'.7rem',fontWeight:'700',color:T.muted,textTransform:'uppercase',letterSpacing:'.06em',borderBottom:`1px solid ${T.border}`,whiteSpace:'nowrap' }}>{c}</th>)}</tr></thead>
                <tbody>
                  {filteredUsers.map(u=>(
                    <tr key={u._id} style={{ borderBottom:`1px solid ${T.border}`,transition:'background .15s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(0,198,255,.03)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'.9rem 1.25rem' }}>
                        <div style={{ display:'flex',alignItems:'center',gap:'.65rem' }}>
                          <div style={{ width:'32px',height:'32px',borderRadius:'50%',background:T.gradient,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Syne',sans-serif",fontWeight:'700',color:T.navy,fontSize:'.75rem',minWidth:'32px',overflow:'hidden' }}>
                            {u.avatarUrl?<img src={u.avatarUrl} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>:u.fullName?.charAt(0)}
                          </div>
                          <div><p style={{ fontSize:'.85rem',fontWeight:'600',color:T.white,lineHeight:1.2 }}>{u.fullName}</p><p style={{ fontSize:'.73rem',color:T.muted }}>{u.email}</p></div>
                        </div>
                      </td>
                      <td style={{ padding:'.9rem 1.25rem',fontSize:'.83rem',color:T.slate }}>{u.department}</td>
                      <td style={{ padding:'.9rem 1.25rem' }}>
                        <select value={u.role} onChange={e=>handleRole(u._id,e.target.value)} style={{ background:T.navyMid,border:`1px solid ${T.border}`,color:T.slate,borderRadius:'7px',padding:'.25rem .55rem',fontSize:'.78rem',cursor:'pointer',outline:'none',fontFamily:"'DM Sans',sans-serif" }}>
                          <option value="employee">Employee</option><option value="manager">Manager</option><option value="admin">Admin</option>
                        </select>
                      </td>
                      <td style={{ padding:'.9rem 1.25rem' }}>
                        <span style={{ display:'inline-flex',alignItems:'center',gap:'.3rem',background:u.isActive?'rgba(16,217,136,.1)':'rgba(239,68,68,.1)',color:u.isActive?T.approved:T.rejected,padding:'.22rem .65rem',borderRadius:'100px',fontSize:'.72rem',fontWeight:'700' }}>
                          <span style={{ width:'5px',height:'5px',borderRadius:'50%',background:u.isActive?T.approved:T.rejected,display:'inline-block' }}/>{u.isActive?'Active':'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding:'.9rem 1.25rem' }}>
                        <div style={{ display:'flex',gap:'.4rem' }}>
                          <button onClick={()=>handleToggle(u._id,u.isActive)} title={u.isActive?'Deactivate':'Activate'} style={{ background:u.isActive?'rgba(239,68,68,.1)':'rgba(16,217,136,.1)',border:`1px solid ${u.isActive?'rgba(239,68,68,.25)':'rgba(16,217,136,.25)'}`,color:u.isActive?'#F87171':T.approved,borderRadius:'7px',padding:'.3rem .55rem',fontSize:'.75rem',cursor:'pointer',fontWeight:'600' }}>{u.isActive?'⏸':'▶'}</button>
                          <button onClick={()=>setConfirm(u._id)} style={{ background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',color:'#F87171',borderRadius:'7px',padding:'.3rem .55rem',fontSize:'.75rem',cursor:'pointer' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(239,68,68,.08)'}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab==='requests' && (
          loadR ? (
            <div style={{ padding:'1.5rem',display:'flex',flexDirection:'column',gap:'.75rem' }}>{[1,2,3,4].map(i=>(<div key={i} style={{ display:'grid',gridTemplateColumns:'2fr 1.5fr 1fr 1fr 1fr',gap:'1rem',padding:'.75rem 0',borderBottom:`1px solid ${T.border}` }}><Sk h="13px" w="70%"/><Sk h="13px" w="60%"/><Sk h="22px" w="80px" r="100px"/><Sk h="13px" w="60%"/><Sk h="22px" w="60px" r="100px"/></div>))}</div>
          ) : reqs.length===0 ? (
            <div style={{ padding:'4rem',textAlign:'center',color:T.muted }}>No requests yet</div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%',borderCollapse:'collapse' }}>
                <thead><tr style={{ background:'rgba(0,198,255,.04)' }}>{['Employee','Role','Department','Status','Date','Risk'].map(c=><th key={c} style={{ padding:'.7rem 1.25rem',textAlign:'left',fontSize:'.7rem',fontWeight:'700',color:T.muted,textTransform:'uppercase',letterSpacing:'.06em',borderBottom:`1px solid ${T.border}`,whiteSpace:'nowrap' }}>{c}</th>)}</tr></thead>
                <tbody>
                  {reqs.map(req=>(
                    <tr key={req._id} style={{ borderBottom:`1px solid ${T.border}`,transition:'background .15s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(0,198,255,.03)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'.9rem 1.25rem' }}><p style={{ fontSize:'.85rem',fontWeight:'600',color:T.white }}>{req.employee?.fullName||'—'}</p><p style={{ fontSize:'.73rem',color:T.muted }}>{req.employee?.jobTitle}</p></td>
                      <td style={{ padding:'.9rem 1.25rem',fontSize:'.85rem',fontWeight:'600',color:T.white }}>{req.requestedRole}</td>
                      <td style={{ padding:'.9rem 1.25rem',fontSize:'.82rem',color:T.slate }}>{req.department}</td>
                      <td style={{ padding:'.9rem 1.25rem' }}><StatusBadge status={req.status}/></td>
                      <td style={{ padding:'.9rem 1.25rem',fontSize:'.8rem',color:T.muted,whiteSpace:'nowrap' }}>{new Date(req.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td>
                      <td style={{ padding:'.9rem 1.25rem' }}><RiskBadge level={req.riskLevel||'low'}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        <div style={{ padding:'.6rem 1.5rem',borderTop:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <span style={{ color:T.muted,fontSize:'.78rem' }}>{tab==='users'?`Showing ${filteredUsers.length} of ${users.length} users`:`Showing ${reqs.length} recent requests`}</span>
          <Link to={tab==='users'?'/dashboard/manage-users':'/dashboard/audit-logs'} style={{ color:T.teal,fontSize:'.78rem',fontWeight:'600',textDecoration:'none' }}>View all →</Link>
        </div>
      </div>
      <style>{GLOBAL_CSS}</style>
    </div>
  );
};
export default AdminHome;