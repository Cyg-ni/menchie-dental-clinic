import React from "react";
import "./Odontogram.css";

const upperPermanentLeft  = [18, 17, 16, 15, 14, 13, 12, 11];
const upperPermanentRight = [21, 22, 23, 24, 25, 26];
const upperDeciduousLeft  = [55, 54, 53, 52, 51];
const upperDeciduousRight = [61, 62, 63, 64, 65];
const lowerDeciduousLeft  = [85, 84, 83, 82, 81];
const lowerDeciduousRight = [71, 72, 73, 74, 75];
const lowerPermanentLeft  = [48, 47, 46, 45, 44, 43, 42, 41];
const lowerPermanentRight = [31, 32, 33, 34, 35, 36];
const maxLenL = 8, maxLenR = 6;

function renderHalfRow(teeth, selectedTeeth, onClick, shadedTeeth = [], shadedStatus = {}, maxLen = 8) {
  // Left pad for arch symmetry
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
  const handleToothClick = (num) => {
    if (!onSelectionChange || !selectable) return;
    const sel = selectedTeeth.includes(num)
      ? selectedTeeth.filter((n) => n !== num)
      : [...selectedTeeth, num];
    onSelectionChange(sel);
  };
  return (
    <div className="odontogram-grid" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {/* upper permanent */}
      <div className="odontogram-row" style={{ justifyContent: 'center' }}>
        {renderHalfRow(upperPermanentLeft, selectedTeeth, handleToothClick, shadedTeeth, shadedStatus, maxLenL)}
        <div style={{ width: 20 }} />
        {renderHalfRow(upperPermanentRight, selectedTeeth, handleToothClick, shadedTeeth, shadedStatus, maxLenR)}
      </div>
      {/* upper deciduous */}
      <div className="odontogram-row" style={{ justifyContent: 'center' }}>
        {renderHalfRow(upperDeciduousLeft, selectedTeeth, handleToothClick, shadedTeeth, shadedStatus, maxLenL)}
        <div style={{ width: 20 }} />
        {renderHalfRow(upperDeciduousRight, selectedTeeth, handleToothClick, shadedTeeth, shadedStatus, maxLenR)}
      </div>
      {/* lower deciduous */}
      <div className="odontogram-row" style={{ justifyContent: 'center' }}>
        {renderHalfRow(lowerDeciduousLeft, selectedTeeth, handleToothClick, shadedTeeth, shadedStatus, maxLenL)}
        <div style={{ width: 20 }} />
        {renderHalfRow(lowerDeciduousRight, selectedTeeth, handleToothClick, shadedTeeth, shadedStatus, maxLenR)}
      </div>
      {/* lower permanent */}
      <div className="odontogram-row" style={{ justifyContent: 'center' }}>
        {renderHalfRow(lowerPermanentLeft, selectedTeeth, handleToothClick, shadedTeeth, shadedStatus, maxLenL)}
        <div style={{ width: 20 }} />
        {renderHalfRow(lowerPermanentRight, selectedTeeth, handleToothClick, shadedTeeth, shadedStatus, maxLenR)}
      </div>
    </div>
  );
}
