import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { T, Sk, PageHeader, TABLE_TH, GLOBAL_CSS } from '../../styles/darkTokens';

const ACTIONS = ['all','REQUEST_SUBMITTED','REQUEST_APPROVED','REQUEST_REJECTED','ACCESS_REVOKED','ROLE_CREATED','ROLE_UPDATED','ROLE_DELETED','USER_ACTIVATED','USER_DEACTIVATED','USER_DELETED','ROLE_CHANGED'];

const actionColor = (action) => {
  if (action.includes('APPROVED') || action.includes('ACTIVATED') || action.includes('CREATED')) return T.approved;
  if (action.includes('REJECTED') || action.includes('DELETED') || action.includes('DEACTIVATED')) return T.rejected;
  if (action.includes('REVOKED'))  return '#F87171';
  if (action.includes('CHANGED') || action.includes('UPDATED')) return T.pending;
  return T.teal;
};

const AuditLogsPage = () => {
  const [data,    setData]    = useState({ logs:[], total:0, pages:1 });
  const [loading, setLoading] = useState(true);
  const [action,  setAction]  = useState('all');
  const [userQ,   setUserQ]   = useState('');
  const [page,    setPage]    = useState(1);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit:25, ...(action!=='all'&&{action}), ...(userQ&&{user:userQ}) });
    axiosInstance.get(`/audit?${params}`)
      .then(res=>setData(res.data))
      .catch(console.error)
      .finally(()=>setLoading(false));
  }, [action, userQ, page]);

  useEffect(()=>{ fetchLogs(); }, [fetchLogs]);
  useEffect(()=>{ setPage(1); }, [action, userQ]);

  return (
    <div style={{ animation:'fadeUp .5s ease' }}>
      <PageHeader badge="Admin Console" badgeColor="purple" title="Audit Logs"
        sub={`${data.total} recorded system events`}/>

      {/* Filters */}
      <div style={{ display:'flex',gap:'.75rem',marginBottom:'1.5rem',flexWrap:'wrap',alignItems:'center' }}>
        <input value={userQ} onChange={e=>setUserQ(e.target.value)}
          placeholder="Filter by user name or email…"
          style={{ flex:1,minWidth:'200px',padding:'.6rem 1rem',background:T.surface,border:`1px solid ${T.border}`,color:T.white,borderRadius:'10px',fontSize:'.88rem',outline:'none',fontFamily:"'DM Sans',sans-serif" }}
          onFocus={e=>e.target.style.borderColor=T.teal} onBlur={e=>e.target.style.borderColor=T.border}
        />
        <select value={action} onChange={e=>setAction(e.target.value)}
          style={{ padding:'.6rem 1rem',background:T.surface,border:`1px solid ${T.border}`,color:T.white,borderRadius:'10px',fontSize:'.82rem',outline:'none',cursor:'pointer',fontFamily:"'DM Sans',sans-serif" }}>
          {ACTIONS.map(a=><option key={a} value={a}>{a==='all'?'All Actions':a.replace(/_/g,' ')}</option>)}
        </select>
      </div>

      <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:'16px',overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:'1.5rem',display:'flex',flexDirection:'column',gap:'.75rem' }}>
            {[1,2,3,4,5].map(i=>(
              <div key={i} style={{ display:'grid',gridTemplateColumns:'1.5fr 2fr 1fr 1fr',gap:'1rem',padding:'.75rem 0',borderBottom:`1px solid ${T.border}` }}>
                <Sk h="13px" w="80%"/><Sk h="13px" w="70%"/><Sk h="22px" w="120px" r="100px"/><Sk h="13px" w="60%"/>
              </div>
            ))}
          </div>
        ) : data.logs.length === 0 ? (
          <div style={{ padding:'5rem',textAlign:'center',color:T.muted }}>No audit logs found</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'rgba(0,198,255,.04)' }}>
                  {['User','Details','Action','Timestamp','IP'].map(c=><th key={c} style={TABLE_TH}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.logs.map(log=>(
                  <tr key={log._id} style={{ borderBottom:`1px solid ${T.border}`,transition:'background .15s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(0,198,255,.03)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'.85rem 1.25rem' }}>
                      <p style={{ fontSize:'.85rem',fontWeight:'600',color:T.white }}>{log.userName || '—'}</p>
                      <p style={{ fontSize:'.73rem',color:T.muted }}>{log.userEmail}</p>
                    </td>
                    <td style={{ padding:'.85rem 1.25rem',fontSize:'.82rem',color:T.slate,maxWidth:'280px' }}>
                      {log.details || '—'}
                    </td>
                    <td style={{ padding:'.85rem 1.25rem' }}>
                      <span style={{ background:`${actionColor(log.action)}18`,color:actionColor(log.action),padding:'.22rem .65rem',borderRadius:'100px',fontSize:'.7rem',fontWeight:'700',whiteSpace:'nowrap' }}>
                        {log.action.replace(/_/g,' ')}
                      </span>
                    </td>
                    <td style={{ padding:'.85rem 1.25rem',fontSize:'.78rem',color:T.muted,whiteSpace:'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                    </td>
                    <td style={{ padding:'.85rem 1.25rem',fontSize:'.75rem',color:T.muted,fontFamily:'monospace' }}>
                      {log.ipAddress || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div style={{ padding:'.75rem 1.5rem',borderTop:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <span style={{ color:T.muted,fontSize:'.78rem' }}>Page {page} of {data.pages} · {data.total} events</span>
          <div style={{ display:'flex',gap:'.4rem' }}>
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{ padding:'.35rem .75rem',background:'transparent',border:`1px solid ${T.border}`,color:page===1?T.muted:T.slate,borderRadius:'7px',cursor:page===1?'not-allowed':'pointer',fontSize:'.82rem' }}>← Prev</button>
            <button onClick={()=>setPage(p=>Math.min(data.pages,p+1))} disabled={page===data.pages} style={{ padding:'.35rem .75rem',background:'transparent',border:`1px solid ${T.border}`,color:page===data.pages?T.muted:T.slate,borderRadius:'7px',cursor:page===data.pages?'not-allowed':'pointer',fontSize:'.82rem' }}>Next →</button>
          </div>
        </div>
      </div>
      <style>{GLOBAL_CSS}</style>
    </div>
  );
};

export default AuditLogsPage;