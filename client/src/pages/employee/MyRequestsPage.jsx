// client/src/pages/employee/MyRequestsPage.jsx
// UPDATED — adds current layer, SLA status, and full ApprovalTimeline in the detail modal
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import axiosInstance from '../../api/axiosInstance';
import { T, Sk, StatusBadge, RiskBadge, Toast, PageHeader, TABLE_TH, GLOBAL_CSS } from '../../styles/darkTokens';
import ApprovalTimeline from '../../components/ApprovalTimeline';
import { getApprovalTimeline } from '../../services/approvalService';

const STATUSES = ['all','Pending','Approved','Rejected'];

// ── SLA pill ──────────────────────────────────────────────────────────────────
const SLAPill = ({ deadline }) => {
  if (!deadline) return null;
  const h = Math.round((new Date(deadline) - Date.now()) / 3600000);
  if (h < 0) return <span style={{ fontSize:'.7rem', fontWeight:'700', color:'#F87171', background:'rgba(239,68,68,.1)', padding:'.12rem .42rem', borderRadius:'100px' }}>⚠ Overdue</span>;
  if (h < 4) return <span style={{ fontSize:'.7rem', fontWeight:'700', color:'#F59E0B', background:'rgba(245,158,11,.1)', padding:'.12rem .42rem', borderRadius:'100px' }}>⏱ {h}h left</span>;
  return <span style={{ fontSize:'.7rem', color:T.muted }}>⏱ {h}h</span>;
};

