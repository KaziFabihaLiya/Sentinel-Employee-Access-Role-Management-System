// client/src/components/ApprovalTimeline.jsx
import { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { T } from '../styles/darkTokens';

const ApprovalTimeline = ({ approvalPath = [], history = [], compact = false }) => {
  const [approversMap, setApproversMap] = useState({}); // layerId -> array of users
  const [hovered, setHovered] = useState(null);

  // Fetch real assigned approvers for each layer
  useEffect(() => {
    const layerIds = approvalPath
      .map(l => String(l.layerId))
      .filter(Boolean);

    if (layerIds.length === 0) return;

    axiosInstance.post('/approver/bulk-approvers', { layerIds })
      .then(res => setApproversMap(res.data || {}))
      .catch(err => console.warn('Could not load approvers:', err));
  }, [approvalPath]);

  if (!approvalPath.length) {
    return (
      <div style={{ color: T.muted, fontSize: '.82rem', padding: '1rem 0' }}>
        No approval path available for this request.
      </div>
    );
  }

  const getLayerStyle = (status, isCurrent) => {
    if (status === 'APPROVED')  return { icon: '✓', bg: 'rgba(16,217,136,.12)', border: 'rgba(16,217,136,.35)', color: '#10D988', dot: '#10D988' };
    if (status === 'REJECTED')  return { icon: '✕', bg: 'rgba(239,68,68,.12)',  border: 'rgba(239,68,68,.35)',  color: '#F87171', dot: '#F87171' };
    if (status === 'ESCALATED') return { icon: '↑', bg: 'rgba(245,158,11,.12)', border: 'rgba(245,158,11,.35)', color: '#F59E0B', dot: '#F59E0B' };
    if (status === 'SKIPPED')   return { icon: '⤳', bg: 'rgba(167,139,250,.1)', border: 'rgba(167,139,250,.3)', color: '#A78BFA', dot: '#A78BFA' };
    if (isCurrent)              return { icon: '◉', bg: 'rgba(0,198,255,.1)',   border: 'rgba(0,198,255,.4)',   color: T.teal,    dot: T.teal    };
    return                             { icon: '○', bg: 'rgba(255,255,255,.03)', border: T.border,               color: T.muted,   dot: T.muted   };
  };

  return (
    <div style={{ position: 'relative', paddingLeft: compact ? '1.5rem' : '2rem' }}>
      {approvalPath.map((layer, idx) => {
        const isCurrent = layer.isCurrent || layer.status === 'PENDING';
        const style = getLayerStyle(layer.status, isCurrent);
        const assignedUsers = approversMap[String(layer.layerId)] || [];
        const isLast = idx === approvalPath.length - 1;

        return (
          <div 
            key={String(layer.layerId)} 
            style={{ 
              display: 'flex', 
              gap: compact ? '.75rem' : '1rem', 
              position: 'relative', 
              marginBottom: isLast ? 0 : '1.25rem' 
            }}
            onMouseEnter={() => setHovered(idx)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Vertical Line */}
            {!isLast && (
              <div style={{
                position: 'absolute',
                left: compact ? '13px' : '17px',
                top: '38px',
                bottom: '-20px',
                width: '1px',
                background: `linear-gradient(to bottom, ${style.dot}50, ${T.border})`,
                zIndex: 0
              }} />
            )}

            {/* Icon */}
            <div style={{
              width: '36px', height: '36px', minWidth: '36px',
              borderRadius: '50%',
              background: style.bg,
              border: `2px solid ${style.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              fontWeight: '800',
              color: style.color,
              zIndex: 1,
            }}>
              {style.icon}
            </div>

            {/* Content */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: compact ? '.9rem' : '.95rem' }}>
                    {layer.layerName}
                  </div>
                  <div style={{ fontSize: '.73rem', color: T.muted }}>
                    Layer {layer.layerLevel}
                  </div>
                </div>
                {isCurrent && (
                  <span style={{ 
                    fontSize: '.7rem', 
                    padding: '2px 9px', 
                    background: 'rgba(0,198,255,.15)', 
                    color: T.teal, 
                    borderRadius: '999px', 
                    fontWeight: '700' 
                  }}>
                    CURRENT
                  </span>
                )}
              </div>

              {/* Real Approver Names - This is the main improvement */}
              {assignedUsers.length > 0 && (
                <div style={{ marginTop: '6px', fontSize: '.8rem', color: T.slate }}>
                  <span style={{ color: T.muted }}>Assigned to: </span>
                  {assignedUsers.slice(0, 3).map((user, i) => (
                    <span key={user._id} style={{ color: T.white }}>
                      {user.fullName}
                      {i < Math.min(2, assignedUsers.length - 1) && ', '}
                    </span>
                  ))}
                  {assignedUsers.length > 3 && (
                    <span style={{ color: T.muted }}> +{assignedUsers.length - 3} more</span>
                  )}
                </div>
              )}

              {/* Status */}
              <div style={{ marginTop: '4px', fontSize: '.78rem', color: style.color, fontWeight: '600' }}>
                {layer.status}
                {layer.approvalDate && ` • ${new Date(layer.approvalDate).toLocaleDateString()}`}
              </div>

              {layer.comments && (
                <div style={{ marginTop: '6px', fontSize: '.77rem', color: T.muted, fontStyle: 'italic' }}>
                  “{layer.comments}”
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ApprovalTimeline;