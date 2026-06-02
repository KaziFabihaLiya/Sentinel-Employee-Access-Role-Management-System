// client/src/components/Admin/ApprovalLayerConfig.jsx
import { useState, useEffect } from 'react';
import { T, GLOBAL_CSS } from '../../styles/darkTokens';

const ROLE_TYPES = ['LINE_MANAGER','SENIOR_MANAGER','HEAD','SENIOR_DIRECTOR','ADMIN','CUSTOM'];
const ROLE_LABELS = { LINE_MANAGER:'Line Manager', SENIOR_MANAGER:'Senior Manager', HEAD:'Department Head', SENIOR_DIRECTOR:'Senior Director', ADMIN:'System Admin', CUSTOM:'Custom' };

const Field = ({ label, children, hint }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{ display:'block', fontSize:'.78rem', fontWeight:'600', color:T.slate, marginBottom:'.3rem' }}>
      {label}
      {hint && <span style={{ color:T.muted, fontWeight:'400', marginLeft:'.3rem' }}>({hint})</span>}
    </label>
    {children}
  </div>
);

const inputStyle = (focused) => ({
  width:'100%', padding:'.6rem .85rem',
  background:'rgba(0,198,255,.04)', border:`1px solid ${focused ? T.teal : T.border}`,
  color:T.white, borderRadius:'9px', fontSize:'.85rem',
  outline:'none', fontFamily:"'DM Sans',sans-serif",
  boxSizing:'border-box', transition:'border-color .2s',
});

