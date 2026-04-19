import { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { T, Sk, Toast, PageHeader, TABLE_TH, GLOBAL_CSS } from '../../styles/darkTokens';
import { useAuth } from '../../contexts/AuthContext';

const ROLES = ['all','employee','manager','admin'];

const ManageUsersPage = () => {
  const { user: me } = useAuth();
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [search,  setSearch]  = useState('');
  const [roleF,   setRoleF]   = useState('all');

  const showToast = (msg,type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const fetchUsers = () => {
    setLoading(true);
    axiosInstance.get('/users').then(res=>setUsers(res.data)).catch(console.error).finally(()=>setLoading(false));
  };
  useEffect(fetchUsers, []);

  const handleToggle = async (userId, current) => {
    try {
      await axiosInstance.patch(`/users/${userId}/toggle-active`);
      showToast(`User ${current ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch { showToast('Failed to update user','error'); }
  };

  const handleRole = async (userId, role) => {
    try {
      await axiosInstance.patch(`/users/${userId}/role`, { role });
      showToast(`Role changed to ${role}`);
      fetchUsers();
    } catch { showToast('Failed to update role','error'); }
  };

  const handleDelete = async (userId) => {
    try {
      await axiosInstance.delete(`/users/${userId}`);
      showToast('User deleted'); setConfirm(null); fetchUsers();
    } catch { showToast('Delete failed','error'); }
  };

  const filtered = users.filter(u => {
    const matchSearch = !search || u.fullName?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole   = roleF === 'all' || u.role === roleF;
    return matchSearch && matchRole;
  });

  const RoleBadge = ({ role }) => {
    const map = { employee:{color:T.teal,bg:'rgba(0,198,255,.1)'}, manager:{color:T.cyan,bg:'rgba(0,255,209,.1)'}, admin:{color:T.purple,bg:'rgba(167,139,250,.1)'} };
    const r = map[role] || map.employee;
    return <span style={{ background:r.bg,color:r.color,padding:'.2rem .6rem',borderRadius:'100px',fontSize:'.7rem',fontWeight:'700',textTransform:'capitalize' }}>{role}</span>;
  };

  return (
    <div style={{ animation:'fadeUp .5s ease' }}>
      {toast && <Toast {...toast}/>}

      <PageHeader badge="Admin Console" badgeColor="purple" title="Manage Users"
        sub={`${users.length} total accounts in the system`}/>

      {/* Filters */}
      <div style={{ display:'flex',gap:'.75rem',marginBottom:'1.5rem',flexWrap:'wrap',alignItems:'center' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search by name or email…"
          style={{ flex:1,minWidth:'200px',padding:'.6rem 1rem',background:T.surface,border:`1px solid ${T.border}`,color:T.white,borderRadius:'10px',fontSize:'.88rem',outline:'none',fontFamily:"'DM Sans',sans-serif" }}
          onFocus={e=>e.target.style.borderColor=T.teal} onBlur={e=>e.target.style.borderColor=T.border}
        />
        <div style={{ display:'flex',gap:'.4rem' }}>
          {ROLES.map(r=>(
            <button key={r} onClick={()=>setRoleF(r)} style={{
              padding:'.45rem .9rem',
              background: roleF===r ? T.gradient : 'transparent',
              border: roleF===r ? 'none' : `1px solid ${T.border}`,
              color: roleF===r ? T.navy : T.slate,
              borderRadius:'100px',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",fontWeight:'600',fontSize:'.82rem',textTransform:'capitalize',
            }}>{r==='all'?'All':r}</button>
          ))}
        </div>
      </div>

      <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:'16px',overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:'1.5rem',display:'flex',flexDirection:'column',gap:'.75rem' }}>
            {[1,2,3,4].map(i=>(
              <div key={i} style={{ display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr',gap:'1rem',padding:'.75rem 0',borderBottom:`1px solid ${T.border}` }}>
                <Sk h="13px" w="70%"/><Sk h="13px" w="60%"/><Sk h="22px" w="80px" r="100px"/><Sk h="22px" w="80px" r="100px"/><Sk h="32px" w="90px" r="8px"/>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:'4rem',textAlign:'center',color:T.muted }}>No users found</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'rgba(0,198,255,.04)' }}>
                  {['User','Department','Role','Status','Actions'].map(c=><th key={c} style={TABLE_TH}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u=>(
                  <tr key={u._id} style={{ borderBottom:`1px solid ${T.border}`,transition:'background .15s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(0,198,255,.03)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'.9rem 1.25rem' }}>
                      <div style={{ display:'flex',alignItems:'center',gap:'.6rem' }}>
                        <div style={{ width:'34px',height:'34px',borderRadius:'50%',background:T.gradient,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'800',color:T.navy,fontSize:'.82rem',minWidth:'34px',fontFamily:"'Syne',sans-serif" }}>
                          {u.fullName?.charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontSize:'.88rem',fontWeight:'600',color:T.white,lineHeight:1.2 }}>{u.fullName}</p>
                          <p style={{ fontSize:'.75rem',color:T.muted }}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'.9rem 1.25rem',fontSize:'.83rem',color:T.slate }}>{u.department}</td>
                    <td style={{ padding:'.9rem 1.25rem' }}>
                      {String(u._id) === String(me?._id)
                        ? <RoleBadge role={u.role}/>
                        : (
                          <select value={u.role} onChange={e=>handleRole(u._id,e.target.value)}
                            style={{ background:T.navyMid,border:`1px solid ${T.border}`,color:T.white,borderRadius:'7px',padding:'.25rem .55rem',fontSize:'.78rem',cursor:'pointer',outline:'none' }}>
                            <option value="employee">Employee</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        )
                      }
                    </td>
                    <td style={{ padding:'.9rem 1.25rem' }}>
                      <span style={{ display:'inline-flex',alignItems:'center',gap:'.3rem',background:u.isActive?'rgba(16,217,136,.1)':'rgba(239,68,68,.1)',color:u.isActive?T.approved:T.rejected,padding:'.22rem .65rem',borderRadius:'100px',fontSize:'.72rem',fontWeight:'700' }}>
                        <span style={{ width:'5px',height:'5px',borderRadius:'50%',background:u.isActive?T.approved:T.rejected,display:'inline-block' }}/>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding:'.9rem 1.25rem' }}>
                      {String(u._id) !== String(me?._id) && (
                        <div style={{ display:'flex',gap:'.4rem' }}>
                          <button onClick={()=>handleToggle(u._id,u.isActive)} title={u.isActive?'Deactivate':'Activate'} style={{ background:u.isActive?'rgba(239,68,68,.1)':'rgba(16,217,136,.1)',border:`1px solid ${u.isActive?'rgba(239,68,68,.25)':'rgba(16,217,136,.25)'}`,color:u.isActive?'#F87171':T.approved,borderRadius:'7px',padding:'.3rem .55rem',fontSize:'.78rem',cursor:'pointer',fontWeight:'600' }}>
                            {u.isActive ? '⏸' : '▶'}
                          </button>
                          <button onClick={()=>setConfirm(u._id)} style={{ background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',color:'#F87171',borderRadius:'7px',padding:'.3rem .55rem',fontSize:'.78rem',cursor:'pointer' }}>🗑</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding:'.6rem 1.5rem',borderTop:`1px solid ${T.border}` }}>
          <span style={{ color:T.muted,fontSize:'.78rem' }}>Showing {filtered.length} of {users.length} users</span>
        </div>
      </div>

      {/* Delete confirm */}
      {confirm && (
        <div style={{ position:'fixed',inset:0,background:'rgba(5,13,31,.85)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem',animation:'fadeIn .2s ease' }}
          onClick={e=>e.target===e.currentTarget&&setConfirm(null)}>
          <div style={{ background:T.surface,border:'1px solid rgba(239,68,68,.35)',borderRadius:'16px',padding:'2rem',maxWidth:'380px',width:'100%',animation:'slideUp .2s ease' }}>
            <h3 style={{ fontFamily:"'Syne',sans-serif",fontWeight:'800',marginBottom:'.5rem' }}>Delete User?</h3>
            <p style={{ color:T.slate,fontSize:'.88rem',lineHeight:1.6,marginBottom:'1.5rem' }}>This will permanently delete the user account. This action cannot be undone.</p>
            <div style={{ display:'flex',gap:'.75rem' }}>
              <button onClick={()=>setConfirm(null)} style={{ flex:1,padding:'.75rem',background:'transparent',border:`1.5px solid ${T.border}`,color:T.slate,borderRadius:'10px',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",fontWeight:'600' }}>Cancel</button>
              <button onClick={()=>handleDelete(confirm)} style={{ flex:1,padding:'.75rem',background:'linear-gradient(135deg,#EF4444,#DC2626)',border:'none',color:'white',borderRadius:'10px',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",fontWeight:'700' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
      <style>{GLOBAL_CSS}</style>
    </div>
  );
};

export default ManageUsersPage;