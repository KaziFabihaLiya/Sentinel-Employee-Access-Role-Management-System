import { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { T, Sk, StatusBadge, PageHeader, TABLE_TH, GLOBAL_CSS } from '../../styles/darkTokens';
import { useAuth } from '../../contexts/AuthContext';

const ApprovalHistoryPage = () => {
  const { user } = useAuth();
  const [data,    setData]    = useState({ requests:[] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosInstance.get('/requests/team?limit=100')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const reviewed = data.requests.filter(r => r.status !== 'Pending');
  const approved = reviewed.filter(r => r.status === 'Approved').length;
  const rejected = reviewed.filter(r => r.status === 'Rejected').length;

  return (
    <div style={{ animation:'fadeUp .5s ease' }}>
      <PageHeader badge="Manager" badgeColor="cyan" title="Approval History"
        sub={`${reviewed.length} reviewed requests from your team`}/>

      {/* Summary pills */}
      <div style={{ display:'flex', gap:'1rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
        {[
          { label:'Total Reviewed', value:reviewed.length, color:T.teal },
          { label:'Approved',       value:approved,         color:T.approved },
          { label:'Rejected',       value:rejected,         color:T.rejected },
        ].map(s=>(
          <div key={s.label} style={{
            background:T.surface, border:`1px solid ${T.border}`,
            borderRadius:'12px', padding:'.75rem 1.25rem',
            display:'flex', alignItems:'center', gap:'.75rem',
          }}>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:'1.5rem', fontWeight:'800', color:s.color }}>{s.value}</span>
            <span style={{ fontSize:'.82rem', color:T.slate }}>{s.label}</span>
          </div>
        ))}
      </div>

      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'.75rem' }}>
            {[1,2,3].map(i=><Sk key={i} h="40px" r="10px"/>)}
          </div>
        ) : reviewed.length === 0 ? (
          <div style={{ padding:'5rem', textAlign:'center', color:T.muted }}>No reviewed requests yet</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'rgba(0,198,255,.04)' }}>
                  {['Employee','Role','Decision','Reviewed','Comment'].map(c=><th key={c} style={TABLE_TH}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {reviewed.map(req=>(
                  <tr key={req._id} style={{ borderBottom:`1px solid ${T.border}` }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(0,198,255,.04)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'.9rem 1.25rem' }}>
                      <p style={{ fontSize:'.85rem', fontWeight:'600', color:T.white }}>{req.employee?.fullName}</p>
                      <p style={{ fontSize:'.75rem', color:T.muted }}>{req.employee?.jobTitle}</p>
                    </td>
                    <td style={{ padding:'.9rem 1.25rem', fontSize:'.85rem', fontWeight:'600', color:T.white }}>{req.requestedRole}</td>
                    <td style={{ padding:'.9rem 1.25rem' }}><StatusBadge status={req.status}/></td>
                    <td style={{ padding:'.9rem 1.25rem', fontSize:'.8rem', color:T.muted, whiteSpace:'nowrap' }}>
                      {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'}
                    </td>
                    <td style={{ padding:'.9rem 1.25rem', fontSize:'.8rem', color:T.muted, maxWidth:'200px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {req.managerComment || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style>{GLOBAL_CSS}</style>
    </div>
  );
};

export default ApprovalHistoryPage;