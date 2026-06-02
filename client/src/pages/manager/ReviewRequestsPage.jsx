// client/src/pages/manager/ReviewRequestsPage.jsx
// UPDATED — full multi-level approval support while keeping legacy single-level intact
import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { T, Sk, StatusBadge, RiskBadge, Toast, PageHeader, TABLE_TH, GLOBAL_CSS } from '../../styles/darkTokens';
import ApprovalTimeline from '../../components/ApprovalTimeline';
import { approveRequest, rejectRequest, delegateApproval, getApprovalDetails } from '../../services/approvalService';
import { useAuth } from '../../contexts/AuthContext';

const TABS = ['Pending','Approved','Rejected','all'];

// ── SLA pill ──────────────────────────────────────────────────────────────────
const SLAPill = ({ deadline, breached }) => {
  if (!deadline) return <span style={{ color:T.muted, fontSize:'.75rem' }}>—</span>;
  const h = Math.round((new Date(deadline) - Date.now()) / 3600000);
  if (breached || h < 0) return <span style={{ fontSize:'.72rem', fontWeight:'700', color:'#F87171', background:'rgba(239,68,68,.1)', padding:'.15rem .5rem', borderRadius:'100px' }}>⚠ {Math.abs(h)}h overdue</span>;
  if (h < 4) return <span style={{ fontSize:'.72rem', fontWeight:'700', color:'#F59E0B', background:'rgba(245,158,11,.1)', padding:'.15rem .5rem', borderRadius:'100px' }}>⏱ {h}h left</span>;
  return <span style={{ fontSize:'.72rem', color:T.muted }}>⏱ {h}h left</span>;
};

