import { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { T, Sk, StatusBadge, RiskBadge, PageHeader, TABLE_TH, GLOBAL_CSS } from '../../styles/darkTokens';

const RequestHistoryPage = () => {
  const [data,    setData]    = useState({ requests:[], total:0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // History = all requests (already ordered newest first)
    axiosInstance.get('/requests/my?limit=50')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Group by month
  const grouped = data.requests.reduce((acc, req) => {
    const key = new Date(req.createdAt).toLocaleDateString('en-US', { month:'long', year:'numeric' });
    if (!acc[key]) acc[key] = [];
    acc[key].push(req);
    return acc;
  }, {});

  return (
    <div style={{ animation:'fadeUp .5s ease' }}>
      <PageHeader badge="Employee" title="Request History" sub={`${data.total} total requests across all time`}/>

      {loading ? (
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', padding:'2rem', display:'flex', flexDirection:'column', gap:'.75rem' }}>
          {[1,2,3].map(i=><Sk key={i} h="40px" r="10px"/>)}
        </div>
      ) : data.requests.length === 0 ? (
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', padding:'5rem', textAlign:'center' }}>
          <p style={{ fontSize:'2rem', marginBottom:'1rem' }}>📜</p>
          <p style={{ color:T.slate }}>No history yet. Submit your first request!</p>
        </div>
      ) : (
        Object.entries(grouped).map(([month, reqs]) => (
          <div key={month} style={{ marginBottom:'2rem' }}>
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:'700', fontSize:'.9rem', color:T.teal, marginBottom:'.75rem', textTransform:'uppercase', letterSpacing:'.08em' }}>
              {month}
            </h3>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'rgba(0,198,255,.04)' }}>
                    {['Role','Duration','Submitted','Status','Risk'].map(c=><th key={c} style={TABLE_TH}>{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {reqs.map(req => (
                    <tr key={req._id} style={{ borderBottom:`1px solid ${T.border}` }}>
                      <td style={{ padding:'.85rem 1.25rem', fontWeight:'600', fontSize:'.88rem', color:T.white }}>{req.requestedRole}</td>
                      <td style={{ padding:'.85rem 1.25rem', fontSize:'.83rem', color:T.slate }}>{req.accessDuration || 'Permanent'}</td>
                      <td style={{ padding:'.85rem 1.25rem', fontSize:'.8rem', color:T.muted, whiteSpace:'nowrap' }}>
                        {new Date(req.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                      </td>
                      <td style={{ padding:'.85rem 1.25rem' }}><StatusBadge status={req.status}/></td>
                      <td style={{ padding:'.85rem 1.25rem' }}><RiskBadge level={req.riskLevel||'low'}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
      <style>{GLOBAL_CSS}</style>
    </div>
  );
};

export default RequestHistoryPage;