// client/src/components/Admin/RuleBuilder.jsx
import { useState } from 'react';
import { T, GLOBAL_CSS } from '../../styles/darkTokens';

const FIELDS = [
  { value:'department',    label:'Department' },
  { value:'riskLevel',     label:'Risk Level' },
  { value:'requestedRole', label:'Requested Role' },
  { value:'jobTitle',      label:'Job Title' },
  { value:'accessDuration',label:'Access Duration' },
  { value:'isHighRisk',    label:'Is High Risk' },
  { value:'isPermanent',   label:'Is Permanent' },
];

const OPERATORS = [
  { value:'EQUALS',       label:'equals' },
  { value:'NOT_EQUALS',   label:'not equals' },
  { value:'CONTAINS',     label:'contains' },
  { value:'NOT_CONTAINS', label:'not contains' },
  { value:'GREATER_THAN', label:'greater than' },
  { value:'LESS_THAN',    label:'less than' },
  { value:'IN',           label:'is one of' },
];

const sel = (extra = {}) => ({
  background:'rgba(0,198,255,.05)', border:`1px solid ${T.border}`,
  color:T.white, borderRadius:'8px', padding:'.4rem .65rem',
  fontSize:'.78rem', outline:'none', cursor:'pointer',
  fontFamily:"'DM Sans',sans-serif", ...extra,
});
const inp = (extra = {}) => ({
  background:'rgba(0,198,255,.05)', border:`1px solid ${T.border}`,
  color:T.white, borderRadius:'8px', padding:'.4rem .65rem',
  fontSize:'.78rem', outline:'none', fontFamily:"'DM Sans',sans-serif",
  ...extra,
});

let _id = 1;
const uid = () => `c_${_id++}`;

const defaultLeaf = () => ({ id: uid(), type:'leaf', field:'department', operator:'EQUALS', value:'' });
const defaultGroup = (op='AND') => ({ id: uid(), type:'group', logicalOperator: op, conditions: [defaultLeaf()] });

