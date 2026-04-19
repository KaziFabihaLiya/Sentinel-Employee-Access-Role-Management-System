import { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { T, Sk, PageHeader, GLOBAL_CSS } from '../../styles/darkTokens';

const AnalyticsPage = () => {
  const [stats,    setStats]    = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      axiosInstance.get('/dashboard/admin-stats'),
      axiosInstance.get('/requests?limit=100'),
    ]).then(([statsRes, reqRes]) => {
      setStats(statsRes.data);
      setRequests(reqRes.data.requests || []);
    }).catch(console.error).finally(()=>setLoading(false));
  }, []);

  // Most requested roles
  const roleCounts = requests.reduce((acc, r) => {
    acc[r.requestedRole] = (acc[r.requestedRole] || 0) + 1;
    return acc;
  }, {});
  const topRoles = Object.entries(roleCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxCount = topRoles[0]?.[1] || 1;

  // Status breakdown
  const pending  = requests.filter(r=>r.status==='Pending').length;
  const approved = requests.filter(r=>r.status==='Approved').length;
  const rejected = requests.filter(r=>r.status==='Rejected').length;
  const total    = requests.length || 1;

  // Risk breakdown
  const highRisk = requests.filter(r=>r.riskLevel==='high').length;
  const medRisk  = requests.filter(r=>r.riskLevel==='medium').length;
  const lowRisk  = requests.filter(r=>r.riskLevel==='low' || !r.riskLevel).length;

  const statCards = [
    { label:'Total Employees',   value:stats?.totalEmployees  ?? 0, icon:'👥', accent:T.gradient },
    { label:'All Time Requests', value:stats?.totalRequests   ?? 0, icon:'📋', accent:'linear-gradient(135deg,#A78BFA,#7C3AED)' },
    { label:'Pending Now',       value:stats?.pendingApprovals ?? 0, icon:'⏳', accent:'linear-gradient(135deg,#F59E0B,#D97706)' },
    { label:'Approved Access',   value:stats?.approvedRoles   ?? 0, icon:'✅', accent:'linear-gradient(135deg,#10D988,#059669)' },
  ];

  return (
    <div style={{ animation:'fadeUp .5s ease' }}>
      <PageHeader badge="Admin Console" badgeColor="purple" title="System Analytics"
        sub="Overview of request trends, risk distribution, and system health"/>

      {/* KPI row */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'1rem',marginBottom:'2rem' }}>
        {statCards.map(c=>(
          <div key={c.label} style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:'16px',padding:'1.4rem',position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:'2px',background:c.accent }}/>
            <div style={{ width:'40px',height:'40px',borderRadius:'12px',background:'rgba(0,198,255,.08)',border:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem',marginBottom:'.75rem' }}>{c.icon}</div>
            {loading ? <Sk h="2rem" w="55%" r="8px"/> : <div style={{ fontFamily:"'Syne',sans-serif",fontSize:'2rem',fontWeight:'800',lineHeight:1 }}>{c.value}</div>}
            <p style={{ color:T.slate,fontSize:'.8rem',marginTop:'.3rem' }}>{c.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'1.25rem' }} className="analytics-grid">

        {/* Status breakdown */}
        <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:'16px',padding:'1.5rem' }}>
          <h3 style={{ fontFamily:"'Syne',sans-serif",fontWeight:'700',fontSize:'.95rem',marginBottom:'1.25rem' }}>Request Status</h3>
          {[
            { label:'Pending',  count:pending,  pct:Math.round((pending/total)*100),  color:T.pending  },
            { label:'Approved', count:approved, pct:Math.round((approved/total)*100), color:T.approved },
            { label:'Rejected', count:rejected, pct:Math.round((rejected/total)*100), color:T.rejected },
          ].map(s=>(
            <div key={s.label} style={{ marginBottom:'1rem' }}>
              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:'.3rem' }}>
                <span style={{ fontSize:'.82rem',color:T.slate }}>{s.label}</span>
                <span style={{ fontSize:'.82rem',fontWeight:'600',color:s.color }}>{s.count} ({s.pct}%)</span>
              </div>
              <div style={{ height:'6px',background:'rgba(255,255,255,.05)',borderRadius:'100px',overflow:'hidden' }}>
                <div style={{ height:'100%',width:`${s.pct}%`,background:s.color,borderRadius:'100px',transition:'width .5s ease' }}/>
              </div>
            </div>
          ))}
        </div>

        {/* Risk breakdown */}
        <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:'16px',padding:'1.5rem' }}>
          <h3 style={{ fontFamily:"'Syne',sans-serif",fontWeight:'700',fontSize:'.95rem',marginBottom:'1.25rem' }}>Risk Distribution</h3>
          {[
            { label:'Low Risk',    count:lowRisk,  color:T.approved },
            { label:'Medium Risk', count:medRisk,  color:T.pending  },
            { label:'High Risk',   count:highRisk, color:T.rejected },
          ].map(r=>{
            const pct = Math.round((r.count / (requests.length||1)) * 100);
            return (
              <div key={r.label} style={{ marginBottom:'1rem' }}>
                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:'.3rem' }}>
                  <span style={{ fontSize:'.82rem',color:T.slate }}>{r.label}</span>
                  <span style={{ fontSize:'.82rem',fontWeight:'600',color:r.color }}>{r.count} ({pct}%)</span>
                </div>
                <div style={{ height:'6px',background:'rgba(255,255,255,.05)',borderRadius:'100px',overflow:'hidden' }}>
                  <div style={{ height:'100%',width:`${pct}%`,background:r.color,borderRadius:'100px',transition:'width .5s ease' }}/>
                </div>
              </div>
            );
          })}
          {highRisk > 0 && (
            <div style={{ marginTop:'1rem',background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',borderRadius:'8px',padding:'.75rem',display:'flex',gap:'.5rem',alignItems:'center' }}>
              <span>⚠️</span>
              <p style={{ fontSize:'.78rem',color:'#F87171' }}>{highRisk} high-risk request{highRisk>1?'s':''} need attention</p>
            </div>
          )}
        </div>

        {/* Top roles */}
        <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:'16px',padding:'1.5rem' }}>
          <h3 style={{ fontFamily:"'Syne',sans-serif",fontWeight:'700',fontSize:'.95rem',marginBottom:'1.25rem' }}>Most Requested Roles</h3>
          {loading ? <Sk h="200px" r="8px"/> :
            topRoles.length === 0 ? <p style={{ color:T.muted,fontSize:'.85rem' }}>No data yet</p> :
            topRoles.map(([role, count], i) => (
              <div key={role} style={{ marginBottom:'.85rem' }}>
                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:'.3rem' }}>
                  <span style={{ fontSize:'.82rem',color:T.slate,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'70%' }}>{role}</span>
                  <span style={{ fontSize:'.82rem',fontWeight:'700',color:T.teal }}>{count}</span>
                </div>
                <div style={{ height:'5px',background:'rgba(255,255,255,.05)',borderRadius:'100px',overflow:'hidden' }}>
                  <div style={{ height:'100%',width:`${Math.round((count/maxCount)*100)}%`,background:T.gradient,borderRadius:'100px',transition:'width .5s ease' }}/>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      <style>{`
        ${GLOBAL_CSS}
        @media(max-width:900px){.analytics-grid{grid-template-columns:1fr!important;}}
      `}</style>
    </div>
  );
};

export default AnalyticsPage;