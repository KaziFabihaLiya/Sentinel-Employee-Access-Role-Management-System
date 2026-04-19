import { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { T, Sk, StatusBadge, RiskBadge, PageHeader, TABLE_TH, GLOBAL_CSS } from '../../styles/darkTokens';

const STATUSES = ['all','Pending','Approved','Rejected'];

const TeamRequestsPage = () => {
  const [data,    setData]    = useState({ requests:[], total:0 });
  const [loading, setLoading] = useState(true);
  const [status,  setStatus]  = useState('all');
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit:50, ...(status!=='all'&&{status}) });
    axiosInstance.get(`/requests/team?${params}`)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [status]);

  const filtered = data.requests.filter(r =>
    !search || r.employee?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    r.requestedRole?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ animation:'fadeUp .5s ease' }}>
      <PageHeader badge="Manager" badgeColor="cyan" title="Team Requests"
        sub="All access requests from your department"/>

      {/* Filters */}
      <div style={{ display:'flex', gap:'.75rem', marginBottom:'1.5rem', flexWrap:'wrap', alignItems:'center' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search by name or role…"
          style={{
            flex:1, minWidth:'200px', padding:'.6rem 1rem',
            background:T.surface, border:`1px solid ${T.border}`,
            color:T.white, borderRadius:'10px', fontSize:'.88rem', outline:'none',
            fontFamily:"'DM Sans',sans-serif",
          }}
          onFocus={e=>e.target.style.borderColor=T.teal}
          onBlur={e=>e.target.style.borderColor=T.border}
        />
        <div style={{ display:'flex', gap:'.4rem' }}>
          {STATUSES.map(s=>(
            <button key={s} onClick={()=>setStatus(s)} style={{
              padding:'.45rem .9rem',
              background: status===s ? T.gradient : 'transparent',
              border: status===s ? 'none' : `1px solid ${T.border}`,
              color: status===s ? T.navy : T.slate,
              borderRadius:'100px', fontFamily:"'DM Sans',sans-serif",
              fontWeight:'600', fontSize:'.82rem', cursor:'pointer',
            }}>{s==='all'?'All':s}</button>
          ))}
        </div>
      </div>

      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'.75rem' }}>
            {[1,2,3,4].map(i=>(
              <div key={i} style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 1fr 1fr', gap:'1rem', padding:'.75rem 0', borderBottom:`1px solid ${T.border}` }}>
                <Sk h="13px" w="70%"/><Sk h="13px" w="60%"/><Sk h="22px" w="80px" r="100px"/><Sk h="13px" w="60%"/><Sk h="13px" w="50%"/>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:'4rem', textAlign:'center', color:T.muted }}>No requests found</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'rgba(0,198,255,.04)' }}>
                  {['Employee','Requested Role','Status','Risk','Submitted','Comment'].map(c=><th key={c} style={TABLE_TH}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(req=>(
                  <tr key={req._id} style={{ borderBottom:`1px solid ${T.border}`, transition:'background .15s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(0,198,255,.04)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'.9rem 1.25rem' }}>
                      <p style={{ fontSize:'.85rem', fontWeight:'600', color:T.white }}>{req.employee?.fullName}</p>
                      <p style={{ fontSize:'.75rem', color:T.muted }}>{req.employee?.jobTitle}</p>
                    </td>
                    <td style={{ padding:'.9rem 1.25rem', fontSize:'.85rem', fontWeight:'600', color:T.white }}>{req.requestedRole}</td>
                    <td style={{ padding:'.9rem 1.25rem' }}><StatusBadge status={req.status}/></td>
                    <td style={{ padding:'.9rem 1.25rem' }}><RiskBadge level={req.riskLevel||'low'}/></td>
                    <td style={{ padding:'.9rem 1.25rem', fontSize:'.8rem', color:T.muted, whiteSpace:'nowrap' }}>
                      {new Date(req.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                    </td>
                    <td style={{ padding:'.9rem 1.25rem', fontSize:'.8rem', color:T.muted, maxWidth:'180px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {req.managerComment || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding:'.6rem 1.5rem', borderTop:`1px solid ${T.border}` }}>
          <span style={{ color:T.muted, fontSize:'.78rem' }}>Showing {filtered.length} of {data.total} requests</span>
        </div>
      </div>
      <style>{GLOBAL_CSS}</style>
    </div>
  );
};

export default TeamRequestsPage;