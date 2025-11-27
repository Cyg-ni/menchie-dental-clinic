import React from "react";
import "./Odontogram.css";
import TeethModelViewer from "../../components/TeethModelViewer.jsx";

const upperPermanentLeft  = [18, 17, 16, 15, 14, 13, 12, 11];
// FIX: Added teeth 27 and 28
const upperPermanentRight = [21, 22, 23, 24, 25, 26, 27, 28]; 

const lowerPermanentLeft  = [48, 47, 46, 45, 44, 43, 42, 41];
// FIX: Added teeth 37 and 38
const lowerPermanentRight = [31, 32, 33, 34, 35, 36, 37, 38]; 

// FIX: Set maxLenR to 8 to match maxLenL for full permanent dentition
const maxLenL = 8, maxLenR = 8; 

function renderHalfRow(teeth, selectedTeeth, onClick, shadedTeeth = [], shadedStatus = {}, maxLen = 8) {
  // Left pad
  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: 3 }}>
      {Array(maxLen - teeth.length).fill(0).map((_, i) => (
        <div key={i} style={{ width: 20 }} />
      ))}
      {teeth.map((num) => {
        const selected = selectedTeeth.includes(num);
        const shaded = shadedTeeth.includes(num);
        const status = shadedStatus[num];
        let classes = "odontogram-tooth";
        if (selected) classes += " selected";
        if (shaded) classes += " shaded" + (status ? ` ${status}` : "");
        return (
          <div key={num} className={classes}>
            <button
              type="button"
              className="tooth-square"
              onClick={() => onClick && onClick(num)}
            />
            <div className="tooth-label">{num}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function Odontogram({ selectedTeeth = [], onSelectionChange, selectable = true, shadedTeeth = [], shadedStatus = {} }) {
  const [isModelOpen, setIsModelOpen] = React.useState(false);
  const handleToothClick = (num) => {
    if (!onSelectionChange || !selectable) return;
    const sel = selectedTeeth.includes(num)
      ? selectedTeeth.filter((n) => n !== num)
      : [...selectedTeeth, num];
    onSelectionChange(sel);
  };
  return (
    <div className="odontogram-grid" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      {/* upper permanent */}
      <div className="odontogram-row" style={{ justifyContent: 'center' }}>
        {renderHalfRow(upperPermanentLeft, selectedTeeth, handleToothClick, shadedTeeth, shadedStatus, maxLenL)}
        <div style={{ width: 20 }} />
        {/* FIX: Changed maxLenR to maxLenL for consistent padding/alignment */}
        {renderHalfRow(upperPermanentRight, selectedTeeth, handleToothClick, shadedTeeth, shadedStatus, maxLenL)} 
      </div>
      {/* lower permanent */}
      <div className="odontogram-row" style={{ justifyContent: 'center' }}>
        {renderHalfRow(lowerPermanentLeft, selectedTeeth, handleToothClick, shadedTeeth, shadedStatus, maxLenL)}
        <div style={{ width: 20 }} />
        {/* FIX: Changed maxLenR to maxLenL for consistent padding/alignment */}
        {renderHalfRow(lowerPermanentRight, selectedTeeth, handleToothClick, shadedTeeth, shadedStatus, maxLenL)}
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
              <TeethModelViewer selectedTeeth={selectedTeeth} shadedTeeth={shadedTeeth} shadedStatus={shadedStatus} />
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