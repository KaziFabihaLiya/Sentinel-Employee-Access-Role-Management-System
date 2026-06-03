// client/src/pages/shared/ProfilePage.jsx
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import { T, Toast, PageHeader, GLOBAL_CSS } from '../../styles/darkTokens';
import { getAssetUrl } from '../../utils/assetUrl';

const DEPARTMENTS = ['IT','HR','Finance','Operations','Marketing','Legal','Sales','Engineering'];
const iStyle = (f,e) => ({
  width:'100%', padding:'.8rem 1rem',
  background:f?'#122040':'#0B1730',
  border:`1px solid ${e?'#EF4444':f?'#00C6FF':'rgba(0,198,255,0.12)'}`,
  color:'#FFF', borderRadius:'10px', fontSize:'.9rem',
  outline:'none', boxSizing:'border-box',
  transition:'all .2s', fontFamily:"'DM Sans',sans-serif",
  boxShadow: f ? '0 0 0 3px rgba(0,198,255,.1)' : 'none',
});

const ProfilePage = () => {
  const { user, login } = useAuth();
  const [tab,setTab]=useState('info');
  const [focused,setFocused]=useState('');
  const [loading,setLoading]=useState(false);
  const [toast,setToast]=useState(null);
  const [avatar,setAvatar]=useState(getAssetUrl(user?.avatarUrl)||null);
  const [uploading,setUploading]=useState(false);
  const fileRef=useRef(null);
  const [form,setForm]=useState({ fullName:user?.fullName||'', department:user?.department||'', jobTitle:user?.jobTitle||'' });
  const [pwForm,setPwForm]=useState({ currentPassword:'', newPassword:'', confirmPassword:'' });
  const [pwErrors,setPwErrors]=useState({});
  const [pwLoading,setPwLoading]=useState(false);
  const [showPw,setShowPw]=useState({current:false,new:false,confirm:false});

  const showToast = (msg,type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  useEffect(() => {
    axiosInstance.get('/auth/me')
      .then(res => {
        setForm({ fullName:res.data.fullName, department:res.data.department, jobTitle:res.data.jobTitle });
        setAvatar(getAssetUrl(res.data.avatarUrl)||null);
      }).catch(console.error);
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2*1024*1024) { showToast('Image must be under 2MB','error'); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const previewUrl = ev.target.result;
      setAvatar(previewUrl);
      try {
        const data = new FormData();
        data.append('fullName', form.fullName);
        data.append('department', form.department);
        data.append('jobTitle', form.jobTitle);
        data.append('avatar', file);

        const res = await axiosInstance.patch('/users/profile', data);
        const savedAvatar = getAssetUrl(res.data.avatarUrl);
        setAvatar(savedAvatar||null);
        login({ ...res.data, avatarUrl:savedAvatar }, localStorage.getItem('token'));
        showToast('Profile picture updated');
      } catch { showToast('Failed to save avatar','error'); }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = async () => {
    setAvatar(null);
    try {
      const res = await axiosInstance.patch('/users/profile', { ...form, avatarUrl:'' });
      login({ ...res.data, avatarUrl:'' }, localStorage.getItem('token'));
      showToast('Avatar removed');
    } catch { showToast('Remove failed','error'); }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) { showToast('Full name required','error'); return; }
    setLoading(true);
    try {
      const res = await axiosInstance.patch('/users/profile', form);
      const savedAvatar = getAssetUrl(res.data.avatarUrl);
      setAvatar(savedAvatar||null);
      login({ ...res.data, avatarUrl:savedAvatar }, localStorage.getItem('token'));
      showToast('Profile updated successfully');
    } catch (err) { showToast(err.response?.data?.message||'Update failed','error'); }
    finally { setLoading(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const errs={};
    if (!pwForm.currentPassword) errs.current='Current password required';
    if (pwForm.newPassword.length<6) errs.new='Minimum 6 characters';
    if (pwForm.newPassword!==pwForm.confirmPassword) errs.confirm='Passwords do not match';
    if (Object.keys(errs).length) { setPwErrors(errs); return; }
    setPwLoading(true);
    try {
      await axiosInstance.patch('/users/change-password', { currentPassword:pwForm.currentPassword, newPassword:pwForm.newPassword });
      showToast('Password changed successfully');
      setPwForm({ currentPassword:'', newPassword:'', confirmPassword:'' });
      setPwErrors({});
    } catch (err) { showToast(err.response?.data?.message||'Change failed','error'); }
    finally { setPwLoading(false); }
  };

  const initials = user?.fullName?.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()||'U';

  return (
    <div style={{ animation:'fadeUp .5s ease', maxWidth:'720px' }}>
      {toast && <Toast {...toast}/>}
      <PageHeader badge="Profile" title="Profile Settings" sub="Manage your avatar, account info and security"/>

      {/* Avatar card */}
      <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:'16px',padding:'1.75rem',display:'flex',alignItems:'center',gap:'1.5rem',marginBottom:'1.5rem',flexWrap:'wrap' }}>
        <div style={{ position:'relative',flexShrink:0 }}>
          <div style={{ width:'80px',height:'80px',borderRadius:'50%',background:avatar?'transparent':T.gradient,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Syne',sans-serif",fontWeight:'800',color:T.navy,fontSize:'1.6rem',boxShadow:'0 0 28px rgba(0,198,255,.35)',overflow:'hidden',border:'2px solid rgba(0,198,255,.3)' }}>
            {avatar ? <img src={avatar} alt="avatar" style={{ width:'100%',height:'100%',objectFit:'cover' }}/> : initials}
          </div>
          <button onClick={()=>fileRef.current?.click()} disabled={uploading} style={{ position:'absolute',bottom:'-2px',right:'-2px',width:'26px',height:'26px',borderRadius:'50%',background:T.gradient,border:`2px solid ${T.surface}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:'.75rem' }}>
            {uploading?'⟳':'📷'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display:'none' }}/>
        </div>
        <div style={{ flex:1 }}>
          <h3 style={{ fontFamily:"'Syne',sans-serif",fontWeight:'800',fontSize:'1.05rem',marginBottom:'.25rem' }}>{user?.fullName}</h3>
          <p style={{ color:T.slate,fontSize:'.83rem',marginBottom:'.5rem' }}>{user?.email}</p>
          <div style={{ display:'flex',gap:'.5rem',flexWrap:'wrap',alignItems:'center' }}>
            <span style={{ background:'rgba(0,198,255,.1)',color:T.teal,fontSize:'.72rem',fontWeight:'700',padding:'.18rem .65rem',borderRadius:'100px',textTransform:'uppercase' }}>{user?.role}</span>
            <span style={{ background:'rgba(0,198,255,.06)',color:T.slate,fontSize:'.72rem',fontWeight:'600',padding:'.18rem .65rem',borderRadius:'100px' }}>{user?.department}</span>
          </div>
          <div style={{ display:'flex',gap:'.5rem',marginTop:'.75rem' }}>
            <button onClick={()=>fileRef.current?.click()} style={{ background:'rgba(0,198,255,.08)',border:`1px solid ${T.border}`,color:T.teal,fontSize:'.75rem',fontWeight:'600',padding:'.3rem .75rem',borderRadius:'7px',cursor:'pointer',fontFamily:"'DM Sans',sans-serif" }}>📷 Change Photo</button>
            {avatar && <button onClick={removeAvatar} style={{ background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',color:'#F87171',fontSize:'.75rem',fontWeight:'600',padding:'.3rem .75rem',borderRadius:'7px',cursor:'pointer',fontFamily:"'DM Sans',sans-serif" }}>Remove</button>}
          </div>
          <p style={{ color:T.muted,fontSize:'.7rem',marginTop:'.3rem' }}>JPG, PNG or GIF · Max 2MB</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex',gap:'.5rem',marginBottom:'1.25rem' }}>
        {[{id:'info',label:'Account Info'},{id:'security',label:'Security'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:'.5rem 1.1rem',background:tab===t.id?T.gradient:'transparent',border:tab===t.id?'none':`1px solid ${T.border}`,color:tab===t.id?T.navy:T.slate,borderRadius:'9px',fontFamily:"'DM Sans',sans-serif",fontWeight:'600',fontSize:'.85rem',cursor:'pointer',transition:'all .2s' }}>{t.label}</button>
        ))}
      </div>

      {tab==='info' && (
        <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:'16px',padding:'2rem' }}>
          <form onSubmit={handleProfileSave}>
            <div style={{ marginBottom:'1.1rem' }}>
              <label style={{ display:'block',fontSize:'.82rem',fontWeight:'600',color:T.slate,marginBottom:'.4rem' }}>Full Name *</label>
              <input value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} onFocus={()=>setFocused('fn')} onBlur={()=>setFocused('')} placeholder="Your full name" style={iStyle(focused==='fn',false)}/>
            </div>
            <div style={{ marginBottom:'1.1rem' }}>
              <label style={{ display:'block',fontSize:'.82rem',fontWeight:'600',color:T.slate,marginBottom:'.4rem' }}>Email <span style={{ color:T.muted,fontWeight:'400' }}>(cannot be changed)</span></label>
              <input value={user?.email||''} disabled style={{ ...iStyle(false,false),opacity:.45,cursor:'not-allowed' }}/>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1.75rem' }} className="form-two-col">
              <div>
                <label style={{ display:'block',fontSize:'.82rem',fontWeight:'600',color:T.slate,marginBottom:'.4rem' }}>Department *</label>
                <select value={form.department} onChange={e=>setForm({...form,department:e.target.value})} onFocus={()=>setFocused('dept')} onBlur={()=>setFocused('')} style={{ ...iStyle(focused==='dept',false),cursor:'pointer' }}>
                  {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:'block',fontSize:'.82rem',fontWeight:'600',color:T.slate,marginBottom:'.4rem' }}>Job Title *</label>
                <input value={form.jobTitle} onChange={e=>setForm({...form,jobTitle:e.target.value})} onFocus={()=>setFocused('jt')} onBlur={()=>setFocused('')} placeholder="e.g. Financial Analyst" style={iStyle(focused==='jt',false)}/>
              </div>
            </div>
            <div style={{ display:'flex',justifyContent:'flex-end' }}>
              <button type="submit" disabled={loading} style={{ padding:'.75rem 2rem',background:loading?'rgba(0,198,255,.3)':T.gradient,border:'none',color:T.navy,borderRadius:'10px',fontFamily:"'DM Sans',sans-serif",fontWeight:'700',fontSize:'.9rem',cursor:loading?'not-allowed':'pointer',boxShadow:loading?'none':'0 4px 20px rgba(0,198,255,.3)',display:'flex',alignItems:'center',gap:'.5rem' }}>
                {loading&&<span style={{ width:'14px',height:'14px',border:'2px solid rgba(5,13,31,.3)',borderTopColor:T.navy,borderRadius:'50%',display:'inline-block',animation:'spin 1s linear infinite' }}/>}
                {loading?'Saving…':'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {tab==='security' && (
        <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:'16px',padding:'2rem' }}>
          <h3 style={{ fontFamily:"'Syne',sans-serif",fontWeight:'700',fontSize:'1rem',marginBottom:'1.5rem' }}>Change Password</h3>
          <form onSubmit={handlePasswordChange}>
            {[{key:'currentPassword',label:'Current Password',show:'current'},{key:'newPassword',label:'New Password',show:'new'},{key:'confirmPassword',label:'Confirm New Password',show:'confirm'}].map(f=>(
              <div key={f.key} style={{ marginBottom:'1.1rem' }}>
                <label style={{ display:'block',fontSize:'.82rem',fontWeight:'600',color:T.slate,marginBottom:'.4rem' }}>{f.label}</label>
                <div style={{ position:'relative' }}>
                  <input type={showPw[f.show]?'text':'password'} value={pwForm[f.key]} onChange={e=>setPwForm({...pwForm,[f.key]:e.target.value})} onFocus={()=>setFocused(f.key)} onBlur={()=>setFocused('')} style={{ ...iStyle(focused===f.key,!!pwErrors[f.show]),paddingRight:'2.75rem' }}/>
                  <button type="button" onClick={()=>setShowPw(s=>({...s,[f.show]:!s[f.show]}))} style={{ position:'absolute',right:'.9rem',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:T.muted,cursor:'pointer',fontSize:'1rem' }}>{showPw[f.show]?'🙈':'👁'}</button>
                </div>
                {pwErrors[f.show]&&<p style={{ color:T.rejected,fontSize:'.74rem',marginTop:'.3rem' }}>{pwErrors[f.show]}</p>}
              </div>
            ))}
            {/* Strength meter */}
            {pwForm.newPassword && (() => {
              const pw=pwForm.newPassword;
              const checks=[pw.length>=8,/[A-Z]/.test(pw),/[0-9]/.test(pw),/[^A-Za-z0-9]/.test(pw)];
              const score=checks.filter(Boolean).length;
              const clr=['','#EF4444','#F59E0B','#F59E0B','#10D988'][score];
              return <div style={{ marginBottom:'1.25rem' }}>
                <div style={{ display:'flex',gap:'4px',marginBottom:'.35rem' }}>{[1,2,3,4].map(i=><div key={i} style={{ flex:1,height:'3px',borderRadius:'2px',background:i<=score?clr:'rgba(255,255,255,.08)',transition:'background .3s' }}/>)}</div>
                <div style={{ display:'flex',gap:'1rem',flexWrap:'wrap' }}>{['8+ chars','Uppercase','Number','Special char'].map((l,i)=><span key={l} style={{ fontSize:'.7rem',color:checks[i]?T.cyan:T.muted,display:'flex',alignItems:'center',gap:'3px' }}><span>{checks[i]?'✓':'○'}</span>{l}</span>)}</div>
              </div>;
            })()}
            <div style={{ display:'flex',justifyContent:'flex-end',marginBottom:'2rem' }}>
              <button type="submit" disabled={pwLoading} style={{ padding:'.75rem 2rem',background:pwLoading?'rgba(0,198,255,.3)':T.gradient,border:'none',color:T.navy,borderRadius:'10px',fontFamily:"'DM Sans',sans-serif",fontWeight:'700',cursor:pwLoading?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:'.5rem' }}>
                {pwLoading&&<span style={{ width:'14px',height:'14px',border:'2px solid rgba(5,13,31,.3)',borderTopColor:T.navy,borderRadius:'50%',display:'inline-block',animation:'spin 1s linear infinite' }}/>}
                {pwLoading?'Changing…':'Change Password'}
              </button>
            </div>
          </form>
          <div style={{ paddingTop:'1.5rem',borderTop:`1px solid ${T.border}` }}>
            <h4 style={{ fontFamily:"'Syne',sans-serif",fontWeight:'700',fontSize:'.88rem',marginBottom:'1rem',color:T.slate }}>Security Details</h4>
            {[{icon:'🔐',label:'Auth',value:'JWT (7-day expiry)'},{icon:'🔒',label:'Hashing',value:'bcrypt 10 rounds'},{icon:'📡',label:'Transport',value:'HTTPS only'}].map(item=>(
              <div key={item.label} style={{ display:'flex',alignItems:'center',gap:'.75rem',padding:'.6rem 0',borderBottom:`1px solid ${T.border}` }}>
                <span style={{ fontSize:'.9rem' }}>{item.icon}</span>
                <span style={{ color:T.muted,fontSize:'.82rem',flex:1 }}>{item.label}</span>
                <span style={{ color:T.slate,fontSize:'.82rem',fontWeight:'500' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <style>{GLOBAL_CSS}</style>
    </div>
  );
};

export default ProfilePage;
