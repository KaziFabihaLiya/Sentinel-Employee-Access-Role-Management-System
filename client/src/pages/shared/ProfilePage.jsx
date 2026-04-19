import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import { T, Toast, GLOBAL_CSS } from '../../styles/darkTokens';

const ProfilePage = () => {
  const { user, login, token } = useAuth();
  const [toast,   setToast]   = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [pwdMode, setPwdMode] = useState(false);
  const [form, setForm] = useState({
    fullName:   user?.fullName   || '',
    department: user?.department || '',
    jobTitle:   user?.jobTitle   || '',
  });
  const [pwd, setPwd] = useState({ current:'', newPwd:'', confirm:'' });

  const showToast = (msg,type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const handleSaveProfile = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await axiosInstance.put('/auth/profile', form);
      login(res.data.user, token);
      showToast('Profile updated successfully');
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed', 'error');
    } finally { setSaving(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwd.newPwd !== pwd.confirm) { showToast('New passwords do not match', 'error'); return; }
    if (pwd.newPwd.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    setSaving(true);
    try {
      await axiosInstance.put('/auth/change-password', { currentPassword: pwd.current, newPassword: pwd.newPwd });
      showToast('Password changed successfully');
      setPwd({current:'',newPwd:'',confirm:''}); setPwdMode(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Password change failed', 'error');
    } finally { setSaving(false); }
  };

  const inputStyle = {
    width:'100%', padding:'.8rem 1rem',
    background:T.navyMid, border:`1px solid ${T.border}`,
    color:T.white, borderRadius:'10px', fontSize:'.9rem',
    outline:'none', boxSizing:'border-box', fontFamily:"'DM Sans',sans-serif",
    transition:'border-color .2s',
  };

  const roleColor = { employee:T.teal, manager:T.cyan, admin:T.purple };

  return (
    <div style={{ animation:'fadeUp .5s ease', maxWidth:'640px' }}>
      {toast && <Toast {...toast}/>}

      {/* Avatar + name header */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', padding:'2rem', marginBottom:'1.5rem', display:'flex', alignItems:'center', gap:'1.5rem' }}>
        <div style={{ width:'72px',height:'72px',borderRadius:'50%',background:T.gradient,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Syne',sans-serif",fontWeight:'800',fontSize:'1.8rem',color:T.navy,flexShrink:0 }}>
          {user?.fullName?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 style={{ fontFamily:"'Syne',sans-serif",fontWeight:'800',fontSize:'1.2rem',marginBottom:'.3rem' }}>{user?.fullName}</h2>
          <p style={{ color:T.muted,fontSize:'.85rem',marginBottom:'.5rem' }}>{user?.email}</p>
          <span style={{ background:`${roleColor[user?.role]||T.teal}18`,color:roleColor[user?.role]||T.teal,padding:'.2rem .65rem',borderRadius:'100px',fontSize:'.72rem',fontWeight:'700',textTransform:'capitalize' }}>
            {user?.role}
          </span>
        </div>
      </div>

      {/* Edit profile */}
      <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:'16px',padding:'1.75rem',marginBottom:'1.25rem' }}>
        <h3 style={{ fontFamily:"'Syne',sans-serif",fontWeight:'700',fontSize:'1rem',marginBottom:'1.25rem',paddingBottom:'.75rem',borderBottom:`1px solid ${T.border}` }}>Edit Profile</h3>
        <form onSubmit={handleSaveProfile}>
          {[
            { label:'Full Name',   key:'fullName',   type:'text', placeholder:'Your full name' },
            { label:'Job Title',   key:'jobTitle',   type:'text', placeholder:'Your job title' },
            { label:'Department',  key:'department', type:'text', placeholder:'Your department' },
          ].map(f=>(
            <div key={f.key} style={{ marginBottom:'1rem' }}>
              <label style={{ display:'block',fontSize:'.82rem',fontWeight:'600',color:T.slate,marginBottom:'.35rem' }}>{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})}
                placeholder={f.placeholder} style={inputStyle}
                onFocus={e=>e.target.style.borderColor=T.teal} onBlur={e=>e.target.style.borderColor=T.border}
              />
            </div>
          ))}
          <div style={{ marginBottom:'1rem' }}>
            <label style={{ display:'block',fontSize:'.82rem',fontWeight:'600',color:T.slate,marginBottom:'.35rem' }}>Email</label>
            <input value={user?.email} disabled style={{...inputStyle,opacity:.5,cursor:'not-allowed'}}/>
            <p style={{ fontSize:'.72rem',color:T.muted,marginTop:'.25rem' }}>Email cannot be changed</p>
          </div>
          <div style={{ display:'flex',justifyContent:'flex-end' }}>
            <button type="submit" disabled={saving} style={{ padding:'.7rem 1.75rem',background:saving?'rgba(0,198,255,.3)':T.gradient,border:'none',color:T.navy,borderRadius:'10px',fontFamily:"'DM Sans',sans-serif",fontWeight:'700',cursor:saving?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:'.5rem' }}>
              {saving&&<span style={{ width:'14px',height:'14px',border:`2px solid rgba(5,13,31,.3)`,borderTopColor:T.navy,borderRadius:'50%',display:'inline-block',animation:'spin 1s linear infinite' }}/>}
              {saving?'Saving…':'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:'16px',padding:'1.75rem' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom: pwdMode ? '1.25rem' : 0,paddingBottom:pwdMode?'.75rem':0,borderBottom:pwdMode?`1px solid ${T.border}`:'none' }}>
          <h3 style={{ fontFamily:"'Syne',sans-serif",fontWeight:'700',fontSize:'1rem' }}>Security</h3>
          <button onClick={()=>setPwdMode(!pwdMode)} style={{ background:'rgba(0,198,255,.08)',border:`1px solid ${T.border}`,color:T.teal,borderRadius:'8px',padding:'.4rem .85rem',fontSize:'.82rem',fontWeight:'600',cursor:'pointer',fontFamily:"'DM Sans',sans-serif" }}>
            {pwdMode ? 'Cancel' : 'Change Password'}
          </button>
        </div>
        {pwdMode && (
          <form onSubmit={handleChangePassword}>
            {[
              { label:'Current Password', key:'current',  placeholder:'Enter current password' },
              { label:'New Password',     key:'newPwd',   placeholder:'At least 6 characters' },
              { label:'Confirm New',      key:'confirm',  placeholder:'Repeat new password' },
            ].map(f=>(
              <div key={f.key} style={{ marginBottom:'1rem' }}>
                <label style={{ display:'block',fontSize:'.82rem',fontWeight:'600',color:T.slate,marginBottom:'.35rem' }}>{f.label}</label>
                <input type="password" value={pwd[f.key]} onChange={e=>setPwd({...pwd,[f.key]:e.target.value})}
                  placeholder={f.placeholder} style={inputStyle}
                  onFocus={e=>e.target.style.borderColor=T.teal} onBlur={e=>e.target.style.borderColor=T.border}
                />
              </div>
            ))}
            <div style={{ display:'flex',justifyContent:'flex-end' }}>
              <button type="submit" disabled={saving} style={{ padding:'.7rem 1.75rem',background:saving?'rgba(0,198,255,.3)':T.gradient,border:'none',color:T.navy,borderRadius:'10px',fontFamily:"'DM Sans',sans-serif",fontWeight:'700',cursor:saving?'not-allowed':'pointer' }}>
                {saving ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>
      <style>{GLOBAL_CSS}</style>
    </div>
  );
};

export default ProfilePage;