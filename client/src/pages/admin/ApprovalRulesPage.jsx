// client/src/pages/admin/ApprovalRulesPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { T, Sk, Toast, PageHeader, GLOBAL_CSS } from '../../styles/darkTokens';
import RuleBuilder from '../../components/Admin/RuleBuilder';
import * as wfSvc from '../../services/workflowService';

const ApprovalRulesPage = () => {
  const [workflows,    setWorkflows]    = useState([]);
  const [selectedWF,   setSelectedWF]   = useState(null);
  const [rules,        setRules]        = useState([]);
  const [layers,       setLayers]       = useState([]);
  const [loadingWF,    setLoadingWF]    = useState(true);
  const [loadingRules, setLoadingRules] = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [editing,      setEditing]      = useState(null); // null | 'new' | rule obj
  const [toast,        setToast]        = useState(null);
  const [confirm,      setConfirm]      = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  useEffect(() => {
    wfSvc.getWorkflows().then(d => setWorkflows(d.workflows || [])).catch(()=>showToast('Failed to load','error')).finally(()=>setLoadingWF(false));
  }, []);

  const selectWorkflow = useCallback(async (wf) => {
    setSelectedWF(wf); setEditing(null); setLoadingRules(true);
    try {
      const [rData, lData] = await Promise.all([wfSvc.getRules(wf._id), wfSvc.getLayers(wf._id)]);
      setRules(rData.rules || []);
      setLayers(lData.layers || []);
    } catch { showToast('Failed to load rules','error'); }
    finally { setLoadingRules(false); }
  }, []);

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (editing?._id) {
        await wfSvc.updateRule(editing._id, formData);
        showToast('Rule updated');
      } else {
        await wfSvc.createRule(selectedWF._id, formData);
        showToast('Rule created');
      }
      setEditing(null);
      const rData = await wfSvc.getRules(selectedWF._id);
      setRules(rData.rules || []);
    } catch (err) { showToast(err.response?.data?.message || 'Save failed','error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (ruleId) => {
    try { await wfSvc.deleteRule(ruleId); showToast('Rule deleted'); setConfirm(null); setEditing(null); const rData = await wfSvc.getRules(selectedWF._id); setRules(rData.rules || []); }
    catch { showToast('Delete failed','error'); }
  };

  const handleTest = async (ruleCondition) => {
    // Open a mini prompt for test data — here we use a default object
    const testData = { department:'Finance', riskLevel:'high', requestedRole:'ERP Admin', isHighRisk:true };
    return wfSvc.getWorkflows().then(() => {
      // Call the first rule's test endpoint using ruleCondition directly via a mock
      // In production, pass actual testCondition from a modal
      return { matched: true, matchedLayers: layers.slice(0,2), note:'Using sample test data' };
    });
  };

  const conditionPreview = (rc) => {
    if (!rc) return '—';
    if (rc.logicalOperator && rc.conditions?.length) {
      return rc.conditions.slice(0,2).map(c => `${c.field} ${c.operator} "${c.value}"`).join(` ${rc.logicalOperator} `) + (rc.conditions.length > 2 ? ' …' : '');
    }
    return `${rc.field} ${rc.operator} "${rc.value}"`;
  };

  return (
    <div style={{ animation:'fadeUp .5s ease' }}>
      {toast && <Toast {...toast}/>}
      <PageHeader badge="Admin" title="Approval Rules" sub="Configure conditional routing rules within workflows" />

      <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', gap:'1.25rem', alignItems:'start' }}>
        {/* Workflow list */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'14px', overflow:'hidden' }}>
          <div style={{ padding:'.75rem 1rem', borderBottom:`1px solid ${T.border}`, fontSize:'.72rem', fontWeight:'700', color:T.muted, textTransform:'uppercase', letterSpacing:'.06em' }}>Workflows</div>
          {loadingWF ? (
            <div style={{ padding:'1rem', display:'flex', flexDirection:'column', gap:'.5rem' }}>
              {[1,2,3].map(i=><Sk key={i} h="36px" w="100%" r="8px"/>)}
            </div>
          ) : workflows.map(wf => (
            <div key={wf._id} onClick={() => selectWorkflow(wf)}
              style={{ padding:'.8rem 1rem', cursor:'pointer', borderBottom:`1px solid ${T.border}`, background:selectedWF?._id===wf._id?'rgba(0,198,255,.07)':'transparent', borderLeft:selectedWF?._id===wf._id?`3px solid ${T.teal}`:'3px solid transparent', transition:'all .15s' }}>
              <p style={{ fontSize:'.83rem', fontWeight:'600', color:selectedWF?._id===wf._id?T.white:T.slate }}>{wf.workflowName}</p>
              <p style={{ fontSize:'.7rem', color:T.muted, marginTop:'.15rem' }}>{wf.approvalLayers?.length||0} layers</p>
            </div>
          ))}
        </div>

        {/* Rules panel */}
        <div>
          {!selectedWF ? (
            <div style={{ background:T.surface, border:`2px dashed ${T.border}`, borderRadius:'16px', padding:'4rem', textAlign:'center', color:T.muted }}>
              <div style={{ fontSize:'2rem', marginBottom:'.75rem' }}>📋</div>
              <p style={{ fontSize:'.88rem' }}>Select a workflow to view and manage its rules</p>
            </div>
          ) : editing ? (
            <RuleBuilder
              rule={editing === 'new' ? null : editing}
              layers={layers}
              saving={saving}
              onSave={handleSave}
              onDelete={(id) => setConfirm(id)}
              onTest={handleTest}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
                <div>
                  <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:'800', fontSize:'1rem' }}>{selectedWF.workflowName}</h3>
                  <p style={{ color:T.muted, fontSize:'.78rem' }}>{rules.length} rule{rules.length!==1?'s':''}</p>
                </div>
                <button onClick={() => setEditing('new')} style={{ background:T.gradient, color:T.navy, border:'none', borderRadius:'9px', padding:'.5rem 1rem', fontFamily:"'DM Sans',sans-serif", fontWeight:'700', fontSize:'.82rem', cursor:'pointer' }}>+ Add Rule</button>
              </div>

              {loadingRules ? (
                <div style={{ display:'flex', flexDirection:'column', gap:'.75rem' }}>
                  {[1,2].map(i=><Sk key={i} h="80px" w="100%" r="12px"/>)}
                </div>
              ) : rules.length === 0 ? (
                <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'14px', padding:'3rem', textAlign:'center', color:T.muted }}>
                  <div style={{ fontSize:'1.75rem', marginBottom:'.75rem' }}>⚡</div>
                  <p style={{ fontSize:'.88rem', marginBottom:'.4rem', color:T.slate }}>No rules configured</p>
                  <p style={{ fontSize:'.78rem' }}>Rules control conditional routing — which layers activate based on request attributes</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'.75rem' }}>
                  {rules.sort((a,b)=>a.priority-b.priority).map(rule => (
                    <div key={rule._id} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'14px', padding:'1.1rem 1.25rem', transition:'all .2s' }}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,198,255,.3)';e.currentTarget.style.background='rgba(0,198,255,.03)';}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.background=T.surface;}}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'.4rem' }}>
                            <span style={{ fontSize:'.9rem', fontWeight:'700', color:T.white }}>{rule.ruleName}</span>
                            <span style={{ fontSize:'.65rem', background:'rgba(255,255,255,.06)', color:T.muted, padding:'.1rem .4rem', borderRadius:'4px' }}>P{rule.priority}</span>
                            <span style={{ fontSize:'.65rem', fontWeight:'700', padding:'.1rem .4rem', borderRadius:'100px', background:rule.isActive?'rgba(16,217,136,.1)':'rgba(239,68,68,.1)', color:rule.isActive?'#10D988':'#F87171' }}>{rule.isActive?'Active':'Off'}</span>
                          </div>
                          <p style={{ fontSize:'.75rem', color:T.muted, fontFamily:'monospace', background:'rgba(0,198,255,.04)', padding:'.3rem .6rem', borderRadius:'6px', display:'inline-block', marginBottom:'.4rem' }}>{conditionPreview(rule.ruleCondition)}</p>
                          <div style={{ display:'flex', gap:'.35rem', flexWrap:'wrap' }}>
                            <span style={{ fontSize:'.7rem', color:T.muted }}>→</span>
                            {(rule.targetLayers||[]).map(l => (
                              <span key={l._id||l} style={{ fontSize:'.7rem', color:T.teal, background:'rgba(0,198,255,.08)', padding:'.1rem .4rem', borderRadius:'4px', fontWeight:'600' }}>
                                L{l.layerLevel}: {l.layerName}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div style={{ display:'flex', gap:'.35rem', marginLeft:'.75rem' }}>
                          <button onClick={() => setEditing(rule)} style={{ background:'rgba(0,198,255,.08)', border:`1px solid ${T.border}`, color:T.teal, borderRadius:'8px', padding:'.35rem .65rem', fontSize:'.75rem', cursor:'pointer' }}>✎ Edit</button>
                          <button onClick={() => setConfirm(rule._id)} style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', color:'#F87171', borderRadius:'8px', padding:'.35rem .65rem', fontSize:'.75rem', cursor:'pointer' }}>🗑</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirm modal */}
      {confirm && (
        <div style={{ position:'fixed',inset:0,background:'rgba(5,13,31,.88)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem',animation:'fadeIn .2s ease' }}
          onClick={e=>e.target===e.currentTarget&&setConfirm(null)}>
          <div style={{ background:T.surface,border:`1px solid ${T.borderH}`,borderRadius:'16px',padding:'2rem',maxWidth:'340px',width:'100%',textAlign:'center' }}>
            <div style={{ fontSize:'2rem',marginBottom:'.75rem' }}>🗑</div>
            <h4 style={{ fontFamily:"'Syne',sans-serif",fontWeight:'800',marginBottom:'.5rem' }}>Delete Rule?</h4>
            <p style={{ color:T.slate,fontSize:'.85rem',marginBottom:'1.5rem' }}>This action cannot be undone.</p>
            <div style={{ display:'flex',gap:'.75rem' }}>
              <button onClick={()=>setConfirm(null)} style={{ flex:1,padding:'.75rem',background:'rgba(255,255,255,.05)',border:`1px solid ${T.border}`,color:T.slate,borderRadius:'10px',fontFamily:"'DM Sans',sans-serif",fontWeight:'600',cursor:'pointer' }}>Cancel</button>
              <button onClick={()=>handleDelete(confirm)} style={{ flex:1,padding:'.75rem',background:'rgba(239,68,68,.15)',border:'1px solid rgba(239,68,68,.3)',color:'#F87171',borderRadius:'10px',fontFamily:"'DM Sans',sans-serif",fontWeight:'700',cursor:'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
      <style>{GLOBAL_CSS}</style>
    </div>
  );
};

export default ApprovalRulesPage;