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
    'healthy': 'tooth-healthy'
};

/**
 * Helper function to render the specific 3D-ready visual layers
 * based on the permanent state (condition) or the selected tool (treatment/issue marking).
 * (This function is identical to the previous version but included for completeness.)
 */
const getToothInnerContent = (state, isSelectedForTreatment, viewMode = null) => {
    // 1. Base Layer (The tooth itself)
    const baseVisual = <div className="tooth-base-shape"></div>;

    // 2. Condition Layers (Permanent/Recorded Issues)
    let conditionVisual = null;
    // Normalize state key to match the CSS classes created earlier (e.g., 'tooth decay' -> 'decay')
    const normalizedState = state.toLowerCase().replace(/\s/g, ''); 

    if (normalizedState === 'decay' || normalizedState === 'toothdecay') {
        conditionVisual = <div className="condition-layer condition-decay" />;
    } else if (normalizedState === 'cavity' || normalizedState === 'toothcavity') {
        conditionVisual = <div className="condition-layer condition-cavity" />;
        // Add cavity line for cavity state
        conditionVisual = (
            <>
                <div className="condition-layer condition-cavity" />
                <div className="cavity-line" />
            </>
        );
    } else if (normalizedState === 'stained' || normalizedState === 'stainedteeth') {
        conditionVisual = <div className="condition-layer condition-stained" />;
    } else if (normalizedState === 'missing') {
        // This is primarily styled by the parent .tooth-square animation
        conditionVisual = <div className="condition-layer condition-missing-cross">X</div>;
    }

    // 3. Treatment Layer (Active/Transient Visuals)
    let treatmentVisual = null;
    if (isSelectedForTreatment) {
        treatmentVisual = <div className="treatment-layer treatment-selected" />;
    }
    
    // Check for specific treatment visuals if the state is recorded as a treatment
    if (normalizedState === 'whitening' || normalizedState === 'teethwhitening') {
        treatmentVisual = <div className="treatment-layer condition-whitening" />;
    }
    // Add logic for 'cleaning' or 'treated' visualizations here if needed...


    return (
        // .tooth-3d-scene is the critical wrapper for perspective and 3D transform style
        <div className="tooth-3d-scene">
            {baseVisual}
            {conditionVisual}
            {treatmentVisual}
        </div>
    );
};


