// client/src/pages/admin/ApprovalAuthorityPage.jsx
import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { T, Sk, Toast, PageHeader, GLOBAL_CSS } from '../../styles/darkTokens';
import ApprovalAuthorityGrid from '../../components/Admin/ApprovalAuthorityGrid';
import * as wfSvc from '../../services/workflowService';

const TABS = ['By Layer','By User','By Department'];

const ApprovalAuthorityPage = () => {
  const [tab,         setTab]         = useState('By Layer');
  const [assignments, setAssignments] = useState([]);
  const [layers,      setLayers]      = useState([]);
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [modal,       setModal]       = useState(null); // null | 'new' | assignment obj
  const [form,        setForm]        = useState({ layerId:'', userId:'', approverRole:'LINE_MANAGER', departments:['*'], designation:'*', approvalLimit:5, backupApproverId:'' });
  const [toast,       setToast]       = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [aData, wData, uData] = await Promise.all([
        wfSvc.getAssignments(),
        wfSvc.getWorkflows(),
        axiosInstance.get('/users').then(r => r.data),
      ]);
      setAssignments(aData.assignments || []);
      // Flatten all layers from all workflows
      const allLayers = [];
      for (const wf of (wData.workflows || [])) {
        if (wf.approvalLayers) allLayers.push(...wf.approvalLayers);
      }
      setLayers(allLayers);
      setUsers(Array.isArray(uData) ? uData : uData.users || []);
    } catch { showToast('Failed to load data','error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openEdit = (a) => {
    setForm({ layerId: String(a.layerId?._id||a.layerId), userId: String(a.userId?._id||a.userId), approverRole: a.approverRole, departments: a.departments||['*'], designation: a.designation||'*', approvalLimit: a.approvalLimit||5, backupApproverId: String(a.backupApproverId?._id||a.backupApproverId||'') });
    setModal(a);
  };

  const handleSave = async () => {
    if (!form.layerId || !form.userId || !form.approverRole) return showToast('Layer, User and Role are required','error');
    setSaving(true);
    try {
      const payload = { ...form, backupApproverId: form.backupApproverId || null };
      if (modal?._id) {
        await wfSvc.updateApproverAssignment(modal._id, payload);
        showToast('Assignment updated');
      } else {
        await wfSvc.assignApprover(payload);
        showToast('Approver assigned');
      }
      setModal(null);
      fetchAll();
    } catch (err) { showToast(err.response?.data?.message || 'Save failed','error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try { await wfSvc.removeApproverAssignment(id); showToast('Assignment removed'); fetchAll(); }
    catch { showToast('Remove failed','error'); }
  };

  const handleToggle = async (id, isActive) => {
    try { await wfSvc.updateApproverAssignment(id, { isActive: !isActive }); showToast(`Assignment ${isActive?'deactivated':'activated'}`); fetchAll(); }
    catch { showToast('Update failed','error'); }
  };

  const handleBulk = async (ids, action) => {
    try {
      await Promise.all(ids.map(id => wfSvc.updateApproverAssignment(id, { isActive: action === 'activate' })));
      showToast(`${ids.length} assignment(s) ${action}d`);
      fetchAll();
    } catch { showToast('Bulk update failed','error'); }
  };

  // Group for tab views
  const byLayer  = {};
  const byUser   = {};
  const byDept   = {};
  assignments.forEach(a => {
    const lk = a.layerId?.layerName || 'Unknown';
    const uk = a.userId?.fullName   || 'Unknown';
    const dk = (a.departments||['*']).join(',');
    if (!byLayer[lk]) byLayer[lk] = [];  byLayer[lk].push(a);
    if (!byUser[uk])  byUser[uk]  = [];  byUser[uk].push(a);
    if (!byDept[dk])  byDept[dk]  = [];  byDept[dk].push(a);
  });

  const inp = { width:'100%', padding:'.6rem .85rem', background:'rgba(0,198,255,.04)', border:`1px solid ${T.border}`, color:T.white, borderRadius:'9px', fontSize:'.85rem', outline:'none', fontFamily:"'DM Sans',sans-serif", boxSizing:'border-box' };
  const sel = { ...inp, cursor:'pointer' };

  const ROLES = ['LINE_MANAGER','SENIOR_MANAGER','HEAD','SENIOR_DIRECTOR','ADMIN','CUSTOM'];

  return (
    <div style={{ animation:'fadeUp .5s ease' }}>
      {toast && <Toast {...toast}/>}
      <PageHeader badge="Admin" title="Approval Authority" sub="Assign approvers to workflow layers by person and designation" />

      {/* Tabs */}
      <div style={{ display:'flex', gap:'.5rem', marginBottom:'1.25rem', borderBottom:`1px solid ${T.border}`, paddingBottom:'.75rem' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding:'.45rem 1rem', background: tab===t ? T.gradient : 'transparent', border: tab===t ? 'none' : `1px solid ${T.border}`, color: tab===t ? T.navy : T.slate, borderRadius:'100px', fontFamily:"'DM Sans',sans-serif", fontWeight:'600', fontSize:'.82rem', cursor:'pointer' }}>{t}</button>
        ))}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'.5rem' }}>
          <span style={{ color:T.muted, fontSize:'.8rem' }}>{assignments.length} total assignments</span>
        </div>
      </div>

      {/* Tab: By Layer — show grouped summary then full grid */}
      {tab === 'By Layer' && (
        <div style={{ marginBottom:'1.5rem', display:'flex', gap:'.6rem', flexWrap:'wrap' }}>
          {Object.entries(byLayer).map(([lname, arr]) => (
            <div key={lname} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'10px', padding:'.65rem 1rem' }}>
              <p style={{ fontSize:'.78rem', fontWeight:'700', color:T.white, marginBottom:'.2rem' }}>{lname}</p>
              <p style={{ fontSize:'.72rem', color:T.muted }}>{arr.length} approver{arr.length!==1?'s':''}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab: By User — grouped cards */}
      {tab === 'By User' && !loading && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:'.75rem', marginBottom:'1.5rem' }}>
          {Object.entries(byUser).map(([uname, arr]) => (
            <div key={uname} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'12px', padding:'1rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'.55rem', marginBottom:'.6rem' }}>
                <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:T.gradient, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', color:T.navy, fontSize:'.72rem', minWidth:'30px' }}>{uname.charAt(0)}</div>
                <span style={{ fontSize:'.85rem', fontWeight:'700', color:T.white }}>{uname}</span>
              </div>
              {arr.map(a => (
                <div key={a._id} style={{ fontSize:'.73rem', color:T.muted, marginBottom:'.2rem' }}>
                  L{a.layerId?.layerLevel}: <span style={{ color:T.slate }}>{a.layerId?.layerName}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Tab: By Department */}
      {tab === 'By Department' && !loading && (
        <div style={{ display:'flex', gap:'.6rem', flexWrap:'wrap', marginBottom:'1.5rem' }}>
          {Object.entries(byDept).map(([dk, arr]) => (
            <div key={dk} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'10px', padding:'.65rem 1rem' }}>
              <p style={{ fontSize:'.78rem', fontWeight:'700', color:T.white, marginBottom:'.2rem' }}>{dk === '*' ? 'All Departments' : dk}</p>
              <p style={{ fontSize:'.72rem', color:T.muted }}>{arr.length} assignment{arr.length!==1?'s':''}</p>
            </div>
          ))}
        </div>
      )}

      {/* Full grid — always shown */}
      <ApprovalAuthorityGrid
        assignments={assignments}
        loading={loading}
        layers={layers}
        onAdd={() => { setForm({ layerId:'', userId:'', approverRole:'LINE_MANAGER', departments:['*'], designation:'*', approvalLimit:5, backupApproverId:'' }); setModal('new'); }}
        onEdit={openEdit}
        onDelete={handleDelete}
        onToggleActive={handleToggle}
        onBulkAction={handleBulk}
      />

      {/* Add/Edit modal */}
      {modal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(5,13,31,.88)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem',animation:'fadeIn .2s ease' }}
          onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div style={{ background:T.surface,border:`1px solid ${T.borderH}`,borderRadius:'20px',padding:'2rem',width:'100%',maxWidth:'480px',boxShadow:'0 24px 80px rgba(0,0,0,.55)',animation:'slideUp .25s ease',maxHeight:'90vh',overflowY:'auto' }}>
            <h3 style={{ fontFamily:"'Syne',sans-serif",fontWeight:'800',marginBottom:'1.5rem' }}>{modal==='new'?'Assign Approver':'Edit Assignment'}</h3>

            {[
              { label:'Layer *', key:'layerId', type:'select', opts: layers.map(l=>({ value:l._id, label:`L${l.layerLevel}: ${l.layerName}` })) },
              { label:'Approver *', key:'userId', type:'select', opts: users.map(u=>({ value:u._id, label:`${u.fullName} (${u.jobTitle})` })) },
              { label:'Role *', key:'approverRole', type:'select', opts: ROLES.map(r=>({ value:r, label:r.replace(/_/g,' ') })) },
              { label:'Designation', key:'designation', type:'text', placeholder:'* for all' },
              { label:'Daily Limit (max 5)', key:'approvalLimit', type:'number' },
              { label:'Backup Approver', key:'backupApproverId', type:'select', opts: [{ value:'', label:'None' }, ...users.map(u=>({ value:u._id, label:u.fullName }))] },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:'.9rem' }}>
                <label style={{ fontSize:'.78rem',fontWeight:'600',color:T.slate,display:'block',marginBottom:'.3rem' }}>{f.label}</label>
                {f.type==='select' ? (
                  <select value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} style={sel}>
                    <option value="">Select…</option>
                    {f.opts?.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input type={f.type||'text'} value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:f.type==='number'?+e.target.value:e.target.value}))} placeholder={f.placeholder||''} min={f.type==='number'?1:undefined} max={f.type==='number'?5:undefined} style={inp} />
                )}
              </div>
            ))}

            <div style={{ marginBottom:'1.25rem' }}>
              <label style={{ fontSize:'.78rem',fontWeight:'600',color:T.slate,display:'block',marginBottom:'.3rem' }}>Departments (comma-separated, or * for all)</label>
              <input value={(form.departments||[]).join(',')} onChange={e=>setForm(p=>({...p,departments:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)||['*']}))} placeholder="Finance, IT, HR or *" style={inp} />
            </div>

            <div style={{ display:'flex',gap:'.75rem' }}>
              <button onClick={()=>setModal(null)} style={{ flex:1,padding:'.8rem',background:'rgba(255,255,255,.04)',border:`1px solid ${T.border}`,color:T.slate,borderRadius:'10px',fontFamily:"'DM Sans',sans-serif",fontWeight:'600',cursor:'pointer' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ flex:2,padding:'.8rem',background:saving?'rgba(0,198,255,.2)':T.gradient,border:'none',color:T.navy,borderRadius:'10px',fontFamily:"'DM Sans',sans-serif",fontWeight:'700',cursor:saving?'not-allowed':'pointer' }}>
                {saving?'Saving…':modal==='new'?'Assign Approver':'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{GLOBAL_CSS}</style>
    </div>
  );
};

export default ApprovalAuthorityPage;