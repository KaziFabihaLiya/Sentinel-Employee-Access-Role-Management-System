import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import axiosInstance from '../../api/axiosInstance';
import { T, Sk, StatusBadge, RiskBadge, PageHeader, TABLE_TH, GLOBAL_CSS } from '../../styles/darkTokens';

const STATUSES = ['all','Pending','Approved','Rejected'];

const MyRequestsPage = () => {
  const [data,    setData]    = useState({ requests:[], total:0, pages:1 });
  const [loading, setLoading] = useState(true);
  const [status,  setStatus]  = useState('all');
  const [page,    setPage]    = useState(1);
  const [detail,  setDetail]  = useState(null); // selected request for detail drawer

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

  return (
    <div style={{ animation:'fadeUp .5s ease' }}>
      <PageHeader badge="Employee" title="My Requests" sub="All your ERP access requests" />

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:'.5rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatus(s)} style={{
            padding:'.45rem 1rem',
            background: status===s ? T.gradient : 'transparent',
            border: status===s ? 'none' : `1px solid ${T.border}`,
            color: status===s ? T.navy : T.slate,
            borderRadius:'100px', fontFamily:"'DM Sans',sans-serif",
            fontWeight:'600', fontSize:'.82rem', cursor:'pointer',
          }}>
            {s === 'all' ? 'All' : s}
          </button>
        ))}
        <span style={{ marginLeft:'auto', color:T.muted, fontSize:'.82rem', alignSelf:'center' }}>
          {data.total} total
        </span>
      </div>

      {/* Table */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'.75rem' }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr', gap:'1rem', padding:'.75rem 0', borderBottom:`1px solid ${T.border}` }}>
                <Sk h="13px" w="70%"/><Sk h="13px" w="60%"/><Sk h="22px" w="80px" r="100px"/><Sk h="13px" w="60px"/><Sk h="13px" w="50%"/>
              </div>
            ))}
          </div>
        ) : data.requests.length === 0 ? (
          <div style={{ padding:'5rem 2rem', textAlign:'center' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>📭</div>
            <p style={{ color:T.slate, marginBottom:'1.25rem' }}>
              {status === 'all' ? 'No requests yet' : `No ${status} requests`}
            </p>
            <Link to="/dashboard/submit-request" style={{ textDecoration:'none' }}>
              <button style={{
                background:T.gradient, color:T.navy, border:'none',
                borderRadius:'9px', padding:'.65rem 1.4rem',
                fontFamily:"'DM Sans',sans-serif", fontWeight:'700', cursor:'pointer',
              }}>Submit a Request</button>
            </Link>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'rgba(0,198,255,.04)' }}>
                  {['Requested Role','Department','Submitted','Status','Risk','Comment'].map(c=>(
                    <th key={c} style={TABLE_TH}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.requests.map(req => (
                  <tr key={req._id}
                    onClick={() => setDetail(req)}
                    style={{ borderBottom:`1px solid ${T.border}`, cursor:'pointer', transition:'background .15s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(0,198,255,.04)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                  >
                    <td style={{ padding:'.9rem 1.25rem', fontSize:'.88rem', fontWeight:'600', color:T.white }}>
                      {req.requestedRole}
                    </td>
                    <td style={{ padding:'.9rem 1.25rem', fontSize:'.83rem', color:T.slate }}>{req.department}</td>
                    <td style={{ padding:'.9rem 1.25rem', fontSize:'.8rem', color:T.muted, whiteSpace:'nowrap' }}>
                      {new Date(req.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                    </td>
                    <td style={{ padding:'.9rem 1.25rem' }}><StatusBadge status={req.status}/></td>
                    <td style={{ padding:'.9rem 1.25rem' }}><RiskBadge level={req.riskLevel||'low'}/></td>
                    <td style={{ padding:'.9rem 1.25rem', fontSize:'.8rem', color:T.muted, maxWidth:'200px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {req.managerComment || '—'}
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
            {Array.from({ length: data.pages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} style={{
                width:'32px', height:'32px',
                background: page===p ? T.gradient : 'transparent',
                border: page===p ? 'none' : `1px solid ${T.border}`,
                color: page===p ? T.navy : T.slate,
                borderRadius:'8px', cursor:'pointer', fontWeight:'600', fontSize:'.82rem',
              }}>{p}</button>
            ))}
          </div>
        )}
      </div>

      {/* Detail drawer/modal */}
      {detail && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(5,13,31,.85)',
          backdropFilter:'blur(8px)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem',
          animation:'fadeIn .2s ease',
        }} onClick={e=>e.target===e.currentTarget&&setDetail(null)}>
          <div style={{
            background:T.surface, border:`1px solid ${T.borderH}`,
            borderRadius:'20px', padding:'2rem', width:'100%', maxWidth:'480px',
            boxShadow:'0 24px 80px rgba(0,0,0,.5)', animation:'slideUp .25s ease',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:'800', fontSize:'1.1rem' }}>Request Detail</h3>
              <button onClick={() => setDetail(null)} style={{
                background:'rgba(0,198,255,.08)', border:`1px solid ${T.border}`,
                color:T.slate, width:'32px', height:'32px', borderRadius:'8px',
                cursor:'pointer', fontSize:'1rem',
              }}>✕</button>
            </div>
            {[
              { label:'Role',       value: detail.requestedRole },
              { label:'Department', value: detail.department },
              { label:'Duration',   value: detail.accessDuration || 'Permanent' },
              { label:'Submitted',  value: new Date(detail.createdAt).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) },
              { label:'Status',     value: <StatusBadge status={detail.status}/> },
              { label:'Risk',       value: <RiskBadge level={detail.riskLevel||'low'}/> },
            ].map(item => (
              <div key={item.label} style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'.6rem 0', borderBottom:`1px solid ${T.border}`,
              }}>
                <span style={{ color:T.muted, fontSize:'.83rem' }}>{item.label}</span>
                <span style={{ color:T.white, fontSize:'.83rem', fontWeight:'500' }}>{item.value}</span>
              </div>
            ))}
            {detail.managerComment && (
              <div style={{ marginTop:'1rem' }}>
                <p style={{ color:T.muted, fontSize:'.78rem', marginBottom:'.4rem' }}>Manager Comment</p>
                <p style={{ color:T.slate, fontSize:'.85rem', lineHeight:1.6, background:'rgba(0,198,255,.04)', padding:'.75rem', borderRadius:'8px' }}>
                  {detail.managerComment}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{GLOBAL_CSS}</style>
    </div>
  );
};

export default MyRequestsPage;