// ── Full detail drawer ────────────────────────────────────────────────────────
const DetailModal = ({ request, timeline, loadingTimeline, onClose }) => {
  const [view, setView] = useState('info'); // 'info' | 'timeline'

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(5,13,31,.9)',backdropFilter:'blur(10px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1.5rem',animation:'fadeIn .2s ease' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:T.surface,border:`1px solid ${T.borderH}`,borderRadius:'20px',width:'100%',maxWidth:'560px',maxHeight:'88vh',overflowY:'auto',boxShadow:'0 24px 80px rgba(0,0,0,.6)',animation:'slideUp .25s ease' }}>
        {/* Header */}
        <div style={{ padding:'1.5rem 1.75rem 0', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:'800', fontSize:'1.05rem', marginBottom:'.3rem' }}>{request.requestedRole}</h3>
            <div style={{ display:'flex', gap:'.4rem', alignItems:'center', flexWrap:'wrap' }}>
              <StatusBadge status={request.status}/>
              <RiskBadge level={request.riskLevel||'low'}/>
              {request.workflowId && (
                <span style={{ fontSize:'.7rem', color:T.muted, background:'rgba(0,198,255,.06)', padding:'.12rem .42rem', borderRadius:'6px' }}>
                  {request.workflowId?.workflowName || 'Multi-level'}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(0,198,255,.08)', border:`1px solid ${T.border}`, color:T.slate, width:'32px', height:'32px', borderRadius:'8px', cursor:'pointer', fontSize:'1rem', minWidth:'32px' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ padding:'.75rem 1.75rem 0', display:'flex', gap:'.5rem', borderBottom:`1px solid ${T.border}`, marginTop:'.75rem' }}>
          {['info','timeline'].map(t=>(
            <button key={t} onClick={()=>setView(t)} style={{ padding:'.38rem .8rem', background:view===t?T.gradient:'transparent', border:view===t?'none':`1px solid ${T.border}`, color:view===t?T.navy:T.slate, borderRadius:'8px 8px 0 0', fontFamily:"'DM Sans',sans-serif", fontWeight:'600', fontSize:'.78rem', cursor:'pointer', textTransform:'capitalize' }}>
              {t==='timeline'?'Approval Timeline':'Request Info'}
            </button>
          ))}
        </div>

        <div style={{ padding:'1.25rem 1.75rem 1.75rem' }}>

          {/* ── Info view ─────────────────────────────────────────────────── */}
          {view === 'info' && (
            <>
              {/* Current layer status card */}
              {request.status === 'Pending' && request.currentApprovalLayerId && (
                <div style={{ background:'rgba(0,198,255,.06)', border:'1px solid rgba(0,198,255,.2)', borderRadius:'12px', padding:'1rem', marginBottom:'1.25rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'.5rem' }}>
                  <div>
                    <p style={{ fontSize:'.7rem', color:T.muted, fontWeight:'600', marginBottom:'.2rem', textTransform:'uppercase' }}>Currently at</p>
                    <p style={{ fontSize:'.92rem', fontWeight:'700', color:T.white }}>{request.currentApprovalLayerId.layerName}</p>
                  </div>
                  {request.slaDeadline && (
                    <div style={{ textAlign:'right' }}>
                      <p style={{ fontSize:'.7rem', color:T.muted, fontWeight:'600', marginBottom:'.2rem', textTransform:'uppercase' }}>SLA Deadline</p>
                      <SLAPill deadline={request.slaDeadline}/>
                    </div>
                  )}
                </div>
              )}

              {/* Fields */}
              {[
                { label:'Department',   value: request.department },
                { label:'Job Title',    value: request.jobTitle },
                { label:'Duration',     value: request.accessDuration || 'Permanent' },
                { label:'Submitted',    value: new Date(request.createdAt).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) },
                { label:'Risk Level',   value: <RiskBadge level={request.riskLevel||'low'}/> },
                ...(request.completedAt ? [{ label:'Completed', value: new Date(request.completedAt).toLocaleDateString() }] : []),
              ].map(item=>(
                <div key={item.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'.6rem 0', borderBottom:`1px solid ${T.border}` }}>
                  <span style={{ color:T.muted, fontSize:'.82rem' }}>{item.label}</span>
                  <span style={{ color:T.white, fontSize:'.83rem', fontWeight:'500' }}>{item.value}</span>
                </div>
              ))}

              {/* Justification */}
              <div style={{ marginTop:'.85rem' }}>
                <p style={{ color:T.muted, fontSize:'.75rem', marginBottom:'.35rem', fontWeight:'600', textTransform:'uppercase' }}>Justification</p>
                <p style={{ color:T.slate, fontSize:'.85rem', lineHeight:1.6, background:'rgba(0,198,255,.04)', padding:'.75rem', borderRadius:'8px' }}>{request.justification}</p>
              </div>

              {/* Manager comment / rejection */}
              {request.managerComment && (
                <div style={{ marginTop:'.85rem' }}>
                  <p style={{ color:T.muted, fontSize:'.75rem', marginBottom:'.35rem', fontWeight:'600', textTransform:'uppercase' }}>
                    {request.status==='Rejected' ? 'Rejection Reason' : 'Manager Comment'}
                  </p>
                  <p style={{ color: request.status==='Rejected'?'#F87171':T.slate, fontSize:'.85rem', lineHeight:1.6, background: request.status==='Rejected'?'rgba(239,68,68,.06)':'rgba(0,198,255,.04)', padding:'.75rem', borderRadius:'8px', borderLeft:`3px solid ${request.status==='Rejected'?'rgba(239,68,68,.4)':'rgba(0,198,255,.3)'}` }}>
                    {request.managerComment}
                  </p>
                  {request.status==='Rejected' && (
                    <Link to="/dashboard/submit-request" style={{ textDecoration:'none' }}>
                      <button style={{ marginTop:'.75rem', width:'100%', padding:'.65rem', background:T.gradient, border:'none', color:T.navy, borderRadius:'9px', fontFamily:"'DM Sans',sans-serif", fontWeight:'700', cursor:'pointer' }}>
                        ↺ Submit Updated Request
                      </button>
                    </Link>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Timeline view ─────────────────────────────────────────────── */}
          {view === 'timeline' && (
            loadingTimeline ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'.75rem' }}>
                {[1,2,3].map(i=><Sk key={i} h="70px" w="100%" r="12px"/>)}
              </div>
            ) : !request.workflowId ? (
              <div style={{ textAlign:'center', padding:'2rem', color:T.muted }}>
                <div style={{ fontSize:'1.5rem', marginBottom:'.5rem' }}>📎</div>
                <p style={{ fontSize:'.85rem' }}>This request uses single-level approval — no timeline available</p>
              </div>
            ) : (
              <>
                <ApprovalTimeline
                  approvalPath={timeline?.approvalPath || request.layerStatuses || []}
                  history={timeline?.history || []}
                />
                {timeline?.escalationCount > 0 && (
                  <div style={{ marginTop:'1rem', padding:'.55rem .85rem', background:'rgba(245,158,11,.08)', border:'1px solid rgba(245,158,11,.2)', borderRadius:'8px', fontSize:'.75rem', color:'#F59E0B', fontWeight:'600' }}>
                    ↑ Escalated {timeline.escalationCount} time{timeline.escalationCount!==1?'s':''}
                  </div>
                )}
                {timeline?.completedAt && (
                  <div style={{ marginTop:'.75rem', padding:'.55rem .85rem', background:'rgba(16,217,136,.06)', border:'1px solid rgba(16,217,136,.2)', borderRadius:'8px', fontSize:'.78rem', color:'#10D988', fontWeight:'600', textAlign:'center' }}>
                    ✅ Completed {new Date(timeline.completedAt).toLocaleDateString()}
                  </div>
                )}
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const MyRequestsPage = () => {
  const [data,            setData]            = useState({ requests:[], total:0, pages:1 });
  const [loading,         setLoading]         = useState(true);
  const [status,          setStatus]          = useState('all');
  const [page,            setPage]            = useState(1);
  const [detail,          setDetail]          = useState(null);
  const [timeline,        setTimeline]        = useState(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [toast,           setToast]           = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const fetchRequests = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit:15, ...(status!=='all'&&{status}) });
    axiosInstance.get(`/requests/my?${params}`)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [status, page]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  useEffect(() => { setPage(1); }, [status]);

  const openDetail = async (req) => {
    setDetail(req);
    setTimeline(null);
    if (req.workflowId) {
      setLoadingTimeline(true);
      try {
        const t = await getApprovalTimeline(req._id);
        setTimeline(t);
      } catch { showToast('Could not load timeline','error'); }
      finally { setLoadingTimeline(false); }
    }
  };

  return (
    <div style={{ animation:'fadeUp .5s ease' }}>
      {toast && <Toast {...toast}/>}
      <PageHeader badge="Employee" title="My Requests" sub="Track your ERP access requests and approval progress" />

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:'.5rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
        {STATUSES.map(s=>(
          <button key={s} onClick={()=>setStatus(s)} style={{ padding:'.45rem 1rem', background:status===s?T.gradient:'transparent', border:status===s?'none':`1px solid ${T.border}`, color:status===s?T.navy:T.slate, borderRadius:'100px', fontFamily:"'DM Sans',sans-serif", fontWeight:'600', fontSize:'.82rem', cursor:'pointer' }}>
            {s==='all'?'All':s}
          </button>
        ))}
        <span style={{ marginLeft:'auto', color:T.muted, fontSize:'.82rem', alignSelf:'center' }}>{data.total} total</span>
      </div>

      {/* Table */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'.75rem' }}>
            {[1,2,3,4,5].map(i=>(
              <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr 1fr', gap:'1rem', padding:'.75rem 0', borderBottom:`1px solid ${T.border}` }}>
                {[1,2,3,4,5,6,7].map(j=><Sk key={j} h="13px" w="80%"/>)}
              </div>
            ))}
          </div>
        ) : data.requests.length === 0 ? (
          <div style={{ padding:'5rem 2rem', textAlign:'center' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>📭</div>
            <p style={{ color:T.slate, marginBottom:'1.25rem' }}>{status==='all'?'No requests yet':`No ${status} requests`}</p>
            <Link to="/dashboard/submit-request" style={{ textDecoration:'none' }}>
              <button style={{ background:T.gradient, color:T.navy, border:'none', borderRadius:'9px', padding:'.65rem 1.4rem', fontFamily:"'DM Sans',sans-serif", fontWeight:'700', cursor:'pointer' }}>Submit a Request</button>
            </Link>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'rgba(0,198,255,.04)' }}>
                  {['Requested Role','Department','Submitted','Status','Current Layer','SLA','Risk','Comment'].map(c=>(
                    <th key={c} style={TABLE_TH}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.requests.map(req=>(
                  <tr key={req._id}
                    onClick={()=>openDetail(req)}
                    style={{ borderBottom:`1px solid ${T.border}`, cursor:'pointer', transition:'background .15s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(0,198,255,.04)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'.9rem 1.25rem', fontSize:'.88rem', fontWeight:'600', color:T.white }}>{req.requestedRole}</td>
                    <td style={{ padding:'.9rem 1.25rem', fontSize:'.83rem', color:T.slate }}>{req.department}</td>
                    <td style={{ padding:'.9rem 1.25rem', fontSize:'.8rem', color:T.muted, whiteSpace:'nowrap' }}>
                      {new Date(req.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                    </td>
                    <td style={{ padding:'.9rem 1.25rem' }}><StatusBadge status={req.status}/></td>
                    <td style={{ padding:'.9rem 1.25rem' }}>
                      {req.currentApprovalLayerId
                        ? <span style={{ fontSize:'.72rem', fontWeight:'700', color:T.teal, background:'rgba(0,198,255,.08)', padding:'.18rem .5rem', borderRadius:'6px', whiteSpace:'nowrap' }}>L{req.currentApprovalLayerId.layerLevel}: {req.currentApprovalLayerId.layerName}</span>
                        : req.status==='Approved' ? <span style={{ fontSize:'.72rem', color:'#10D988', fontWeight:'600' }}>✓ Complete</span>
                        : <span style={{ fontSize:'.72rem', color:T.muted }}>—</span>}
                    </td>
                    <td style={{ padding:'.9rem 1.25rem' }}>
                      {req.status==='Pending' ? <SLAPill deadline={req.slaDeadline}/> : <span style={{ color:T.muted, fontSize:'.75rem' }}>—</span>}
                    </td>
                    <td style={{ padding:'.9rem 1.25rem' }}><RiskBadge level={req.riskLevel||'low'}/></td>
                    <td style={{ padding:'.9rem 1.25rem', fontSize:'.8rem', color:T.muted, maxWidth:'160px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {req.managerComment||'—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data.pages > 1 && (
          <div style={{ padding:'.75rem 1.5rem', borderTop:`1px solid ${T.border}`, display:'flex', justifyContent:'center', gap:'.5rem' }}>
            {Array.from({length:data.pages},(_,i)=>i+1).map(p=>(
              <button key={p} onClick={()=>setPage(p)} style={{ width:'32px', height:'32px', background:page===p?T.gradient:'transparent', border:page===p?'none':`1px solid ${T.border}`, color:page===p?T.navy:T.slate, borderRadius:'8px', cursor:'pointer', fontWeight:'600', fontSize:'.82rem' }}>{p}</button>
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detail && (
        <DetailModal
          request={detail}
          timeline={timeline}
          loadingTimeline={loadingTimeline}
          onClose={()=>setDetail(null)}
        />
      )}
      <style>{GLOBAL_CSS}</style>
    </div>
  );
};

export default MyRequestsPage;