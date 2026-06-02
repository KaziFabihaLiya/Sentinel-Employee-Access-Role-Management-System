import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../api/axiosInstance';

const T = {
  navy:'#050D1F',navyMid:'#0B1730',surface:'#0F1E38',surfaceAlt:'#122040',
  teal:'#00C6FF',cyan:'#00FFD1',gradient:'linear-gradient(135deg,#00C6FF 0%,#00FFD1 100%)',
  white:'#FFFFFF',slate:'#8DA5C4',muted:'#4A6080',
  border:'rgba(0,198,255,0.12)',borderH:'rgba(0,198,255,0.32)',
  pendingGrad:'linear-gradient(135deg,#F59E0B,#D97706)',
  approvedGrad:'linear-gradient(135deg,#10D988,#059669)',
  rejectedGrad:'linear-gradient(135deg,#EF4444,#DC2626)',
};

/*   ─ Skeleton loader   ─ */
const Skeleton = ({ w='100%', h='20px', r='6px' }) => (
  <div style={{
    width:w,height:h,borderRadius:r,
    background:`linear-gradient(90deg,${T.surface} 25%,${T.surfaceAlt} 50%,${T.surface} 75%)`,
    backgroundSize:'200% 100%',
    animation:'shimmer 1.5s infinite',
  }}/>
);

/*   ─ Status Badge   ─ */
const StatusBadge = ({ status }) => {
  const map = {
    pending:  { color:'#F59E0B', bg:'rgba(245,158,11,.12)',  label:'Pending'  },
    approved: { color:'#10D988', bg:'rgba(16,217,136,.12)',  label:'Approved' },
    rejected: { color:'#EF4444', bg:'rgba(239,68,68,.12)',   label:'Rejected' },
  };
  const s = map[status?.toLowerCase()] || map.pending;
  return (
    <span style={{
      display:'inline-flex',alignItems:'center',gap:'.35rem',
      background:s.bg,color:s.color,
      padding:'.25rem .75rem',borderRadius:'100px',
      fontSize:'.75rem',fontWeight:'700',
      border:`1px solid ${s.color}25`,
    }}>
      <span style={{width:'5px',height:'5px',borderRadius:'50%',background:s.color,display:'inline-block'}}/>
      {s.label}
    </span>
  );
};

/*   ─ Metric Card   ─ */
const MetricCard = ({ label, value, icon, accentColor, loading, delta }) => (
  <div style={{
    background:T.surface,border:`1px solid ${T.border}`,borderRadius:'16px',
    padding:'1.5rem',position:'relative',overflow:'hidden',
    transition:'transform .3s,box-shadow .3s,border-color .3s',cursor:'default',
  }}
    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='0 16px 48px rgba(0,198,255,.12)';e.currentTarget.style.borderColor='rgba(0,198,255,.28)';}}
    onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';e.currentTarget.style.borderColor=T.border;}}
  >
    {/* Accent bar */}
    <div style={{position:'absolute',top:0,left:0,right:0,height:'2px',background:accentColor,borderRadius:'16px 16px 0 0'}}/>
    {/* Glow orb */}
    <div style={{
      position:'absolute',top:'-30px',right:'-20px',
      width:'100px',height:'100px',borderRadius:'50%',
      background:accentColor,opacity:.05,filter:'blur(20px)',
    }}/>

    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1rem'}}>
      <div style={{
        width:'42px',height:'42px',borderRadius:'12px',
        background:'rgba(0,198,255,.08)',border:`1px solid ${T.border}`,
        display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem',
      }}>{icon}</div>
      {delta && (
        <span style={{fontSize:'.72rem',fontWeight:'600',color:'#10D988'}}>
          {delta}
        </span>
      )}
    </div>
    {loading
      ? <Skeleton h="2rem" w="60%" r="8px"/>
      : <div style={{fontFamily:"'Syne',sans-serif",fontSize:'2rem',fontWeight:'800',lineHeight:1,marginBottom:'.35rem'}}>
          {value}
        </div>
    }
    <p style={{color:T.slate,fontSize:'.82rem',fontWeight:'500'}}>{label}</p>
  </div>
);

/*   ─ Risk Badge   ─ */
const RiskBadge = ({ level }) => {
  const map = {
    low:    { color:'#10D988', bg:'rgba(16,217,136,.1)',  bars:2 },
    medium: { color:'#F59E0B', bg:'rgba(245,158,11,.1)',  bars:3 },
    high:   { color:'#EF4444', bg:'rgba(239,68,68,.1)',   bars:5 },
  };
  const r = map[level?.toLowerCase()] || map.low;
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:'.35rem',
      background:r.bg,color:r.color,
      padding:'.2rem .65rem',borderRadius:'100px',fontSize:'.72rem',fontWeight:'700',
    }}>
      {level?.charAt(0).toUpperCase()+level?.slice(1)} Risk
    </span>
  );
};

