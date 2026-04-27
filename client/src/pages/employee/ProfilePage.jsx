// client/src/pages/employee/ProfilePage.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import { T, Toast, PageHeader, GLOBAL_CSS } from '../../styles/darkTokens';

const DEPARTMENTS = ['IT','HR','Finance','Operations','Marketing','Legal','Sales','Engineering'];

const inputStyle = (focused) => ({
  width: '100%', padding: '.8rem 1rem',
  background: focused ? '#122040' : '#0F1E38',
  border: `1px solid ${focused ? '#00C6FF' : 'rgba(0,198,255,0.12)'}`,
  color: '#FFFFFF', borderRadius: '10px', fontSize: '.9rem',
  outline: 'none', boxSizing: 'border-box',
  transition: 'all .2s', fontFamily: "'DM Sans',sans-serif",
  boxShadow: focused ? '0 0 0 3px rgba(0,198,255,.1)' : 'none',
});

const ProfilePage = () => {
  const { user, login } = useAuth();
  const [tab,     setTab]     = useState('info');   // 'info' | 'security'
  const [focused, setFocused] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState(null);

  const [form, setForm] = useState({
    fullName:   user?.fullName   || '',
    department: user?.department || '',
    jobTitle:   user?.jobTitle   || '',
  });
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword:     '',
    confirmPassword: '',
  });
  const [pwErrors, setPwErrors] = useState({});
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw] = useState({ current:false, new:false, confirm:false });

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  // Refresh profile from server on mount
  useEffect(() => {
    axiosInstance.get('/auth/me')
      .then(res => setForm({ fullName:res.data.fullName, department:res.data.department, jobTitle:res.data.jobTitle }))
      .catch(console.error);
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) return showToast('Full name is required', 'error');
    setLoading(true);
    try {
      const res = await axiosInstance.patch('/users/profile', form);
      // Update auth context with fresh data
      const token = localStorage.getItem('sentinel_token');
      login(res.data, token);
      showToast('Profile updated successfully');
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!pwForm.currentPassword)             errs.current  = 'Current password is required';
    if (pwForm.newPassword.length < 6)       errs.new      = 'Minimum 6 characters';
    if (pwForm.newPassword !== pwForm.confirmPassword) errs.confirm = 'Passwords do not match';
    if (Object.keys(errs).length) { setPwErrors(errs); return; }

    setPwLoading(true);
    try {
      await axiosInstance.patch('/users/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword:     pwForm.newPassword,
      });
      showToast('Password changed successfully');
      setPwForm({ currentPassword:'', newPassword:'', confirmPassword:'' });
      setPwErrors({});
    } catch (err) {
      showToast(err.response?.data?.message || 'Password change failed', 'error');
    } finally {
      setPwLoading(false);
    }
  };

  const initials = user?.fullName?.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase() || 'U';

  return (
    <div style={{ animation:'fadeUp .5s ease', maxWidth:'700px' }}>
      {toast && <Toast {...toast}/>}

      <PageHeader badge="Employee" title="Profile Settings" sub="Manage your account information and security"/>

      {/* Avatar + summary card */}
      <div style={{
        background:T.surface, border:`1px solid ${T.border}`,
        borderRadius:'16px', padding:'1.75rem',
        display:'flex', alignItems:'center', gap:'1.5rem',
        marginBottom:'1.5rem', flexWrap:'wrap',
      }}>
        {/* Avatar */}
        <div style={{ position:'relative' }}>
          <div style={{
            width:'72px', height:'72px', borderRadius:'50%',
            background:T.gradient,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:"'Syne',sans-serif", fontWeight:'800',
            color:T.navy, fontSize:'1.5rem',
            boxShadow:'0 0 30px rgba(0,198,255,.35)',
          }}>{initials}</div>
          <div style={{
            position:'absolute', bottom:'1px', right:'1px',
            width:'16px', height:'16px', borderRadius:'50%',
            background:'#10D988', border:`2px solid ${T.surface}`,
            boxShadow:'0 0 6px #10D988',
          }}/>
        </div>

        <div style={{ flex:1 }}>
          <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:'800', fontSize:'1.1rem', marginBottom:'.2rem' }}>
            {user?.fullName}
          </h3>
          <p style={{ color:T.slate, fontSize:'.85rem', marginBottom:'.5rem' }}>{user?.email}</p>
          <div style={{ display:'flex', gap:'.5rem', flexWrap:'wrap' }}>
            <span style={{ background:'rgba(0,198,255,.1)', color:T.teal, fontSize:'.72rem', fontWeight:'700', padding:'.18rem .65rem', borderRadius:'100px', textTransform:'uppercase', letterSpacing:'.06em' }}>
              {user?.role}
            </span>
            <span style={{ background:'rgba(0,198,255,.06)', color:T.slate, fontSize:'.72rem', fontWeight:'600', padding:'.18rem .65rem', borderRadius:'100px' }}>
              {user?.department}
            </span>
          </div>
        </div>

        <div style={{
          textAlign:'right',
          display:'flex', flexDirection:'column', gap:'.4rem',
        }}>
          <div style={{ fontSize:'.72rem', color:T.muted }}>Member since</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:'700', fontSize:'.9rem' }}>
            {user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString('en-US',{month:'long',year:'numeric'})
              : '—'
            }
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'.5rem', marginBottom:'1.25rem' }}>
        {[{ id:'info', label:'Account Info' }, { id:'security', label:'Security' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:'.5rem 1.1rem',
            background: tab===t.id ? T.gradient : 'transparent',
            border: tab===t.id ? 'none' : `1px solid ${T.border}`,
            color: tab===t.id ? T.navy : T.slate,
            borderRadius:'9px', fontFamily:"'DM Sans',sans-serif",
            fontWeight:'600', fontSize:'.85rem', cursor:'pointer',
            transition:'all .2s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── Account Info Tab ─────────────────────────────── */}
      {tab === 'info' && (
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', padding:'2rem' }}>
          <form onSubmit={handleProfileSave}>
            <div style={{ marginBottom:'1.1rem' }}>
              <label style={{ display:'block', fontSize:'.82rem', fontWeight:'600', color:T.slate, marginBottom:'.4rem' }}>
                Full Name *
              </label>
              <input
                value={form.fullName}
                onChange={e => setForm({...form, fullName:e.target.value})}
                onFocus={() => setFocused('fullName')}
                onBlur={() => setFocused('')}
                placeholder="Your full name"
                style={inputStyle(focused==='fullName')}
              />
            </div>

            <div style={{ marginBottom:'1.1rem' }}>
              <label style={{ display:'block', fontSize:'.82rem', fontWeight:'600', color:T.slate, marginBottom:'.4rem' }}>
                Email Address
              </label>
              <input
                value={user?.email || ''}
                disabled
                style={{ ...inputStyle(false), opacity:.5, cursor:'not-allowed' }}
              />
              <p style={{ color:T.muted, fontSize:'.74rem', marginTop:'.3rem' }}>
                Email cannot be changed. Contact admin for email updates.
              </p>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1.75rem' }} className="form-two-col">
              <div>
                <label style={{ display:'block', fontSize:'.82rem', fontWeight:'600', color:T.slate, marginBottom:'.4rem' }}>
                  Department *
                </label>
                <select
                  value={form.department}
                  onChange={e => setForm({...form, department:e.target.value})}
                  onFocus={() => setFocused('department')}
                  onBlur={() => setFocused('')}
                  style={{ ...inputStyle(focused==='department'), cursor:'pointer' }}
                >
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'.82rem', fontWeight:'600', color:T.slate, marginBottom:'.4rem' }}>
                  Job Title *
                </label>
                <input
                  value={form.jobTitle}
                  onChange={e => setForm({...form, jobTitle:e.target.value})}
                  onFocus={() => setFocused('jobTitle')}
                  onBlur={() => setFocused('')}
                  placeholder="e.g. Software Engineer"
                  style={inputStyle(focused==='jobTitle')}
                />
              </div>
            </div>

            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button type="submit" disabled={loading} style={{
                padding:'.75rem 2rem',
                background: loading ? 'rgba(0,198,255,.3)' : T.gradient,
                border:'none', color:T.navy, borderRadius:'10px',
                fontFamily:"'DM Sans',sans-serif", fontWeight:'700', fontSize:'.9rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(0,198,255,.3)',
                display:'flex', alignItems:'center', gap:'.5rem',
                transition:'all .2s',
              }}>
                {loading && <span style={{ width:'14px',height:'14px',border:`2px solid rgba(5,13,31,.3)`,borderTopColor:T.navy,borderRadius:'50%',display:'inline-block',animation:'spin 1s linear infinite' }}/>}
                {loading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Security Tab ─────────────────────────────────── */}
      {tab === 'security' && (
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', padding:'2rem' }}>
          <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:'700', fontSize:'1rem', marginBottom:'1.5rem' }}>
            Change Password
          </h3>
          <form onSubmit={handlePasswordChange}>
            {/* Current password */}
            <div style={{ marginBottom:'1.1rem' }}>
              <label style={{ display:'block', fontSize:'.82rem', fontWeight:'600', color:T.slate, marginBottom:'.4rem' }}>
                Current Password
              </label>
              <div style={{ position:'relative' }}>
                <input
                  type={showPw.current ? 'text' : 'password'}
                  value={pwForm.currentPassword}
                  onChange={e => setPwForm({...pwForm, currentPassword:e.target.value})}
                  onFocus={() => setFocused('curr')}
                  onBlur={() => setFocused('')}
                  placeholder="Enter current password"
                  style={{ ...inputStyle(focused==='curr'), paddingRight:'2.75rem' }}
                />
                <button type="button" onClick={() => setShowPw(s=>({...s,current:!s.current}))}
                  style={{ position:'absolute',right:'.9rem',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:T.muted,cursor:'pointer',fontSize:'1rem' }}>
                  {showPw.current ? '🙈' : '👁'}
                </button>
              </div>
              {pwErrors.current && <p style={{ color:T.rejected, fontSize:'.74rem', marginTop:'.3rem' }}>{pwErrors.current}</p>}
            </div>

            {/* New password */}
            <div style={{ marginBottom:'1.1rem' }}>
              <label style={{ display:'block', fontSize:'.82rem', fontWeight:'600', color:T.slate, marginBottom:'.4rem' }}>
                New Password
              </label>
              <div style={{ position:'relative' }}>
                <input
                  type={showPw.new ? 'text' : 'password'}
                  value={pwForm.newPassword}
                  onChange={e => setPwForm({...pwForm, newPassword:e.target.value})}
                  onFocus={() => setFocused('new')}
                  onBlur={() => setFocused('')}
                  placeholder="Min. 6 characters"
                  style={{ ...inputStyle(focused==='new'), paddingRight:'2.75rem' }}
                />
                <button type="button" onClick={() => setShowPw(s=>({...s,new:!s.new}))}
                  style={{ position:'absolute',right:'.9rem',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:T.muted,cursor:'pointer',fontSize:'1rem' }}>
                  {showPw.new ? '🙈' : '👁'}
                </button>
              </div>
              {pwErrors.new && <p style={{ color:T.rejected, fontSize:'.74rem', marginTop:'.3rem' }}>{pwErrors.new}</p>}
            </div>

            {/* Confirm */}
            <div style={{ marginBottom:'1.75rem' }}>
              <label style={{ display:'block', fontSize:'.82rem', fontWeight:'600', color:T.slate, marginBottom:'.4rem' }}>
                Confirm New Password
              </label>
              <div style={{ position:'relative' }}>
                <input
                  type={showPw.confirm ? 'text' : 'password'}
                  value={pwForm.confirmPassword}
                  onChange={e => setPwForm({...pwForm, confirmPassword:e.target.value})}
                  onFocus={() => setFocused('confirm')}
                  onBlur={() => setFocused('')}
                  placeholder="Re-enter new password"
                  style={{ ...inputStyle(focused==='confirm'), paddingRight:'2.75rem' }}
                />
                <button type="button" onClick={() => setShowPw(s=>({...s,confirm:!s.confirm}))}
                  style={{ position:'absolute',right:'.9rem',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:T.muted,cursor:'pointer',fontSize:'1rem' }}>
                  {showPw.confirm ? '🙈' : '👁'}
                </button>
              </div>
              {pwErrors.confirm && <p style={{ color:T.rejected, fontSize:'.74rem', marginTop:'.3rem' }}>{pwErrors.confirm}</p>}
            </div>

            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button type="submit" disabled={pwLoading} style={{
                padding:'.75rem 2rem',
                background: pwLoading ? 'rgba(0,198,255,.3)' : T.gradient,
                border:'none', color:T.navy, borderRadius:'10px',
                fontFamily:"'DM Sans',sans-serif", fontWeight:'700', fontSize:'.9rem',
                cursor: pwLoading ? 'not-allowed' : 'pointer',
                boxShadow: pwLoading ? 'none' : '0 4px 20px rgba(0,198,255,.3)',
                display:'flex', alignItems:'center', gap:'.5rem',
              }}>
                {pwLoading && <span style={{ width:'14px',height:'14px',border:`2px solid rgba(5,13,31,.3)`,borderTopColor:T.navy,borderRadius:'50%',display:'inline-block',animation:'spin 1s linear infinite' }}/>}
                {pwLoading ? 'Changing…' : 'Change Password'}
              </button>
            </div>
          </form>

          {/* Security info */}
          <div style={{
            marginTop:'2rem', paddingTop:'1.5rem',
            borderTop:`1px solid ${T.border}`,
          }}>
            <h4 style={{ fontFamily:"'Syne',sans-serif", fontWeight:'700', fontSize:'.88rem', marginBottom:'1rem', color:T.slate }}>
              Security Information
            </h4>
            {[
              { icon:'🔐', label:'Authentication',   value:'JWT Token (7 day expiry)' },
              { icon:'🔒', label:'Password Storage', value:'bcrypt encrypted (10 rounds)' },
              { icon:'📡', label:'Communication',    value:'HTTPS encrypted' },
            ].map(item => (
              <div key={item.label} style={{
                display:'flex', alignItems:'center', gap:'.75rem',
                padding:'.6rem 0', borderBottom:`1px solid ${T.border}`,
              }}>
                <span style={{ fontSize:'.9rem' }}>{item.icon}</span>
                <span style={{ color:T.muted, fontSize:'.82rem', flex:1 }}>{item.label}</span>
                <span style={{ color:T.slate, fontSize:'.82rem', fontWeight:'500' }}>{item.value}</span>
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