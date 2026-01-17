import React from "react";
import "./Odontogram.css"; 
import TeethModelViewer from "../../components/TeethModelViewer.jsx"; 
import { db } from "../../firebase";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";

const upperPermanentLeft  = [18, 17, 16, 15, 14, 13, 12, 11];
const upperPermanentRight = [21, 22, 23, 24, 25, 26, 27, 28]; 
const lowerPermanentLeft  = [48, 47, 46, 45, 44, 43, 42, 41];
const lowerPermanentRight = [31, 32, 33, 34, 35, 36, 37, 38]; 
const maxLenL = 8, maxLenR = 8; 

const STATE_CLASSES = {
    'missing': 'tooth-missing',
    'issue': 'tooth-issue',
    'treated': 'tooth-treated', 
    'selected': 'tooth-selected', 
    'healthy': 'tooth-healthy'
};

const getToothInnerContent = (state, isSelectedForTreatment, viewMode = null) => {
    const baseVisual = <div className="tooth-base-shape"></div>;
    const normalizedState = state.toLowerCase().replace(/\s/g, ''); 

    let conditionVisual = null;
    if (normalizedState === 'decay' || normalizedState === 'toothdecay') {
        conditionVisual = <div className="condition-layer condition-decay" />;
    } else if (normalizedState === 'cavity' || normalizedState === 'toothcavity') {
        conditionVisual = (
            <>
                <div className="condition-layer condition-cavity" />
                <div className="cavity-line" />
            </>
        );
    } else if (normalizedState === 'stained' || normalizedState === 'stainedteeth') {
        conditionVisual = <div className="condition-layer condition-stained" />;
    } else if (normalizedState === 'missing') {
        conditionVisual = <div className="condition-layer condition-missing-cross">X</div>;
    }

    let treatmentVisual = null;
    if (isSelectedForTreatment) {
        treatmentVisual = <div className="treatment-layer treatment-selected" />;
    }
    
    if (normalizedState === 'whitening' || normalizedState === 'teethwhitening') {
        treatmentVisual = <div className="treatment-layer condition-whitening" />;
    }

    return (
        <div className="tooth-3d-scene">
            {baseVisual}
            {conditionVisual}
            {treatmentVisual}
        </div>
    );
};