/*   ─ Main Component   ─ */
const EmployeeHome = () => {
  const { user } = useAuth();
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosInstance.get('/dashboard/employee-stats')
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const metrics = [
    { label:'Total Submitted', value:stats?.total    ?? 0, icon:'📋', accentColor:T.gradient },
    { label:'Pending Review',  value:stats?.pending  ?? 0, icon:'⏳', accentColor:T.pendingGrad, delta: stats?.pending>0 ? `${stats.pending} awaiting` : null },
    { label:'Approved',        value:stats?.approved ?? 0, icon:'✅', accentColor:T.approvedGrad },
    { label:'Rejected',        value:stats?.rejected ?? 0, icon:'❌', accentColor:T.rejectedGrad },
  ];

  const firstName = user?.fullName?.split(' ')[0] ?? 'there';

  return (
    <div style={{animation:'fadeUp .5s ease'}}>

      {/*    Header    */}
      <div style={{
        display:'flex',justifyContent:'space-between',alignItems:'flex-start',
        marginBottom:'2rem',flexWrap:'wrap',gap:'1rem',
      }}>
        <div>
          <div style={{
            display:'inline-flex',alignItems:'center',gap:'.5rem',
            background:'rgba(0,198,255,.08)',border:`1px solid ${T.border}`,
            color:T.teal,fontSize:'.72rem',fontWeight:'600',letterSpacing:'.1em',
            textTransform:'uppercase',padding:'.28rem .75rem',borderRadius:'100px',
            marginBottom:'.75rem',
          }}>
            <span style={{width:'5px',height:'5px',borderRadius:'50%',background:T.teal,display:'inline-block'}}/>
            Employee Portal
          </div>
          <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:'1.6rem',fontWeight:'800',letterSpacing:'-.02em',marginBottom:'.3rem'}}>
            Welcome back, {firstName} 👋
          </h1>
          <p style={{color:T.slate,fontSize:'.9rem'}}>
            {user?.department} · {user?.jobTitle} — here's your access overview
          </p>
        </div>

        <Link to="/dashboard/submit-request" style={{textDecoration:'none'}}>
          <button style={{
            background:T.gradient,color:T.navy,border:'none',
            borderRadius:'10px',padding:'.75rem 1.5rem',
            fontFamily:"'DM Sans',sans-serif",fontWeight:'700',fontSize:'.9rem',
            cursor:'pointer',transition:'all .2s',
            boxShadow:'0 4px 20px rgba(0,198,255,.3)',
            display:'flex',alignItems:'center',gap:'.5rem',
          }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 28px rgba(0,198,255,.45)';}}
            onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 4px 20px rgba(0,198,255,.3)';}}
          >
            + New Request
          </button>
        </Link>
      </div>

      {/*    Metric Cards    */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',
        gap:'1.1rem',marginBottom:'2rem',
      }}>
        {metrics.map(m=><MetricCard key={m.label} {...m} loading={loading}/>)}
      </div>

      {/*    Bottom grid    */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 260px',gap:'1.25rem',alignItems:'start'}} className="emp-bottom-grid">

        {/* Recent Requests Table */}
        <div style={{
          background:T.surface,border:`1px solid ${T.border}`,
          borderRadius:'16px',overflow:'hidden',
        }}>
          <div style={{
            padding:'1.1rem 1.5rem',borderBottom:`1px solid ${T.border}`,
            display:'flex',justifyContent:'space-between',alignItems:'center',
          }}>
            <div>
              <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:'.98rem',fontWeight:'700'}}>Recent Requests</h2>
              <p style={{color:T.muted,fontSize:'.75rem',marginTop:'.1rem'}}>Your last 5 access requests</p>
            </div>
            <Link to="/dashboard/my-requests" style={{
              color:T.teal,fontSize:'.8rem',fontWeight:'600',textDecoration:'none',
              display:'flex',alignItems:'center',gap:'.3rem',
            }}>
              View all →
            </Link>
          </div>

          {loading ? (
            <div style={{padding:'1.5rem',display:'flex',flexDirection:'column',gap:'.75rem'}}>
              {[1,2,3].map(i=>(
                <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'1rem',padding:'.75rem 0',borderBottom:`1px solid ${T.border}`}}>
                  <Skeleton h="14px" w="80%"/> <Skeleton h="14px" w="60%"/> <Skeleton h="22px" w="70%" r="100px"/>
                </div>
              ))}
            </div>
          ) : !stats?.recentRequests?.length ? (
            <div style={{padding:'4rem 2rem',textAlign:'center'}}>
              <div style={{
                width:'60px',height:'60px',borderRadius:'50%',
                background:'rgba(0,198,255,.08)',border:`1px solid ${T.border}`,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:'1.5rem',margin:'0 auto 1rem',
              }}>📭</div>
              <p style={{color:T.slate,marginBottom:'1.25rem',fontSize:'.9rem'}}>No requests submitted yet</p>
              <Link to="/dashboard/submit-request" style={{textDecoration:'none'}}>
                <button style={{
                  background:T.gradient,color:T.navy,border:'none',
                  borderRadius:'9px',padding:'.65rem 1.4rem',
                  fontFamily:"'DM Sans',sans-serif",fontWeight:'700',fontSize:'.85rem',
                  cursor:'pointer',
                }}>Submit your first request</button>
              </Link>
            </div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{background:'rgba(0,198,255,.04)'}}>
                    {['Requested Role','Date','Status','Risk'].map(col=>(
                      <th key={col} style={{
                        padding:'.7rem 1.5rem',textAlign:'left',
                        fontSize:'.7rem',fontWeight:'700',color:T.muted,
                        textTransform:'uppercase',letterSpacing:'.06em',
                        borderBottom:`1px solid ${T.border}`,
                        whiteSpace:'nowrap',
                      }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.recentRequests.map(req=>(
                    <tr key={req._id}
                      style={{borderBottom:`1px solid ${T.border}`,transition:'background .15s',cursor:'pointer'}}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(0,198,255,.04)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                    >
                      <td style={{padding:'1rem 1.5rem',fontSize:'.88rem',fontWeight:'600',color:T.white}}>
                        {req.requestedRole}
                      </td>
                      <td style={{padding:'1rem 1.5rem',fontSize:'.82rem',color:T.slate}}>
                        {new Date(req.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                      </td>
                      <td style={{padding:'1rem 1.5rem'}}>
                        <StatusBadge status={req.status}/>
                      </td>
                      <td style={{padding:'1rem 1.5rem'}}>
                        <RiskBadge level={req.riskLevel || 'low'}/>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          {/* Quick action card */}
          <div style={{
            background:T.gradient,borderRadius:'16px',
            padding:'1.75rem 1.5rem',textAlign:'center',color:T.navy,
            position:'relative',overflow:'hidden',
          }}>
            <div style={{
              position:'absolute',top:'-20px',right:'-20px',
              width:'100px',height:'100px',borderRadius:'50%',
              background:'rgba(255,255,255,.1)',
            }}/>
            <div style={{fontSize:'1.75rem',marginBottom:'.6rem'}}>✦</div>
            <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:'.95rem',fontWeight:'800',marginBottom:'.4rem'}}>
              Need Access?
            </h3>
            <p style={{fontSize:'.8rem',opacity:.8,lineHeight:1.5,marginBottom:'1.25rem'}}>
              Submit a new ERP access request for your role
            </p>
            <Link to="/dashboard/submit-request" style={{textDecoration:'none'}}>
              <button style={{
                width:'100%',background:'rgba(5,13,31,.2)',
                color:T.navy,border:'2px solid rgba(5,13,31,.2)',
                borderRadius:'9px',padding:'.65rem',
                fontFamily:"'DM Sans',sans-serif",fontWeight:'800',fontSize:'.85rem',
                cursor:'pointer',backdropFilter:'blur(8px)',
              }}>Submit Request</button>
            </Link>
          </div>

          {/* AI Recommendation teaser */}
          <div style={{
            background:T.surface,border:`1px solid ${T.border}`,
            borderRadius:'14px',padding:'1.25rem',
          }}>
            <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'.75rem'}}>
              <span style={{fontSize:'1rem'}}>🤖</span>
              <span style={{fontFamily:"'Syne',sans-serif",fontWeight:'700',fontSize:'.85rem'}}>AI Suggestion</span>
              <span style={{
                marginLeft:'auto',
                background:'rgba(0,198,255,.1)',color:T.teal,
                fontSize:'.65rem',fontWeight:'700',padding:'.15rem .5rem',borderRadius:'100px',
              }}>Beta</span>
            </div>
            <p style={{color:T.slate,fontSize:'.8rem',lineHeight:1.6,marginBottom:'.9rem'}}>
              Based on your role in <strong style={{color:T.white}}>{user?.department}</strong>, you may benefit from:
            </p>
            {['Data Analyst Access','Report Viewer Role'].map((role,i)=>(
              <div key={role} style={{
                display:'flex',alignItems:'center',justifyContent:'space-between',
                padding:'.5rem .7rem',borderRadius:'8px',
                background:'rgba(0,198,255,.05)',border:`1px solid ${T.border}`,
                marginBottom:i===0 ? '.4rem' : 0,
                cursor:'pointer',transition:'border-color .2s',
              }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=T.borderH}
                onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}
              >
                <span style={{fontSize:'.82rem',color:T.slate}}>{role}</span>
                <span style={{color:T.teal,fontSize:'.75rem',fontWeight:'600'}}>Apply →</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
        @keyframes shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}
        @media(max-width:900px){.emp-bottom-grid{grid-template-columns:1fr!important;}}
      `}</style>
    </div>
  );
};

export default EmployeeHome;