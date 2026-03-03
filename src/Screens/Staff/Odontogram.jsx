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

const getToothInnerContent = (state, isSelectedForTreatment, viewMode = null, isTimelineSelected = false) => {
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
    } else if (normalizedState === 'crooked' || normalizedState === 'crookedteeth') {
        conditionVisual = <div className="condition-layer condition-crooked" />;
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

    let timelineSelectionVisual = null;
    if (isTimelineSelected) {
        timelineSelectionVisual = <div className="treatment-layer timeline-selection-indicator" />;
    }

    return (
        <div className="tooth-3d-scene">
            {baseVisual}
            {conditionVisual}
            {treatmentVisual}
            {timelineSelectionVisual}
        </div>
    );
};

function renderHalfRow(teeth, selectedTeeth, onTreatmentSelect, toothStates, onStateChange, currentTool, maxLen = 8, viewMode = null, timelineSelectedTooth = null, medicalRecordSelectedTeeth = []) {
  
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
        const isTimelineSelected = timelineSelectedTooth === num;
        const isMedicalRecordSelected = medicalRecordSelectedTeeth.includes(num);
        
        let wrapperClasses = "odontogram-tooth";
        if (currentTool !== 'treat' && !isMissing) {
             wrapperClasses += ' state-selectable';
        }
        
        wrapperClasses += ` ${STATE_CLASSES[permanentState] || 'tooth-healthy'}`;
        
        if (isTimelineSelected) {
            wrapperClasses += ' tooth-timeline-selected';
        }
        
        if (isMedicalRecordSelected) {
            wrapperClasses += ' tooth-medical-record-selected';
        }
        
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
                    data-timeline-selected={isTimelineSelected}
                    data-medical-selected={isMedicalRecordSelected}
                >
                    {getToothInnerContent(permanentState, isSelectedForTreatment, viewMode, isTimelineSelected || isMedicalRecordSelected)}
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
    patientId = "default-patient",
    treatmentType = 'tooth removal',
    defaultCondition = ''
}) {
    const [isModelOpen, setIsModelOpen] = React.useState(false);
    const [modalViewMode, setModalViewMode] = React.useState('status');
    const [loading, setLoading] = React.useState(false);
    const [timelineRecords, setTimelineRecords] = React.useState([]);
    const [selectedRecord, setSelectedRecord] = React.useState(null);
    const [toothTreatments, setToothTreatments] = React.useState({});
    const [timelineSelectedTooth, setTimelineSelectedTooth] = React.useState(null);
    const [modelKey, setModelKey] = React.useState(0);
    
    // NEW: Medical Record Selected Teeth - FORCE MISSING TEETH TO APPEAR
    const [medicalRecordSelectedTeeth, setMedicalRecordSelectedTeeth] = React.useState([]);

    React.useEffect(() => {
        console.log("🦷 Odontogram received toothStates:", toothStates);
        console.log("🦷 Tooth 45 state:", toothStates[45]);
    }, [toothStates]);

    const syncMissingTeeth = React.useCallback(() => {
        const missingTeeth = Object.entries(toothStates)
            .filter(([toothId, state]) => state === 'missing')
            .map(([toothId]) => parseInt(toothId));
        
        if (missingTeeth.length > 0 && selectedTeeth.length > 0) {
            const newSelectedTeeth = selectedTeeth.filter(toothId => 
                !missingTeeth.includes(toothId)
            );
            
            if (newSelectedTeeth.length !== selectedTeeth.length) {
                console.log(`Removing missing teeth from selection:`, 
                    selectedTeeth.filter(id => missingTeeth.includes(id))
                );
                onSelectionChange(newSelectedTeeth);
            }
        }
    }, [toothStates, selectedTeeth, onSelectionChange]);

    React.useEffect(() => {
        syncMissingTeeth();
    }, [toothStates, syncMissingTeeth]);

    React.useEffect(() => {
        if (!isModelOpen || !patientId) return;

        const fetchTimelineRecords = async () => {
            setLoading(true);
            try {
                console.log("=== FETCHING FIREBASE DATA FOR TIMELINE ===");
                
                const conditionsSnapshot = await getDocs(
                    collection(db, `patients/${patientId}/conditions`)
                );
                const conditions = conditionsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    type: 'condition',
                    ...doc.data()
                }));

                console.log("Conditions found:", conditions);

                const treatmentsSnapshot = await getDocs(
                    collection(db, `patients/${patientId}/treatments`)
                );
                const treatments = treatmentsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    type: 'treatment',
                    ...doc.data()
                }));

                console.log("Treatments found:", treatments);
                
                const treatmentsByTooth = {};
                treatments.forEach(treatment => {
                    if (treatment.toothNumber) {
                        treatmentsByTooth[treatment.toothNumber] = treatment.treatment || 'tooth removal';
                        console.log(`📌 Tooth ${treatment.toothNumber}: treatment "${treatment.treatment}"`);
                    }
                });
                setToothTreatments(treatmentsByTooth);

                const allRecords = [
                    ...conditions.map(condition => ({
                        id: condition.id,
                        toothNumber: condition.toothNumber,
                        type: 'condition',
                        condition: condition.condition,
                        treatment: null,
                        date: condition.updatedAt || new Date().toISOString(),
                        status: 'Recorded',
                        description: `Condition: ${condition.condition} on tooth ${condition.toothNumber}`
                    })),
                    ...treatments.map(treatment => ({
                        id: treatment.id,
                        toothNumber: treatment.toothNumber,
                        type: 'treatment',
                        condition: null,
                        treatment: treatment.treatment,
                        date: treatment.updatedAt || new Date().toISOString(),
                        status: treatment.status || 'Done',
                        description: `Treatment: ${treatment.treatment} on tooth ${treatment.toothNumber}`
                    }))
                ].sort((a, b) => new Date(b.date) - new Date(a.date));

                console.log("=== ALL TIMELINE RECORDS ===");
                console.log("Total records:", allRecords.length);
                allRecords.forEach(record => {
                    console.log(`- Tooth ${record.toothNumber}: ${record.type} - ${record.condition || record.treatment}`);
                });
                console.log("=== END RECORDS ===");

                setTimelineRecords(allRecords);
                
                // AUTO-SELECT FIRST RECORD AND HIGHLIGHT TOOTH
                if (allRecords.length > 0) {
                    const firstRecord = allRecords[0];
                    setSelectedRecord(firstRecord);
                    setTimelineSelectedTooth(firstRecord.toothNumber);
                    
                    // FORCE MISSING TEETH TO APPEAR - COPY TREATMENT LOGIC
                    if (firstRecord.condition && firstRecord.condition.toLowerCase().includes('missing')) {
                        console.log(`🟥 AUTO-SELECTING missing tooth ${firstRecord.toothNumber} from timeline!`);
                        setMedicalRecordSelectedTeeth([firstRecord.toothNumber]);
                    }
                }

            } catch (error) {
                console.error("Error fetching timeline records:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTimelineRecords();
    }, [isModelOpen, patientId]);

    const handleRecordSelect = (record) => {
        console.log("🟢 SELECTING record:", record);
        console.log("🟢 Record condition:", record.condition);
        
        setSelectedRecord(record);
        
        if (record && record.toothNumber) {
            const toothNum = record.toothNumber;
            console.log(`🟢 Setting timelineSelectedTooth to: ${toothNum}`);
            setTimelineSelectedTooth(toothNum);
            
            // FORCE MISSING TEETH TO APPEAR - EXACT COPY OF TREATMENT LOGIC
            if (record.condition && record.condition.toLowerCase().includes('missing')) {
                console.log(`🟥 FORCING missing tooth ${toothNum} to appear in odontogram!`);
                console.log(`🟥 Adding tooth ${toothNum} to medicalRecordSelectedTeeth`);
                
                // Update the toothStates to show as missing
                onStateChange(toothNum, 'missing');
                
                // SET THE TOOTH AS SELECTED IN MEDICAL RECORD - JUST LIKE TREATMENT
                setMedicalRecordSelectedTeeth([toothNum]);
                
                // Also update the actual state
                if (!toothStates[toothNum] || toothStates[toothNum] !== 'missing') {
                    console.log(`🟥 Updating tooth ${toothNum} state to 'missing'`);
                    onStateChange(toothNum, 'missing');
                }
            } else {
                // Clear medical record selection for non-missing teeth
                setMedicalRecordSelectedTeeth([]);
            }
        } else {
            console.log("🟢 Clearing timeline selection");
            setTimelineSelectedTooth(null);
            setMedicalRecordSelectedTeeth([]);
        }
    };

    const clearTimelineSelection = () => {
        console.log("🟢 Clearing timeline selection");
        setSelectedRecord(null);
        setTimelineSelectedTooth(null);
        setMedicalRecordSelectedTeeth([]);
    };

    const saveConditionToFirebase = async (toothId, condition) => {
        try {
            const conditionRef = doc(db, `patients/${patientId}/conditions`, `tooth-${toothId}`);
            
            if (condition === 'healthy' || condition === 'treated') {
                await deleteDoc(conditionRef);
                console.log(`Deleted condition for tooth ${toothId}`);
            } else {
                await setDoc(conditionRef, {
                    toothNumber: toothId,
                    condition: condition,
                    updatedAt: new Date().toISOString()
                });
                console.log(`Condition saved for tooth ${toothId}: ${condition}`);
            }
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
        console.log(`🔄 handleStateChange: Tooth ${toothId} -> ${newState}`);
        
        if (newState === 'treated') {
            console.log(`⚠️ Cannot manually set tooth ${toothId} as 'treated'. Use treatment selection instead.`);
            return;
        }
        
        onStateChange(toothId, newState);
        
        if (newState === 'stained') {
            await saveConditionToFirebase(toothId, 'stained teeth');
        } else if (newState === 'crooked') {
            await saveConditionToFirebase(toothId, 'crooked teeth');
        } else if (newState === 'cavity') {
            await saveConditionToFirebase(toothId, 'tooth cavity');
        } else if (newState === 'decay') {
            await saveConditionToFirebase(toothId, 'tooth decay');
        } else if (newState === 'missing') {
            await saveConditionToFirebase(toothId, 'missing');
            if (selectedTeeth.includes(toothId)) {
                const newSelected = selectedTeeth.filter(t => t !== toothId);
                onSelectionChange(newSelected);
            }
        } else if (newState === 'healthy') {
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
                console.log(`ADDING treatment "${treatmentType}" to tooth ${toothId}`);
                await saveTreatmentToFirebase(toothId, treatmentType);
            } else {
                console.log(`REMOVING treatment from tooth ${toothId}`);
                await saveTreatmentToFirebase(toothId, null);
            }
        }
    };

    React.useEffect(() => {
        console.log("🔄 SYNCING tooth states with treatments");
        console.log("Current toothTreatments:", toothTreatments);
        console.log("Current toothStates (before sync):", toothStates);
        
        const teethWithTreatments = new Set();
        Object.keys(toothTreatments).forEach(toothId => {
            if (toothTreatments[toothId]) {
                teethWithTreatments.add(parseInt(toothId));
            }
        });
        
        console.log("Teeth with actual treatments:", Array.from(teethWithTreatments));
        
        Object.entries(toothStates).forEach(([toothId, state]) => {
            const toothNum = parseInt(toothId);
            
            if (state === 'treated') {
                if (!teethWithTreatments.has(toothNum)) {
                    console.log(`🔄 Tooth ${toothNum} marked as 'treated' but no treatment record found - resetting to 'healthy'`);
                    onStateChange(toothNum, 'healthy');
                }
            } else if (state !== 'missing') {
                if (teethWithTreatments.has(toothNum)) {
                    console.log(`🔄 Tooth ${toothNum} has treatment record but not marked as 'treated' - updating`);
                    onStateChange(toothNum, 'treated');
                }
            }
        });
        
        teethWithTreatments.forEach(toothNum => {
            if (!toothStates[toothNum]) {
                console.log(`🔄 Tooth ${toothNum} has treatment record but no state - marking as 'treated'`);
                onStateChange(toothNum, 'treated');
            }
        });
        
    }, [toothTreatments]);

    const handleOpenModel = () => {
        console.log("Opening 3D model");
        setModalViewMode('status');
        setModelKey(prev => prev + 1);
        setIsModelOpen(true);
    };
    
    const getActiveButtonClass = (mode) => {
        return `action-btn ${mode}-btn ${modalViewMode === mode ? 'active-view' : ''}`;
    };

    return (
        <div className="odontogram-grid">
          
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {renderHalfRow(upperPermanentLeft, selectedTeeth, handleTreatmentSelect, toothStates, handleStateChange, currentTool, maxLenL, isModelOpen ? modalViewMode : null, timelineSelectedTooth, medicalRecordSelectedTeeth)}
            <div style={{ width: 20 }} />
            {renderHalfRow(upperPermanentRight, selectedTeeth, handleTreatmentSelect, toothStates, handleStateChange, currentTool, maxLenL, isModelOpen ? modalViewMode : null, timelineSelectedTooth, medicalRecordSelectedTeeth)} 
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            {renderHalfRow(lowerPermanentLeft, selectedTeeth, handleTreatmentSelect, toothStates, handleStateChange, currentTool, maxLenL, isModelOpen ? modalViewMode : null, timelineSelectedTooth, medicalRecordSelectedTeeth)}
            <div style={{ width: 20 }} />
            {renderHalfRow(lowerPermanentRight, selectedTeeth, handleTreatmentSelect, toothStates, handleStateChange, currentTool, maxLenL, isModelOpen ? modalViewMode : null, timelineSelectedTooth, medicalRecordSelectedTeeth)}
          </div>
          
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
                    
                    {modalViewMode === 'treatment' && timelineRecords.length > 0 && (
                        <div className="timeline-selector">
                            <label><strong>Treatment Record Timeline</strong></label>
                            <div className="clear-selection" style={{ marginBottom: '10px' }}>
                                <button 
                                    className="clear-btn"
                                    onClick={clearTimelineSelection}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#0066cc',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        textDecoration: 'underline',
                                        padding: 0,
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Clear Selection
                                </button>
                            </div>
                            
                            <div className="timeline-list" style={{
                                maxHeight: '200px',
                                overflowY: 'auto',
                                border: '1px solid #eee',
                                borderRadius: '4px',
                                padding: '10px'
                            }}>
                                {timelineRecords.map(record => {
                                    const isMissing = record.condition && 
                                                     record.condition.toLowerCase().includes('missing');
                                    
                                    return (
                                        <div 
                                            key={record.id}
                                            className={`timeline-item ${selectedRecord?.id === record.id ? 'selected' : ''} ${isMissing ? 'missing-tooth' : ''}`}
                                            onClick={() => handleRecordSelect(record)}
                                            style={{
                                                padding: '12px',
                                                marginBottom: '10px',
                                                border: selectedRecord?.id === record.id ? '2px solid #0066cc' : '1px solid #ddd',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                background: selectedRecord?.id === record.id ? 
                                                    (isMissing ? '#f0f0f0' : '#f0f8ff') : 
                                                    (isMissing ? '#f9f9f9' : '#fff'),
                                                transition: 'all 0.2s',
                                                borderLeft: isMissing ? '4px solid #999' : 
                                                           selectedRecord?.id === record.id ? '4px solid #0066cc' : '1px solid #ddd',
                                                display: 'flex',
                                                alignItems: 'center',
                                                position: 'relative',
                                                minHeight: '60px'
                                            }}
                                            data-condition={record.condition}
                                            data-tooth-number={record.toothNumber}
                                        >
                                            {/* GREY BOX FOR MISSING TEETH - EXACT COPY OF TREATMENT LOGIC */}
                                            <div 
                                                style={{
                                                    width: '45px',
                                                    height: '45px',
                                                    marginRight: '15px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: isMissing ? '#f5f5f5' : '#0066cc',
                                                    border: isMissing ? '2px dashed #999' : 'none',
                                                    borderRadius: '6px',
                                                    color: isMissing ? '#666' : 'white',
                                                    fontWeight: 'bold',
                                                    fontSize: isMissing ? '16px' : '18px',
                                                    position: 'relative',
                                                    flexShrink: 0
                                                }}
                                            >
                                                {/* TOOTH NUMBER - ALWAYS SHOW - COPY FROM TREATMENT */}
                                                <span style={{
                                                    position: 'relative',
                                                    zIndex: 2,
                                                    fontWeight: 'bold'
                                                }}>
                                                    {record.toothNumber}
                                                </span>
                                                
                                                {!isMissing && (
                                                    <div style={{
                                                        fontSize: '10px',
                                                        opacity: 0.9,
                                                        marginTop: '2px',
                                                        fontWeight: 'normal'
                                                    }}>
                                                        Tooth
                                                    </div>
                                                )}
                                                
                                                {/* BIG RED X FOR MISSING TEETH - COPY FROM TREATMENT */}
                                                {isMissing && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '50%',
                                                        left: '50%',
                                                        transform: 'translate(-50%, -50%)',
                                                        fontSize: '28px',
                                                        fontWeight: 'bold',
                                                        color: '#ff4444',
                                                        zIndex: 3,
                                                        textShadow: '0 0 3px white',
                                                        opacity: 0.9
                                                    }}>
                                                        ✕
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* RECORD DETAILS - COPY FROM TREATMENT */}
                                            <div style={{ flex: 1 }}>
                                                <div style={{ 
                                                    marginBottom: '6px', 
                                                    fontWeight: 'bold', 
                                                    color: isMissing ? '#666' : '#0066cc',
                                                    fontSize: '14px'
                                                }}>
                                                    Tooth {record.toothNumber} {isMissing ? '(Missing)' : ''}
                                                </div>
                                                <div style={{ 
                                                    marginBottom: '3px', 
                                                    fontSize: '12px', 
                                                    color: isMissing ? '#888' : '#555',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '5px'
                                                }}>
                                                    <span style={{ fontWeight: 'bold', color: isMissing ? '#999' : '#333' }}>Date:</span>
                                                    <span>{new Date(record.date).toISOString().split('T')[0]}</span>
                                                </div>
                                                {record.condition && (
                                                    <div style={{ 
                                                        marginBottom: '3px', 
                                                        fontSize: '12px', 
                                                        color: isMissing ? '#888' : '#555',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '5px'
                                                    }}>
                                                        <span style={{ fontWeight: 'bold', color: isMissing ? '#999' : '#333' }}>Condition:</span>
                                                        <span>{record.condition}</span>
                                                    </div>
                                                )}
                                                {record.treatment && (
                                                    <div style={{ 
                                                        marginBottom: '3px', 
                                                        fontSize: '12px', 
                                                        color: isMissing ? '#888' : '#555',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '5px'
                                                    }}>
                                                        <span style={{ fontWeight: 'bold', color: isMissing ? '#999' : '#333' }}>Treatment:</span>
                                                        <span>{record.treatment}</span>
                                                    </div>
                                                )}
                                                <div style={{ 
                                                    fontSize: '12px', 
                                                    marginTop: '6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '5px'
                                                }}>
                                                    <span style={{ fontWeight: 'bold', color: isMissing ? '#999' : '#333' }}>Status:</span>
                                                    <span style={{ 
                                                        color: isMissing ? '#999' : 
                                                               record.status === 'Done' ? '#28a745' : 
                                                               record.status === 'Recorded' ? '#17a2b8' : 
                                                               '#ffc107',
                                                        fontWeight: 'bold',
                                                        padding: '2px 8px',
                                                        borderRadius: '10px',
                                                        background: isMissing ? '#eee' : 
                                                                   record.status === 'Done' ? '#e8f5e9' : 
                                                                   record.status === 'Recorded' ? '#e3f2fd' : 
                                                                   '#fff3cd',
                                                        fontSize: '11px'
                                                    }}>
                                                        {record.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            
                            {selectedRecord && (
                                <div className="selected-record-info" style={{
                                    padding: '12px',
                                    background: selectedRecord.condition && selectedRecord.condition.toLowerCase().includes('missing') ? '#f0f0f0' : '#f0f8ff',
                                    border: selectedRecord.condition && selectedRecord.condition.toLowerCase().includes('missing') ? '1px solid #ddd' : '1px solid #cce5ff',
                                    borderRadius: '6px',
                                    marginTop: '12px',
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}>
                                    <div style={{
                                        width: '35px',
                                        height: '35px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: selectedRecord.condition && selectedRecord.condition.toLowerCase().includes('missing') ? '#f5f5f5' : '#0066cc',
                                        border: selectedRecord.condition && selectedRecord.condition.toLowerCase().includes('missing') ? '2px dashed #999' : 'none',
                                        borderRadius: '6px',
                                        color: selectedRecord.condition && selectedRecord.condition.toLowerCase().includes('missing') ? '#666' : 'white',
                                        fontWeight: 'bold',
                                        fontSize: selectedRecord.condition && selectedRecord.condition.toLowerCase().includes('missing') ? '14px' : '16px',
                                        position: 'relative'
                                    }}>
                                        {selectedRecord.toothNumber}
                                        {selectedRecord.condition && selectedRecord.condition.toLowerCase().includes('missing') && (
                                            <span style={{
                                                position: 'absolute',
                                                fontSize: '22px',
                                                fontWeight: 'bold',
                                                color: '#ff4444'
                                            }}>
                                                ✕
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <strong>Selected:</strong> Tooth {selectedRecord.toothNumber} - 
                                        {selectedRecord.type === 'condition' ? ` Condition: ${selectedRecord.condition}` : ` Treatment: ${selectedRecord.treatment}`}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                  </div>
                  
                  <div className="odontogram-modal-body">
                    <TeethModelViewer 
                        key={modelKey}
                        selectedTeeth={selectedTeeth} 
                        toothStates={toothStates} 
                        viewMode={modalViewMode}
                        selectedRecord={selectedRecord}
                        timelineRecords={timelineRecords}
                        patientId={patientId}
                        toothTreatments={toothTreatments}
                        defaultTreatment={treatmentType}
                        defaultCondition={defaultCondition}
                        timelineSelectedTooth={timelineSelectedTooth}
                        medicalRecordSelectedTeeth={medicalRecordSelectedTeeth}
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