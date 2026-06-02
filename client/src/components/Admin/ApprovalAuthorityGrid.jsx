// client/src/components/Admin/ApprovalAuthorityGrid.jsx
import { useState } from 'react';
import { T, Sk, GLOBAL_CSS } from '../../styles/darkTokens';

const TABLE_TH = { padding:'.7rem 1.1rem', textAlign:'left', fontSize:'.7rem', fontWeight:'700', color:T.muted, textTransform:'uppercase', letterSpacing:'.06em', borderBottom:`1px solid ${T.border}`, whiteSpace:'nowrap' };

const ApprovalAuthorityGrid = ({
  assignments = [],
  loading      = false,
  layers       = [],
  onAdd,
  onEdit,
  onDelete,
  onToggleActive,
  onBulkAction,
}) => {
  const [search,    setSearch]    = useState('');
  const [layerF,    setLayerF]    = useState('all');
  const [deptF,     setDeptF]     = useState('all');
  const [selected,  setSelected]  = useState([]);
  const [confirm,   setConfirm]   = useState(null);

  const depts = [...new Set(assignments.flatMap(a => a.departments || []).filter(d => d !== '*'))];

  const filtered = assignments.filter(a => {
    const name  = a.userId?.fullName?.toLowerCase() || '';
    const email = a.userId?.email?.toLowerCase()    || '';
    const ms    = !search || name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
    const lf    = layerF === 'all' || String(a.layerId?._id || a.layerId) === layerF;
    const df    = deptF  === 'all' || (a.departments || []).includes(deptF);
    return ms && lf && df;
  });

  const toggle = (id) => setSelected(p => p.includes(id) ? p.filter(i=>i!==id) : [...p, id]);
  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map(a => a._id));

  const handleDelete = (id) => { onDelete(id); setConfirm(null); setSelected(p => p.filter(i=>i!==id)); };
  const handleBulk = (action) => { onBulkAction(selected, action); setSelected([]); };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:'flex', gap:'.75rem', marginBottom:'1rem', flexWrap:'wrap', alignItems:'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
          style={{ flex:1, minWidth:'180px', padding:'.5rem .9rem', background:T.surface, border:`1px solid ${T.border}`, color:T.white, borderRadius:'9px', fontSize:'.83rem', outline:'none', fontFamily:"'DM Sans',sans-serif" }} />
        <select value={layerF} onChange={e => setLayerF(e.target.value)}
          style={{ padding:'.5rem .8rem', background:T.surface, border:`1px solid ${T.border}`, color:T.slate, borderRadius:'9px', fontSize:'.82rem', outline:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
          <option value="all">All Layers</option>
          {layers.map(l => <option key={l._id} value={l._id}>L{l.layerLevel}: {l.layerName}</option>)}
        </select>
        <select value={deptF} onChange={e => setDeptF(e.target.value)}
          style={{ padding:'.5rem .8rem', background:T.surface, border:`1px solid ${T.border}`, color:T.slate, borderRadius:'9px', fontSize:'.82rem', outline:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
          <option value="all">All Departments</option>
          {depts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {selected.length > 0 && (
          <div style={{ display:'flex', gap:'.4rem' }}>
            <button onClick={() => handleBulk('activate')} style={{ padding:'.45rem .85rem', background:'rgba(16,217,136,.1)', border:'1px solid rgba(16,217,136,.25)', color:'#10D988', borderRadius:'8px', fontSize:'.75rem', fontWeight:'700', cursor:'pointer' }}>✓ Activate ({selected.length})</button>
            <button onClick={() => handleBulk('deactivate')} style={{ padding:'.45rem .85rem', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', color:'#F87171', borderRadius:'8px', fontSize:'.75rem', fontWeight:'700', cursor:'pointer' }}>⏸ Deactivate ({selected.length})</button>
          </div>
        )}
        <button onClick={onAdd} style={{ padding:'.5rem 1.1rem', background:T.gradient, border:'none', color:T.navy, borderRadius:'9px', fontFamily:"'DM Sans',sans-serif", fontWeight:'700', fontSize:'.82rem', cursor:'pointer', whiteSpace:'nowrap' }}>
          + Assign Approver
        </button>
      </div>

      {/* Table */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'14px', overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:'1.25rem', display:'flex', flexDirection:'column', gap:'.6rem' }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'32px 2fr 1fr 1fr 1fr 1fr 1fr 100px', gap:'1rem', padding:'.65rem 0', borderBottom:`1px solid ${T.border}` }}>
                <Sk h="14px" w="14px" r="4px"/><Sk h="13px" w="70%"/><Sk h="13px" w="60%"/><Sk h="13px" w="50%"/><Sk h="13px" w="50%"/><Sk h="13px" w="40px"/><Sk h="22px" w="60px" r="100px"/><Sk h="28px" w="80px" r="8px"/>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:'4rem', textAlign:'center', color:T.muted, fontSize:'.88rem' }}>
            {assignments.length ? 'No assignments match filters' : 'No approver assignments yet — click "+ Assign Approver" to start'}
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'rgba(0,198,255,.04)' }}>
                  <th style={TABLE_TH}>
                    <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0}
                      onChange={toggleAll} style={{ cursor:'pointer', accentColor:T.teal }} />
                  </th>
                  {['Approver','Role','Layer','Department','Daily Limit','Backup','Status','Actions'].map(c => (
                    <th key={c} style={TABLE_TH}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a._id}
                    style={{ borderBottom:`1px solid ${T.border}`, transition:'background .15s', background: selected.includes(a._id) ? 'rgba(0,198,255,.04)' : 'transparent' }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(0,198,255,.03)'}
                    onMouseLeave={e => e.currentTarget.style.background=selected.includes(a._id)?'rgba(0,198,255,.04)':'transparent'}>
                    <td style={{ padding:'.8rem 1.1rem' }}>
                      <input type="checkbox" checked={selected.includes(a._id)} onChange={() => toggle(a._id)} style={{ cursor:'pointer', accentColor:T.teal }} />
                    </td>
                    <td style={{ padding:'.8rem 1.1rem' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'.55rem' }}>
                        <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:T.gradient, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', color:T.navy, fontSize:'.7rem', minWidth:'30px', fontFamily:"'Syne',sans-serif" }}>
                          {a.userId?.fullName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p style={{ fontSize:'.83rem', fontWeight:'600', color:T.white, lineHeight:1.2 }}>{a.userId?.fullName || '—'}</p>
                          <p style={{ fontSize:'.72rem', color:T.muted }}>{a.userId?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'.8rem 1.1rem', fontSize:'.8rem', color:T.slate }}>{a.approverRole?.replace('_',' ')}</td>
                    <td style={{ padding:'.8rem 1.1rem' }}>
                      <span style={{ fontSize:'.72rem', fontWeight:'600', color:T.teal, background:'rgba(0,198,255,.08)', padding:'.15rem .45rem', borderRadius:'4px' }}>
                        L{a.layerId?.layerLevel} · {a.layerId?.layerName}
                      </span>
                      {a.layerId?.workflowId?.workflowName && (
                        <p style={{ fontSize:'.68rem', color:T.muted, marginTop:'.1rem' }}>{a.layerId.workflowId.workflowName}</p>
                      )}
                    </td>
                    <td style={{ padding:'.8rem 1.1rem', fontSize:'.8rem', color:T.slate }}>
                      {(a.departments || []).join(', ') || '*'}
                    </td>
                    <td style={{ padding:'.8rem 1.1rem', fontSize:'.85rem', fontWeight:'700', color:T.white, textAlign:'center' }}>
                      {a.approvalLimit ?? 5}
                    </td>
                    <td style={{ padding:'.8rem 1.1rem', fontSize:'.78rem', color:T.muted }}>
                      {a.backupApproverId?.fullName || '—'}
                    </td>
                    <td style={{ padding:'.8rem 1.1rem' }}>
                      <span style={{
                        display:'inline-flex', alignItems:'center', gap:'.3rem', padding:'.2rem .6rem', borderRadius:'100px', fontSize:'.7rem', fontWeight:'700',
                        background: a.isActive ? 'rgba(16,217,136,.1)' : 'rgba(239,68,68,.1)',
                        color: a.isActive ? '#10D988' : '#F87171',
                      }}>
                        <span style={{ width:'5px', height:'5px', borderRadius:'50%', background: a.isActive ? '#10D988' : '#F87171', display:'inline-block' }}/>
                        {a.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding:'.8rem 1.1rem' }}>
                      <div style={{ display:'flex', gap:'.35rem' }}>
                        <button onClick={() => onEdit(a)} title="Edit" style={{ background:'rgba(0,198,255,.08)', border:`1px solid ${T.border}`, color:T.teal, borderRadius:'7px', padding:'.28rem .55rem', fontSize:'.75rem', cursor:'pointer' }}>✎</button>
                        <button onClick={() => onToggleActive(a._id, a.isActive)} title={a.isActive?'Deactivate':'Activate'} style={{ background: a.isActive?'rgba(239,68,68,.08)':'rgba(16,217,136,.08)', border:`1px solid ${a.isActive?'rgba(239,68,68,.2)':'rgba(16,217,136,.2)'}`, color: a.isActive?'#F87171':'#10D988', borderRadius:'7px', padding:'.28rem .55rem', fontSize:'.75rem', cursor:'pointer' }}>
                          {a.isActive ? '⏸' : '▶'}
                        </button>
                        <button onClick={() => setConfirm(a._id)} title="Delete" style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', color:'#F87171', borderRadius:'7px', padding:'.28rem .55rem', fontSize:'.75rem', cursor:'pointer' }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding:'.55rem 1.25rem', borderTop:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ color:T.muted, fontSize:'.75rem' }}>Showing {filtered.length} of {assignments.length} assignments</span>
          {selected.length > 0 && <span style={{ color:T.teal, fontSize:'.75rem', fontWeight:'600' }}>{selected.length} selected</span>}
        </div>
      </div>

      {/* Delete confirm */}
      {confirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(5,13,31,.85)', backdropFilter:'blur(8px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem', animation:'fadeIn .2s ease' }}
          onClick={e => e.target === e.currentTarget && setConfirm(null)}>
          <div style={{ background:T.surface, border:`1px solid ${T.borderH}`, borderRadius:'16px', padding:'2rem', maxWidth:'360px', width:'100%', textAlign:'center' }}>
            <div style={{ fontSize:'2rem', marginBottom:'.75rem' }}>⚠️</div>
            <h4 style={{ fontFamily:"'Syne',sans-serif", fontWeight:'800', marginBottom:'.5rem' }}>Remove Assignment?</h4>
            <p style={{ color:T.slate, fontSize:'.85rem', marginBottom:'1.5rem', lineHeight:1.6 }}>This approver will be removed from the layer. Existing in-progress approvals are unaffected.</p>
            <div style={{ display:'flex', gap:'.75rem' }}>
              <button onClick={() => setConfirm(null)} style={{ flex:1, padding:'.75rem', background:'rgba(255,255,255,.05)', border:`1px solid ${T.border}`, color:T.slate, borderRadius:'10px', fontFamily:"'DM Sans',sans-serif", fontWeight:'600', cursor:'pointer' }}>Cancel</button>
              <button onClick={() => handleDelete(confirm)} style={{ flex:1, padding:'.75rem', background:'rgba(239,68,68,.15)', border:'1px solid rgba(239,68,68,.3)', color:'#F87171', borderRadius:'10px', fontFamily:"'DM Sans',sans-serif", fontWeight:'700', cursor:'pointer' }}>Remove</button>
            </div>
          </div>
        </div>
      )}
      <style>{GLOBAL_CSS}</style>
    </div>
  );
};

export default ApprovalAuthorityGrid;