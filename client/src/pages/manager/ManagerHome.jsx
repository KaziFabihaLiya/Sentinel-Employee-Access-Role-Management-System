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
};

/* ─── Skeleton ─── */
const Skeleton = ({ w='100%', h='16px', r='6px' }) => (
  <div style={{
    width:w,height:h,borderRadius:r,
    background:`linear-gradient(90deg,${T.surface} 25%,${T.surfaceAlt} 50%,${T.surface} 75%)`,
    backgroundSize:'200% 100%',animation:'shimmer 1.5s infinite',
  }}/>
);

/* ─── Risk Badge ─── */
const RiskBadge = ({ level }) => {
  const map = {
    low:    { color:'#10D988', bg:'rgba(16,217,136,.1)'  },
    medium: { color:'#F59E0B', bg:'rgba(245,158,11,.1)'  },
    high:   { color:'#EF4444', bg:'rgba(239,68,68,.1)'   },
  };
  const r = map[level?.toLowerCase()] || map.low;
  return (
    <span style={{
      background:r.bg,color:r.color,
      padding:'.22rem .6rem',borderRadius:'100px',
      fontSize:'.72rem',fontWeight:'700',
      display:'inline-flex',alignItems:'center',gap:'.3rem',
    }}>
      <span style={{width:'5px',height:'5px',borderRadius:'50%',background:r.color,display:'inline-block'}}/>
      {level ? level.charAt(0).toUpperCase()+level.slice(1) : 'Low'}
    </span>
  );
};

/* ─── Metric Card ─── */
const MetricCard = ({ label, value, icon, accentColor, loading, sub }) => (
  <div style={{
    background:T.surface,border:`1px solid ${T.border}`,
    borderRadius:'16px',padding:'1.5rem',
    position:'relative',overflow:'hidden',
    transition:'transform .3s,box-shadow .3s,border-color .3s',
  }}
    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='0 16px 48px rgba(0,198,255,.12)';e.currentTarget.style.borderColor='rgba(0,198,255,.28)';}}
    onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';e.currentTarget.style.borderColor=T.border;}}
  >
    <div style={{position:'absolute',top:0,left:0,right:0,height:'2px',background:accentColor,borderRadius:'16px 16px 0 0'}}/>
    <div style={{
      position:'absolute',top:'-30px',right:'-20px',
      width:'100px',height:'100px',borderRadius:'50%',
      background:accentColor,opacity:.04,filter:'blur(20px)',
    }}/>
    <div style={{
      width:'42px',height:'42px',borderRadius:'12px',
      background:'rgba(0,198,255,.08)',border:`1px solid ${T.border}`,
      display:'flex',alignItems:'center',justifyContent:'center',
      fontSize:'1.2rem',marginBottom:'1rem',
    }}>{icon}</div>
    {loading
      ? <Skeleton h="2rem" w="55%" r="8px"/>
      : <div style={{fontFamily:"'Syne',sans-serif",fontSize:'2rem',fontWeight:'800',lineHeight:1,marginBottom:'.3rem'}}>
          {value}
        </div>
    }
    <p style={{color:T.slate,fontSize:'.82rem',fontWeight:'500'}}>{label}</p>
    {sub && <p style={{color:T.muted,fontSize:'.75rem',marginTop:'.2rem'}}>{sub}</p>}
  </div>
);

