import React from "react";
import "./Odontogram.css"; 
import TeethModelViewer from "../../components/TeethModelViewer.jsx"; 
import { db } from "../../firebase";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { logActivity, getCurrentUserId } from "../../utils/activityLogger";

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

    return (
        <div className="tooth-3d-scene">
            {baseVisual}
            {conditionVisual}
            {treatmentVisual}
        </div>
    );
};

function renderHalfRow(teeth, selectedTeeth, onTreatmentSelect, toothStates, onStateChange, currentTool, handleMissingToggle, maxLen = 8, viewMode = null) {
  
  const handleToothAction = (toothId) => {
    const rawState = toothStates[toothId] || 'healthy';
    const currentState = rawState.toLowerCase().replace(/\s/g, '');

    if (currentTool === 'missing') {
        // For Missing tool: use the dedicated toggle function
        handleMissingToggle(toothId);
    } else if (currentTool === 'treat') {
        // For Treatment tool: select/deselect for treatment
        onTreatmentSelect(toothId);
    } else if (currentTool === 'issue') {
        // For Issue tool: toggle issue state
        const newState = (currentState === 'healthy' || currentState === 'treated') ? 'decay' : 'healthy';
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
    patientId = "default-patient",
    treatmentType = 'tooth removal',
    defaultCondition = ''
}) {
    const [isModelOpen, setIsModelOpen] = React.useState(false);
    const [modalViewMode, setModalViewMode] = React.useState('status');
    const [loading, setLoading] = React.useState(false);
    const [toothTreatments, setToothTreatments] = React.useState({});
    const [modelKey, setModelKey] = React.useState(0);

    React.useEffect(() => {
        console.log("🦷 Odontogram received toothStates:", toothStates);
        console.log("🦷 Tooth 45 state:", toothStates[45]);
    }, [toothStates]);

    const syncMissingTeeth = React.useCallback(() => {
        const missingTeeth = Object.entries(toothStates)
            .filter(([toothId, state]) => {
                const normalizedState = (state || '').toLowerCase().replace(/\s/g, '');
                return normalizedState === 'missing';
            })
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

        const fetchToothTreatments = async () => {
            setLoading(true);
            try {
                console.log("=== FETCHING FIREBASE DATA FOR TREATMENTS ===");

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

            } catch (error) {
                console.error("Error fetching treatments:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchToothTreatments();
    }, [isModelOpen, patientId]);

    const saveConditionToFirebase = async (toothId, condition) => {
        try {
            const conditionRef = doc(db, `patients/${patientId}/conditions`, `tooth-${toothId}`);
            
            if (condition === 'healthy' || condition === 'treated') {
                await deleteDoc(conditionRef);
                
                // Log activity for deletion
                const userId = getCurrentUserId();
                await logActivity(userId, `Removed ${condition} condition from tooth`, {
                    patientId: patientId,
                    toothNumber: toothId,
                    condition: condition,
                    action: 'delete'
                });
                
                console.log(`Deleted condition for tooth ${toothId}`);
            } else {
                await setDoc(conditionRef, {
                    toothNumber: toothId,
                    condition: condition,
                    updatedAt: new Date().toISOString()
                });
                
                // Log activity for creation/update
                const userId = getCurrentUserId();
                await logActivity(userId, `Created/Updated condition for tooth ${toothId}`, {
                    patientId: patientId,
                    toothNumber: toothId,
                    condition: condition,
                    action: 'create/update'
                });
                
                console.log(`Condition saved for tooth ${toothId}: ${condition}`);
            }
        } catch (error) {
            console.error("Error saving condition to Firebase:", error);
        }
    };

    const handleMissingToggle = async (toothId) => {
        const rawState = toothStates[toothId] || 'healthy';
        const currentState = rawState.toLowerCase().replace(/\s/g, '');
        const newState = currentState === 'missing' ? 'healthy' : 'missing';
        
        // Immediately notify parent (sync) - like onSelectionChange does for treatment
        onStateChange(toothId, newState);
        
        // Then persist to Firebase
        if (newState === 'missing') {
            await saveConditionToFirebase(toothId, 'missing');
        } else {
            await saveConditionToFirebase(toothId, 'healthy');
        }
        
        // Remove from treatment selection if marked as healthy
        if (newState === 'healthy' && selectedTeeth.includes(toothId)) {
            const newSelected = selectedTeeth.filter(t => t !== toothId);
            onSelectionChange(newSelected);
        }
    };

    const saveTreatmentToFirebase = async (toothId, treatment) => {
        try {
            console.log(`=== SAVING TREATMENT TO FIREBASE ===`);
            console.log(`Tooth: ${toothId}`);
            console.log(`Treatment: "${treatment}"`);
            
            const treatmentRef = doc(db, `patients/${patientId}/treatments`, `tooth-${toothId}`);
            const userId = getCurrentUserId();
            
            if (!treatment || treatment === 'none') {
                console.log(`Deleting treatment for tooth ${toothId}`);
                await deleteDoc(treatmentRef);
                
                // Log activity for treatment removal
                await logActivity(userId, `Removed treatment from tooth ${toothId}`, {
                    patientId: patientId,
                    toothNumber: toothId,
                    treatment: treatment,
                    action: 'delete'
                });
                
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
                
                // Log activity for new treatment
                await logActivity(userId, `Created/Updated treatment for tooth ${toothId}`, {
                    patientId: patientId,
                    toothNumber: toothId,
                    treatment: treatment,
                    status: 'pending',
                    action: 'create/update'
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

    const sortedSelectedTeeth = [...selectedTeeth].sort((a, b) => a - b);
    const selectedTeethLabel = sortedSelectedTeeth.length > 0
        ? sortedSelectedTeeth.join(', ')
        : 'No teeth selected';

    const selectedConditions = sortedSelectedTeeth
        .map((tooth) => toothStates[tooth])
        .filter((state) => state && state !== 'healthy')
        .map((state) => String(state));

    const uniqueConditions = [...new Set(selectedConditions)];
    const conditionSummary = defaultCondition || (uniqueConditions.length > 0 ? uniqueConditions.join(', ') : 'No condition selected');
    const treatmentSummary = treatmentType || 'No treatment selected';
    const titleMetaText = modalViewMode === 'status'
        ? `Teeth No.: ${selectedTeethLabel}`
        : modalViewMode === 'condition'
            ? `Condition: ${conditionSummary}`
            : `Treatment: ${treatmentSummary}`;

    return (
        <div className="odontogram-grid">
          
          <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {renderHalfRow(upperPermanentLeft, selectedTeeth, handleTreatmentSelect, toothStates, handleStateChange, currentTool, handleMissingToggle, maxLenL, isModelOpen ? modalViewMode : null)}
            <div style={{ width: 20 }} />
                        {renderHalfRow(upperPermanentRight, selectedTeeth, handleTreatmentSelect, toothStates, handleStateChange, currentTool, handleMissingToggle, maxLenL, isModelOpen ? modalViewMode : null)} 
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                        {renderHalfRow(lowerPermanentLeft, selectedTeeth, handleTreatmentSelect, toothStates, handleStateChange, currentTool, handleMissingToggle, maxLenL, isModelOpen ? modalViewMode : null)}
            <div style={{ width: 20 }} />
                        {renderHalfRow(lowerPermanentRight, selectedTeeth, handleTreatmentSelect, toothStates, handleStateChange, currentTool, handleMissingToggle, maxLenL, isModelOpen ? modalViewMode : null)}
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
                                        <div className="modal-title-row">
                                            <h3>3D Teeth Visualization ({modalViewMode.toUpperCase()})</h3>
                                            <span className="modal-title-meta">{titleMetaText}</span>
                                        </div>
                    <div className="patient-info">
                      Patient ID: {patientId}
                    </div>
                  </div>
                  
                  <div className="odontogram-modal-body">
                    <TeethModelViewer 
                        key={modelKey}
                        selectedTeeth={selectedTeeth} 
                        toothStates={toothStates} 
                        viewMode={modalViewMode}
                        patientId={patientId}
                        toothTreatments={toothTreatments}
                        defaultTreatment={treatmentType}
                        defaultCondition={defaultCondition}
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