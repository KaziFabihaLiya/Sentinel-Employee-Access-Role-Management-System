// client/src/pages/admin/ApprovalDashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import { T, Sk, Toast, PageHeader, GLOBAL_CSS } from '../../styles/darkTokens';
import * as wfSvc from '../../services/workflowService';
import { escalateApproval } from '../../services/approvalService';

// ── Small metric tile ─────────────────────────────────────────────────────────
const Tile = ({ icon, label, value, accent = T.teal, loading }) => (
  <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'14px', padding:'1.1rem', display:'flex', alignItems:'center', gap:'.85rem' }}>
    <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:'rgba(0,198,255,.07)', border:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.05rem', minWidth:'40px' }}>{icon}</div>
    <div>
      <p style={{ fontSize:'.72rem', fontWeight:'600', color:T.muted, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:'.2rem' }}>{label}</p>
      {loading
        ? <div style={{ width:'48px', height:'1.5rem', borderRadius:'6px', background:'rgba(255,255,255,.06)', animation:'shimmer 1.5s infinite' }}/>
        : <p style={{ fontFamily:"'Syne',sans-serif", fontSize:'1.65rem', fontWeight:'800', color:T.white, lineHeight:1 }}>{value ?? '—'}</p>}
    </div>
  </div>
);

// ── Activity item ─────────────────────────────────────────────────────────────
const ActivityItem = ({ entry }) => {
  const colorMap = { APPROVED:'#10D988', REJECTED:'#F87171', ESCALATED:'#F59E0B', DELEGATED:'#A78BFA', SKIPPED:'#64748B' };
  const iconMap  = { APPROVED:'✓', REJECTED:'✕', ESCALATED:'↑', DELEGATED:'⇄', SKIPPED:'⤳' };
  const color = colorMap[entry.approvalAction] || T.muted;
  const icon  = iconMap[entry.approvalAction]  || '·';

  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:'.75rem', padding:'.7rem 0', borderBottom:`1px solid ${T.border}` }}>
      <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:`${color}18`, border:`1px solid ${color}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.7rem', fontWeight:'800', color, minWidth:'28px' }}>{icon}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:'.82rem', fontWeight:'600', color:T.white, lineHeight:1.3 }}>
          <span style={{ color }}>{entry.approvalAction}</span>
          {entry.approvedBy && <span style={{ color:T.muted, fontWeight:'400' }}> · {entry.approvedBy.fullName}</span>}
        </p>
        <p style={{ fontSize:'.73rem', color:T.muted, marginTop:'.1rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {entry.requestId?.requestedRole || 'Access Request'} — {entry.layerId?.layerName || 'Layer'}
        </p>
      </div>
      <span style={{ fontSize:'.68rem', color:T.muted, whiteSpace:'nowrap' }}>
        {new Date(entry.createdAt).toLocaleTimeString('en-US',{ hour:'2-digit', minute:'2-digit' })}
      </span>
    </div>
  );
};

// ── SLA alert row ─────────────────────────────────────────────────────────────
const SLAAlert = ({ request, onEscalate, escalating }) => {
  const hoursOverdue = request.slaDeadline
    ? Math.max(0, Math.round((Date.now() - new Date(request.slaDeadline)) / 3600000))
    : 0;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'.75rem', padding:'.65rem .85rem', background:'rgba(239,68,68,.05)', border:'1px solid rgba(239,68,68,.2)', borderRadius:'10px', marginBottom:'.5rem' }}>
      <span style={{ fontSize:'.8rem', fontWeight:'700', color:'#F87171', whiteSpace:'nowrap' }}>⚠ {hoursOverdue}h overdue</span>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:'.82rem', fontWeight:'600', color:T.white, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{request.requestedRole}</p>
        <p style={{ fontSize:'.72rem', color:T.muted }}>{request.employee?.fullName} · {request.currentApprovalLayerId?.layerName}</p>
      </div>
      <button
        onClick={() => onEscalate(request._id)}
        disabled={escalating === request._id}
        style={{ padding:'.3rem .7rem', background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.3)', color:'#F59E0B', borderRadius:'7px', fontSize:'.72rem', fontWeight:'700', cursor:'pointer', whiteSpace:'nowrap' }}>
        {escalating === request._id ? '…' : '↑ Escalate'}
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const ApprovalDashboard = () => {
  const [dash,       setDash]       = useState(null);
  const [slaList,    setSLAList]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [escalating, setEscalating] = useState(null);
  const [lastRefresh,setLastRefresh]= useState(new Date());
  const [toast,      setToast]      = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const fetchDash = useCallback(async () => {
    setLoading(true);
    try {
      const [dData, slaData] = await Promise.all([
        wfSvc.getApprovalDashboard(),
        // Fetch pending requests with SLA breach
        fetch('/api/requests?status=Pending&limit=20', {
          headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` }
        }).then(r=>r.json()).catch(()=>({ requests:[] })),
      ]);
      setDash(dData);
      const now = Date.now();
      setSLAList((slaData.requests||[]).filter(r => r.slaDeadline && new Date(r.slaDeadline) < now).slice(0, 6));
    } catch { showToast('Failed to refresh dashboard','error'); }
    finally { setLoading(false); setLastRefresh(new Date()); }
  }, []);

  useEffect(() => { fetchDash(); }, [fetchDash]);

  // Auto-refresh every 60s
  useEffect(() => {
    const t = setInterval(fetchDash, 60000);
    return () => clearInterval(t);
  }, [fetchDash]);

  const handleEscalate = async (requestId) => {
    setEscalating(requestId);
    try {
      await escalateApproval(requestId, 'Manually escalated from Admin Dashboard');
      showToast('Request escalated');
      fetchDash();
    } catch (err) { showToast(err.response?.data?.message || 'Escalation failed','error'); }
    finally { setEscalating(null); }
  };

  const handleRunEscalationCron = async () => {
    try {
      const r = await wfSvc.runEscalationCheck();
      showToast(`Escalation check: ${r.checked} checked, ${r.escalated} escalated`);
      fetchDash();
    } catch { showToast('Escalation check failed','error'); }
  };

  const s = dash?.summary || {};

  const tiles = [
    { icon:'📋', label:'Total Pending',       value: s.totalPending },
    { icon:'🔀', label:'Multi-Level Pending', value: s.pendingWithWorkflow },
    { icon:'📎', label:'Legacy Pending',      value: s.pendingLegacy },
    { icon:'✅', label:'Completed Today',     value: s.completedToday,   accent:'#10D988' },
    { icon:'⚠️', label:'SLA Breached',        value: s.slaBreached,      accent:'#EF4444' },
    { icon:'↑',  label:'Escalated',           value: s.escalated,        accent:'#F59E0B' },
  ];

  return (
    <div style={{ animation:'fadeUp .5s ease' }}>
      {toast && <Toast {...toast}/>}
      <PageHeader
        badge="Admin"
        title="Approval Dashboard"
        sub="Live overview of all pending approvals, SLA status, and escalations"
        action={
          <div style={{ display:'flex', gap:'.5rem', alignItems:'center' }}>
            <span style={{ fontSize:'.72rem', color:T.muted }}>Last refresh: {lastRefresh.toLocaleTimeString()}</span>
            <button onClick={fetchDash} style={{ padding:'.42rem .9rem', background:'rgba(0,198,255,.07)', border:`1px solid ${T.border}`, color:T.teal, borderRadius:'9px', fontFamily:"'DM Sans',sans-serif", fontWeight:'600', fontSize:'.78rem', cursor:'pointer' }}>⟳ Refresh</button>
            <button onClick={handleRunEscalationCron} style={{ padding:'.42rem .9rem', background:'rgba(245,158,11,.08)', border:'1px solid rgba(245,158,11,.2)', color:'#F59E0B', borderRadius:'9px', fontFamily:"'DM Sans',sans-serif", fontWeight:'600', fontSize:'.78rem', cursor:'pointer' }}>↑ Run Escalations</button>
          </div>
        }
      />

      {/* KPI tiles */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(175px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
        {tiles.map(t => <Tile key={t.label} loading={loading} {...t}/>)}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1.25rem', alignItems:'start' }}>

        {/* Pending by workflow */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', padding:'1.25rem' }}>
          <h4 style={{ fontFamily:"'Syne',sans-serif", fontWeight:'800', fontSize:'.9rem', marginBottom:'1rem' }}>Pending by Workflow</h4>
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'.5rem' }}>{[1,2,3].map(i=><Sk key={i} h="44px" w="100%" r="10px"/>)}</div>
          ) : !(dash?.byWorkflow?.length) ? (
            <p style={{ color:T.muted, fontSize:'.82rem', textAlign:'center', padding:'1.5rem 0' }}>No pending multi-level requests</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'.5rem' }}>
              {(dash.byWorkflow||[]).sort((a,b)=>b.count-a.count).map(wf => {
                const pct = s.pendingWithWorkflow ? Math.round((wf.count/s.pendingWithWorkflow)*100) : 0;
                return (
                  <div key={wf._id} style={{ background:'rgba(0,198,255,.03)', border:`1px solid ${T.border}`, borderRadius:'10px', padding:'.65rem .85rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'.3rem' }}>
                      <span style={{ fontSize:'.82rem', fontWeight:'600', color:T.white }}>{wf.workflowName || 'Standard Workflow'}</span>
                      <span style={{ fontSize:'.85rem', fontWeight:'700', color:T.teal }}>{wf.count}</span>
                    </div>
                    <div style={{ height:'4px', background:'rgba(255,255,255,.06)', borderRadius:'100px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:T.gradient, borderRadius:'100px', transition:'width .5s ease' }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SLA alerts */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', padding:'1.25rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
            <h4 style={{ fontFamily:"'Syne',sans-serif", fontWeight:'800', fontSize:'.9rem' }}>SLA Alerts</h4>
            {s.slaBreached > 0 && <span style={{ fontSize:'.7rem', fontWeight:'700', color:'#F87171', background:'rgba(239,68,68,.1)', padding:'.15rem .5rem', borderRadius:'100px' }}>{s.slaBreached} breached</span>}
          </div>
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'.5rem' }}>{[1,2,3].map(i=><Sk key={i} h="52px" w="100%" r="10px"/>)}</div>
          ) : !slaList.length ? (
            <div style={{ textAlign:'center', padding:'2rem 0' }}>
              <div style={{ fontSize:'1.75rem', marginBottom:'.5rem' }}>✅</div>
              <p style={{ color:T.slate, fontSize:'.85rem' }}>No SLA breaches</p>
            </div>
          ) : (
            slaList.map(r => <SLAAlert key={r._id} request={r} onEscalate={handleEscalate} escalating={escalating}/>)
          )}
        </div>

        {/* Recent activity */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', padding:'1.25rem' }}>
          <h4 style={{ fontFamily:"'Syne',sans-serif", fontWeight:'800', fontSize:'.9rem', marginBottom:'.75rem' }}>Recent Activity</h4>
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'.5rem' }}>{[1,2,3,4,5].map(i=><Sk key={i} h="44px" w="100%" r="8px"/>)}</div>
          ) : !(dash?.recentActivity?.length) ? (
            <p style={{ color:T.muted, fontSize:'.82rem', textAlign:'center', padding:'2rem 0' }}>No recent activity</p>
          ) : (
            <div style={{ maxHeight:'360px', overflowY:'auto' }}>
              {dash.recentActivity.map((entry, i) => <ActivityItem key={i} entry={entry}/>)}
            </div>
          )}
        </div>
      </div>
      <style>{`${GLOBAL_CSS} @keyframes shimmer { from{background-position:200% 0} to{background-position:-200% 0} }`}</style>
    </div>
  );
};

export default ApprovalDashboard;