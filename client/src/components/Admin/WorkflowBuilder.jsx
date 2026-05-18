// client/src/components/Admin/WorkflowBuilder.jsx
import { useState, useRef } from 'react';
import { T, GLOBAL_CSS } from '../../styles/darkTokens';
import ApprovalLayerConfig from './ApprovalLayerConfig';

const ROLE_ICONS = {
  LINE_MANAGER: '👤',
  SENIOR_MANAGER: '👥',
  HEAD: '🏛️',
  SENIOR_DIRECTOR: '⭐',
  ADMIN: '🛡️',
  CUSTOM: '⚙️'
};

const LayerCard = ({ layer, isSelected, onSelect, onDragStart, onDragOver, onDrop, isDraggingOver }) => (
  <div
    draggable
    onDragStart={onDragStart}
    onDragOver={onDragOver}
    onDrop={onDrop}
    onClick={onSelect}
    style={{
      background: isSelected ? 'rgba(0,198,255,.12)' : isDraggingOver ? 'rgba(0,198,255,.08)' : 'rgba(0,198,255,.04)',
      border: `2px solid ${isSelected ? T.teal : isDraggingOver ? T.teal : T.border}`,
      borderRadius: '14px',
      padding: '1.1rem',
      cursor: 'grab',
      transition: 'all .2s',
      userSelect: 'none',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem' }}>
      <div style={{
        width: '42px',
        height: '42px',
        borderRadius: '12px',
        background: 'rgba(0,198,255,.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.4rem'
      }}>
        {ROLE_ICONS[layer.approvalRoleType] || '📋'}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '700', fontSize: '1rem' }}>{layer.layerName}</div>
        <div style={{ display: 'flex', gap: '.6rem', marginTop: '4px', fontSize: '.75rem', color: T.muted }}>
          <span>L{layer.layerLevel}</span>
          <span>⏱ {layer.slaHours}h</span>
          <span>{layer.approvalType === 'ANY_ONE' ? 'Any One' : 'All Required'}</span>
        </div>
      </div>
    </div>
  </div>
);

const WorkflowBuilder = ({
  workflow,
  layers = [],
  onSaveLayer,
  onDeleteLayer,
  onAddLayer,
  onReorder,
  onSaveWorkflow,
  onDuplicate,
  onDeleteWorkflow,
  saving = false,
}) => {
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const sortedLayers = [...layers].sort((a, b) => a.layerLevel - b.layerLevel);

  const handleDrop = (targetIdx) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    
    const draggedLayer = sortedLayers[dragIdx];
    const targetLayer = sortedLayers[targetIdx];

    onReorder(draggedLayer._id, targetLayer.layerLevel);
    onReorder(targetLayer._id, draggedLayer.layerLevel);
    
    setDragIdx(null);
    setOverIdx(null);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedLayer ? '1fr 380px' : '1fr', gap: '1.5rem' }}>
      {/* Main Canvas */}
      <div>
        <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: '800', fontSize: '1.4rem' }}>
            {workflow?.workflowName || 'New Workflow'}
          </h2>
          
          <div style={{ display: 'flex', gap: '.6rem' }}>
            <button onClick={onDuplicate} style={{ padding: '.5rem 1rem', background: 'rgba(167,139,250,.1)', border: '1px solid rgba(167,139,250,.3)', color: '#A78BFA', borderRadius: '9px', fontWeight: '600' }}>
              Duplicate
            </button>
            <button onClick={onDeleteWorkflow} style={{ padding: '.5rem 1rem', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', color: '#F87171', borderRadius: '9px', fontWeight: '600' }}>
              Delete Workflow
            </button>
          </div>
        </div>

        {/* Layers Canvas */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '16px', padding: '1.5rem' }}>
          {sortedLayers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: T.muted }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔀</div>
              <p>No layers yet. Add your first approval layer below.</p>
            </div>
          ) : (
            sortedLayers.map((layer, idx) => (
              <div key={layer._id}>
                <LayerCard
                  layer={layer}
                  isSelected={selectedLayer?._id === layer._id}
                  isDraggingOver={overIdx === idx}
                  onSelect={() => setSelectedLayer(layer)}
                  onDragStart={() => setDragIdx(idx)}
                  onDragOver={() => setOverIdx(idx)}
                  onDrop={() => handleDrop(idx)}
                />
                {idx < sortedLayers.length - 1 && (
                  <div style={{ textAlign: 'center', color: T.muted, fontSize: '.75rem', padding: '8px 0' }}>
                    ↓ THEN ↓
                  </div>
                )}
              </div>
            ))
          )}

          <button 
            onClick={() => setSelectedLayer('new')}
            style={{
              width: '100%',
              padding: '1rem',
              marginTop: '1rem',
              background: 'rgba(0,198,255,.08)',
              border: `2px dashed ${T.teal}`,
              color: T.teal,
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '.9rem',
              cursor: 'pointer'
            }}
          >
            + Add New Approval Layer
          </button>
        </div>
      </div>

      {/* Layer Configuration Sidebar */}
      {selectedLayer && (
        <div>
          <ApprovalLayerConfig
            layer={selectedLayer === 'new' ? null : selectedLayer}
            onSave={onSaveLayer}
            onDelete={onDeleteLayer}
            onCancel={() => setSelectedLayer(null)}
            saving={saving}
          />
        </div>
      )}
    </div>
  );
};

export default WorkflowBuilder;