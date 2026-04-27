import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { T, Sk, RiskBadge, Toast, PageHeader, TABLE_TH, GLOBAL_CSS } from '../../styles/darkTokens';

const ReviewRequestsPage = () => {
  const [data,     setData]     = useState({ requests:[], total:0 });
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [comment,  setComment]  = useState('');
  const [actLoad,  setActLoad]  = useState(false);
  const [toast,    setToast]    = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const fetch = useCallback(() => {
    setLoading(true);
    axiosInstance.get('/requests/team?status=Pending&limit=50')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAction = async (action) => {
    setActLoad(true);
    try {
      await axiosInstance.patch(`/requests/${selected._id}/review`, { status: action, managerComment: comment });
      showToast(action==='approved' ? '✅ Request approved' : '✕ Request rejected');
      setSelected(null); setComment('');
      fetch();
    } catch {
      showToast('Action failed — please try again', 'error');
    } finally { setActLoad(false); }
  };

  return (
    <div style={{ animation:'fadeUp .5s ease' }}>
      {toast && <Toast {...toast}/>}

      <PageHeader badge="Manager" badgeColor="cyan" title="Review Requests"
        sub={`${data.total} pending requests from your team`}/>

      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'.75rem' }}>
            {[1,2,3].map(i=>(
              <div key={i} style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 1fr 1fr', gap:'1rem', padding:'.75rem 0', borderBottom:`1px solid ${T.border}` }}>
                <Sk h="13px" w="70%"/><Sk h="13px" w="60%"/><Sk h="13px" w="65%"/><Sk h="22px" w="80px" r="100px"/><Sk h="32px" w="90px" r="8px"/>
              </div>
            ))}
          </div>
        ) : data.requests.length === 0 ? (
          <div style={{ padding:'5rem', textAlign:'center' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>🎉</div>
            <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:'700', marginBottom:'.4rem' }}>All caught up!</p>
            <p style={{ color:T.slate }}>No pending requests from your team.</p>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'rgba(0,198,255,.04)' }}>
                  {['Employee','Role Requested','Department','Submitted','Risk','Action'].map(c=><th key={c} style={TABLE_TH}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.requests.map(req => (
                  <tr key={req._id} style={{ borderBottom:`1px solid ${T.border}`, transition:'background .15s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(0,198,255,.04)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'.9rem 1.25rem' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'.6rem' }}>
                        <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:T.gradient, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700', color:T.navy, fontSize:'.75rem', minWidth:'30px' }}>
                          {req.employee?.fullName?.charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontSize:'.85rem', fontWeight:'600', color:T.white, lineHeight:1.2 }}>{req.employee?.fullName}</p>
                          <p style={{ fontSize:'.75rem', color:T.muted }}>{req.employee?.jobTitle}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'.9rem 1.25rem', fontWeight:'600', fontSize:'.88rem', color:T.white }}>{req.requestedRole}</td>
                    <td style={{ padding:'.9rem 1.25rem', fontSize:'.83rem', color:T.slate }}>{req.employee?.department}</td>
                    <td style={{ padding:'.9rem 1.25rem', fontSize:'.8rem', color:T.muted, whiteSpace:'nowrap' }}>
                      {new Date(req.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                    </td>
                    <td style={{ padding:'.9rem 1.25rem' }}><RiskBadge level={req.riskLevel||'low'}/></td>
                    <td style={{ padding:'.9rem 1.25rem' }}>
                      <button onClick={() => { setSelected(req); setComment(''); }} style={{
                        background:T.gradient, color:T.navy, border:'none',
                        borderRadius:'8px', padding:'.45rem .9rem',
                        fontFamily:"'DM Sans',sans-serif", fontSize:'.82rem', fontWeight:'700',
                        cursor:'pointer', boxShadow:'0 2px 10px rgba(0,198,255,.25)',
                      }}>
                        Review →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selected && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(5,13,31,.85)',
          backdropFilter:'blur(8px)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem',
          animation:'fadeIn .2s ease',
        }} onClick={e=>e.target===e.currentTarget&&setSelected(null)}>
          <div style={{
            background:T.surface, border:`1px solid ${T.borderH}`,
            borderRadius:'20px', padding:'2rem', width:'100%', maxWidth:'500px',
            boxShadow:'0 24px 80px rgba(0,0,0,.5)', animation:'slideUp .25s ease',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'1.5rem' }}>
              <div>
                <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:'800', fontSize:'1.1rem', marginBottom:'.2rem' }}>Review Access Request</h3>
                <p style={{ color:T.muted, fontSize:'.78rem' }}>#{selected._id?.slice(-8).toUpperCase()}</p>
              </div>
              <button onClick={()=>setSelected(null)} style={{ background:'rgba(0,198,255,.08)', border:`1px solid ${T.border}`, color:T.slate, width:'32px', height:'32px', borderRadius:'8px', cursor:'pointer' }}>✕</button>
            </div>

            {/* Details */}
            <div style={{ background:'rgba(0,198,255,.04)', border:`1px solid ${T.border}`, borderRadius:'12px', padding:'1.1rem', marginBottom:'1.25rem' }}>
              {[
                { label:'Employee',  value: selected.employee?.fullName },
                { label:'Dept.',     value: selected.employee?.department },
                { label:'Requested', value: selected.requestedRole },
                { label:'Duration',  value: selected.accessDuration || 'Permanent' },
                { label:'Submitted', value: new Date(selected.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) },
              ].map(item=>(
                <div key={item.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:'.45rem' }}>
                  <span style={{ color:T.muted, fontSize:'.82rem' }}>{item.label}</span>
                  <span style={{ color:T.white, fontSize:'.82rem', fontWeight:'500' }}>{item.value}</span>
                </div>
              ))}
              {selected.justification && (
                <div style={{ marginTop:'.75rem', paddingTop:'.75rem', borderTop:`1px solid ${T.border}` }}>
                  <p style={{ color:T.muted, fontSize:'.75rem', marginBottom:'.3rem' }}>Justification</p>
                  <p style={{ color:T.slate, fontSize:'.83rem', lineHeight:1.55 }}>{selected.justification}</p>
                </div>
              )}
              <div style={{ marginTop:'.75rem' }}><RiskBadge level={selected.riskLevel||'low'}/></div>
            </div>

            {/* Comment */}
            <div style={{ marginBottom:'1.25rem' }}>
              <label style={{ display:'block', fontSize:'.82rem', fontWeight:'600', color:T.slate, marginBottom:'.4rem' }}>
                Comment <span style={{ color:T.muted, fontWeight:'400' }}>(optional)</span>
              </label>
              <textarea value={comment} onChange={e=>setComment(e.target.value)}
                placeholder="Add a note for the employee…" rows={3}
                style={{
                  width:'100%', padding:'.8rem 1rem',
                  background:T.navyMid, border:`1px solid ${T.border}`,
                  color:T.white, borderRadius:'10px', fontSize:'.88rem',
                  outline:'none', resize:'vertical', fontFamily:"'DM Sans',sans-serif", boxSizing:'border-box',
                }}
                onFocus={e=>e.target.style.borderColor=T.teal}
                onBlur={e=>e.target.style.borderColor=T.border}
              />
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:'.75rem' }}>
              <button onClick={()=>handleAction('rejected')} disabled={actLoad} style={{
                flex:1, padding:'.85rem',
                background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)',
                color:'#F87171', borderRadius:'10px',
                fontFamily:"'DM Sans',sans-serif", fontWeight:'700', cursor: actLoad?'not-allowed':'pointer',
              }}>✕ Reject</button>
              <button onClick={()=>handleAction('approved')} disabled={actLoad} style={{
                flex:2, padding:'.85rem',
                background: actLoad ? 'rgba(16,217,136,.3)' : 'linear-gradient(135deg,#10D988,#059669)',
                border:'none', color:T.navy, borderRadius:'10px',
                fontFamily:"'DM Sans',sans-serif", fontWeight:'700', cursor: actLoad?'not-allowed':'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:'.5rem',
              }}>
                {actLoad && <span style={{ width:'14px', height:'14px', border:`2px solid rgba(5,13,31,.3)`, borderTopColor:T.navy, borderRadius:'50%', display:'inline-block', animation:'spin 1s linear infinite' }}/>}
                ✓ Approve
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{GLOBAL_CSS}</style>
    </div>
  );
};

export default ReviewRequestsPage;