// ── Recursive condition node ──────────────────────────────────────────────────
const ConditionNode = ({ node, onChange, onDelete, depth = 0 }) => {
  const update = (k, v) => onChange({ ...node, [k]: v });

  if (node.type === 'leaf') {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:'.5rem', flexWrap:'wrap',
        background:'rgba(0,198,255,.03)', border:`1px solid ${T.border}`,
        borderRadius:'10px', padding:'.6rem .75rem' }}>
        <select value={node.field} onChange={e => update('field', e.target.value)} style={sel()}>
          {FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <select value={node.operator} onChange={e => update('operator', e.target.value)} style={sel()}>
          {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input value={node.value} onChange={e => update('value', e.target.value)}
          placeholder="value…"
          style={inp({ width:'120px', minWidth:'80px' })} />
        <button onClick={onDelete} style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', color:'#F87171', borderRadius:'7px', padding:'.3rem .5rem', fontSize:'.75rem', cursor:'pointer', marginLeft:'auto' }}>✕</button>
      </div>
    );
  }

  // Group node
  const addLeaf  = () => update('conditions', [...node.conditions, defaultLeaf()]);
  const addGroup = () => update('conditions', [...node.conditions, defaultGroup()]);
  const updateChild = (idx, child) => {
    const next = [...node.conditions];
    next[idx] = child;
    update('conditions', next);
  };
  const deleteChild = (idx) => update('conditions', node.conditions.filter((_, i) => i !== idx));

  return (
    <div style={{ border:`1px solid ${depth === 0 ? T.border : 'rgba(0,198,255,.15)'}`, borderRadius:'12px', padding:'.85rem', background: depth === 0 ? 'transparent' : 'rgba(0,198,255,.02)' }}>
      {/* Group header */}
      <div style={{ display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'.75rem' }}>
        <span style={{ fontSize:'.72rem', color:T.muted, fontWeight:'600' }}>MATCH</span>
        {['AND','OR'].map(op => (
          <button key={op} onClick={() => update('logicalOperator', op)} style={{
            padding:'.25rem .65rem', borderRadius:'100px', fontSize:'.72rem', fontWeight:'700', cursor:'pointer',
            background: node.logicalOperator === op ? T.gradient : 'rgba(255,255,255,.05)',
            border: node.logicalOperator === op ? 'none' : `1px solid ${T.border}`,
            color: node.logicalOperator === op ? T.navy : T.slate,
          }}>{op}</button>
        ))}
        <span style={{ fontSize:'.72rem', color:T.muted }}>of the following</span>
        {depth > 0 && <button onClick={onDelete} style={{ marginLeft:'auto', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)', color:'#F87171', borderRadius:'7px', padding:'.25rem .5rem', fontSize:'.72rem', cursor:'pointer' }}>Remove group</button>}
      </div>

      {/* Children */}
      <div style={{ display:'flex', flexDirection:'column', gap:'.5rem', paddingLeft:'.75rem', borderLeft:`2px solid rgba(0,198,255,.12)` }}>
        {node.conditions.map((child, idx) => (
          <ConditionNode key={child.id} node={child} depth={depth + 1}
            onChange={c => updateChild(idx, c)}
            onDelete={() => deleteChild(idx)} />
        ))}
      </div>

      {/* Add buttons */}
      <div style={{ display:'flex', gap:'.5rem', marginTop:'.65rem' }}>
        <button onClick={addLeaf} style={{ background:'rgba(0,198,255,.07)', border:`1px solid ${T.border}`, color:T.teal, borderRadius:'8px', padding:'.35rem .75rem', fontSize:'.75rem', fontWeight:'600', cursor:'pointer' }}>
          + Condition
        </button>
        <button onClick={addGroup} style={{ background:'rgba(167,139,250,.07)', border:'1px solid rgba(167,139,250,.2)', color:'#A78BFA', borderRadius:'8px', padding:'.35rem .75rem', fontSize:'.75rem', fontWeight:'600', cursor:'pointer' }}>
          + Group
        </button>
      </div>
    </div>
  );
};

// ── RuleBuilder ───────────────────────────────────────────────────────────────
const RuleBuilder = ({ rule, layers = [], onSave, onDelete, onTest, onCancel, saving = false }) => {
  const [form, setForm] = useState({
    ruleName:      rule?.ruleName      || '',
    description:   rule?.description   || '',
    targetLayers:  rule?.targetLayers?.map(l => l._id || l) || [],
    priority:      rule?.priority      ?? 100,
    isActive:      rule?.isActive      ?? true,
    ruleCondition: rule?.ruleCondition || defaultGroup(),
  });
  const [testResult, setTestResult] = useState(null);
  const [testing,    setTesting]    = useState(false);
  const [errors,     setErrors]     = useState({});

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleLayer = (id) => {
    const ids = form.targetLayers.map(String);
    set('targetLayers', ids.includes(String(id))
      ? ids.filter(i => i !== String(id))
      : [...ids, String(id)]);
  };

  const validate = () => {
    const e = {};
    if (!form.ruleName.trim())       e.ruleName     = 'Rule name required';
    if (!form.targetLayers.length)   e.targetLayers = 'Select at least one target layer';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = () => { if (validate()) onSave(form); };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await onTest(form.ruleCondition);
      setTestResult(res);
    } catch { setTestResult({ error: 'Test failed' }); }
    finally { setTesting(false); }
  };

  return (
    <div style={{ background:T.surface, border:`1px solid ${T.borderH}`, borderRadius:'16px', padding:'1.5rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
        <h4 style={{ fontFamily:"'Syne',sans-serif", fontWeight:'800', fontSize:'.95rem' }}>
          {rule?._id ? `Edit Rule: ${rule.ruleName}` : 'New Rule'}
        </h4>
        {rule?._id && (
          <button onClick={() => onDelete(rule._id)} style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', color:'#F87171', borderRadius:'8px', padding:'.35rem .7rem', fontSize:'.75rem', fontWeight:'700', cursor:'pointer' }}>
            🗑 Delete
          </button>
        )}
      </div>

      {/* Name + priority */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'1rem', marginBottom:'1rem' }}>
        <div>
          <label style={{ fontSize:'.78rem', fontWeight:'600', color:T.slate, display:'block', marginBottom:'.3rem' }}>Rule Name</label>
          <input value={form.ruleName} onChange={e => set('ruleName', e.target.value)} placeholder="Finance High-Risk Rule"
            style={{ width:'100%', padding:'.6rem .85rem', background:'rgba(0,198,255,.04)', border:`1px solid ${errors.ruleName ? '#F87171' : T.border}`, color:T.white, borderRadius:'9px', fontSize:'.85rem', outline:'none', boxSizing:'border-box', fontFamily:"'DM Sans',sans-serif" }} />
          {errors.ruleName && <p style={{ color:'#F87171', fontSize:'.72rem', marginTop:'.2rem' }}>{errors.ruleName}</p>}
        </div>
        <div>
          <label style={{ fontSize:'.78rem', fontWeight:'600', color:T.slate, display:'block', marginBottom:'.3rem' }}>Priority</label>
          <input type="number" min={1} value={form.priority} onChange={e => set('priority', +e.target.value)}
            style={{ width:'80px', padding:'.6rem .85rem', background:'rgba(0,198,255,.04)', border:`1px solid ${T.border}`, color:T.white, borderRadius:'9px', fontSize:'.85rem', outline:'none', fontFamily:"'DM Sans',sans-serif" }} />
        </div>
      </div>

      {/* Conditions */}
      <div style={{ marginBottom:'1rem' }}>
        <label style={{ fontSize:'.78rem', fontWeight:'600', color:T.slate, display:'block', marginBottom:'.5rem' }}>Conditions</label>
        <ConditionNode node={form.ruleCondition} depth={0}
          onChange={c => set('ruleCondition', c)}
          onDelete={() => {}} />
      </div>

      {/* Target layers */}
      <div style={{ marginBottom:'1rem' }}>
        <label style={{ fontSize:'.78rem', fontWeight:'600', color:T.slate, display:'block', marginBottom:'.4rem' }}>
          Target Layers {errors.targetLayers && <span style={{ color:'#F87171', fontWeight:'400', marginLeft:'.3rem' }}>{errors.targetLayers}</span>}
        </label>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'.4rem' }}>
          {layers.map(l => {
            const active = form.targetLayers.map(String).includes(String(l._id));
            return (
              <button key={l._id} onClick={() => toggleLayer(l._id)} style={{
                padding:'.3rem .75rem', borderRadius:'100px', fontSize:'.75rem', fontWeight:'600', cursor:'pointer',
                background: active ? T.gradient : 'rgba(0,198,255,.05)',
                border: active ? 'none' : `1px solid ${T.border}`,
                color: active ? T.navy : T.slate,
              }}>
                L{l.layerLevel} · {l.layerName}
              </button>
            );
          })}
          {!layers.length && <span style={{ color:T.muted, fontSize:'.78rem' }}>No layers configured yet</span>}
        </div>
      </div>

      {/* Test result */}
      {testResult && (
        <div style={{ background: testResult.matched ? 'rgba(16,217,136,.08)' : 'rgba(239,68,68,.08)', border:`1px solid ${testResult.matched ? 'rgba(16,217,136,.25)' : 'rgba(239,68,68,.25)'}`, borderRadius:'10px', padding:'.75rem 1rem', marginBottom:'1rem', fontSize:'.8rem' }}>
          {testResult.error
            ? <span style={{ color:'#F87171' }}>⚠ {testResult.error}</span>
            : testResult.matched
            ? <span style={{ color:'#10D988' }}>✓ Rule matched → {testResult.matchedLayers?.map(l => l.layerName).join(', ')}</span>
            : <span style={{ color:'#F87171' }}>✕ Rule did not match the test data</span>}
        </div>
      )}

      <div style={{ display:'flex', gap:'.6rem', flexWrap:'wrap' }}>
        <button onClick={onCancel} style={{ padding:'.65rem 1rem', background:'rgba(255,255,255,.04)', border:`1px solid ${T.border}`, color:T.slate, borderRadius:'9px', fontFamily:"'DM Sans',sans-serif", fontWeight:'600', fontSize:'.82rem', cursor:'pointer' }}>Cancel</button>
        <button onClick={handleTest} disabled={testing} style={{ padding:'.65rem 1rem', background:'rgba(167,139,250,.1)', border:'1px solid rgba(167,139,250,.3)', color:'#A78BFA', borderRadius:'9px', fontFamily:"'DM Sans',sans-serif", fontWeight:'700', fontSize:'.82rem', cursor:'pointer' }}>
          {testing ? '…Testing' : '⚡ Test Rule'}
        </button>
        <button onClick={handleSave} disabled={saving} style={{ flex:1, padding:'.65rem 1rem', background: saving ? 'rgba(0,198,255,.2)' : T.gradient, border:'none', color:T.navy, borderRadius:'9px', fontFamily:"'DM Sans',sans-serif", fontWeight:'700', fontSize:'.82rem', cursor: saving ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'.4rem', minWidth:'120px' }}>
          {saving && <span style={{ width:'12px', height:'12px', border:'2px solid rgba(5,13,31,.3)', borderTopColor:T.navy, borderRadius:'50%', display:'inline-block', animation:'spin 1s linear infinite' }}/>}
          {rule?._id ? 'Save Changes' : 'Create Rule'}
        </button>
      </div>
      <style>{GLOBAL_CSS}</style>
    </div>
  );
};

export default RuleBuilder;