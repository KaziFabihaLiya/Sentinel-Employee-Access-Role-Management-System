// client/src/pages/admin/ApprovalLayerConfigPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { T, Sk, Toast, PageHeader, GLOBAL_CSS } from '../../styles/darkTokens';
import ApprovalLayerConfig from '../../components/Admin/ApprovalLayerConfig';
import * as wfSvc from '../../services/workflowService';

const TABLE_TH = { padding:'.7rem 1.1rem', textAlign:'left', fontSize:'.7rem', fontWeight:'700', color:T.muted, textTransform:'uppercase', letterSpacing:'.06em', borderBottom:`1px solid ${T.border}`, whiteSpace:'nowrap' };

const ROLE_LABELS = { LINE_MANAGER:'Line Manager', SENIOR_MANAGER:'Senior Manager', HEAD:'Dept. Head', SENIOR_DIRECTOR:'Sr. Director', ADMIN:'Admin', CUSTOM:'Custom' };

const ApprovalLayerConfigPage = () => {
  const [workflows, setWorkflows] = useState([]);
  const [allLayers, setAllLayers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [modal,     setModal]     = useState(null);       // null | 'new' | layer obj
  const [selWF,     setSelWF]     = useState('');         // filter by workflow
  const [confirm,   setConfirm]   = useState(null);
  const [toast,     setToast]     = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const wData = await wfSvc.getWorkflows();
      const wfs   = wData.workflows || [];
      setWorkflows(wfs);

      // Fetch layers for every workflow
      const layerArrays = await Promise.all(wfs.map(w => wfSvc.getLayers(w._id).then(d => (d.layers||[]).map(l => ({ ...l, workflowName:w.workflowName, workflowId:w._id })))));
      setAllLayers(layerArrays.flat());
    } catch { showToast('Failed to load layers','error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (modal?._id) {
        await wfSvc.updateLayer(modal._id, formData);
        showToast('Layer updated');
      } else {
        if (!formData._workflowId) return showToast('Select a workflow first','error');
        await wfSvc.createLayer(formData._workflowId, formData);
        showToast('Layer created');
      }
      setModal(null);
      fetchAll();
    } catch (err) { showToast(err.response?.data?.message || 'Save failed','error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try { await wfSvc.deleteLayer(id); showToast('Layer deleted'); setConfirm(null); setModal(null); fetchAll(); }
    catch { showToast('Delete failed','error'); }
  };

  const filtered = allLayers.filter(l => !selWF || l.workflowId === selWF);

  return (
    <div style={{ animation:'fadeUp .5s ease' }}>
      {toast && <Toast {...toast}/>}
      <PageHeader badge="Admin" title="Approval Layers" sub="View and edit all approval layers across every workflow"
        action={<button onClick={() => setModal('new')} style={{ background:T.gradient, color:T.navy, border:'none', borderRadius:'9px', padding:'.55rem 1.1rem', fontFamily:"'DM Sans',sans-serif", fontWeight:'700', fontSize:'.83rem', cursor:'pointer' }}>+ Add Layer</button>}
      />

      {/* Filter bar */}
      <div style={{ display:'flex', gap:'.75rem', marginBottom:'1.25rem', flexWrap:'wrap', alignItems:'center' }}>
        <select value={selWF} onChange={e=>setSelWF(e.target.value)}
          style={{ padding:'.5rem .9rem', background:T.surface, border:`1px solid ${T.border}`, color:T.slate, borderRadius:'9px', fontSize:'.83rem', outline:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
          <option value="">All Workflows</option>
          {workflows.map(w => <option key={w._id} value={w._id}>{w.workflowName}</option>)}
        </select>
        <span style={{ color:T.muted, fontSize:'.8rem', marginLeft:'auto' }}>{filtered.length} layer{filtered.length!==1?'s':''}</span>
      </div>

      {/* Table */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:'1.25rem', display:'flex', flexDirection:'column', gap:'.6rem' }}>
            {[1,2,3,4].map(i=>(
              <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 2fr 1fr 1.5fr 1fr 1fr 100px', gap:'1rem', padding:'.65rem 0', borderBottom:`1px solid ${T.border}` }}>
                {[1,2,3,4,5,6,7].map(j=><Sk key={j} h="13px" w="80%" r="4px"/>)}
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:'4rem', textAlign:'center', color:T.muted, fontSize:'.88rem' }}>
            <div style={{ fontSize:'2rem', marginBottom:'.75rem' }}>🔀</div>
            {allLayers.length ? 'No layers match this filter' : 'No layers configured yet — create a workflow and add layers'}
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'rgba(0,198,255,.04)' }}>
                  {['Layer Name','Workflow','Level','Role Type','SLA Hours','Escalation','Actions'].map(c=>(
                    <th key={c} style={TABLE_TH}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.sort((a,b)=>a.layerLevel-b.layerLevel).map(layer => (
                  <tr key={layer._id}
                    style={{ borderBottom:`1px solid ${T.border}`, transition:'background .15s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(0,198,255,.03)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'.85rem 1.1rem' }}>
                      <span style={{ fontSize:'.88rem', fontWeight:'700', color:T.white }}>{layer.layerName}</span>
                      {layer.isOptional && <span style={{ marginLeft:'.4rem', fontSize:'.65rem', color:'#A78BFA', fontWeight:'600' }}>optional</span>}
                    </td>
                    <td style={{ padding:'.85rem 1.1rem', fontSize:'.8rem', color:T.slate }}>{layer.workflowName}</td>
                    <td style={{ padding:'.85rem 1.1rem', textAlign:'center' }}>
                      <span style={{ fontSize:'.75rem', fontWeight:'700', color:T.teal, background:'rgba(0,198,255,.1)', padding:'.2rem .55rem', borderRadius:'6px' }}>L{layer.layerLevel}</span>
                    </td>
                    <td style={{ padding:'.85rem 1.1rem', fontSize:'.8rem', color:T.slate }}>{ROLE_LABELS[layer.approvalRoleType] || layer.approvalRoleType}</td>
                    <td style={{ padding:'.85rem 1.1rem' }}>
                      <div style={{ display:'flex', flexDirection:'column', gap:'.15rem' }}>
                        <span style={{ fontSize:'.83rem', fontWeight:'700', color:T.white }}>{layer.slaHours}h</span>
                        <span style={{ fontSize:'.7rem', color:T.muted }}>escalate @{layer.autoEscalateAfterHours}h</span>
                      </div>
                    </td>
                    <td style={{ padding:'.85rem 1.1rem' }}>
                      <span style={{ fontSize:'.72rem', fontWeight:'700', padding:'.2rem .5rem', borderRadius:'100px',
                        background: layer.escalationEnabled ? 'rgba(16,217,136,.1)' : 'rgba(239,68,68,.1)',
                        color: layer.escalationEnabled ? '#10D988' : '#F87171' }}>
                        {layer.escalationEnabled ? '✓ On' : '✕ Off'}
                      </span>
                    </td>
                    <td style={{ padding:'.85rem 1.1rem' }}>
                      <div style={{ display:'flex', gap:'.35rem' }}>
                        <button onClick={() => setModal(layer)}
                          style={{ background:'rgba(0,198,255,.08)', border:`1px solid ${T.border}`, color:T.teal, borderRadius:'8px', padding:'.3rem .6rem', fontSize:'.75rem', cursor:'pointer' }}>✎ Edit</button>
                        <button onClick={() => setConfirm(layer._id)}
                          style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', color:'#F87171', borderRadius:'8px', padding:'.3rem .6rem', fontSize:'.75rem', cursor:'pointer' }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit / Add modal */}
      {modal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(5,13,31,.88)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem',animation:'fadeIn .2s ease' }}
          onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div style={{ width:'100%', maxWidth:'480px', animation:'slideUp .25s ease', maxHeight:'90vh', overflowY:'auto' }}>
            {/* Workflow picker for new layers */}
            {modal === 'new' && (
              <div style={{ background:T.surface, border:`1px solid ${T.borderH}`, borderRadius:'16px', padding:'1rem 1.5rem', marginBottom:'.75rem' }}>
                <label style={{ fontSize:'.78rem', fontWeight:'600', color:T.slate, display:'block', marginBottom:'.4rem' }}>Workflow *</label>
                <select
                  onChange={e => setModal(m => ({ ...(m==='new'?{}:m), _workflowId: e.target.value }))}
                  style={{ width:'100%', padding:'.6rem .85rem', background:'rgba(0,198,255,.04)', border:`1px solid ${T.border}`, color:T.white, borderRadius:'9px', fontSize:'.85rem', outline:'none', fontFamily:"'DM Sans',sans-serif" }}>
                  <option value="">Select workflow…</option>
                  {workflows.map(w=><option key={w._id} value={w._id}>{w.workflowName}</option>)}
                </select>
              </div>
            )}
            <ApprovalLayerConfig
              layer={modal === 'new' ? null : modal}
              saving={saving}
              onSave={handleSave}
              onDelete={(id) => setConfirm(id)}
              onCancel={() => setModal(null)}
            />
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirm && (
        <div style={{ position:'fixed',inset:0,background:'rgba(5,13,31,.88)',backdropFilter:'blur(8px)',zIndex:1100,display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem' }}>
          <div style={{ background:T.surface, border:`1px solid ${T.borderH}`, borderRadius:'16px', padding:'2rem', maxWidth:'340px', width:'100%', textAlign:'center' }}>
            <div style={{ fontSize:'2rem', marginBottom:'.75rem' }}>⚠️</div>
            <h4 style={{ fontFamily:"'Syne',sans-serif", fontWeight:'800', marginBottom:'.5rem' }}>Delete Layer?</h4>
            <p style={{ color:T.slate, fontSize:'.85rem', marginBottom:'1.5rem', lineHeight:1.6 }}>This will also remove all approver assignments for this layer. In-progress requests are unaffected.</p>
            <div style={{ display:'flex', gap:'.75rem' }}>
              <button onClick={()=>setConfirm(null)} style={{ flex:1, padding:'.75rem', background:'rgba(255,255,255,.05)', border:`1px solid ${T.border}`, color:T.slate, borderRadius:'10px', fontFamily:"'DM Sans',sans-serif", fontWeight:'600', cursor:'pointer' }}>Cancel</button>
              <button onClick={()=>handleDelete(confirm)} style={{ flex:1, padding:'.75rem', background:'rgba(239,68,68,.15)', border:'1px solid rgba(239,68,68,.3)', color:'#F87171', borderRadius:'10px', fontFamily:"'DM Sans',sans-serif", fontWeight:'700', cursor:'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
      <style>{GLOBAL_CSS}</style>
    </div>
  );
};

export default ApprovalLayerConfigPage;