// ── Full request detail modal ─────────────────────────────────────────────────
const RequestDetailModal = ({ request, approvalPath, history, onClose, onApprove, onReject, onDelegate, acting }) => {
  const [view,       setView]       = useState('detail'); // 'detail' | 'timeline'
  const [comment,    setComment]    = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [suggestion,   setSuggestion]   = useState('');
  const [delegateId,   setDelegateId]   = useState('');
  const [delegateReason, setDelegateReason] = useState('');
  const [action,     setAction]     = useState(null);   // null | 'reject' | 'delegate'
  const [users,      setUsers]      = useState([]);

  useEffect(() => {
    if (action === 'delegate') {
      axiosInstance.get('/users?role=manager').then(r => setUsers(Array.isArray(r.data) ? r.data : r.data.users||[])).catch(()=>{});
    }
  }, [action]);

  const isMultiLevel = !!request.workflowId;
  const currentLayer = request.currentApprovalLayerId;

  const inp = { width:'100%', padding:'.6rem .85rem', background:'rgba(0,198,255,.04)', border:`1px solid ${T.border}`, color:T.white, borderRadius:'9px', fontSize:'.85rem', outline:'none', fontFamily:"'DM Sans',sans-serif", boxSizing:'border-box', resize:'vertical' };

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(5,13,31,.9)',backdropFilter:'blur(10px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1.5rem',animation:'fadeIn .2s ease' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:T.surface,border:`1px solid ${T.borderH}`,borderRadius:'20px',width:'100%',maxWidth:'640px',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 24px 80px rgba(0,0,0,.6)',animation:'slideUp .25s ease' }}>
        {/* Header */}
        <div style={{ padding:'1.5rem 1.75rem 0', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:'800', fontSize:'1.1rem', marginBottom:'.3rem' }}>{request.requestedRole}</h3>
            <div style={{ display:'flex', gap:'.5rem', alignItems:'center', flexWrap:'wrap' }}>
              <span style={{ fontSize:'.78rem', color:T.slate }}>{request.employee?.fullName}</span>
              <span style={{ color:T.muted }}>·</span>
              <StatusBadge status={request.status}/>
              <RiskBadge level={request.riskLevel||'low'}/>
              {isMultiLevel && currentLayer && (
                <span style={{ fontSize:'.72rem', fontWeight:'700', color:T.teal, background:'rgba(0,198,255,.1)', padding:'.15rem .5rem', borderRadius:'100px', border:'1px solid rgba(0,198,255,.25)' }}>
                  {currentLayer.layerName}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(0,198,255,.08)', border:`1px solid ${T.border}`, color:T.slate, width:'32px', height:'32px', borderRadius:'8px', cursor:'pointer', fontSize:'1rem', minWidth:'32px' }}>✕</button>
        </div>

        {/* Tabs (only if multi-level) */}
        {isMultiLevel && (
          <div style={{ padding:'.75rem 1.75rem 0', display:'flex', gap:'.5rem', borderBottom:`1px solid ${T.border}`, marginTop:'.75rem' }}>
            {['detail','timeline'].map(t=>(
              <button key={t} onClick={()=>setView(t)} style={{ padding:'.4rem .85rem', background: view===t ? T.gradient : 'transparent', border: view===t ? 'none' : `1px solid ${T.border}`, color: view===t ? T.navy : T.slate, borderRadius:'8px 8px 0 0', fontFamily:"'DM Sans',sans-serif", fontWeight:'600', fontSize:'.78rem', cursor:'pointer', textTransform:'capitalize' }}>{t==='timeline'?'Approval Timeline':'Details'}</button>
            ))}
          </div>
        )}

        <div style={{ padding:'1.25rem 1.75rem' }}>
          {/* ── Detail view ─────────────────────────────────────────────── */}
          {view === 'detail' && (
            <>
              {/* Request info */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.5rem', marginBottom:'1rem' }}>
                {[
                  { label:'Department',   value: request.department },
                  { label:'Job Title',    value: request.jobTitle },
                  { label:'Duration',     value: request.accessDuration || 'Permanent' },
                  { label:'Submitted',    value: new Date(request.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) },
                  ...(isMultiLevel && request.slaDeadline ? [{ label:'SLA Deadline', value: <SLAPill deadline={request.slaDeadline} breached={false}/> }] : []),
                  ...(isMultiLevel && currentLayer ? [{ label:'Next Layer', value: <span style={{ color:T.teal, fontSize:'.82rem', fontWeight:'600' }}>{currentLayer.layerName}</span> }] : []),
                ].map(item=>(
                  <div key={item.label} style={{ display:'flex', flexDirection:'column', gap:'.2rem', padding:'.55rem .75rem', background:'rgba(0,198,255,.03)', borderRadius:'8px' }}>
                    <span style={{ fontSize:'.7rem', color:T.muted, fontWeight:'600', textTransform:'uppercase', letterSpacing:'.04em' }}>{item.label}</span>
                    <span style={{ fontSize:'.83rem', color:T.white }}>{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Justification */}
              <div style={{ marginBottom:'1.25rem', padding:'.75rem', background:'rgba(0,198,255,.04)', borderRadius:'10px', borderLeft:`3px solid rgba(0,198,255,.3)` }}>
                <p style={{ fontSize:'.7rem', color:T.muted, fontWeight:'600', marginBottom:'.35rem', textTransform:'uppercase' }}>Justification</p>
                <p style={{ fontSize:'.85rem', color:T.slate, lineHeight:1.6 }}>{request.justification}</p>
              </div>

              {/* Previous layer comments */}
              {isMultiLevel && request.approvalHistory?.filter(h=>h.approvalAction==='APPROVED').length > 0 && (
                <div style={{ marginBottom:'1.25rem' }}>
                  <p style={{ fontSize:'.73rem', color:T.muted, fontWeight:'600', marginBottom:'.5rem', textTransform:'uppercase' }}>Previous Approvals</p>
                  {request.approvalHistory.filter(h=>h.approvalAction==='APPROVED').map((h,i) => (
                    <div key={i} style={{ display:'flex', gap:'.6rem', alignItems:'flex-start', marginBottom:'.4rem', padding:'.5rem .75rem', background:'rgba(16,217,136,.05)', borderRadius:'8px', borderLeft:'2px solid rgba(16,217,136,.3)' }}>
                      <span style={{ fontSize:'.75rem', color:'#10D988', fontWeight:'700', whiteSpace:'nowrap' }}>✓ L{i+1}</span>
                      <div>
                        <p style={{ fontSize:'.78rem', color:T.white, fontWeight:'600' }}>{h.approvedBy?.fullName||'—'}</p>
                        {h.approvalComments && <p style={{ fontSize:'.73rem', color:T.muted }}>{h.approvalComments}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action form */}
              {request.status === 'Pending' && (
                <>
                  <div style={{ marginBottom:'1rem' }}>
                    <label style={{ fontSize:'.78rem', fontWeight:'600', color:T.slate, display:'block', marginBottom:'.35rem' }}>Comments</label>
                    <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Add approval comments…" rows={2} style={{ ...inp }} />
                  </div>

                  {action === 'reject' && (
                    <>
                      <div style={{ marginBottom:'.85rem' }}>
                        <label style={{ fontSize:'.78rem', fontWeight:'600', color:'#F87171', display:'block', marginBottom:'.35rem' }}>Rejection Reason *</label>
                        <textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="Clearly explain why the request is rejected…" rows={2} style={{ ...inp, borderColor:'rgba(239,68,68,.4)' }} />
                      </div>
                      <div style={{ marginBottom:'.85rem' }}>
                        <label style={{ fontSize:'.78rem', fontWeight:'600', color:T.slate, display:'block', marginBottom:'.35rem' }}>Suggested Changes (optional)</label>
                        <textarea value={suggestion} onChange={e=>setSuggestion(e.target.value)} placeholder="What should the employee change before resubmitting?" rows={2} style={inp} />
                      </div>
                    </>
                  )}

                  {action === 'delegate' && (
                    <>
                      <div style={{ marginBottom:'.85rem' }}>
                        <label style={{ fontSize:'.78rem', fontWeight:'600', color:T.slate, display:'block', marginBottom:'.35rem' }}>Delegate To *</label>
                        <select value={delegateId} onChange={e=>setDelegateId(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                          <option value="">Select user…</option>
                          {users.map(u=><option key={u._id} value={u._id}>{u.fullName} ({u.jobTitle})</option>)}
                        </select>
                      </div>
                      <div style={{ marginBottom:'.85rem' }}>
                        <label style={{ fontSize:'.78rem', fontWeight:'600', color:T.slate, display:'block', marginBottom:'.35rem' }}>Reason</label>
                        <input value={delegateReason} onChange={e=>setDelegateReason(e.target.value)} placeholder="e.g. Out of office this week" style={inp} />
                      </div>
                    </>
                  )}

                  <div style={{ display:'flex', gap:'.6rem', flexWrap:'wrap' }}>
                    {action === 'reject' ? (
                      <>
                        <button onClick={()=>setAction(null)} style={{ flex:1, padding:'.7rem', background:'rgba(255,255,255,.04)', border:`1px solid ${T.border}`, color:T.slate, borderRadius:'9px', fontFamily:"'DM Sans',sans-serif", fontWeight:'600', cursor:'pointer' }}>Back</button>
                        <button onClick={()=>onReject(request._id, rejectReason, suggestion)} disabled={!rejectReason.trim()||acting} style={{ flex:2, padding:'.7rem', background: !rejectReason.trim()||acting?'rgba(239,68,68,.2)':'rgba(239,68,68,.15)', border:'1px solid rgba(239,68,68,.3)', color:'#F87171', borderRadius:'9px', fontFamily:"'DM Sans',sans-serif", fontWeight:'700', cursor:(!rejectReason.trim()||acting)?'not-allowed':'pointer' }}>
                          {acting?'…':'Confirm Rejection'}
                        </button>
                      </>
                    ) : action === 'delegate' ? (
                      <>
                        <button onClick={()=>setAction(null)} style={{ flex:1, padding:'.7rem', background:'rgba(255,255,255,.04)', border:`1px solid ${T.border}`, color:T.slate, borderRadius:'9px', fontFamily:"'DM Sans',sans-serif", fontWeight:'600', cursor:'pointer' }}>Back</button>
                        <button onClick={()=>onDelegate(request._id, delegateId, delegateReason)} disabled={!delegateId||acting} style={{ flex:2, padding:'.7rem', background: !delegateId||acting?'rgba(167,139,250,.15)':'rgba(167,139,250,.1)', border:'1px solid rgba(167,139,250,.3)', color:'#A78BFA', borderRadius:'9px', fontFamily:"'DM Sans',sans-serif", fontWeight:'700', cursor:(!delegateId||acting)?'not-allowed':'pointer' }}>
                          {acting?'…':'Delegate'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={()=>setAction('reject')} style={{ padding:'.7rem .9rem', background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', color:'#F87171', borderRadius:'9px', fontFamily:"'DM Sans',sans-serif", fontWeight:'700', cursor:'pointer' }}>✕ Reject</button>
                        {isMultiLevel && <button onClick={()=>setAction('delegate')} style={{ padding:'.7rem .9rem', background:'rgba(167,139,250,.08)', border:'1px solid rgba(167,139,250,.25)', color:'#A78BFA', borderRadius:'9px', fontFamily:"'DM Sans',sans-serif", fontWeight:'700', cursor:'pointer' }}>⇄ Delegate</button>}
                        <button onClick={()=>onApprove(request._id, comment)} disabled={acting} style={{ flex:1, padding:'.7rem 1.25rem', background:acting?'rgba(0,198,255,.2)':T.gradient, border:'none', color:T.navy, borderRadius:'9px', fontFamily:"'DM Sans',sans-serif", fontWeight:'700', cursor:acting?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'.4rem' }}>
                          {acting && <span style={{ width:'12px', height:'12px', border:'2px solid rgba(5,13,31,.3)', borderTopColor:T.navy, borderRadius:'50%', display:'inline-block', animation:'spin 1s linear infinite' }}/>}
                          {acting ? 'Approving…' : '✓ Approve'}
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Timeline view ───────────────────────────────────────────── */}
          {view === 'timeline' && (
            <ApprovalTimeline approvalPath={approvalPath} history={history} />
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const ReviewRequestsPage = () => {
  const { user } = useAuth();
  const [data,    setData]    = useState({ requests:[], total:0 });
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('Pending');
  const [page,    setPage]    = useState(1);
  const [detail,  setDetail]  = useState(null);   // { request, approvalPath, history }
  const [acting,  setActing]  = useState(false);
  const [toast,   setToast]   = useState(null);
  const LIMIT = 20;

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const fetchRequests = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit:LIMIT, ...(tab!=='all' && { status:tab }) });
    axiosInstance.get(`/approver/pending-approvals?${params}`)
      .then(r => setData(r.data))
      .catch(() => {
        // Fallback to team endpoint for legacy flow
        axiosInstance.get(`/requests/team?${params}`).then(r => setData(r.data)).catch(console.error);
      })
      .finally(() => setLoading(false));
  }, [tab, page]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  useEffect(() => { setPage(1); }, [tab]);

  const openDetail = async (req) => {
    if (req.workflowId) {
      try {
        const d = await getApprovalDetails(req._id);
        setDetail({ request: d.request || req, approvalPath: d.approvalPath || [], history: d.request?.approvalHistory || [] });
      } catch { setDetail({ request: req, approvalPath: req.layerStatuses || [], history: [] }); }
    } else {
      setDetail({ request: req, approvalPath: [], history: [] });
    }
  };

  const handleApprove = async (requestId, comments) => {
    setActing(true);
    try {
      const res = await approveRequest(requestId, comments);
      showToast(res.isComplete ? '✅ Access approved — workflow complete!' : `✓ Layer approved. Moving to: ${res.nextLayer?.name || 'next layer'}`);
      setDetail(null);
      fetchRequests();
    } catch (err) { showToast(err.response?.data?.message || 'Approval failed', 'error'); }
    finally { setActing(false); }
  };

  const handleReject = async (requestId, reason, suggestion) => {
    setActing(true);
    try {
      await rejectRequest(requestId, reason, suggestion);
      showToast('Request rejected and returned to employee');
      setDetail(null);
      fetchRequests();
    } catch (err) { showToast(err.response?.data?.message || 'Rejection failed', 'error'); }
    finally { setActing(false); }
  };

  const handleDelegate = async (requestId, delegateToUserId, reason) => {
    setActing(true);
    try {
      const res = await delegateApproval(requestId, delegateToUserId, reason);
      showToast(`Delegated to ${res.delegatedTo?.fullName}`);
      setDetail(null);
      fetchRequests();
    } catch (err) { showToast(err.response?.data?.message || 'Delegation failed', 'error'); }
    finally { setActing(false); }
  };

  const requests = data.requests || [];
  const pages    = data.pages || Math.ceil((data.total||0) / LIMIT) || 1;

  return (
    <div style={{ animation:'fadeUp .5s ease' }}>
      {toast && <Toast {...toast}/>}
      <PageHeader
        badge={user?.role === 'admin' ? 'Admin' : 'Manager'}
        title={user?.role === 'admin' ? 'Approval Queue' : 'Review Requests'}
        sub="Approve, reject, or delegate access requests in your queue"
      />

      {/* Stats banner */}
      {!loading && (
        <div style={{ display:'flex', gap:'.75rem', marginBottom:'1.25rem', flexWrap:'wrap' }}>
          {[
            { label:'In Queue', value:data.total||0, color:T.teal },
            { label:'SLA Breached', value:requests.filter(r=>r.slaBreached).length, color:'#F87171' },
            { label:'Multi-Level', value:requests.filter(r=>r.workflowId).length, color:'#A78BFA' },
          ].map(s=>(
            <div key={s.label} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'10px', padding:'.55rem 1rem', display:'flex', gap:'.5rem', alignItems:'center' }}>
              <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:'800', fontSize:'1.1rem', color:s.color }}>{s.value}</span>
              <span style={{ fontSize:'.75rem', color:T.muted }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:'.5rem', marginBottom:'1.25rem', flexWrap:'wrap' }}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:'.42rem .95rem', background:tab===t?T.gradient:'transparent', border:tab===t?'none':`1px solid ${T.border}`, color:tab===t?T.navy:T.slate, borderRadius:'100px', fontFamily:"'DM Sans',sans-serif", fontWeight:'600', fontSize:'.82rem', cursor:'pointer' }}>
            {t==='all'?'All':t}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:'1.25rem', display:'flex', flexDirection:'column', gap:'.65rem' }}>
            {[1,2,3,4,5].map(i=>(
              <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr', gap:'1rem', padding:'.65rem 0', borderBottom:`1px solid ${T.border}` }}>
                {[1,2,3,4,5,6].map(j=><Sk key={j} h="13px" w="80%"/>)}
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div style={{ padding:'5rem 2rem', textAlign:'center' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>🎉</div>
            <p style={{ color:T.slate, fontSize:'.9rem' }}>{tab==='Pending'?'No pending requests — queue is clear!':'No requests found'}</p>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(0,198,255,.04)' }}>
                  {['Employee', 'Role', 'Department', 'Current Layer', 'Assigned Approvers', 'SLA', 'Risk', 'Status', ''].map(c => (
                    <th key={c} style={TABLE_TH}>{c}</th>
                  ))}
                </tr>
              </thead>
              {/* Inside the <tbody> of your table - replace the row rendering part */}

              {requests.map(req => {
                const assignedApprovers = req.currentApproverIds || [];
                
                return (
                  <tr 
                    key={req._id}
                    onClick={() => openDetail(req)}
                    style={{ borderBottom: `1px solid ${T.border}`, cursor: 'pointer', transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,198,255,.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '.85rem 1.1rem' }}>
                      {/* Employee Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: T.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: T.navy, fontSize: '.68rem' }}>
                          {req.employee?.fullName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p style={{ fontSize: '.83rem', fontWeight: '600', color: T.white }}>{req.employee?.fullName}</p>
                          <p style={{ fontSize: '.7rem', color: T.muted }}>{req.employee?.jobTitle}</p>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '.85rem 1.1rem', fontSize: '.83rem', fontWeight: '600', color: T.white }}>{req.requestedRole}</td>
                    <td style={{ padding: '.85rem 1.1rem', fontSize: '.8rem', color: T.slate }}>{req.department}</td>

                    {/* NEW: Current Layer */}
                    <td style={{ padding: '.85rem 1.1rem' }}>
                      {req.currentApprovalLayerId ? (
                        <span style={{ fontSize: '.72rem', fontWeight: '700', color: T.teal, background: 'rgba(0,198,255,.08)', padding: '.2rem .5rem', borderRadius: '6px' }}>
                          L{req.currentApprovalLayerId.layerLevel}: {req.currentApprovalLayerId.layerName}
                        </span>
                      ) : (
                        <span style={{ fontSize: '.72rem', color: T.muted }}>Legacy</span>
                      )}
                    </td>

                    {/* NEW: Assigned Approvers Column */}
                    <td style={{ padding: '.85rem 1.1rem', fontSize: '.78rem' }}>
                      {assignedApprovers.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {assignedApprovers.slice(0, 2).map((approver, i) => (
                            <div key={i} style={{ color: T.slate }}>
                              {typeof approver === 'object' ? approver.fullName : approver}
                            </div>
                          ))}
                          {assignedApprovers.length > 2 && (
                            <span style={{ color: T.muted, fontSize: '.7rem' }}>+{assignedApprovers.length - 2} more</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: T.muted }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: '.85rem 1.1rem' }}>
                      <SLAPill deadline={req.slaDeadline} breached={req.slaBreached} />
                    </td>
                    <td style={{ padding: '.85rem 1.1rem' }}><RiskBadge level={req.riskLevel || 'low'} /></td>
                    <td style={{ padding: '.85rem 1.1rem' }}><StatusBadge status={req.status} /></td>
                    <td style={{ padding: '.85rem 1.1rem' }}>
                      {req.status === 'Pending' && <span style={{ fontSize: '.75rem', color: T.teal, fontWeight: '600' }}>Review →</span>}
                    </td>
                  </tr>
                );
              })}
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ padding:'.75rem 1.5rem', borderTop:`1px solid ${T.border}`, display:'flex', justifyContent:'center', gap:'.5rem' }}>
            {Array.from({ length:pages },(_,i)=>i+1).map(p=>(
              <button key={p} onClick={()=>setPage(p)} style={{ width:'32px', height:'32px', background:page===p?T.gradient:'transparent', border:page===p?'none':`1px solid ${T.border}`, color:page===p?T.navy:T.slate, borderRadius:'8px', cursor:'pointer', fontWeight:'600', fontSize:'.82rem' }}>{p}</button>
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detail && (
        <RequestDetailModal
          request={detail.request}
          approvalPath={detail.approvalPath}
          history={detail.history}
          acting={acting}
          onClose={()=>setDetail(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onDelegate={handleDelegate}
        />
      )}
      <style>{GLOBAL_CSS}</style>
    </div>
  );
};

export default ReviewRequestsPage;
