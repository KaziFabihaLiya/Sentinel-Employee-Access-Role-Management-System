// client/src/pages/admin/ApprovalMetricsPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { T, Sk, Toast, PageHeader, GLOBAL_CSS } from '../../styles/darkTokens';
import ApprovalMetricsCard from '../../components/Admin/ApprovalMetricsCard';
import * as wfSvc from '../../services/workflowService';

// ── SVG Bar Chart (no external lib) ──────────────────────────────────────────
const BarChart = ({ data = [], color = T.teal, height = 140, title }) => {
  if (!data.length) return <div style={{ color:T.muted, fontSize:'.8rem', padding:'1rem' }}>No data</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 100, H = height;
  const bw = Math.max(4, Math.floor((W - (data.length - 1) * 2) / data.length));

  return (
    <div>
      {title && <p style={{ fontSize:'.75rem', color:T.muted, fontWeight:'600', marginBottom:'.5rem', textTransform:'uppercase', letterSpacing:'.05em' }}>{title}</p>}
      <div style={{ overflowX:'auto' }}>
        <svg width={Math.max(300, data.length * (bw + 8) + 20)} height={H + 30} style={{ display:'block' }}>
          {data.map((d, i) => {
            const bh = Math.max(2, Math.round((d.value / max) * H));
            const x  = 10 + i * (bw + 8);
            return (
              <g key={i}>
                <rect x={x} y={H - bh} width={bw} height={bh} rx={3} fill={color} opacity={0.75}/>
                <text x={x + bw/2} y={H - bh - 4} textAnchor="middle" fill={T.white} fontSize={9} fontWeight="600">{d.value}</text>
                <text x={x + bw/2} y={H + 14} textAnchor="middle" fill={T.muted} fontSize={8}
                  style={{ overflow:'hidden', textOverflow:'ellipsis' }}>
                  {String(d.label).slice(0,8)}
                </text>
              </g>
            );
          })}
          <line x1={8} y1={0} x2={8} y2={H} stroke={T.border} strokeWidth={1}/>
          <line x1={8} y1={H} x2="100%" y2={H} stroke={T.border} strokeWidth={1}/>
        </svg>
      </div>
    </div>
  );
};