function renderHalfRow(teeth, selectedTeeth, onTreatmentSelect, toothStates, onStateChange, currentTool, maxLen = 8, viewMode = null) {
  
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
        let newState = currentTool;
        if (currentTool === 'issue') {
            // Default generic 'issue' tool click to marking 'decay'
            newState = (currentState === 'healthy' || currentState === 'treated') ? 'decay' : 'healthy'; 
        }
        onStateChange(toothId, newState);
    }
  };

  return (
    // Note: 'odontogram-row' class handles the main flex layout and gap
    <div className="odontogram-row"> 
      {/* Spacer to align molars/premolars on the outside */}
      {Array(maxLen - teeth.length).fill(0).map((_, i) => (
        // The width of the spacer is based on the tooth size (20px) + gap (3px)
        <div key={`spacer-${i}`} style={{ width: 23 }} /> 
      ))}
      {teeth.map((num) => {
        const isSelectedForTreatment = selectedTeeth.includes(num);
        // Normalize state key to allow for different casing/spacing (e.g., 'Tooth Cavity' -> 'toothcavity')
        const permanentState = (toothStates[num] || 'healthy').toLowerCase().replace(/\s/g, ''); 
        const isMissing = permanentState === 'missing';
        
        // Wrapper class controls overall pointer/layout behavior
        let wrapperClasses = "odontogram-tooth";
        if (currentTool !== 'treat' && !isMissing) {
             wrapperClasses += ' state-selectable';
        }
        
        // Add the permanent state class to the wrapper for complex styling (like missing X)
        wrapperClasses += ` ${STATE_CLASSES[permanentState] || 'tooth-healthy'}`;
        
        // Button classes (Visuals & Animations)
        let buttonClasses = "tooth-square";
        
        // 1. Add the selection class to the button
        if (isSelectedForTreatment) {
             buttonClasses += ` ${STATE_CLASSES.selected}`;
        }
        
        return (
          <div key={num} className={wrapperClasses}>
            <button
              type="button"
              className={buttonClasses}
              onClick={() => handleToothAction(num)} 
              disabled={isMissing && currentTool !== 'missing'}
              data-state={permanentState} // Helper for CSS
              data-selected={isSelectedForTreatment}
            >
              {/* NEW: Inject the 3D layered content */}
              {getToothInnerContent(permanentState, isSelectedForTreatment, viewMode)}
            </button>
            <div className="tooth-label">{num}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function Odontogram({ 
    selectedTeeth = [], 
    onSelectionChange = () => {}, 
    onStateChange = () => {}, 
    currentTool = 'issue', 
    toothStates = {}, 
    selectable = false 
}) {
    // State to manage modal visibility
    const [isModelOpen, setIsModelOpen] = React.useState(false);
    // NEW State to manage what the 3D model is showing
    const [modalViewMode, setModalViewMode] = React.useState('status'); // 'status', 'condition', 'treatment'

    // This handler is only used if currentTool === 'treat'
    const handleTreatmentSelect = (num) => {
        if (currentTool === 'treat') {
            const sel = selectedTeeth.includes(num)
                ? selectedTeeth.filter((n) => n !== num)
                : [...selectedTeeth, num];
            onSelectionChange(sel);
        }
    };

    // Handler to open the modal and reset to default view
    const handleOpenModel = () => {
        setModalViewMode('status'); // Reset view to Status when opening
        setIsModelOpen(true);
    };
    
    // Helper to determine the button's active class
    const getActiveButtonClass = (mode) => {
        return `action-btn ${mode}-btn ${modalViewMode === mode ? 'active-view' : ''}`;
    };
  
    return (
        <div className="odontogram-grid">
          
          {/* Upper Arch */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {renderHalfRow(upperPermanentLeft, selectedTeeth, handleTreatmentSelect, toothStates, onStateChange, currentTool, maxLenL, isModelOpen ? modalViewMode : null)}
            <div style={{ width: 20 }} /> {/* Center gap */}
            {renderHalfRow(upperPermanentRight, selectedTeeth, handleTreatmentSelect, toothStates, onStateChange, currentTool, maxLenL, isModelOpen ? modalViewMode : null)} 
          </div>
          
          {/* Lower Arch */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            {renderHalfRow(lowerPermanentLeft, selectedTeeth, handleTreatmentSelect, toothStates, onStateChange, currentTool, maxLenL, isModelOpen ? modalViewMode : null)}
            <div style={{ width: 20 }} /> {/* Center gap */}
            {renderHalfRow(lowerPermanentRight, selectedTeeth, handleTreatmentSelect, toothStates, onStateChange, currentTool, maxLenL, isModelOpen ? modalViewMode : null)}
          </div>
          
          <button
            type="button"
            className="view-3d-model-btn"
            onClick={handleOpenModel}
          >
            View 3D Teeth Model
          </button>
          
          {isModelOpen && (
            <div className="odontogram-modal-backdrop" onClick={() => setIsModelOpen(false)} role="presentation" >
              <div className="odontogram-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                  <div className="odontogram-modal-header">
                    <h3>3D Teeth Visualization ({modalViewMode.toUpperCase()})</h3>
                  </div>
                  <div className="odontogram-modal-body">
                    {/* Pass the new view mode to the 3D Viewer */}
                    <TeethModelViewer 
                        selectedTeeth={selectedTeeth} 
                        toothStates={toothStates} 
                        viewMode={modalViewMode} // <-- NEW PROP
                    />
                  </div>
                  <div className="odontogram-modal-footer">
                        {/* FIX 1: Status Button with onClick handler and active class */}
                    <button 
                            type="button" 
                            className={getActiveButtonClass('status')}
                            onClick={() => setModalViewMode('status')}
                        >
                            Status
                        </button>
                        {/* FIX 2: Condition Button with onClick handler and active class */}
                    <button 
                            type="button" 
                            className={getActiveButtonClass('condition')}
                            onClick={() => setModalViewMode('condition')}
                        >
                            Condition
                        </button>
                        {/* FIX 3: Treatment Button with onClick handler and active class */}
                    <button 
                            type="button" 
                            className={getActiveButtonClass('treatment')}
                            onClick={() => setModalViewMode('treatment')}
                        >
                            Treatment
                        </button>
                    <button 
                            type="button" 
                            className="modal-close-secondary" 
                            onClick={() => setIsModelOpen(false)}
                        >
                            Close
                        </button>
                  </div>
              </div>
            </div>
          )}
        </div>
    );
}