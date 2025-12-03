import React from "react";
import "./Odontogram.css";
import TeethModelViewer from "../../components/TeethModelViewer.jsx"; 

const upperPermanentLeft  = [18, 17, 16, 15, 14, 13, 12, 11];
const upperPermanentRight = [21, 22, 23, 24, 25, 26, 27, 28]; 
const lowerPermanentLeft  = [48, 47, 46, 45, 44, 43, 42, 41];
const lowerPermanentRight = [31, 32, 33, 34, 35, 36, 37, 38]; 
const maxLenL = 8, maxLenR = 8; 

// Map state keys to CSS classes 
const STATE_CLASSES = {
    'missing': 'tooth-missing',
    'issue': 'tooth-issue',
    'treated': 'tooth-treated', 
    'selected': 'tooth-selected', 
    'healthy': ''
};

function renderHalfRow(teeth, selectedTeeth, onTreatmentSelect, toothStates, onStateChange, currentTool, maxLen = 8) {
  
  const handleToothAction = (toothId) => {
    // Determine the permanent state
    const currentState = toothStates[toothId];
    const isMissing = currentState === 'missing';

    // If tooth is missing, prevent actions UNLESS we are in 'missing' tool to toggle it back
    if (isMissing && currentTool !== 'missing') {
        return; 
    }

    if (currentTool === 'treat') {
        // Selection Mode
        onTreatmentSelect(toothId);
    } 
    else if (onStateChange) {
        // State Changing Mode (Mark Issue / Mark Missing)
        onStateChange(toothId, currentTool);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: 3 }}>
      {Array(maxLen - teeth.length).fill(0).map((_, i) => (
        <div key={i} style={{ width: 20 }} />
      ))}
      {teeth.map((num) => {
        const isSelectedForTreatment = selectedTeeth.includes(num);
        const permanentState = toothStates[num] || 'healthy';
        const isMissing = permanentState === 'missing';
        
        // Base class
        let classes = "odontogram-tooth";
        
        // 1. Permanent State Class (Red, Grey, Green)
        classes += ` ${STATE_CLASSES[permanentState]}`;
        
        // 2. Selection Class (Blue Border)
        if (isSelectedForTreatment) {
             classes += ` ${STATE_CLASSES.selected}`;
        }
        
        // 3. Cursor Interaction
        if (currentTool !== 'treat' && !isMissing) {
             classes += ' state-selectable';
        }
        
        return (
          <div key={num} className={classes}>
            <button
              type="button"
              className="tooth-square"
              onClick={() => handleToothAction(num)} 
              disabled={isMissing && currentTool !== 'missing'}
            />
            <div className="tooth-label">{num}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function Odontogram({ 
    selectedTeeth = [], 
    onSelectionChange, 
    onStateChange, 
    currentTool = 'issue', 
    toothStates = {}, 
    selectable = false 
}) {
  const [isModelOpen, setIsModelOpen] = React.useState(false);

  // This handler is only used if currentTool === 'treat'
  const handleTreatmentSelect = (num) => {
      if (currentTool === 'treat') {
          const sel = selectedTeeth.includes(num)
              ? selectedTeeth.filter((n) => n !== num)
              : [...selectedTeeth, num];
          onSelectionChange(sel);
      }
  };
  
  return (
    <div className="odontogram-grid" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      
      {/* Upper Arch */}
      <div className="odontogram-row" style={{ justifyContent: 'center' }}>
        {renderHalfRow(upperPermanentLeft, selectedTeeth, handleTreatmentSelect, toothStates, onStateChange, currentTool, maxLenL)}
        <div style={{ width: 20 }} />
        {renderHalfRow(upperPermanentRight, selectedTeeth, handleTreatmentSelect, toothStates, onStateChange, currentTool, maxLenL)} 
      </div>
      
      {/* Lower Arch */}
      <div className="odontogram-row" style={{ justifyContent: 'center' }}>
        {renderHalfRow(lowerPermanentLeft, selectedTeeth, handleTreatmentSelect, toothStates, onStateChange, currentTool, maxLenL)}
        <div style={{ width: 20 }} />
        {renderHalfRow(lowerPermanentRight, selectedTeeth, handleTreatmentSelect, toothStates, onStateChange, currentTool, maxLenL)}
      </div>
      
      <button
        type="button"
        className="view-3d-model-btn"
        style={{ marginTop: 16 }}
        onClick={() => setIsModelOpen(true)}
      >
        View 3D Teeth Model
      </button>
      
      {isModelOpen && (
        <div className="odontogram-modal-backdrop" onClick={() => setIsModelOpen(false)} role="presentation">
          <div className="odontogram-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="odontogram-modal-header">
              <h3>3D Teeth Visualization</h3>
              <button type="button" className="modal-close-btn" aria-label="Close" onClick={() => setIsModelOpen(false)}>
                ×
              </button>
            </div>
            <div className="odontogram-modal-body">
              <TeethModelViewer selectedTeeth={selectedTeeth} toothStates={toothStates} />
            </div>
            <div className="odontogram-modal-footer">
              <button type="button" className="modal-close-secondary" onClick={() => setIsModelOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}