/* ─── Approve/Reject modal ─── */
const ActionModal = ({ req, onClose, onAction }) => {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (action) => {
    setLoading(true);
    await onAction(req._id, action, comment);
    setLoading(false);
    onClose();
  };

  return (
    <div style={{
      position:'fixed',inset:0,background:'rgba(5,13,31,.85)',
      backdropFilter:'blur(8px)',zIndex:1000,
      display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem',
      animation:'fadeIn .2s ease',
    }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{
        background:T.surface,border:`1px solid ${T.borderH}`,
        borderRadius:'20px',padding:'2rem',
        width:'100%',maxWidth:'500px',
        boxShadow:'0 24px 80px rgba(0,0,0,.5)',
        animation:'slideUp .25s ease',
      }}>
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.5rem'}}>
          <div>
            <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:'1.1rem',fontWeight:'800',marginBottom:'.25rem'}}>
              Review Access Request
            </h3>
            <p style={{color:T.muted,fontSize:'.8rem'}}>#{req._id?.slice(-8).toUpperCase()}</p>
          </div>
          <button onClick={onClose} style={{
            background:'rgba(0,198,255,.08)',border:`1px solid ${T.border}`,
            color:T.slate,width:'32px',height:'32px',borderRadius:'8px',
            cursor:'pointer',fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center',
          }}>✕</button>
        </div>

        {/* Request details */}
        <div style={{
          background:'rgba(0,198,255,.04)',border:`1px solid ${T.border}`,
          borderRadius:'12px',padding:'1.1rem',marginBottom:'1.25rem',
        }}>
          {[
            {label:'Employee',  value:req.employee?.fullName},
            {label:'Dept.',     value:req.employee?.department},
            {label:'Job Title', value:req.employee?.jobTitle},
            {label:'Requested', value:req.requestedRole},
            {label:'Submitted', value:new Date(req.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})},
          ].map(item=>(
            <div key={item.label} style={{display:'flex',justifyContent:'space-between',marginBottom:'.5rem'}}>
              <span style={{color:T.muted,fontSize:'.82rem'}}>{item.label}</span>
              <span style={{color:T.white,fontSize:'.82rem',fontWeight:'500',textAlign:'right',maxWidth:'60%'}}>{item.value}</span>
            </div>
          ))}
          {req.justification && (
            <div style={{marginTop:'.75rem',paddingTop:'.75rem',borderTop:`1px solid ${T.border}`}}>
              <p style={{color:T.muted,fontSize:'.78rem',marginBottom:'.35rem'}}>Justification</p>
              <p style={{color:T.slate,fontSize:'.83rem',lineHeight:1.55}}>{req.justification}</p>
            </div>
          )}
          <div style={{marginTop:'.75rem',display:'flex',gap:'.5rem',flexWrap:'wrap'}}>
            <RiskBadge level={req.riskLevel||'low'}/>
            {req.duration && (
              <span style={{
                background:'rgba(167,139,250,.1)',color:'#A78BFA',
                padding:'.22rem .6rem',borderRadius:'100px',fontSize:'.72rem',fontWeight:'700',
              }}>⏱ {req.duration}</span>
            )}
          </div>
        </div>

        {/* Comment */}
        <div style={{marginBottom:'1.25rem'}}>
          <label style={{display:'block',fontSize:'.82rem',fontWeight:'600',color:T.slate,marginBottom:'.4rem'}}>
            Add Comment <span style={{color:T.muted,fontWeight:'400'}}>(optional)</span>
          </label>
          <textarea value={comment} onChange={e=>setComment(e.target.value)}
            placeholder="Add a note for the employee…"
            rows={3}
            style={{
              width:'100%',padding:'.8rem 1rem',
              background:T.navyMid,border:`1px solid ${T.border}`,
              color:T.white,borderRadius:'10px',fontSize:'.88rem',
              outline:'none',resize:'vertical',fontFamily:"'DM Sans',sans-serif",
              boxSizing:'border-box',transition:'border-color .2s',
            }}
            onFocus={e=>e.target.style.borderColor=T.teal}
            onBlur={e=>e.target.style.borderColor=T.border}
          />
        </div>

        {/* Actions */}
        <div style={{display:'flex',gap:'.75rem'}}>
          <button onClick={()=>handle('rejected')} disabled={loading} style={{
            flex:1,padding:'.85rem',
            background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.3)',
            color:'#F87171',borderRadius:'10px',
            fontFamily:"'DM Sans',sans-serif",fontWeight:'700',fontSize:'.9rem',
            cursor:loading?'not-allowed':'pointer',transition:'all .2s',
          }}
            onMouseEnter={e=>{if(!loading){e.currentTarget.style.background='rgba(239,68,68,.2)';}}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(239,68,68,.1)';}}
          >
            ✕ Reject
          </button>
          <button onClick={()=>handle('approved')} disabled={loading} style={{
            flex:2,padding:'.85rem',
            background:loading?'rgba(16,217,136,.3)':'linear-gradient(135deg,#10D988,#059669)',
            border:'none',color:T.navy,borderRadius:'10px',
            fontFamily:"'DM Sans',sans-serif",fontWeight:'700',fontSize:'.9rem',
            cursor:loading?'not-allowed':'pointer',transition:'all .2s',
            display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem',
            boxShadow:loading?'none':'0 4px 16px rgba(16,217,136,.3)',
          }}>
            {loading && <span style={{width:'14px',height:'14px',border:'2px solid rgba(5,13,31,.3)',borderTopColor:T.navy,borderRadius:'50%',display:'inline-block',animation:'spin 1s linear infinite'}}/>}
            ✓ Approve
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Component ─── */
const ManagerHome = () => {
  const { user } = useAuth();
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchStats = () => {
    setLoading(true);
    axiosInstance.get('/dashboard/manager-stats')
      .then(res=>setStats(res.data))
      .catch(console.error)
      .finally(()=>setLoading(false));
  };

  useEffect(() => { fetchStats(); }, []);

  const handleAction = async (id, action, comment) => {
    try {
      await axiosInstance.patch(`/requests/${id}/review`, { status:action, managerComment:comment });
      showToast(action==='approved' ? '✅ Request approved successfully' : '✕ Request rejected');
      fetchStats();
    } catch(err) {
      showToast('⚠ Action failed — please try again', 'error');
    }
  };

  const showToast = (msg, type='success') => {
    setToast({msg,type});
    setTimeout(()=>setToast(null), 3500);
  };

  const metrics = [
    { label:'Total Team Requests',  value:stats?.totalTeam        ?? 0, icon:'📊', accentColor:T.gradient,     sub:'All time' },
    { label:'Pending Approvals',    value:stats?.pendingApprovals ?? 0, icon:'⏳', accentColor:T.pendingGrad,   sub:'Action required' },
    { label:'Approved This Month',  value:stats?.recentlyApproved ?? 0, icon:'✅', accentColor:T.approvedGrad,  sub:'Last 30 days' },
  ];

  return (
    <div style={{animation:'fadeUp .5s ease',position:'relative'}}>

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed',bottom:'2rem',right:'2rem',zIndex:2000,
          background: toast.type==='error' ? 'rgba(239,68,68,.15)' : 'rgba(16,217,136,.15)',
          border:`1px solid ${toast.type==='error' ? 'rgba(239,68,68,.4)' : 'rgba(16,217,136,.4)'}`,
          color: toast.type==='error' ? '#F87171' : '#10D988',
          padding:'.9rem 1.4rem',borderRadius:'12px',
          fontFamily:"'DM Sans',sans-serif",fontSize:'.88rem',fontWeight:'600',
          backdropFilter:'blur(16px)',boxShadow:'0 8px 32px rgba(0,0,0,.3)',
          animation:'slideInRight .3s ease',
        }}>{toast.msg}</div>
      )}

      {/* Modal */}
      {selectedReq && (
        <ActionModal
          req={selectedReq}
          onClose={()=>setSelectedReq(null)}
          onAction={handleAction}
        />
      )}

      {/* ── Header ── */}
      <div style={{
        display:'flex',justifyContent:'space-between',alignItems:'flex-start',
        marginBottom:'2rem',flexWrap:'wrap',gap:'1rem',
      }}>
        <div>
          <div style={{
            display:'inline-flex',alignItems:'center',gap:'.5rem',
            background:'rgba(0,255,209,.08)',border:'1px solid rgba(0,255,209,.2)',
            color:T.cyan,fontSize:'.72rem',fontWeight:'600',letterSpacing:'.1em',
            textTransform:'uppercase',padding:'.28rem .75rem',borderRadius:'100px',
            marginBottom:'.75rem',
          }}>
            <span style={{width:'5px',height:'5px',borderRadius:'50%',background:T.cyan,display:'inline-block'}}/>
            Manager Portal
          </div>
          <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:'1.6rem',fontWeight:'800',letterSpacing:'-.02em',marginBottom:'.3rem'}}>
            Manager Dashboard
          </h1>
          <p style={{color:T.slate,fontSize:'.9rem'}}>
            {user?.department} department — review and manage access requests
          </p>
        </div>

        <Link to="/dashboard/review-requests" style={{textDecoration:'none'}}>
          <button style={{
            background:'rgba(0,255,209,.1)',border:`1px solid rgba(0,255,209,.3)`,
            color:T.cyan,borderRadius:'10px',padding:'.7rem 1.4rem',
            fontFamily:"'DM Sans',sans-serif",fontWeight:'700',fontSize:'.88rem',
            cursor:'pointer',transition:'all .2s',
            display:'flex',alignItems:'center',gap:'.5rem',
          }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(0,255,209,.18)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(0,255,209,.1)'}
          >
            View All Requests →
          </button>
        </Link>
      </div>

      {/* ── Metric Cards ── */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',
        gap:'1.1rem',marginBottom:'2rem',
      }}>
        {metrics.map(m=><MetricCard key={m.label} {...m} loading={loading}/>)}
      </div>

      {/* ── Escalation alert ── */}
      {!loading && (stats?.pendingApprovals ?? 0) > 0 && (
        <div style={{
          background:'rgba(245,158,11,.08)',border:'1px solid rgba(245,158,11,.25)',
          borderRadius:'12px',padding:'1rem 1.25rem',
          display:'flex',alignItems:'center',gap:'.9rem',
          marginBottom:'1.5rem',
          animation:'fadeIn .4s ease',
        }}>
          <span style={{fontSize:'1.1rem'}}>⚠️</span>
          <div style={{flex:1}}>
            <p style={{fontSize:'.85rem',fontWeight:'600',color:'#F59E0B'}}>
              {stats.pendingApprovals} request{stats.pendingApprovals>1?'s':''} awaiting review
            </p>
            <p style={{fontSize:'.78rem',color:T.muted,marginTop:'.1rem'}}>
              Requests older than 48 hours will auto-escalate to higher authority
            </p>
          </div>
          <Link to="/dashboard/review-requests" style={{
            color:'#F59E0B',fontSize:'.8rem',fontWeight:'700',textDecoration:'none',
            background:'rgba(245,158,11,.1)',border:'1px solid rgba(245,158,11,.3)',
            padding:'.4rem .9rem',borderRadius:'8px',whiteSpace:'nowrap',
          }}>
            Review Now
          </Link>
        </div>
      )}

      {/* ── Pending Requests Table ── */}
      <div style={{
        background:T.surface,border:`1px solid ${T.border}`,
        borderRadius:'16px',overflow:'hidden',
      }}>
        <div style={{
          padding:'1.1rem 1.5rem',borderBottom:`1px solid ${T.border}`,
          display:'flex',justifyContent:'space-between',alignItems:'center',
        }}>
          <div>
            <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:'.98rem',fontWeight:'700'}}>
              Pending Approvals
            </h2>
            <p style={{color:T.muted,fontSize:'.75rem',marginTop:'.1rem'}}>Oldest requests first — action required</p>
          </div>
          <Link to="/dashboard/review-requests" style={{color:T.teal,fontSize:'.8rem',fontWeight:'600',textDecoration:'none'}}>
            Full review →
          </Link>
        </div>

        {loading ? (
          <div style={{padding:'1.5rem',display:'flex',flexDirection:'column',gap:'.75rem'}}>
            {[1,2,3].map(i=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'1.5fr 1fr 1fr 1fr 1fr',gap:'1rem',padding:'.75rem 0',borderBottom:`1px solid ${T.border}`}}>
                <div><Skeleton h="13px" w="70%" r="4px"/><Skeleton h="11px" w="50%" r="4px" style={{marginTop:'4px'}}/></div>
                <Skeleton h="13px" w="65%"/><Skeleton h="13px" w="75%"/>
                <Skeleton h="22px" w="80px" r="100px"/>
                <Skeleton h="32px" w="90px" r="8px"/>
              </div>
            ))}
          </div>
        ) : !stats?.pendingList?.length ? (
          <div style={{padding:'4rem 2rem',textAlign:'center'}}>
            <div style={{
              width:'60px',height:'60px',borderRadius:'50%',
              background:'rgba(16,217,136,.1)',border:'1px solid rgba(16,217,136,.2)',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:'1.5rem',margin:'0 auto 1rem',
            }}>🎉</div>
            <p style={{fontFamily:"'Syne',sans-serif",fontWeight:'700',marginBottom:'.4rem'}}>All caught up!</p>
            <p style={{color:T.slate,fontSize:'.88rem'}}>No pending requests for your team.</p>
          </div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:'rgba(0,198,255,.04)'}}>
                  {['Employee','Department','Requested Role','Submitted','Risk','Action'].map(col=>(
                    <th key={col} style={{
                      padding:'.7rem 1.25rem',textAlign:'left',
                      fontSize:'.7rem',fontWeight:'700',color:T.muted,
                      textTransform:'uppercase',letterSpacing:'.06em',
                      borderBottom:`1px solid ${T.border}`,
                      whiteSpace:'nowrap',
                    }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.pendingList.map(req=>(
                  <tr key={req._id}
                    style={{borderBottom:`1px solid ${T.border}`,transition:'background .15s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(0,198,255,.04)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                  >
                    <td style={{padding:'.9rem 1.25rem'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'.6rem'}}>
                        <div style={{
                          width:'30px',height:'30px',borderRadius:'50%',
                          background:T.gradient,
                          display:'flex',alignItems:'center',justifyContent:'center',
                          fontFamily:"'Syne',sans-serif",fontWeight:'700',
                          color:T.navy,fontSize:'.72rem',minWidth:'30px',
                        }}>
                          {req.employee?.fullName?.charAt(0)}
                        </div>
                        <div>
                          <p style={{fontSize:'.85rem',fontWeight:'600',color:T.white,lineHeight:1.2}}>{req.employee?.fullName}</p>
                          <p style={{fontSize:'.75rem',color:T.muted}}>{req.employee?.jobTitle}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{padding:'.9rem 1.25rem',fontSize:'.83rem',color:T.slate}}>{req.employee?.department}</td>
                    <td style={{padding:'.9rem 1.25rem',fontSize:'.85rem',fontWeight:'600',color:T.white}}>{req.requestedRole}</td>
                    <td style={{padding:'.9rem 1.25rem',fontSize:'.8rem',color:T.muted,whiteSpace:'nowrap'}}>
                      {new Date(req.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                    </td>
                    <td style={{padding:'.9rem 1.25rem'}}>
                      <RiskBadge level={req.riskLevel||'low'}/>
                    </td>
                    <td style={{padding:'.9rem 1.25rem'}}>
                      <button onClick={()=>setSelectedReq(req)} style={{
                        background:T.gradient,color:T.navy,border:'none',
                        borderRadius:'8px',padding:'.45rem .9rem',
                        fontFamily:"'DM Sans',sans-serif",fontSize:'.8rem',fontWeight:'700',
                        cursor:'pointer',transition:'all .2s',
                        boxShadow:'0 2px 10px rgba(0,198,255,.25)',
                        whiteSpace:'nowrap',
                      }}
                        onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,198,255,.4)';}}
                        onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 2px 10px rgba(0,198,255,.25)';}}
                      >
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

      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
        @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
        @keyframes shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
        @keyframes slideInRight{from{opacity:0;transform:translateX(20px);}to{opacity:1;transform:translateX(0);}}
        textarea::placeholder{color:#4A6080;}
      `}</style>
    </div>
  );
};

export default ManagerHome;