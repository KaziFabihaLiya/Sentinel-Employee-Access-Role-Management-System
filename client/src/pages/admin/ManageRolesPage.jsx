import { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { T, Sk, Toast, PageHeader, GLOBAL_CSS } from '../../styles/darkTokens';

const LEVELS    = ['Low','Medium','High'];
const PERM_OPTS = ['read:hr','write:hr','read:finance','write:finance','read:payroll','write:payroll','admin:erp','read:reports','write:reports','admin:users'];

const EMPTY_FORM = { roleName:'', description:'', accessLevel:'Low', permissions:[] };

const ManageRolesPage = () => {
  const [roles,   setRoles]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState(null);
  const [modal,   setModal]   = useState(null);   // null | 'create' | {role object for edit}
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const fetchRoles = () => {
    setLoading(true);
    axiosInstance.get('/roles').then(res=>setRoles(res.data)).catch(console.error).finally(()=>setLoading(false));
  };
  useEffect(fetchRoles, []);

  const openCreate = () => { setForm(EMPTY_FORM); setModal('create'); };
  const openEdit   = (role) => { setForm({ roleName:role.roleName, description:role.description, accessLevel:role.accessLevel, permissions:role.permissions }); setModal(role); };

  const handleSave = async () => {
    if (!form.roleName.trim()) { showToast('Role name is required', 'error'); return; }
    setSaving(true);
    try {
      if (modal === 'create') {
        await axiosInstance.post('/roles', form);
        showToast(`Role "${form.roleName}" created`);
      } else {
        await axiosInstance.put(`/roles/${modal._id}`, form);
        showToast(`Role "${form.roleName}" updated`);
      }
      setModal(null); fetchRoles();
    } catch (err) {
      showToast(err.response?.data?.message || 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/roles/${id}`);
      showToast('Role deleted'); setConfirm(null); fetchRoles();
    } catch { showToast('Delete failed', 'error'); }
  };

  const togglePerm = (perm) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter(p=>p!==perm)
        : [...f.permissions, perm],
    }));
  };

  const levelColor = { Low:T.approved, Medium:T.pending, High:T.rejected };

  return (
    <div style={{ animation:'fadeUp .5s ease' }}>
      {toast && <Toast {...toast}/>}

      <PageHeader badge="Admin Console" badgeColor="purple" title="Manage Role Templates"
        sub="Create and manage predefined ERP role templates"
        action={
          <button onClick={openCreate} style={{
            background:T.gradient, color:T.navy, border:'none',
            borderRadius:'10px', padding:'.7rem 1.4rem',
            fontFamily:"'DM Sans',sans-serif", fontWeight:'700', fontSize:'.88rem',
            cursor:'pointer', boxShadow:'0 4px 16px rgba(0,198,255,.3)',
          }}>+ Create Role</button>
        }
      />

      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'1rem' }}>
          {[1,2,3].map(i=><div key={i} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', padding:'1.5rem', height:'160px' }}><Sk h="20px" w="60%" r="8px"/></div>)}
        </div>
      ) : roles.length === 0 ? (
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', padding:'5rem', textAlign:'center' }}>
          <p style={{ fontSize:'2rem', marginBottom:'1rem' }}>✦</p>
          <p style={{ color:T.slate, marginBottom:'1.25rem' }}>No role templates yet</p>
          <button onClick={openCreate} style={{ background:T.gradient, color:T.navy, border:'none', borderRadius:'9px', padding:'.65rem 1.4rem', fontFamily:"'DM Sans',sans-serif", fontWeight:'700', cursor:'pointer' }}>
            Create First Role
          </button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'1rem' }}>
          {roles.map(role=>(
            <div key={role._id} style={{
              background:T.surface, border:`1px solid ${T.border}`,
              borderRadius:'16px', padding:'1.5rem',
              transition:'border-color .2s, transform .2s',
              position:'relative', overflow:'hidden',
            }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=T.borderH; e.currentTarget.style.transform='translateY(-2px)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border; e.currentTarget.style.transform='translateY(0)';}}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background: role.accessLevel==='High' ? `linear-gradient(135deg,${T.rejected},#DC2626)` : role.accessLevel==='Medium' ? `linear-gradient(135deg,${T.pending},#D97706)` : T.gradient }}/>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1rem' }}>
                <div>
                  <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:'700', fontSize:'1rem', marginBottom:'.25rem' }}>{role.roleName}</h3>
                  <span style={{ fontSize:'.72rem', fontWeight:'700', color: levelColor[role.accessLevel], background: `${levelColor[role.accessLevel]}18`, padding:'.18rem .55rem', borderRadius:'100px' }}>
                    {role.accessLevel} Risk
                  </span>
                </div>
                <div style={{ display:'flex', gap:'.4rem' }}>
                  <button onClick={()=>openEdit(role)} style={{ background:'rgba(0,198,255,.08)', border:`1px solid ${T.border}`, color:T.teal, borderRadius:'7px', padding:'.3rem .55rem', fontSize:'.78rem', cursor:'pointer' }}>Edit</button>
                  <button onClick={()=>setConfirm(role._id)} style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', color:'#F87171', borderRadius:'7px', padding:'.3rem .55rem', fontSize:'.78rem', cursor:'pointer' }}>Del</button>
                </div>
              </div>
              {role.description && <p style={{ color:T.muted, fontSize:'.8rem', lineHeight:1.5, marginBottom:'.75rem' }}>{role.description}</p>}
              <div style={{ display:'flex', flexWrap:'wrap', gap:'.3rem' }}>
                {role.permissions?.slice(0,4).map(p=>(
                  <span key={p} style={{ background:'rgba(0,198,255,.06)', color:T.slate, border:`1px solid ${T.border}`, fontSize:'.68rem', padding:'.18rem .5rem', borderRadius:'100px' }}>{p}</span>
                ))}
                {role.permissions?.length > 4 && <span style={{ color:T.muted, fontSize:'.7rem' }}>+{role.permissions.length-4} more</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal !== null && (
        <div style={{ position:'fixed',inset:0,background:'rgba(5,13,31,.85)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem',animation:'fadeIn .2s ease' }}
          onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div style={{ background:T.surface,border:`1px solid ${T.borderH}`,borderRadius:'20px',padding:'2rem',width:'100%',maxWidth:'540px',boxShadow:'0 24px 80px rgba(0,0,0,.5)',animation:'slideUp .25s ease',maxHeight:'90vh',overflowY:'auto' }}>
            <div style={{ display:'flex',justifyContent:'space-between',marginBottom:'1.5rem' }}>
              <h3 style={{ fontFamily:"'Syne',sans-serif",fontWeight:'800',fontSize:'1.1rem' }}>
                {modal==='create' ? 'Create Role Template' : `Edit: ${modal.roleName}`}
              </h3>
              <button onClick={()=>setModal(null)} style={{ background:'rgba(0,198,255,.08)',border:`1px solid ${T.border}`,color:T.slate,width:'32px',height:'32px',borderRadius:'8px',cursor:'pointer' }}>✕</button>
            </div>

            {[
              { label:'Role Name *', key:'roleName', type:'input', placeholder:'e.g. Finance Viewer' },
              { label:'Description', key:'description', type:'textarea', placeholder:'What does this role allow?' },
            ].map(f=>(
              <div key={f.key} style={{ marginBottom:'1rem' }}>
                <label style={{ display:'block',fontSize:'.82rem',fontWeight:'600',color:T.slate,marginBottom:'.35rem' }}>{f.label}</label>
                {f.type==='input'
                  ? <input value={form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})} placeholder={f.placeholder}
                      style={{ width:'100%',padding:'.75rem 1rem',background:T.navyMid,border:`1px solid ${T.border}`,color:T.white,borderRadius:'10px',fontSize:'.9rem',outline:'none',boxSizing:'border-box',fontFamily:"'DM Sans',sans-serif" }}
                      onFocus={e=>e.target.style.borderColor=T.teal} onBlur={e=>e.target.style.borderColor=T.border}/>
                  : <textarea value={form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})} placeholder={f.placeholder} rows={2}
                      style={{ width:'100%',padding:'.75rem 1rem',background:T.navyMid,border:`1px solid ${T.border}`,color:T.white,borderRadius:'10px',fontSize:'.9rem',outline:'none',resize:'vertical',fontFamily:"'DM Sans',sans-serif",boxSizing:'border-box' }}
                      onFocus={e=>e.target.style.borderColor=T.teal} onBlur={e=>e.target.style.borderColor=T.border}/>
                }
              </div>
            ))}

            <div style={{ marginBottom:'1rem' }}>
              <label style={{ display:'block',fontSize:'.82rem',fontWeight:'600',color:T.slate,marginBottom:'.35rem' }}>Access Level</label>
              <div style={{ display:'flex',gap:'.5rem' }}>
                {LEVELS.map(l=>(
                  <button key={l} onClick={()=>setForm({...form,accessLevel:l})} style={{
                    flex:1,padding:'.55rem',
                    background: form.accessLevel===l ? (l==='High'?`linear-gradient(135deg,${T.rejected},#DC2626)`:l==='Medium'?`linear-gradient(135deg,${T.pending},#D97706)`:T.gradient) : 'transparent',
                    border: form.accessLevel===l ? 'none' : `1px solid ${T.border}`,
                    color: form.accessLevel===l ? (l==='Low'?T.navy:T.white) : T.slate,
                    borderRadius:'8px',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",fontWeight:'600',fontSize:'.82rem',
                  }}>{l}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:'1.5rem' }}>
              <label style={{ display:'block',fontSize:'.82rem',fontWeight:'600',color:T.slate,marginBottom:'.5rem' }}>Permissions</label>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.4rem' }}>
                {PERM_OPTS.map(p=>(
                  <button key={p} onClick={()=>togglePerm(p)} style={{
                    padding:'.4rem .7rem',textAlign:'left',
                    background: form.permissions.includes(p) ? 'rgba(0,198,255,.12)' : 'transparent',
                    border: form.permissions.includes(p) ? `1px solid ${T.teal}` : `1px solid ${T.border}`,
                    color: form.permissions.includes(p) ? T.teal : T.muted,
                    borderRadius:'8px',cursor:'pointer',fontSize:'.75rem',fontFamily:"'DM Sans',sans-serif",
                    transition:'all .15s',
                  }}>{p}</button>
                ))}
              </div>
            </div>

            <div style={{ display:'flex',gap:'.75rem' }}>
              <button onClick={()=>setModal(null)} style={{ flex:1,padding:'.8rem',background:'transparent',border:`1.5px solid ${T.border}`,color:T.slate,borderRadius:'10px',fontFamily:"'DM Sans',sans-serif",fontWeight:'600',cursor:'pointer' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ flex:2,padding:'.8rem',background:saving?'rgba(0,198,255,.3)':T.gradient,border:'none',color:T.navy,borderRadius:'10px',fontFamily:"'DM Sans',sans-serif",fontWeight:'700',cursor:saving?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem' }}>
                {saving&&<span style={{ width:'14px',height:'14px',border:`2px solid rgba(5,13,31,.3)`,borderTopColor:T.navy,borderRadius:'50%',display:'inline-block',animation:'spin 1s linear infinite' }}/>}
                {saving ? 'Saving…' : (modal==='create' ? 'Create Role' : 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirm && (
        <div style={{ position:'fixed',inset:0,background:'rgba(5,13,31,.85)',backdropFilter:'blur(8px)',zIndex:1001,display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem' }}
          onClick={e=>e.target===e.currentTarget&&setConfirm(null)}>
          <div style={{ background:T.surface,border:'1px solid rgba(239,68,68,.35)',borderRadius:'16px',padding:'2rem',maxWidth:'380px',width:'100%' }}>
            <h3 style={{ fontFamily:"'Syne',sans-serif",fontWeight:'800',marginBottom:'.5rem' }}>Delete Role?</h3>
            <p style={{ color:T.slate,fontSize:'.88rem',lineHeight:1.6,marginBottom:'1.5rem' }}>This will permanently delete the role template. Active requests using this role are not affected.</p>
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

export default ManageRolesPage;