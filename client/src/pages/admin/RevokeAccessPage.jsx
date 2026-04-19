import { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { T, Sk, Toast, PageHeader, TABLE_TH, GLOBAL_CSS } from '../../styles/darkTokens';

const RevokeAccessPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState(null);
  const [confirm,  setConfirm]  = useState(null); // { id, role, employeeName }
  const [reason,   setReason]   = useState('');
  const [revoking, setRevoking] = useState(false);
  const [search,   setSearch]   = useState('');

  const showToast = (msg,type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const fetchApproved = () => {
    setLoading(true);
    axiosInstance.get('/requests?status=Approved&limit=100')
      .then(res => setRequests(res.data.requests || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(fetchApproved, []);

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      await axiosInstance.patch(`/requests/${confirm.id}/revoke`, { reason });
      showToast(`Access revoked for ${confirm.employeeName}`);
      setConfirm(null); setReason(''); fetchApproved();
    } catch { showToast('Revoke failed','error'); }
    finally { setRevoking(false); }
  };

  const filtered = requests.filter(r =>
    !search ||
    r.employee?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    r.requestedRole?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ animation:'fadeUp .5s ease' }}>
      {toast && <Toast {...toast}/>}

      <PageHeader badge="Admin Console" badgeColor="purple" title="Revoke Access"
        sub={`${requests.length} active approved access grants`}/>

      <div style={{ background:'rgba(239,68,68,.06)',border:'1px solid rgba(239,68,68,.2)',borderRadius:'12px',padding:'1rem 1.25rem',display:'flex',gap:'.75rem',alignItems:'center',marginBottom:'1.5rem' }}>
        <span style={{ fontSize:'1rem' }}>⚠️</span>
        <p style={{ fontSize:'.83rem',color:'#F87171' }}>Revoking access immediately removes the user's ERP permissions and logs the event.</p>
      </div>

      <div style={{ marginBottom:'1.25rem' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search by employee name or role…"
          style={{ width:'100%',padding:'.65rem 1rem',background:T.surface,border:`1px solid ${T.border}`,color:T.white,borderRadius:'10px',fontSize:'.88rem',outline:'none',fontFamily:"'DM Sans',sans-serif",boxSizing:'border-box' }}
          onFocus={e=>e.target.style.borderColor=T.teal} onBlur={e=>e.target.style.borderColor=T.border}
        />
      </div>

      <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:'16px',overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:'1.5rem',display:'flex',flexDirection:'column',gap:'.75rem' }}>
            {[1,2,3].map(i=>(
              <div key={i} style={{ display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr',gap:'1rem',padding:'.75rem 0',borderBottom:`1px solid ${T.border}` }}>
                <Sk h="13px" w="70%"/><Sk h="13px" w="60%"/><Sk h="13px" w="50%"/><Sk h="13px" w="60%"/><Sk h="32px" w="90px" r="8px"/>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:'5rem',textAlign:'center',color:T.muted }}>
            {search ? 'No matching access grants found' : 'No approved access grants to revoke'}
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'rgba(0,198,255,.04)' }}>
                  {['Employee','Role','Department','Approved Date','Duration','Action'].map(c=><th key={c} style={TABLE_TH}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(req=>(
                  <tr key={req._id} style={{ borderBottom:`1px solid ${T.border}`,transition:'background .15s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,.03)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'.9rem 1.25rem' }}>
                      <p style={{ fontSize:'.88rem',fontWeight:'600',color:T.white }}>{req.employee?.fullName}</p>
                      <p style={{ fontSize:'.75rem',color:T.muted }}>{req.employee?.email}</p>
                    </td>
                    <td style={{ padding:'.9rem 1.25rem',fontSize:'.88rem',fontWeight:'600',color:T.white }}>{req.requestedRole}</td>
                    <td style={{ padding:'.9rem 1.25rem',fontSize:'.83rem',color:T.slate }}>{req.department}</td>
                    <td style={{ padding:'.9rem 1.25rem',fontSize:'.8rem',color:T.muted,whiteSpace:'nowrap' }}>
                      {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'}
                    </td>
                    <td style={{ padding:'.9rem 1.25rem',fontSize:'.8rem',color:T.slate }}>{req.accessDuration||'Permanent'}</td>
                    <td style={{ padding:'.9rem 1.25rem' }}>
                      <button onClick={()=>setConfirm({id:req._id,role:req.requestedRole,employeeName:req.employee?.fullName})} style={{
                        background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.3)',color:'#F87171',
                        borderRadius:'8px',padding:'.4rem .9rem',fontFamily:"'DM Sans',sans-serif",fontSize:'.8rem',fontWeight:'700',cursor:'pointer',
                        transition:'all .2s',
                      }}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,.22)'}
                        onMouseLeave={e=>e.currentTarget.style.background='rgba(239,68,68,.12)'}>
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Revoke Modal */}
      {confirm && (
        <div style={{ position:'fixed',inset:0,background:'rgba(5,13,31,.85)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem',animation:'fadeIn .2s ease' }}
          onClick={e=>e.target===e.currentTarget&&setConfirm(null)}>
          <div style={{ background:T.surface,border:'1px solid rgba(239,68,68,.4)',borderRadius:'20px',padding:'2rem',width:'100%',maxWidth:'460px',boxShadow:'0 24px 80px rgba(0,0,0,.5)',animation:'slideUp .25s ease' }}>
            <h3 style={{ fontFamily:"'Syne',sans-serif",fontWeight:'800',fontSize:'1.1rem',marginBottom:'.5rem' }}>Revoke Access</h3>
            <p style={{ color:T.slate,fontSize:'.88rem',lineHeight:1.6,marginBottom:'1.25rem' }}>
              You are revoking <strong style={{color:T.white}}>{confirm.role}</strong> access from <strong style={{color:T.white}}>{confirm.employeeName}</strong>. This action is logged.
            </p>
            <div style={{ marginBottom:'1.25rem' }}>
              <label style={{ display:'block',fontSize:'.82rem',fontWeight:'600',color:T.slate,marginBottom:'.4rem' }}>Reason (optional)</label>
              <textarea value={reason} onChange={e=>setReason(e.target.value)}
                placeholder="e.g. Employee resigned, project ended…" rows={3}
                style={{ width:'100%',padding:'.8rem 1rem',background:T.navyMid,border:`1px solid ${T.border}`,color:T.white,borderRadius:'10px',fontSize:'.88rem',outline:'none',resize:'vertical',fontFamily:"'DM Sans',sans-serif",boxSizing:'border-box' }}
                onFocus={e=>e.target.style.borderColor='rgba(239,68,68,.5)'} onBlur={e=>e.target.style.borderColor=T.border}
              />
            </div>
            <div style={{ display:'flex',gap:'.75rem' }}>
              <button onClick={()=>{setConfirm(null);setReason('');}} style={{ flex:1,padding:'.8rem',background:'transparent',border:`1.5px solid ${T.border}`,color:T.slate,borderRadius:'10px',fontFamily:"'DM Sans',sans-serif",fontWeight:'600',cursor:'pointer' }}>Cancel</button>
              <button onClick={handleRevoke} disabled={revoking} style={{ flex:1,padding:'.8rem',background:revoking?'rgba(239,68,68,.3)':'linear-gradient(135deg,#EF4444,#DC2626)',border:'none',color:'white',borderRadius:'10px',fontFamily:"'DM Sans',sans-serif",fontWeight:'700',cursor:revoking?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem' }}>
                {revoking&&<span style={{ width:'14px',height:'14px',border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',display:'inline-block',animation:'spin 1s linear infinite' }}/>}
                {revoking?'Revoking…':'Confirm Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{GLOBAL_CSS}</style>
    </div>
  );
};

export default RevokeAccessPage;