function renderHalfRow(teeth, selectedTeeth, onTreatmentSelect, toothStates, onStateChange, currentTool, maxLen = 8, viewMode = null) {
  
  const handleToothAction = (toothId) => {
    const currentState = toothStates[toothId];
    const isMissing = currentState === 'missing';

    if (isMissing && currentTool !== 'missing') {
        return; 
    }

    if (currentTool === 'treat') {
        onTreatmentSelect(toothId);
    } 
    else if (onStateChange) {
        let newState = currentTool;
        if (currentTool === 'issue') {
            newState = (currentState === 'healthy' || currentState === 'treated') ? 'decay' : 'healthy'; 
        }
        onStateChange(toothId, newState);
    }
  };

  return (
    <div className="odontogram-row"> 
      {Array(maxLen - teeth.length).fill(0).map((_, i) => (
        <div key={`spacer-${i}`} style={{ width: 23 }} /> 
      ))}
      {teeth.map((num) => {
        const isSelectedForTreatment = selectedTeeth.includes(num);
        const permanentState = (toothStates[num] || 'healthy').toLowerCase().replace(/\s/g, ''); 
        const isMissing = permanentState === 'missing';
        
        let wrapperClasses = "odontogram-tooth";
        if (currentTool !== 'treat' && !isMissing) {
             wrapperClasses += ' state-selectable';
        }
        
        wrapperClasses += ` ${STATE_CLASSES[permanentState] || 'tooth-healthy'}`;
        
        let buttonClasses = "tooth-square";
        
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
              data-state={permanentState}
              data-selected={isSelectedForTreatment}
            >
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
    selectable = false,
    patientId = "default-patient"
}) {
    const [isModelOpen, setIsModelOpen] = React.useState(false);
    const [modalViewMode, setModalViewMode] = React.useState('status');
    const [loading, setLoading] = React.useState(false);
    const [timelineRecords, setTimelineRecords] = React.useState([]);
    const [selectedRecord, setSelectedRecord] = React.useState(null);
    const [treatmentType, setTreatmentType] = React.useState('tooth removal');
    const [toothTreatments, setToothTreatments] = React.useState({});

    // Fetch timeline records from Firebase
    React.useEffect(() => {
        if (!isModelOpen || !patientId) return;

        const fetchTimelineRecords = async () => {
            setLoading(true);
            try {
                console.log("=== FETCHING FIREBASE DATA ===");
                
                // Fetch conditions
                const conditionsSnapshot = await getDocs(
                    collection(db, `patients/${patientId}/conditions`)
                );
                const conditions = conditionsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    type: 'condition',
                    ...doc.data()
                }));

                // Fetch treatments
                const treatmentsSnapshot = await getDocs(
                    collection(db, `patients/${patientId}/treatments`)
                );
                const treatments = treatmentsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    type: 'treatment',
                    ...doc.data()
                }));

                console.log("Found treatments:", treatments);
                
                // CRITICAL FIX: Create toothTreatments object with tooth number as key
                const treatmentsByTooth = {};
                treatments.forEach(treatment => {
                    if (treatment.toothNumber) {
                        const treatmentValue = treatment.treatment || 'tooth removal';
                        treatmentsByTooth[treatment.toothNumber] = treatmentValue;
                        console.log(`📌 Tooth ${treatment.toothNumber}: "${treatmentValue}" added to toothTreatments`);
                    }
                });
                
                console.log("toothTreatments object:", treatmentsByTooth);
                setToothTreatments(treatmentsByTooth);

                // Combine and format records
                const allRecords = [...conditions, ...treatments].map(record => ({
                    id: record.id,
                    toothNumbers: [record.toothNumber],
                    condition: record.type === 'condition' ? record.condition : null,
                    treatment: record.type === 'treatment' ? record.treatment : null,
                    type: record.type,
                    date: record.updatedAt,
                    description: `${record.type === 'condition' ? 'Condition' : 'Treatment'} for tooth ${record.toothNumber}: ${record.type === 'condition' ? record.condition : record.treatment}`
                }));

                console.log("All timeline records:", allRecords);
                setTimelineRecords(allRecords);
                
                // Auto-select first treatment record if available
                const treatmentRecords = allRecords.filter(record => record.type === 'treatment');
                console.log("Treatment records:", treatmentRecords);
                
                if (treatmentRecords.length > 0) {
                    setSelectedRecord(treatmentRecords[0]);
                    const recordTreatment = treatmentRecords[0].treatment || 'tooth removal';
                    setTreatmentType(recordTreatment);
                    console.log("✅ Auto-selected record:", treatmentRecords[0]);
                    console.log("✅ Set treatment type to:", recordTreatment);
                } else {
                    setSelectedRecord(null);
                    console.log("⚠️ No treatment records found");
                }

            } catch (error) {
                console.error("Error fetching timeline records:", error);
            } finally {
                setLoading(false);
                console.log("=== FINISHED FETCHING ===");
            }
        };

        fetchTimelineRecords();
    }, [isModelOpen, patientId]);

    // Handle record selection
    const handleRecordSelect = (record) => {
        console.log("Selected record:", record);
        setSelectedRecord(record);
        if (record && record.treatment) {
            setTreatmentType(record.treatment);
            console.log("Set treatment type to:", record.treatment);
        }
    };

    const saveConditionToFirebase = async (toothId, condition) => {
        try {
            const conditionRef = doc(db, `patients/${patientId}/conditions`, `tooth-${toothId}`);
            
            if (condition === 'healthy' || condition === 'treated') {
                await deleteDoc(conditionRef);
            } else {
                await setDoc(conditionRef, {
                    toothNumber: toothId,
                    condition: condition,
                    updatedAt: new Date().toISOString()
                });
            }
            
            console.log(`Condition saved for tooth ${toothId}: ${condition}`);
        } catch (error) {
            console.error("Error saving condition to Firebase:", error);
        }
    };

    const saveTreatmentToFirebase = async (toothId, treatment) => {
        try {
            console.log(`=== SAVING TREATMENT TO FIREBASE ===`);
            console.log(`Tooth: ${toothId}`);
            console.log(`Treatment: "${treatment}"`);
            
            const treatmentRef = doc(db, `patients/${patientId}/treatments`, `tooth-${toothId}`);
            
            if (!treatment || treatment === 'none') {
                console.log(`Deleting treatment for tooth ${toothId}`);
                await deleteDoc(treatmentRef);
                // Remove from local state
                setToothTreatments(prev => {
                    const updated = { ...prev };
                    delete updated[toothId];
                    return updated;
                });
            } else {
                console.log(`Setting treatment "${treatment}" for tooth ${toothId}`);
                await setDoc(treatmentRef, {
                    toothNumber: toothId,
                    treatment: treatment,
                    updatedAt: new Date().toISOString(),
                    status: 'pending'
                });
                // Update local state
                setToothTreatments(prev => ({
                    ...prev,
                    [toothId]: treatment
                }));
            }
            
            console.log(`=== SAVED SUCCESSFULLY ===`);
        } catch (error) {
            console.error("Error saving treatment to Firebase:", error);
        }
    };

    const handleStateChange = async (toothId, newState) => {
        onStateChange(toothId, newState);
        
        if (newState === 'stained') {
            await saveConditionToFirebase(toothId, 'stained teeth');
        } else if (newState === 'cavity') {
            await saveConditionToFirebase(toothId, 'tooth cavity');
        } else if (newState === 'decay') {
            await saveConditionToFirebase(toothId, 'tooth decay');
        } else if (newState === 'missing') {
            await saveConditionToFirebase(toothId, 'missing');
        } else if (newState === 'healthy' || newState === 'treated') {
            await saveConditionToFirebase(toothId, 'healthy');
        }
    };

    const handleTreatmentSelect = async (toothId) => {
        if (currentTool === 'treat') {
            console.log(`=== TREATMENT SELECT ===`);
            console.log(`Tooth: ${toothId}`);
            console.log(`Current treatment type: ${treatmentType}`);
            console.log(`Currently selected teeth:`, selectedTeeth);
            
            const isAlreadySelected = selectedTeeth.includes(toothId);
            const sel = isAlreadySelected
                ? selectedTeeth.filter((n) => n !== toothId)
                : [...selectedTeeth, toothId];
            
            console.log(`New selection:`, sel);
            onSelectionChange(sel);
            
            if (!isAlreadySelected) {
                // Adding treatment - use CURRENT treatment type
                console.log(`ADDING treatment "${treatmentType}" to tooth ${toothId}`);
                await saveTreatmentToFirebase(toothId, treatmentType);
            } else {
                // Removing treatment
                console.log(`REMOVING treatment from tooth ${toothId}`);
                await saveTreatmentToFirebase(toothId, null);
            }
        }
    };

    const handleOpenModel = () => {
        console.log("Opening 3D model");
        setModalViewMode('status');
        setIsModelOpen(true);
    };
    
    const getActiveButtonClass = (mode) => {
        return `action-btn ${mode}-btn ${modalViewMode === mode ? 'active-view' : ''}`;
    };

    // Treatment type selector for the UI
    const renderTreatmentTypeSelector = () => {
        const treatmentTypes = [
            'tooth removal',
            'teeth whitening',
            'cavity cleaning',
        ];

        return (
            <div className="treatment-type-selector">
                <label>Treatment Type (for new selections):</label>
                <select
                    value={treatmentType}
                    onChange={(e) => {
                        console.log("Treatment type changed to:", e.target.value);
                        setTreatmentType(e.target.value);
                    }}
                    disabled={loading}
                >
                    {treatmentTypes.map(type => (
                        <option key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                    ))}
                </select>
                <div className="treatment-hint">
                    Current: <strong>{treatmentType}</strong> - This will be applied to newly selected teeth
                </div>
            </div>
        );
    };
  
    return (
        <div className="odontogram-grid">
          
          {/* Upper Arch */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {renderHalfRow(upperPermanentLeft, selectedTeeth, handleTreatmentSelect, toothStates, handleStateChange, currentTool, maxLenL, isModelOpen ? modalViewMode : null)}
            <div style={{ width: 20 }} />
            {renderHalfRow(upperPermanentRight, selectedTeeth, handleTreatmentSelect, toothStates, handleStateChange, currentTool, maxLenL, isModelOpen ? modalViewMode : null)} 
          </div>
          
          {/* Lower Arch */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            {renderHalfRow(lowerPermanentLeft, selectedTeeth, handleTreatmentSelect, toothStates, handleStateChange, currentTool, maxLenL, isModelOpen ? modalViewMode : null)}
            <div style={{ width: 20 }} />
            {renderHalfRow(lowerPermanentRight, selectedTeeth, handleTreatmentSelect, toothStates, handleStateChange, currentTool, maxLenL, isModelOpen ? modalViewMode : null)}
          </div>
          
          {/* Treatment Type Selector (shown when in treat mode) */}
          {currentTool === 'treat' && renderTreatmentTypeSelector()}
          
          <button
            type="button"
            className="view-3d-model-btn"
            onClick={handleOpenModel}
            disabled={loading}
          >
            {loading ? "Loading..." : "View 3D Teeth Model"}
          </button>
          
          {isModelOpen && (
            <div className="odontogram-modal-backdrop" onClick={() => setIsModelOpen(false)} role="presentation" >
              <div className="odontogram-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                  <div className="odontogram-modal-header">
                    <h3>3D Teeth Visualization ({modalViewMode.toUpperCase()})</h3>
                    <div className="patient-info">
                      Patient ID: {patientId}
                    </div>
                    
                    {/* Timeline Records Selector */}
                    {modalViewMode === 'treatment' && timelineRecords.length > 0 && (
                        <div className="timeline-selector">
                            <label>Select Treatment Record:</label>
                            <select 
                                value={selectedRecord?.id || ''}
                                onChange={(e) => {
                                    const record = timelineRecords.find(r => r.id === e.target.value);
                                    handleRecordSelect(record);
                                }}
                                disabled={loading}
                            >
                                <option value="">Select a record...</option>
                                {timelineRecords
                                    .filter(record => record.type === 'treatment')
                                    .map(record => (
                                        <option key={record.id} value={record.id}>
                                            Tooth {record.toothNumbers[0]}: {record.treatment}
                                        </option>
                                    ))}
                            </select>
                            {selectedRecord && (
                                <div className="selected-record-info">
                                    <strong>Selected:</strong> Tooth {selectedRecord.toothNumbers[0]} - {selectedRecord.treatment}
                                </div>
                            )}
                        </div>
                    )}
                  </div>
                  <div className="odontogram-modal-body">
                    <TeethModelViewer 
                        selectedTeeth={selectedTeeth} 
                        toothStates={toothStates} 
                        viewMode={modalViewMode}
                        selectedRecord={selectedRecord}
                        timelineRecords={timelineRecords.filter(record => record.type === 'treatment')}
                        patientId={patientId}
                        toothTreatments={toothTreatments}
                    />
                  </div>
                  <div className="odontogram-modal-footer">
                    <button 
                        type="button" 
                        className={getActiveButtonClass('status')}
                        onClick={() => setModalViewMode('status')}
                    >
                        Status
                    </button>
                    <button 
                        type="button" 
                        className={getActiveButtonClass('condition')}
                        onClick={() => setModalViewMode('condition')}
                    >
                        Condition
                    </button>
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