const ApprovalLayerConfig = ({ layer, onSave, onDelete, onCancel, saving = false }) => {
  const [form, setForm] = useState({
    layerName:              '',
    layerLevel:             1,
    approvalRoleType:       'LINE_MANAGER',
    requiredApprovers:      1,
    approvalType:           'ANY_ONE',
    slaHours:               24,
    escalationEnabled:      true,
    autoEscalateAfterHours: 48,
    isOptional:             false,
    description:            '',
  });
  const [focused, setFocused] = useState('');
  const [errors,  setErrors]  = useState({});

  useEffect(() => {
    if (layer) setForm({ ...form, ...layer });
  }, [layer?._id]);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '' })); };

  const validate = () => {
    const e = {};
    if (!form.layerName.trim())      e.layerName  = 'Layer name is required';
    if (form.layerLevel < 1)         e.layerLevel  = 'Must be ≥ 1';
    if (form.slaHours < 1)           e.slaHours    = 'Must be ≥ 1 hour';
    if (form.requiredApprovers < 1)  e.requiredApprovers = 'Must be ≥ 1';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => { if (validate()) onSave(form); };

  const inputProps = (k) => ({
    style: inputStyle(focused === k),
    onFocus: () => setFocused(k),
    onBlur:  () => setFocused(''),
  });

  return (
    <div style={{ background:T.surface, border:`1px solid ${T.borderH}`, borderRadius:'16px', padding:'1.5rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
        <h4 style={{ fontFamily:"'Syne',sans-serif", fontWeight:'800', fontSize:'.95rem', color:T.white }}>
          {layer?._id ? `Edit: ${layer.layerName}` : 'New Approval Layer'}
        </h4>
        {layer?._id && (
          <button onClick={() => onDelete(layer._id)} style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', color:'#F87171', borderRadius:'8px', padding:'.35rem .7rem', fontSize:'.75rem', fontWeight:'700', cursor:'pointer' }}>
            🗑 Delete
          </button>
        )}
      </div>

      <Field label="Layer Name" hint="e.g. Line Manager">
        <input value={form.layerName} onChange={e => set('layerName', e.target.value)} placeholder="Line Manager" {...inputProps('layerName')} />
        {errors.layerName && <p style={{ color:'#F87171', fontSize:'.72rem', marginTop:'.2rem' }}>{errors.layerName}</p>}
      </Field>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
        <Field label="Layer Level" hint="1 = first">
          <input type="number" min={1} max={10} value={form.layerLevel} onChange={e => set('layerLevel', +e.target.value)} {...inputProps('layerLevel')} />
          {errors.layerLevel && <p style={{ color:'#F87171', fontSize:'.72rem', marginTop:'.2rem' }}>{errors.layerLevel}</p>}
        </Field>
        <Field label="Required Approvers">
          <input type="number" min={1} max={10} value={form.requiredApprovers} onChange={e => set('requiredApprovers', +e.target.value)} {...inputProps('requiredApprovers')} />
          {errors.requiredApprovers && <p style={{ color:'#F87171', fontSize:'.72rem', marginTop:'.2rem' }}>{errors.requiredApprovers}</p>}
        </Field>
      </div>

      <Field label="Approval Role Type">
        <select value={form.approvalRoleType} onChange={e => set('approvalRoleType', e.target.value)}
          style={{ ...inputStyle(focused === 'roleType'), cursor:'pointer' }}
          onFocus={() => setFocused('roleType')} onBlur={() => setFocused('')}>
          {ROLE_TYPES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </Field>

      <Field label="Approval Type">
        <div style={{ display:'flex', gap:'.6rem' }}>
          {['ANY_ONE','ALL_REQUIRED'].map(t => (
            <button key={t} onClick={() => set('approvalType', t)} style={{
              flex:1, padding:'.55rem', borderRadius:'9px', fontSize:'.78rem', fontWeight:'700', cursor:'pointer',
              background: form.approvalType === t ? T.gradient : 'rgba(0,198,255,.05)',
              border: form.approvalType === t ? 'none' : `1px solid ${T.border}`,
              color: form.approvalType === t ? T.navy : T.slate,
            }}>
              {t === 'ANY_ONE' ? '⚡ Any One' : '✦ All Required'}
            </button>
          ))}
        </div>
      </Field>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
        <Field label="SLA Hours" hint="working hours">
          <input type="number" min={1} max={720} value={form.slaHours} onChange={e => set('slaHours', +e.target.value)} {...inputProps('slaHours')} />
          {errors.slaHours && <p style={{ color:'#F87171', fontSize:'.72rem', marginTop:'.2rem' }}>{errors.slaHours}</p>}
        </Field>
        <Field label="Auto-Escalate After" hint="hours">
          <input type="number" min={1} max={720} value={form.autoEscalateAfterHours} onChange={e => set('autoEscalateAfterHours', +e.target.value)} {...inputProps('autoEscalateAfterHours')} />
        </Field>
      </div>

      <Field label="Description" hint="optional">
        <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief note about this layer…" {...inputProps('description')} />
      </Field>

      {/* Toggles */}
      <div style={{ display:'flex', gap:'1.5rem', marginBottom:'1.25rem', flexWrap:'wrap' }}>
        {[
          { key:'escalationEnabled', label:'Enable Escalation' },
          { key:'isOptional',        label:'Optional Layer' },
        ].map(({ key, label }) => (
          <label key={key} style={{ display:'flex', alignItems:'center', gap:'.5rem', cursor:'pointer', fontSize:'.82rem', color:T.slate }}>
            <div onClick={() => set(key, !form[key])} style={{
              width:'36px', height:'20px', borderRadius:'100px', position:'relative', cursor:'pointer',
              background: form[key] ? 'rgba(0,198,255,.3)' : 'rgba(255,255,255,.08)',
              border: `1px solid ${form[key] ? T.teal : T.border}`, transition:'all .2s',
            }}>
              <div style={{
                width:'14px', height:'14px', borderRadius:'50%', position:'absolute',
                top:'2px', left: form[key] ? '18px' : '2px',
                background: form[key] ? T.teal : T.muted, transition:'left .2s',
              }}/>
            </div>
            {label}
          </label>
        ))}
      </div>

      <div style={{ display:'flex', gap:'.75rem' }}>
        <button onClick={onCancel} style={{ flex:1, padding:'.7rem', background:'rgba(255,255,255,.04)', border:`1px solid ${T.border}`, color:T.slate, borderRadius:'9px', fontFamily:"'DM Sans',sans-serif", fontWeight:'600', fontSize:'.85rem', cursor:'pointer' }}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving} style={{ flex:2, padding:'.7rem', background: saving ? 'rgba(0,198,255,.2)' : T.gradient, border:'none', color:T.navy, borderRadius:'9px', fontFamily:"'DM Sans',sans-serif", fontWeight:'700', fontSize:'.85rem', cursor: saving ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'.4rem' }}>
          {saving && <span style={{ width:'12px', height:'12px', border:'2px solid rgba(5,13,31,.3)', borderTopColor:T.navy, borderRadius:'50%', display:'inline-block', animation:'spin 1s linear infinite' }}/>}
          {layer?._id ? 'Save Changes' : 'Create Layer'}
        </button>
      </div>
      <style>{GLOBAL_CSS}</style>
    </div>
  );
};

export default ApprovalLayerConfig;