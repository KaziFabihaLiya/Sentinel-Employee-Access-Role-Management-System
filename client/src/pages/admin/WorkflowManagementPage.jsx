// client/src/pages/admin/WorkflowManagementPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { T, Sk, Toast, PageHeader, GLOBAL_CSS } from '../../styles/darkTokens';
import WorkflowBuilder from '../../components/Admin/WorkflowBuilder';
import * as wfSvc from '../../services/workflowService';

const TYPE_COLORS = { SEQUENTIAL:'rgba(0,198,255,.15)', PARALLEL:'rgba(167,139,250,.15)', CONDITIONAL:'rgba(245,158,11,.15)' };
const TYPE_TEXT   = { SEQUENTIAL:T.teal, PARALLEL:'#A78BFA', CONDITIONAL:'#F59E0B' };

const WorkflowManagementPage = () => {
  const [workflows,  setWorkflows]  = useState([]);
  const [selected,   setSelected]   = useState(null); // full workflow with layers
  const [layers,     setLayers]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [detailLoad, setDetailLoad] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [search,     setSearch]     = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [toast,      setToast]      = useState(null);
  const [createForm, setCreateForm] = useState({ workflowName:'', description:'', workflowType:'SEQUENTIAL', applicableDepartments:[], applicableRiskLevels:['*'] });

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const fetchWorkflows = useCallback(() => {
    setLoading(true);
    wfSvc.getWorkflows().then(d => setWorkflows(d.workflows || [])).catch(() => showToast('Failed to load workflows','error')).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  const selectWorkflow = async (wf) => {
    setDetailLoad(true);
    try {
      const data = await wfSvc.previewWorkflow(wf._id);
      setSelected(data.workflow);
      setLayers(data.layers || []);
    } catch { showToast('Failed to load workflow details','error'); }
    finally { setDetailLoad(false); }
  };

  const handleCreate = async () => {
    if (!createForm.workflowName.trim()) return showToast('Workflow name required','error');
    setSaving(true);
    try {
      const data = await wfSvc.createWorkflow(createForm);
      showToast('Workflow created');
      setShowCreate(false);
      setCreateForm({ workflowName:'', description:'', workflowType:'SEQUENTIAL', applicableDepartments:[], applicableRiskLevels:['*'] });
      fetchWorkflows();
      selectWorkflow(data.workflow);
    } catch (err) { showToast(err.response?.data?.message || 'Create failed','error'); }
    finally { setSaving(false); }
  };

  const handleSaveLayer = async (layerId, formData) => {
    setSaving(true);
    try {
      if (layerId) {
        await wfSvc.updateLayer(layerId, formData);
        showToast('Layer updated');
      } else {
        await wfSvc.createLayer(selected._id, formData);
        showToast('Layer created');
      }
      await selectWorkflow(selected);
      fetchWorkflows();
    } catch (err) { showToast(err.response?.data?.message || 'Save failed','error'); }
    finally { setSaving(false); }
  };

  const handleDeleteLayer = async (layerId) => {
    try { await wfSvc.deleteLayer(layerId); showToast('Layer deleted'); await selectWorkflow(selected); fetchWorkflows(); }
    catch { showToast('Delete failed','error'); }
  };

  const handleReorder = async (layerId, newLevel) => {
    try { await wfSvc.reorderLayer(layerId, newLevel); await selectWorkflow(selected); }
    catch { showToast('Reorder failed','error'); }
  };

  const handleSaveWorkflow = async (updates) => {
    try { await wfSvc.updateWorkflow(selected._id, updates); showToast('Workflow updated'); fetchWorkflows(); }
    catch { showToast('Update failed','error'); }
  };

  const handleDuplicate = async () => {
    try { const d = await wfSvc.duplicateWorkflow(selected._id); showToast('Workflow duplicated'); fetchWorkflows(); selectWorkflow(d.workflow); }
    catch { showToast('Duplicate failed','error'); }
  };

  const handleDeleteWorkflow = async () => {
    if (!confirm(`Delete "${selected.workflowName}"? This cannot be undone.`)) return;
    try { await wfSvc.deleteWorkflow(selected._id); showToast('Workflow deleted'); setSelected(null); setLayers([]); fetchWorkflows(); }
    catch { showToast('Delete failed','error'); }
  };

  const filtered = workflows.filter(w => !search || w.workflowName?.toLowerCase().includes(search.toLowerCase()));

  const inp = { width:'100%', padding:'.6rem .85rem', background:'rgba(0,198,255,.04)', border:`1px solid ${T.border}`, color:T.white, borderRadius:'9px', fontSize:'.85rem', outline:'none', fontFamily:"'DM Sans',sans-serif", boxSizing:'border-box' };

  return (
    <div style={{ animation:'fadeUp .5s ease' }}>
      {toast && <Toast {...toast}/>}
      <PageHeader badge="Admin" title="Approval Workflows" sub="Configure multi-level approval chains for access requests"
        action={<button onClick={() => setShowCreate(true)} style={{ background:T.gradient, color:T.navy, border:'none', borderRadius:'9px', padding:'.55rem 1.1rem', fontFamily:"'DM Sans',sans-serif", fontWeight:'700', fontSize:'.83rem', cursor:'pointer' }}>+ New Workflow</button>}
      />

      <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:'1.25rem', alignItems:'start' }}>
        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', overflow:'hidden' }}>
          <div style={{ padding:'.85rem 1rem', borderBottom:`1px solid ${T.border}` }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search workflows…"
              style={{ ...inp, padding:'.42rem .75rem', fontSize:'.8rem' }} />
          </div>
          {loading ? (
            <div style={{ padding:'1rem', display:'flex', flexDirection:'column', gap:'.5rem' }}>
              {[1,2,3].map(i=><div key={i} style={{ display:'flex', flexDirection:'column', gap:'.3rem', padding:'.65rem', borderRadius:'10px', border:`1px solid ${T.border}` }}><Sk h="13px" w="70%"/><Sk h="11px" w="45%"/></div>)}
            </div>
          ) : (
            <div style={{ maxHeight:'70vh', overflowY:'auto' }}>
              {filtered.map(wf => (
                <div key={wf._id} onClick={() => selectWorkflow(wf)} style={{ padding:'.85rem 1rem', cursor:'pointer', borderBottom:`1px solid ${T.border}`, background: selected?._id === wf._id ? 'rgba(0,198,255,.07)' : 'transparent', borderLeft: selected?._id === wf._id ? `3px solid ${T.teal}` : '3px solid transparent', transition:'all .15s' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'.25rem' }}>
                    <span style={{ fontSize:'.84rem', fontWeight:'700', color: selected?._id===wf._id ? T.white : T.slate }}>{wf.workflowName}</span>
                    <span style={{ width:'7px', height:'7px', borderRadius:'50%', background: wf.isActive ? '#10D988' : '#F87171', display:'inline-block', minWidth:'7px' }}/>
                  </div>
                  <div style={{ display:'flex', gap:'.35rem', flexWrap:'wrap' }}>
                    <span style={{ fontSize:'.65rem', fontWeight:'700', padding:'.1rem .4rem', borderRadius:'4px', background:TYPE_COLORS[wf.workflowType]||'rgba(0,198,255,.1)', color:TYPE_TEXT[wf.workflowType]||T.teal }}>{wf.workflowType}</span>
                    <span style={{ fontSize:'.65rem', color:T.muted }}>{wf.layerCount || wf.approvalLayers?.length || 0} layers</span>
                  </div>
                </div>
              ))}
              {!filtered.length && <div style={{ padding:'2rem', textAlign:'center', color:T.muted, fontSize:'.82rem' }}>No workflows found</div>}
            </div>
          )}
        </div>

        {/* ── Main canvas ───────────────────────────────────────────────────── */}
        <div>
          {detailLoad ? (
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', padding:'2rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
              <Sk h="20px" w="40%"/> <Sk h="14px" w="60%"/> <Sk h="90px" w="100%" r="14px"/> <Sk h="90px" w="100%" r="14px"/>
            </div>
          ) : selected ? (
            <WorkflowBuilder
              workflow={selected}
              layers={layers}
              saving={saving}
              onSaveLayer={handleSaveLayer}
              onDeleteLayer={handleDeleteLayer}
              onReorder={handleReorder}
              onSaveWorkflow={handleSaveWorkflow}
              onDuplicate={handleDuplicate}
              onDeleteWorkflow={handleDeleteWorkflow}
            />
          ) : (
            <div style={{ background:T.surface, border:`2px dashed ${T.border}`, borderRadius:'20px', padding:'5rem 2rem', textAlign:'center' }}>
              <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🔀</div>
              <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:'700', fontSize:'1.1rem', marginBottom:'.5rem' }}>Select or Create a Workflow</p>
              <p style={{ color:T.slate, fontSize:'.88rem', marginBottom:'1.5rem' }}>Choose a workflow from the left to view and edit its approval layers</p>
              <button onClick={() => setShowCreate(true)} style={{ background:T.gradient, color:T.navy, border:'none', borderRadius:'10px', padding:'.7rem 1.5rem', fontFamily:"'DM Sans',sans-serif", fontWeight:'700', cursor:'pointer' }}>+ Create New Workflow</button>
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div style={{ position:'fixed', inset:0, background:'rgba(5,13,31,.88)', backdropFilter:'blur(8px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem', animation:'fadeIn .2s ease' }}
          onClick={e=>e.target===e.currentTarget&&setShowCreate(false)}>
          <div style={{ background:T.surface, border:`1px solid ${T.borderH}`, borderRadius:'20px', padding:'2rem', width:'100%', maxWidth:'460px', boxShadow:'0 24px 80px rgba(0,0,0,.55)', animation:'slideUp .25s ease' }}>
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:'800', marginBottom:'1.5rem' }}>Create Workflow</h3>
            {[
              { label:'Workflow Name *', key:'workflowName', placeholder:'e.g. Finance Elevated Access' },
              { label:'Description',     key:'description',  placeholder:'Brief description…' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:'.9rem' }}>
                <label style={{ fontSize:'.78rem', fontWeight:'600', color:T.slate, display:'block', marginBottom:'.3rem' }}>{f.label}</label>
                <input value={createForm[f.key]} onChange={e=>setCreateForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder} style={inp} />
              </div>
            ))}
            <div style={{ marginBottom:'.9rem' }}>
              <label style={{ fontSize:'.78rem', fontWeight:'600', color:T.slate, display:'block', marginBottom:'.3rem' }}>Workflow Type</label>
              <div style={{ display:'flex', gap:'.5rem' }}>
                {['SEQUENTIAL','PARALLEL','CONDITIONAL'].map(t => (
                  <button key={t} onClick={() => setCreateForm(p=>({...p,workflowType:t}))} style={{ flex:1, padding:'.45rem', borderRadius:'8px', fontSize:'.72rem', fontWeight:'700', cursor:'pointer', background:createForm.workflowType===t?T.gradient:'rgba(0,198,255,.05)', border:createForm.workflowType===t?'none':`1px solid ${T.border}`, color:createForm.workflowType===t?T.navy:T.slate }}>{t}</button>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', gap:'.75rem', marginTop:'1.5rem' }}>
              <button onClick={() => setShowCreate(false)} style={{ flex:1, padding:'.8rem', background:'rgba(255,255,255,.04)', border:`1px solid ${T.border}`, color:T.slate, borderRadius:'10px', fontFamily:"'DM Sans',sans-serif", fontWeight:'600', cursor:'pointer' }}>Cancel</button>
              <button onClick={handleCreate} disabled={saving} style={{ flex:2, padding:'.8rem', background:saving?'rgba(0,198,255,.2)':T.gradient, border:'none', color:T.navy, borderRadius:'10px', fontFamily:"'DM Sans',sans-serif", fontWeight:'700', cursor:saving?'not-allowed':'pointer' }}>
                {saving ? 'Creating…' : 'Create Workflow'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{GLOBAL_CSS}</style>
    </div>
  );
};

export default WorkflowManagementPage;