// ── Approver leaderboard row ──────────────────────────────────────────────────
const LeaderRow = ({ rank, name, total, avg, breaches }) => (
  <div style={{ display:'flex', alignItems:'center', gap:'.75rem', padding:'.65rem 0', borderBottom:`1px solid ${T.border}` }}>
    <span style={{ fontSize:'.8rem', fontWeight:'700', color:T.muted, width:'20px', textAlign:'center' }}>#{rank}</span>
    <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:T.gradient, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', color:T.navy, fontSize:'.7rem', minWidth:'30px' }}>{name?.charAt(0)||'?'}</div>
    <div style={{ flex:1, minWidth:0 }}>
      <p style={{ fontSize:'.82rem', fontWeight:'600', color:T.white, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</p>
      <p style={{ fontSize:'.7rem', color:T.muted }}>{total} actions · avg {avg ? `${Math.round(avg)}min` : '—'}</p>
    </div>
    {breaches > 0 && <span style={{ fontSize:'.68rem', fontWeight:'700', color:'#F87171', background:'rgba(239,68,68,.1)', padding:'.15rem .4rem', borderRadius:'4px' }}>⚠ {breaches}</span>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────

const RANGES = [{ label:'7 days', days:7 },{ label:'30 days', days:30 },{ label:'90 days', days:90 }];

const ApprovalMetricsPage = () => {
  const [range,      setRange]      = useState(30);
  const [metrics,    setMetrics]    = useState(null);
  const [report,     setReport]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [exporting,  setExporting]  = useState(false);
  const [toast,      setToast]      = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const startDate = new Date(Date.now() - range * 86400000).toISOString();
    try {
      const [m, r] = await Promise.all([
        wfSvc.getMetrics({ startDate }),
        wfSvc.getSLAReport({ startDate }),
      ]);
      setMetrics(m);
      setReport(r);
    } catch { showToast('Failed to load metrics','error'); }
    finally { setLoading(false); }
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = JSON.stringify({ metrics, report }, null, 2);
      const blob = new Blob([data], { type:'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `sla-report-${new Date().toISOString().slice(0,10)}.json`;
      a.click(); URL.revokeObjectURL(url);
      showToast('Report exported');
    } catch { showToast('Export failed','error'); }
    finally { setExporting(false); }
  };

  const kpis = [
    { title:'Total Requests',       value: metrics?.totalRequests,              icon:'📋', accent:'linear-gradient(135deg,#00C6FF,#0072FF)', sub:`Last ${range} days` },
    { title:'SLA Breaches',         value: metrics?.breachedCount,              icon:'⚠️', accent:'linear-gradient(135deg,#EF4444,#DC2626)', sub:`${metrics?.breachedPercentage ?? 0}% breach rate`, highlight: (metrics?.breachedPercentage||0) > 20 },
    { title:'Avg Approval Time',    value: metrics?.avgTimeToApprove ? `${Math.round(metrics.avgTimeToApprove)}m` : '—', icon:'⏱', accent:'linear-gradient(135deg,#F59E0B,#D97706)', sub:'Minutes per layer' },
    { title:'SLA Compliance',       value: metrics ? `${100 - (metrics.breachedPercentage||0)}%` : '—', icon:'✅', accent:'linear-gradient(135deg,#10D988,#059669)', ringPct: metrics ? 100 - (metrics.breachedPercentage||0) : 0, ringColor:'#10D988' },
  ];

  // Bottleneck: layer with highest avg time
  const bottleneck = metrics?.byLayer?.reduce((a, b) => (b.avgTimeToApprove||0) > (a.avgTimeToApprove||0) ? b : a, {});

  return (
    <div style={{ animation:'fadeUp .5s ease' }}>
      {toast && <Toast {...toast}/>}
      <PageHeader badge="Admin" title="Approval Metrics" sub="SLA performance, bottleneck analysis, and approver leaderboard"
        action={
          <div style={{ display:'flex', gap:'.5rem', alignItems:'center' }}>
            {RANGES.map(r => (
              <button key={r.days} onClick={() => setRange(r.days)} style={{ padding:'.38rem .85rem', background: range===r.days ? T.gradient : 'rgba(0,198,255,.06)', border: range===r.days ? 'none' : `1px solid ${T.border}`, color: range===r.days ? T.navy : T.slate, borderRadius:'100px', fontFamily:"'DM Sans',sans-serif", fontWeight:'600', fontSize:'.78rem', cursor:'pointer' }}>{r.label}</button>
            ))}
            <button onClick={handleExport} disabled={exporting} style={{ padding:'.38rem .85rem', background:'rgba(167,139,250,.1)', border:'1px solid rgba(167,139,250,.25)', color:'#A78BFA', borderRadius:'100px', fontFamily:"'DM Sans',sans-serif", fontWeight:'600', fontSize:'.78rem', cursor:'pointer' }}>
              {exporting ? '…' : '↓ Export'}
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
        {kpis.map(k => (
          <ApprovalMetricsCard key={k.title} loading={loading} {...k} />
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem', marginBottom:'1.25rem' }}>
        {/* Approval time by layer */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', padding:'1.25rem' }}>
          <h4 style={{ fontFamily:"'Syne',sans-serif", fontWeight:'800', fontSize:'.9rem', marginBottom:'1rem' }}>Avg Approval Time by Layer</h4>
          {loading ? <Sk h="140px" w="100%" r="10px"/> : (
            <BarChart
              data={(metrics?.byLayer||[]).map(l => ({ label:l.layerName, value: Math.round(l.avgTimeToApprove||0) }))}
              color={T.teal} height={130}
            />
          )}
        </div>

        {/* SLA breaches by layer */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', padding:'1.25rem' }}>
          <h4 style={{ fontFamily:"'Syne',sans-serif", fontWeight:'800', fontSize:'.9rem', marginBottom:'1rem' }}>SLA Breaches by Layer</h4>
          {loading ? <Sk h="140px" w="100%" r="10px"/> : (
            <BarChart
              data={(metrics?.byLayer||[]).map(l => ({ label:l.layerName, value: l.breached||0 }))}
              color='#EF4444' height={130}
            />
          )}
        </div>
      </div>

      {/* Bottleneck + Leaderboard */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem' }}>
        {/* Bottleneck analysis */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', padding:'1.25rem' }}>
          <h4 style={{ fontFamily:"'Syne',sans-serif", fontWeight:'800', fontSize:'.9rem', marginBottom:'1rem' }}>Bottleneck Analysis</h4>
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'.6rem' }}>{[1,2,3].map(i=><Sk key={i} h="44px" w="100%" r="10px"/>)}</div>
          ) : !metrics?.byLayer?.length ? (
            <p style={{ color:T.muted, fontSize:'.82rem' }}>No data available</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'.5rem' }}>
              {(metrics.byLayer||[]).sort((a,b)=>(b.avgTimeToApprove||0)-(a.avgTimeToApprove||0)).map((l, i) => {
                const maxT = metrics.byLayer[0]?.avgTimeToApprove || 1;
                const pct  = Math.round(((l.avgTimeToApprove||0) / maxT) * 100);
                return (
                  <div key={l.layerName} style={{ background:'rgba(0,198,255,.03)', border:`1px solid ${l.layerName===bottleneck?.layerName?'rgba(239,68,68,.3)':T.border}`, borderRadius:'10px', padding:'.65rem .85rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.35rem' }}>
                      <span style={{ fontSize:'.82rem', fontWeight:'600', color:T.white }}>{l.layerName}</span>
                      <div style={{ display:'flex', gap:'.4rem', alignItems:'center' }}>
                        {l.layerName===bottleneck?.layerName && <span style={{ fontSize:'.65rem', fontWeight:'700', color:'#F87171', background:'rgba(239,68,68,.1)', padding:'.1rem .35rem', borderRadius:'4px' }}>BOTTLENECK</span>}
                        <span style={{ fontSize:'.78rem', fontWeight:'700', color:T.white }}>{Math.round(l.avgTimeToApprove||0)}m</span>
                      </div>
                    </div>
                    <div style={{ height:'5px', background:'rgba(255,255,255,.06)', borderRadius:'100px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background: i===0 ? '#EF4444' : T.teal, borderRadius:'100px', transition:'width .6s ease' }}/>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:'.25rem' }}>
                      <span style={{ fontSize:'.68rem', color:T.muted }}>{l.total} requests</span>
                      <span style={{ fontSize:'.68rem', color: l.breachedPercentage > 20 ? '#F87171' : T.muted }}>{l.breachedPercentage||0}% breached</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Approver leaderboard */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', padding:'1.25rem' }}>
          <h4 style={{ fontFamily:"'Syne',sans-serif", fontWeight:'800', fontSize:'.9rem', marginBottom:'.25rem' }}>Approver Performance</h4>
          <p style={{ fontSize:'.73rem', color:T.muted, marginBottom:'1rem' }}>Ranked by total actions — ⚠ = SLA breaches</p>
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'.5rem' }}>{[1,2,3,4,5].map(i=><Sk key={i} h="44px" w="100%" r="8px"/>)}</div>
          ) : !report?.approverPerformance?.length ? (
            <p style={{ color:T.muted, fontSize:'.82rem' }}>No approver data yet</p>
          ) : (
            <div>
              {report.approverPerformance.slice(0, 8).map((a, i) => (
                <LeaderRow key={String(a._id)} rank={i+1} name={a.fullName || `User ${String(a._id).slice(-4)}`} total={a.totalActions} avg={a.avgTime} breaches={a.slaBreaches} />
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{GLOBAL_CSS}</style>
    </div>
  );
};

export default ApprovalMetricsPage;