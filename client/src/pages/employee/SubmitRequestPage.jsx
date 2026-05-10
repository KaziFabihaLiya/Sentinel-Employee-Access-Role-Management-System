// client/src/pages/employee/SubmitRequestPage.jsx
// KEY FIX: Field component defined OUTSIDE — prevents remount on every state change (was causing focus loss)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import { T, Toast, PageHeader, GLOBAL_CSS } from '../../styles/darkTokens';

const DEPARTMENTS = ['IT','HR','Finance','Operations','Marketing','Legal','Sales','Engineering'];
const DURATIONS   = ['Permanent','1 Week','2 Weeks','1 Month','3 Months','6 Months'];

// ── CRITICAL: Defined OUTSIDE component so it never remounts ─────────────────
const Field = ({ label, error, children }) => (
  <div style={{ marginBottom:'1.25rem' }}>
    <label style={{ display:'block',fontSize:'.82rem',fontWeight:'600',color:'#8DA5C4',marginBottom:'.4rem' }}>
      {label}
    </label>
    {children}
    {error && <p style={{ color:'#EF4444',fontSize:'.75rem',marginTop:'.3rem' }}>{error}</p>}
  </div>
);

const baseInput = {
  width:'100%', padding:'.8rem 1rem',
  background:'#0B1730', border:'1px solid rgba(0,198,255,0.12)',
  color:'#FFF', borderRadius:'10px', fontSize:'.9rem',
  outline:'none', boxSizing:'border-box',
  transition:'border-color .2s,box-shadow .2s',
  fontFamily:"'DM Sans',sans-serif",
};

const focusStyle  = { borderColor:'#00C6FF', boxShadow:'0 0 0 3px rgba(0,198,255,.1)' };
const blurStyle   = { borderColor:'rgba(0,198,255,0.12)', boxShadow:'none' };
const errorBorder = { borderColor:'#EF4444' };

const SubmitRequestPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [toast,       setToast]       = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [roleOpts,    setRoleOpts]    = useState([]);
  const [loadingRoles,setLoadingRoles]= useState(true);
  const [form,        setForm]        = useState({
    department:    user?.department || '',
    jobTitle:      user?.jobTitle   || '',
    requestedRole: '',
    justification: '',
    accessDuration:'',
  });
  const [errors, setErrors] = useState({});

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  // Fetch role templates on mount (once)
  useEffect(() => {
    axiosInstance.get('/roles')
      .then(res => setRoleOpts(res.data))
      .catch(() => setRoleOpts([]))
      .finally(() => setLoadingRoles(false));
  }, []);

  // Stable onChange — does NOT recreate component
  const set = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]:'' }));
  };

  const validate = () => {
    const e = {};
    if (!form.department)             e.department    = 'Department is required';
    if (!form.jobTitle.trim())        e.jobTitle      = 'Job title is required';
    if (!form.requestedRole.trim())   e.requestedRole = 'Please select or enter a role';
    if (form.justification.trim().length < 20)
      e.justification = `At least 20 characters required (${form.justification.trim().length} entered)`;
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await axiosInstance.post('/requests', form);
      showToast('✅ Request submitted! Your manager has been notified.');
      setTimeout(() => navigate('/dashboard/my-requests'), 1800);
    } catch (err) {
      showToast(err.response?.data?.message || 'Submission failed. Please try again.', 'error');
    } finally { setLoading(false); }
  };

  // Risk preview
  const getRisk = () => {
    const r = form.requestedRole.toLowerCase();
    if (['admin','database','payroll','erp admin','root'].some(k=>r.includes(k))) return { label:'High', color:'#EF4444', icon:'🔴' };
    if (['finance','hr','manager','write','delete'].some(k=>r.includes(k)) || (form.accessDuration && form.accessDuration!=='Permanent')) return { label:'Medium', color:'#F59E0B', icon:'🟡' };
    return { label:'Low', color:'#10D988', icon:'🟢' };
  };
  const risk = form.requestedRole ? getRisk() : null;

  // If a template is selected in dropdown, get its info
  const selectedTemplate = roleOpts.find(r => r.roleName === form.requestedRole);

  return (
    <div style={{ animation:'fadeUp .5s ease', maxWidth:'760px' }}>
      {toast && <Toast {...toast}/>}
      <PageHeader badge="Employee" title="Submit Access Request" sub="Request ERP system access — your manager will be notified"/>

      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', padding:'2rem' }}>
        <form onSubmit={handleSubmit} autoComplete="off">

          {/* Row 1: Department + Job Title */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }} className="form-two-col">
            <Field label="Department *" error={errors.department}>
              <select
                value={form.department}
                onChange={set('department')}
                onFocus={e=>Object.assign(e.target.style,focusStyle)}
                onBlur={e=>Object.assign(e.target.style,blurStyle)}
                style={{ ...baseInput, cursor:'pointer', ...(errors.department?errorBorder:{}) }}
              >
                <option value="">Select department…</option>
                {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </Field>

            <Field label="Job Title *" error={errors.jobTitle}>
              <input
                type="text"
                value={form.jobTitle}
                onChange={set('jobTitle')}
                onFocus={e=>Object.assign(e.target.style,focusStyle)}
                onBlur={e=>Object.assign(e.target.style,blurStyle)}
                placeholder="e.g. Financial Analyst"
                style={{ ...baseInput, ...(errors.jobTitle?errorBorder:{}) }}
              />
            </Field>
          </div>

          {/* Row 2: Role dropdown + manual + Duration */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }} className="form-two-col">
            <Field label="Requested Role *" error={errors.requestedRole}>
              {/* Dropdown from DB */}
              <select
                value={selectedTemplate ? form.requestedRole : ''}
                onChange={e => { if(e.target.value){ set('requestedRole')({ target:{ value:e.target.value } }); } }}
                onFocus={e=>Object.assign(e.target.style,focusStyle)}
                onBlur={e=>Object.assign(e.target.style,blurStyle)}
                style={{ ...baseInput, cursor:'pointer', marginBottom:'.5rem' }}
              >
                <option value="">— Select from templates —</option>
                {loadingRoles
                  ? <option disabled>Loading…</option>
                  : roleOpts.map(r=>(
                    <option key={r._id} value={r.roleName}>
                      {r.roleName} ({r.accessLevel} Risk)
                    </option>
                  ))
                }
              </select>
              {/* Manual text */}
              <input
                type="text"
                value={form.requestedRole}
                onChange={set('requestedRole')}
                onFocus={e=>Object.assign(e.target.style,focusStyle)}
                onBlur={e=>Object.assign(e.target.style,blurStyle)}
                placeholder="Or type a custom role…"
                style={{ ...baseInput, ...(errors.requestedRole?errorBorder:{}) }}
              />
            </Field>

            <div style={{ marginBottom:'1.25rem' }}>
              <label style={{ display:'block',fontSize:'.82rem',fontWeight:'600',color:'#8DA5C4',marginBottom:'.4rem' }}>
                Access Duration
              </label>
              <select
                value={form.accessDuration}
                onChange={set('accessDuration')}
                onFocus={e=>Object.assign(e.target.style,focusStyle)}
                onBlur={e=>Object.assign(e.target.style,blurStyle)}
                style={{ ...baseInput, cursor:'pointer' }}
              >
                <option value="">Permanent</option>
                {DURATIONS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>

              {/* Template info card */}
              {selectedTemplate && (
                <div style={{ marginTop:'.65rem', background:'rgba(0,198,255,.04)', border:`1px solid ${T.border}`, borderRadius:'9px', padding:'.7rem .9rem' }}>
                  <p style={{ fontSize:'.75rem', color:T.slate, lineHeight:1.5, marginBottom:'.4rem' }}>
                    <strong style={{ color:T.white }}>{selectedTemplate.roleName}</strong><br/>
                    {selectedTemplate.description}
                  </p>
                  {selectedTemplate.permissions?.length > 0 && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'.3rem' }}>
                      {selectedTemplate.permissions.slice(0,5).map(p=>(
                        <span key={p} style={{ background:'rgba(0,198,255,.08)',color:T.teal,fontSize:'.65rem',padding:'.1rem .4rem',borderRadius:'100px' }}>{p}</span>
                      ))}
                      {selectedTemplate.permissions.length > 5 && (
                        <span style={{ color:T.muted,fontSize:'.68rem' }}>+{selectedTemplate.permissions.length-5} more</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Justification */}
          <Field label="Justification *" error={errors.justification}>
            <textarea
              value={form.justification}
              onChange={set('justification')}
              onFocus={e=>Object.assign(e.target.style,focusStyle)}
              onBlur={e=>Object.assign(e.target.style,blurStyle)}
              rows={5}
              placeholder="Clearly explain why you need this access — include your project name, business need, and expected usage. The more detail you provide, the faster your request will be reviewed."
              style={{ ...baseInput, resize:'vertical', lineHeight:1.65, ...(errors.justification?errorBorder:{}) }}
            />
            <p style={{ color:form.justification.trim().length<20?T.muted:T.approved, fontSize:'.74rem', marginTop:'.3rem' }}>
              {form.justification.trim().length} characters
              {form.justification.trim().length>=20 ? ' ✓ Good length' : ` — ${20-form.justification.trim().length} more needed`}
            </p>
          </Field>

          {/* Risk preview */}
          {risk && (
            <div style={{
              background:`${risk.color}0D`, border:`1px solid ${risk.color}28`,
              borderRadius:'10px', padding:'1rem 1.25rem', marginBottom:'1.75rem',
              display:'flex', alignItems:'flex-start', gap:'.85rem',
            }}>
              <div style={{ width:'36px',height:'36px',borderRadius:'10px',minWidth:'36px',background:`${risk.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem' }}>
                {risk.icon}
              </div>
              <div>
                <p style={{ fontSize:'.84rem',fontWeight:'600',color:risk.color,marginBottom:'.2rem' }}>
                  Estimated Risk: {risk.label}
                </p>
                <p style={{ fontSize:'.78rem',color:T.slate,lineHeight:1.5 }}>
                  {risk.label==='High'
                    ? 'High-risk requests require additional admin approval after manager review.'
                    : risk.label==='Medium'
                    ? 'Your manager will carefully review this request before approving.'
                    : 'Low-risk access is typically approved quickly by your manager.'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display:'flex', gap:'.75rem', justifyContent:'flex-end' }}>
            <button type="button" onClick={()=>navigate('/dashboard')} style={{
              padding:'.75rem 1.5rem', background:'transparent',
              border:`1.5px solid ${T.border}`, color:T.slate,
              borderRadius:'10px', fontFamily:"'DM Sans',sans-serif",
              fontWeight:'600', cursor:'pointer',
            }}>Cancel</button>
            <button type="submit" disabled={loading} style={{
              padding:'.75rem 2.25rem',
              background: loading ? 'rgba(0,198,255,.3)' : T.gradient,
              border:'none', color:T.navy, borderRadius:'10px',
              fontFamily:"'DM Sans',sans-serif", fontWeight:'700', fontSize:'.92rem',
              cursor: loading?'not-allowed':'pointer',
              boxShadow: loading?'none':'0 4px 20px rgba(0,198,255,.3)',
              display:'flex', alignItems:'center', gap:'.5rem',
            }}>
              {loading && <span style={{ width:'14px',height:'14px',border:'2px solid rgba(5,13,31,.3)',borderTopColor:T.navy,borderRadius:'50%',display:'inline-block',animation:'spin 1s linear infinite' }}/>}
              {loading ? 'Submitting…' : '→ Submit Request'}
            </button>
          </div>
        </form>
      </div>
      <style>{GLOBAL_CSS}</style>
    </div>
  );
};

export default SubmitRequestPage;