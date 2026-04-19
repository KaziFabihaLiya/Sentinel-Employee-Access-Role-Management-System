import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import { T, Toast, PageHeader, GLOBAL_CSS } from '../../styles/darkTokens';

const DEPARTMENTS = ['IT','HR','Finance','Operations','Marketing','Legal','Sales','Engineering'];
const DURATIONS   = ['Permanent','1 Week','2 Weeks','1 Month','3 Months','6 Months'];

const inputStyle = {
  width:'100%', padding:'.8rem 1rem',
  background:T.navyMid, border:`1px solid ${T.border}`,
  color:T.white, borderRadius:'10px', fontSize:'.9rem',
  outline:'none', boxSizing:'border-box',
  transition:'border-color .2s', fontFamily:"'DM Sans',sans-serif",
};

const SubmitRequestPage = () => {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [toast,    setToast]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [form, setForm] = useState({
    department:    user?.department || '',
    jobTitle:      user?.jobTitle   || '',
    requestedRole: '',
    justification: '',
    accessDuration:'',
  });
  const [errors, setErrors] = useState({});

  const showToast = (msg, type='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const validate = () => {
    const e = {};
    if (!form.department)    e.department    = 'Department is required';
    if (!form.jobTitle)      e.jobTitle      = 'Job title is required';
    if (!form.requestedRole) e.requestedRole = 'Requested role is required';
    if (form.justification.length < 20) e.justification = 'Please provide at least 20 characters of justification';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await axiosInstance.post('/requests', form);
      showToast('✅ Request submitted successfully!');
      setTimeout(() => navigate('/dashboard/my-requests'), 1500);
    } catch (err) {
      showToast(err.response?.data?.message || 'Submission failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, name, children, error }) => (
    <div style={{ marginBottom:'1.25rem' }}>
      <label style={{
        display:'block', fontSize:'.82rem', fontWeight:'600',
        color:T.slate, marginBottom:'.4rem',
      }}>{label}</label>
      {children}
      {error && <p style={{ color:T.rejected, fontSize:'.75rem', marginTop:'.3rem' }}>{error}</p>}
    </div>
  );

  return (
    <div style={{ animation:'fadeUp .5s ease', maxWidth:'720px' }}>
      {toast && <Toast {...toast}/>}

      <PageHeader
        badge="Employee"
        title="Submit Access Request"
        sub="Request ERP system access — your manager will be notified for review"
      />

      <div style={{
        background:T.surface, border:`1px solid ${T.border}`,
        borderRadius:'16px', padding:'2rem',
      }}>
        <form onSubmit={handleSubmit}>
          {/* Row 1 */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            <Field label="Department *" name="department" error={errors.department}>
              <select value={form.department} onChange={e=>setForm({...form,department:e.target.value})}
                style={{...inputStyle, cursor:'pointer'}}>
                <option value="">Select department</option>
                {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Job Title *" name="jobTitle" error={errors.jobTitle}>
              <input value={form.jobTitle} onChange={e=>setForm({...form,jobTitle:e.target.value})}
                placeholder="e.g. Software Engineer"
                style={inputStyle}
                onFocus={e=>e.target.style.borderColor=T.teal}
                onBlur={e=>e.target.style.borderColor=T.border}
              />
            </Field>
          </div>

          {/* Row 2 */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            <Field label="Requested Role *" name="requestedRole" error={errors.requestedRole}>
              <input value={form.requestedRole} onChange={e=>setForm({...form,requestedRole:e.target.value})}
                placeholder="e.g. Finance Viewer, HR Admin"
                style={inputStyle}
                onFocus={e=>e.target.style.borderColor=T.teal}
                onBlur={e=>e.target.style.borderColor=T.border}
              />
            </Field>
            <Field label="Access Duration (optional)">
              <select value={form.accessDuration} onChange={e=>setForm({...form,accessDuration:e.target.value})}
                style={{...inputStyle, cursor:'pointer'}}>
                <option value="">Permanent</option>
                {DURATIONS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
          </div>

          {/* Justification */}
          <Field label="Access Justification *" error={errors.justification}>
            <textarea value={form.justification}
              onChange={e=>setForm({...form,justification:e.target.value})}
              rows={5}
              placeholder="Explain why you need this access — e.g. required for Q3 audit process..."
              style={{...inputStyle, resize:'vertical', lineHeight:1.6}}
              onFocus={e=>e.target.style.borderColor=T.teal}
              onBlur={e=>e.target.style.borderColor=T.border}
            />
            <p style={{ color: form.justification.length<20 ? T.muted : T.approved, fontSize:'.75rem', marginTop:'.3rem' }}>
              {form.justification.length} characters {form.justification.length<20 ? `(${20-form.justification.length} more needed)` : '✓'}
            </p>
          </Field>

          {/* Risk preview */}
          {form.requestedRole && (
            <div style={{
              background:'rgba(0,198,255,.04)', border:`1px solid ${T.border}`,
              borderRadius:'10px', padding:'1rem', marginBottom:'1.5rem',
              display:'flex', alignItems:'center', gap:'.75rem',
            }}>
              <span style={{fontSize:'1rem'}}>🛡️</span>
              <div>
                <p style={{fontSize:'.82rem', color:T.slate, fontWeight:'500'}}>
                  Risk estimate: <strong style={{color:
                    ['admin','finance','payroll','hr','database'].some(k=>form.requestedRole.toLowerCase().includes(k))
                      ? T.rejected
                      : form.accessDuration && form.accessDuration !== 'Permanent' ? T.pending : T.approved
                  }}>
                    {['admin','finance','payroll','hr','database'].some(k=>form.requestedRole.toLowerCase().includes(k))
                      ? 'High' : form.accessDuration && form.accessDuration !== 'Permanent' ? 'Medium' : 'Low'}
                  </strong>
                </p>
                <p style={{fontSize:'.75rem', color:T.muted, marginTop:'.15rem'}}>
                  High-risk requests may require additional approval
                </p>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display:'flex', gap:'.75rem', justifyContent:'flex-end' }}>
            <button type="button" onClick={()=>navigate('/dashboard')}
              style={{
                padding:'.75rem 1.5rem', background:'transparent',
                border:`1.5px solid ${T.border}`, color:T.slate,
                borderRadius:'10px', fontFamily:"'DM Sans',sans-serif",
                fontWeight:'600', cursor:'pointer',
              }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{
              padding:'.75rem 2rem',
              background: loading ? 'rgba(0,198,255,.3)' : T.gradient,
              border:'none', color:T.navy, borderRadius:'10px',
              fontFamily:"'DM Sans',sans-serif", fontWeight:'700', fontSize:'.92rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(0,198,255,.3)',
              display:'flex', alignItems:'center', gap:'.5rem',
            }}>
              {loading && <span style={{width:'14px',height:'14px',border:`2px solid rgba(5,13,31,.3)`,borderTopColor:T.navy,borderRadius:'50%',display:'inline-block',animation:'spin 1s linear infinite'}}/>}
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
      <style>{GLOBAL_CSS}</style>
    </div>
  );
};

export default SubmitRequestPage;