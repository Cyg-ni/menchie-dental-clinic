import React from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

// Paths to external assets
const TEETH_MODEL_PATH = "/models/Teeth.obj"; 
const TEETH_TEXTURE_PATH = "/models/AlysonTeeth.png"; 

// --- ANIMATION CONSTANTS ---
const REMOVAL_DURATION = 2.5;
const REMOVAL_DISTANCE = 20; 
const WHITENING_DURATION = 3.0;
const CLEANING_DURATION = 3.0;

export default function TeethModelViewer({ 
    className = "", 
    selectedTeeth = [],
    toothStates = {}, 
    viewMode = 'status',
    selectedRecord = null,
    timelineRecords = [],
    patientId = "default-patient",
    toothTreatments = {},
    defaultTreatment = null,
    defaultCondition = null,
    timelineSelectedTooth = null
}) {
  const mountRef = React.useRef(null);
  const [status, setStatus] = React.useState("loading");
  const toothMeshMapRef = React.useRef({}); 
  const sceneRef = React.useRef(null);
  const rendererRef = React.useRef(null);
  const clockRef = React.useRef(new THREE.Clock()); 
  const animationFrameIdRef = React.useRef(null);

  // Track previous viewMode to detect changes
  const prevViewModeRef = React.useRef(viewMode);
  
  // --- COLORS ---
  const COLOR_DEFAULT = new THREE.Color(0xffffff);
  const COLOR_SELECTED_TREAT = new THREE.Color(0x2452a2); 
  const COLOR_TREATED = new THREE.Color(0x89c994);
  const COLOR_ISSUE = new THREE.Color(0xd23c3c);
  const COLOR_DECAY = new THREE.Color(0x333333);
  const COLOR_CAVITY = new THREE.Color(0xa89080);
  const COLOR_STAINED_BASE = new THREE.Color(0xffe699);
  const COLOR_WHITENING_TARGET = new THREE.Color(0xffffff);
  const COLOR_DIM = new THREE.Color(0x444444); 
  const COLOR_MISSING = new THREE.Color(0x9e9e9e);
  const COLOR_CLEANING_TARGET = new THREE.Color(0xffffff);
  
  // --- ANIMATION TRACKING ---
  const animationStateRef = React.useRef({
    pulsingMeshes: [],
    whiteningMeshes: [],
    removalMeshes: [],
    cleaningMeshes: [],
    completedAnimations: new Set(),
    // Track animation start times
    animationStartTimes: new Map()
  });

  // Debug logging for props
  React.useEffect(() => {
    console.log("=== TEETH MODEL VIEWER PROPS ===");
    console.log("viewMode:", viewMode);
    console.log("selectedRecord:", selectedRecord);
    console.log("selectedTeeth:", selectedTeeth);
    console.log("toothStates:", toothStates);
    console.log("timelineRecords count:", timelineRecords?.length || 0);
    console.log("timelineRecords:", timelineRecords);
    console.log("toothTreatments:", toothTreatments);
    console.log("patientId:", patientId);
    console.log("=== END PROPS ===");
  }, [viewMode, selectedRecord, selectedTeeth, toothStates, timelineRecords, toothTreatments, patientId]);

  // Animation update function
  const updateAnimations = React.useCallback(() => {
    if (status !== 'ready') return;
    
    const elapsedTime = clockRef.current.getElapsedTime();
    const state = animationStateRef.current;

    // Update whitening animations
    state.whiteningMeshes.forEach((mesh, index) => {
      if (!mesh.userData.whiteningStartTime) {
        mesh.userData.whiteningStartTime = elapsedTime;
        mesh.userData.whiteningStartColor = mesh.material.color.clone();
      }
      
      const startTime = mesh.userData.whiteningStartTime;
      const progress = Math.min(1, (elapsedTime - startTime) / WHITENING_DURATION);
      
      const startColor = mesh.userData.whiteningStartColor || COLOR_STAINED_BASE;
      const endColor = COLOR_WHITENING_TARGET;

      // Smooth color interpolation
      mesh.material.color.copy(startColor);
      mesh.material.color.lerp(endColor, progress);
      
      if (progress >= 1) {
        mesh.userData.whiteningCompleted = true;
        // Remove completed animation
        state.whiteningMeshes.splice(index, 1);
      }
    });

    // Update cleaning animations
    state.cleaningMeshes.forEach((mesh, index) => {
      if (!mesh.userData.cleaningStartTime) {
        mesh.userData.cleaningStartTime = elapsedTime;
        mesh.userData.cleaningStartColor = mesh.material.color.clone();
      }
      
      const startTime = mesh.userData.cleaningStartTime;
      const progress = Math.min(1, (elapsedTime - startTime) / CLEANING_DURATION);
      
      const startColor = mesh.userData.cleaningStartColor;
      const endColor = COLOR_CLEANING_TARGET;

      // Smooth color interpolation
      mesh.material.color.copy(startColor);
      mesh.material.color.lerp(endColor, progress);
      
      if (progress >= 1) {
        mesh.userData.cleaningCompleted = true;
        // Remove completed animation
        state.cleaningMeshes.splice(index, 1);
      }
    });

    // Update removal animations
    state.removalMeshes.forEach((mesh, index) => {
      if (!mesh.userData.removalStartTime) {
        mesh.userData.removalStartTime = elapsedTime;
        mesh.userData.removalStartColor = mesh.material.color.clone();
      }
      
      const startTime = mesh.userData.removalStartTime;
      const progress = Math.min(1, (elapsedTime - startTime) / REMOVAL_DURATION);

      if (progress < 1) {
        const easedProgress = progress * progress * progress;
        
        // Move up and forward
        mesh.position.set(
          mesh.userData.originalPosition.x,
          mesh.userData.originalPosition.y + easedProgress * REMOVAL_DISTANCE,
          mesh.userData.originalPosition.z + easedProgress * (REMOVAL_DISTANCE / 4)
        ); 
        
        // Shrink
        const scale = 1 - easedProgress * 0.7;
        mesh.scale.set(scale, scale, scale);
        
        // Fade out
        mesh.material.opacity = 1 - easedProgress;
        mesh.material.transparent = true;
        
        // Color change during removal
        const startColor = mesh.userData.removalStartColor || new THREE.Color(0xffffff);
        const removalColor = new THREE.Color(0xff6b6b);
        mesh.material.color.copy(startColor);
        mesh.material.color.lerp(removalColor, easedProgress * 0.5);
      } else {
        mesh.visible = false;
        mesh.userData.removalCompleted = true;
        // Remove completed animation
        state.removalMeshes.splice(index, 1);
      }
    });
  }, [status]);

  React.useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode) return undefined;
    
    let isMounted = true;
    const width = mountNode.clientWidth || 640;
    const height = mountNode.clientHeight || 360;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e121b); 
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    rendererRef.current = renderer;
    mountNode.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    scene.add(new THREE.DirectionalLight(0xffffff, 0.8));

    const textureLoader = new THREE.TextureLoader();
    const objLoader = new OBJLoader();
    const texture = textureLoader.load(TEETH_TEXTURE_PATH, undefined, undefined, (err) => {
        console.warn("Texture load failed. Model will render in solid color.", err);
    });
    const sharedMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: texture,
        roughness: 0.5,
        metalness: 0.1,
    });
    
    objLoader.load(TEETH_MODEL_PATH, (object) => { 
        if (!isMounted) return;
        const toothMeshMap = { all: [] };
        object.traverse((child) => {
          if (child.isMesh) {
                child.material = sharedMaterial.clone(); 
                child.userData.originalColor = new THREE.Color(0xffffff); 
                child.userData.originalPosition = child.position.clone();
                child.userData.originalScale = child.scale.clone();
                child.userData.originalOpacity = 1;
                const name = (child.name || "").toLowerCase();
                const match = name.match(/(\d{2})/);
                if (match && match[1]) {
                    const id = match[1];
                    if (!toothMeshMap[id]) toothMeshMap[id] = [];
                    toothMeshMap[id].push(child);
                } else {
                    toothMeshMap.all.push(child); 
                }
          }
        });
        toothMeshMapRef.current = toothMeshMap;
        
        // Scaling and Camera Setup
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        object.position.sub(center); 
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.2; 
        camera.position.set(0, 0, cameraZ);
        camera.updateProjectionMatrix();
        controls.target.set(0, 0, 0);
        controls.update();
        scene.add(object);
        setStatus("ready");
    }, undefined, (err) => {
        console.error("FATAL ERROR: Failed to load anatomical OBJ model.", err);
        setStatus("error");
    });

    // Animation loop
    const animate = () => {
      if (!isMounted) return;
      
      animationFrameIdRef.current = requestAnimationFrame(animate);
      controls.update();
      updateAnimations();
      
      if (rendererRef.current && scene && camera) {
        rendererRef.current.render(scene, camera);
      }
    };
    
    // Start animation loop
    animate();

    const handleResize = () => {
        if (!isMounted || !mountNode) return;
        const width = mountNode.clientWidth;
        const height = mountNode.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
        isMounted = false;
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
        }
        window.removeEventListener('resize', handleResize);
        controls.dispose();
        renderer.dispose();
        if(mountNode) mountNode.innerHTML = '';
    };
  }, [updateAnimations]);

  // Check if a tooth is missing from any source
  const isToothMissing = React.useCallback((toothNum) => {
    // Check toothStates first
    if (toothStates[toothNum] === 'missing') {
      console.log(`Tooth ${toothNum} marked as missing in toothStates`);
      return true;
    }
    
    // Check timeline records for missing condition
    if (timelineRecords && timelineRecords.length > 0) {
      const missingRecords = timelineRecords.filter(record => 
        record.toothNumber === toothNum && 
        record.condition && 
        record.condition.toLowerCase().includes('missing')
      );
      
      if (missingRecords.length > 0) {
        console.log(`Tooth ${toothNum} found as missing in timeline records:`, missingRecords);
        return true;
      }
    }
    
    // Check selected record for missing condition
    if (selectedRecord && selectedRecord.condition) {
      if (selectedRecord.condition.toLowerCase().includes('missing') && 
          selectedRecord.toothNumber === toothNum) {
        console.log(`Tooth ${toothNum} found as missing in selected record`);
        return true;
      }
    }
    
    return false;
  }, [toothStates, timelineRecords, selectedRecord]);

  // --- MAIN EFFECT TO UPDATE VISUALS ---
  React.useEffect(() => {
    if (status !== 'ready') {
        console.log("Status not ready:", status);
        return;
    }
    
    const map = toothMeshMapRef.current;
    const state = animationStateRef.current;
    
    // Clear all animation lists when viewMode changes
    if (prevViewModeRef.current !== viewMode) {
        console.log("View mode changed from", prevViewModeRef.current, "to", viewMode);
        state.pulsingMeshes = [];
        state.whiteningMeshes = [];
        state.removalMeshes = [];
        state.cleaningMeshes = [];
        state.completedAnimations.clear();
        state.animationStartTimes.clear();
        prevViewModeRef.current = viewMode;
    }

    // NEW: Highlight timeline selected tooth
    if (timelineSelectedTooth) {
        console.log(`🔍 Timeline selected tooth: ${timelineSelectedTooth}`);
        const selectedMeshes = getMeshes(timelineSelectedTooth);
        selectedMeshes.forEach(mesh => {
            // Add a special glow/pulse effect for timeline selection
            mesh.material.emissive.setHex(0xff6b6b);
            mesh.material.emissiveIntensity = 0.5;
            mesh.userData.timelineSelected = true;
                
            // Add to pulsing meshes for animation
            if (!state.pulsingMeshes.includes(mesh)) {
                state.pulsingMeshes.push(mesh);
                mesh.userData.pulseColor1 = new THREE.Color(0xff6b6b);
                mesh.userData.pulseColor2 = new THREE.Color(0xff8e8e);
            }
        });
    }

    const getMeshes = (id) => map[String(id)] || [];

    // Reset all teeth to default state first
    Object.values(map).flat().forEach(mesh => {
        if (!mesh.userData.removalCompleted) {
            mesh.visible = true;
            mesh.position.copy(mesh.userData.originalPosition || new THREE.Vector3(0, 0, 0));
            mesh.scale.copy(mesh.userData.originalScale || new THREE.Vector3(1, 1, 1));
            mesh.material.opacity = mesh.userData.originalOpacity || 1;
            mesh.material.transparent = false;
            mesh.material.emissive.setHex(0x000000); 
            mesh.material.emissiveIntensity = 0;
        }
    });

    const setupWhitening = (mesh) => {
        if (!state.whiteningMeshes.includes(mesh) && !mesh.userData.whiteningCompleted) {
            console.log("💎 Setting up whitening animation - will fade from yellow to white");
            
            // Reset animation state
            mesh.userData.whiteningStartTime = undefined;
            mesh.userData.whiteningStartColor = mesh.material.color.clone();
            mesh.userData.whiteningCompleted = false;
            
            // Start with stained yellow color
            mesh.material.color.copy(COLOR_STAINED_BASE);
            
            // Add to animation list
            if (!state.whiteningMeshes.includes(mesh)) {
                state.whiteningMeshes.push(mesh);
            }
        }
    };
    
    const setupRemoval = (mesh) => {
        if (!state.removalMeshes.includes(mesh) && !mesh.userData.removalCompleted) {
            console.log("🦷 SETTING UP REMOVAL ANIMATION");
            mesh.userData.removalStartTime = undefined;
            mesh.userData.removalCompleted = false;
            
            if (!state.removalMeshes.includes(mesh)) {
                state.removalMeshes.push(mesh);
            }
        }
    };
    
    const setupCleaning = (mesh) => {
        if (!state.cleaningMeshes.includes(mesh) && !mesh.userData.cleaningCompleted) {
            console.log("🧼 Setting up cleaning animation - will fade to white");
            
            // Reset animation state
            mesh.userData.cleaningStartTime = undefined;
            mesh.userData.cleaningStartColor = mesh.material.color.clone();
            mesh.userData.cleaningCompleted = false;
            
            // Add to animation list
            if (!state.cleaningMeshes.includes(mesh)) {
                state.cleaningMeshes.push(mesh);
            }
        }
    };

    const setVisuals = (mesh, color, pulse = false, pulseColor2 = null) => {
        // Don't set visuals if tooth is currently animating
        if (state.whiteningMeshes.includes(mesh) || 
            state.removalMeshes.includes(mesh) || 
            state.cleaningMeshes.includes(mesh)) {
            return;
        }
        
        mesh.material.color.set(color);
        mesh.material.emissive.set(color);
        mesh.material.emissiveIntensity = pulse ? 0.3 : 0.1;

        if (pulse) {
            mesh.userData.pulseColor1 = color;
            mesh.userData.pulseColor2 = pulseColor2 || new THREE.Color(color).clone().lerp(new THREE.Color(0xffffff), 0.3);
            if (!state.pulsingMeshes.includes(mesh)) {
                state.pulsingMeshes.push(mesh);
            }
        } else {
            // Remove from pulsing if not pulsing anymore
            state.pulsingMeshes = state.pulsingMeshes.filter(m => m !== mesh);
        }
    };

    // Get teeth from selected record
    const teethToShow = selectedRecord ? [selectedRecord.toothNumber] : [];
    
    // Get all teeth we need to process
    const allToothIds = new Set([
        ...Object.keys(toothStates),
        ...selectedTeeth.map(String),
        ...teethToShow.map(String)
    ]);

    // Prepare a string-based set for selected teeth to avoid type mismatch (string vs number)
    const selectedSet = new Set((selectedTeeth || []).map(String));

    console.log('=== VISUAL UPDATE ===');
    console.log('VIEW MODE:', viewMode);
    console.log('SELECTED TEETH:', Array.from(selectedSet));

    // Process each tooth
    allToothIds.forEach(toothNumStr => {
        const toothNum = parseInt(toothNumStr);
        const meshes = getMeshes(toothNum);
        const toothState = toothStates[toothNum];

        // Check if tooth is missing from any source
        const isMissing = isToothMissing(toothNum);
        
        if (isMissing) {
            console.log(`🚫 Tooth ${toothNum} is marked as MISSING - hiding in 3D view`);
            meshes.forEach(mesh => {
                mesh.visible = false;
                // Remove any animations referencing this mesh
                state.pulsingMeshes = state.pulsingMeshes.filter(m => m !== mesh);
                state.whiteningMeshes = state.whiteningMeshes.filter(m => m !== mesh);
                state.removalMeshes = state.removalMeshes.filter(m => m !== mesh);
                state.cleaningMeshes = state.cleaningMeshes.filter(m => m !== mesh);
            });
            return; // Skip further processing for this tooth
        }
        
        // Determine if this tooth is in the selected record
        const isInSelectedRecord = teethToShow.includes(toothNum);

        meshes.forEach(mesh => {
            if (viewMode === 'status') {
                // Status view - SIMPLIFIED: Only highlight teeth that are in selectedTeeth
                if (selectedSet.has(String(toothNum))) {
                    // ONLY highlight if tooth is in selectedTeeth
                    console.log(`Highlighting tooth ${toothNum} in status view (selected in odontogram)`);
                    setVisuals(mesh, COLOR_SELECTED_TREAT, true, new THREE.Color(0x7397c5));
                } else {
                    // All other teeth - show default or treated color
                    if (toothState === 'treated') {
                        setVisuals(mesh, COLOR_TREATED);
                    } else if (toothState === 'issue') {
                        setVisuals(mesh, COLOR_ISSUE);
                    } else {
                        setVisuals(mesh, COLOR_DEFAULT);
                    }
                }
                
            } else if (viewMode === 'condition') {
                console.log(`=== CONDITION VIEW - Tooth ${toothNum} ===`);
                
                // Find condition from any source. Prefer selectedRecord, then timelineRecords, then toothStates.
                let actualCondition = '';

                // If a defaultCondition is provided by the parent and this tooth is selected for treatment,
                // prefer that (staff just chose it in the side panel).
                if (defaultCondition && selectedSet.has(String(toothNum))) {
                    actualCondition = (defaultCondition || '').toLowerCase().trim();
                    console.log(`Using defaultCondition prop for selected tooth: "${actualCondition}"`);
                }
                // Check selectedRecord next
                else if (isInSelectedRecord && selectedRecord && selectedRecord.condition) {
                    actualCondition = selectedRecord.condition.toLowerCase().trim();
                    console.log(`Found condition in selectedRecord: "${actualCondition}"`);
                }
                // Then check timelineRecords
                if (!actualCondition && timelineRecords && timelineRecords.length > 0) {
                    const timelineRecord = timelineRecords.find(record => 
                        record.toothNumber === toothNum && 
                        record.condition
                    );
                    if (timelineRecord) {
                        actualCondition = timelineRecord.condition.toLowerCase().trim();
                        console.log(`Found condition in timelineRecords: "${actualCondition}"`);
                    }
                }
                // Finally, check toothStates as fallback (non-missing)
                if (!actualCondition && toothState && toothState !== 'healthy') {
                    actualCondition = toothState.toLowerCase().trim();
                    console.log(`Found condition in toothStates: "${actualCondition}"`);
                }
                
                console.log(`Final condition for tooth ${toothNum}: "${actualCondition}"`);
                
                // Apply correct color based on condition
                if (actualCondition.includes('stained')) {
                    setVisuals(mesh, COLOR_STAINED_BASE);
                    console.log(`Setting tooth ${toothNum} as stained (yellow)`);
                } else if (actualCondition.includes('decay')) {
                    setVisuals(mesh, COLOR_DECAY);
                    console.log(`Setting tooth ${toothNum} as decay (dark red)`);
                } else if (actualCondition.includes('cavity')) {
                    setVisuals(mesh, COLOR_CAVITY);
                    console.log(`Setting tooth ${toothNum} as cavity (brown)`);
                } else {
                    setVisuals(mesh, COLOR_DIM);
                    console.log(`Setting tooth ${toothNum} as dim (no specific condition)`);
                }
                
            } else if (viewMode === 'treatment') {
                console.log(`=== TREATMENT VIEW - Tooth ${toothNum} ===`);
                
                // Check if tooth is selected (highlighted in odontogram)
                const isToothSelected = selectedSet.has(String(toothNum));
                console.log(`Tooth ${toothNum} is in selectedTeeth: ${isToothSelected}`);
                
                if (isToothSelected) {
                    console.log(`🔄 Tooth ${toothNum} is highlighted in odontogram - determining treatment`);
                    
                    // Get treatment AND condition for this specific tooth
                    let treatment = null;
                    let condition = null;
                    
                    // 1. Get treatment from toothTreatments or selectedRecord
                    if (toothTreatments && typeof toothTreatments === 'object') {
                        if (Array.isArray(toothTreatments)) {
                            const treatmentObj = toothTreatments.find(t => 
                                t && t.toothNumber === toothNum
                            );
                            if (treatmentObj && treatmentObj.treatment) {
                                treatment = treatmentObj.treatment;
                                console.log(`📋 Found treatment in toothTreatments array: "${treatment}"`);
                            }
                        } else {
                            treatment = toothTreatments[toothNum];
                            if (treatment) {
                                console.log(`📋 Found treatment in toothTreatments object: "${treatment}"`);
                            }
                        }
                    }
                    
                    // 2. If no treatment from toothTreatments, check selectedRecord
                    if (!treatment && selectedRecord && selectedRecord.treatment) {
                        if (selectedRecord.toothNumber === toothNum) {
                            treatment = selectedRecord.treatment;
                            console.log(`📋 Found treatment in selectedRecord: "${treatment}"`);
                        }
                    }

                    // 3. If still no treatment, use the parent's defaultTreatment (e.g. selected in side-panel)
                    if (!treatment && defaultTreatment) {
                        treatment = defaultTreatment;
                        console.log(`📌 Using defaultTreatment prop: "${treatment}"`);
                    }
                    
                    // Get condition for this tooth
                    if (toothState && toothState !== 'healthy') {
                        condition = toothState.toLowerCase().trim();
                        console.log(`📋 Found condition in toothStates: "${condition}"`);
                    }
                    
                    console.log(`🔍 Condition for tooth ${toothNum}: "${condition}"`);
                    console.log(`💊 Treatment for tooth ${toothNum}: "${treatment}"`);
                    
                    // If no treatment found, use DEFAULT treatment based on condition
                    if (!treatment && condition) {
                        console.log(`⚠️ No treatment found for tooth ${toothNum}, using default based on condition`);
                        
                        // Set default treatment based on condition
                        if (condition.includes('stained') || condition.includes('stained teeth')) {
                            treatment = 'tooth whitening';
                            console.log(`✅ Default treatment for stained teeth: "${treatment}"`);
                        }
                        else if (condition.includes('cavity') || condition.includes('tooth cavity')) {
                            treatment = 'cavity cleaning';
                            console.log(`✅ Default treatment for cavity: "${treatment}"`);
                        }
                        else if (condition.includes('decay') || condition.includes('tooth decay')) {
                            treatment = 'tooth removal';
                            console.log(`✅ Default treatment for decay: "${treatment}"`);
                        }
                    }
                    
                    // If we still have a condition but no treatment, show whitening as default
                    if (!treatment && condition) {
                        treatment = 'tooth whitening';
                        console.log(`🔄 Ultimate fallback treatment: "${treatment}"`);
                    }
                    
                    // SPECIFIC LOGIC BASED ON YOUR REQUIREMENTS
                    if (treatment) {
                        const normalizedTreatment = treatment.toLowerCase().trim();
                        const normalizedCondition = condition ? condition.toLowerCase().trim() : '';
                        
                        console.log(`🎯 FINAL: Condition="${normalizedCondition}", Treatment="${normalizedTreatment}"`);

                        // If the staff explicitly selected a removal/extraction as the current procedure,
                        // prioritize the removal animation regardless of the recorded condition (unless missing).
                        if (normalizedTreatment.includes('remov') || normalizedTreatment.includes('extract')) {
                            console.log(`⚡ Staff-selected removal detected → FORCE REMOVAL ANIMATION`);
                            setupRemoval(mesh);
                        }
                        // Otherwise, run condition+treatment rules
                        else if ((normalizedCondition.includes('tooth cavity') || normalizedCondition.includes('cavity')) &&
                            (normalizedTreatment.includes('removal') || normalizedTreatment.includes('extraction'))) {
                            console.log(`✅ Condition: tooth cavity, Treatment: removal → REMOVAL ANIMATION`);
                            setupRemoval(mesh);
                        }
                        else if ((normalizedCondition.includes('stained teeth') || normalizedCondition.includes('stained')) &&
                                (normalizedTreatment.includes('removal') || normalizedTreatment.includes('extraction'))) {
                            console.log(`✅ Condition: stained teeth, Treatment: removal → REMOVAL ANIMATION`);
                            setupRemoval(mesh);
                        }
                        else if ((normalizedCondition.includes('tooth decay') || normalizedCondition.includes('decay')) &&
                                (normalizedTreatment.includes('removal') || normalizedTreatment.includes('extraction'))) {
                            console.log(`✅ Condition: tooth decay, Treatment: removal → REMOVAL ANIMATION`);
                            setupRemoval(mesh);
                        }
                        // Whitening animation conditions
                        else if ((normalizedCondition.includes('tooth cavity') || normalizedCondition.includes('cavity')) &&
                                (normalizedTreatment.includes('whitening') || normalizedTreatment.includes('bleaching'))) {
                            console.log(`✅ Condition: tooth cavity, Treatment: whitening → WHITENING ANIMATION`);
                            setupWhitening(mesh);
                        }
                        else if ((normalizedCondition.includes('stained teeth') || normalizedCondition.includes('stained')) &&
                                (normalizedTreatment.includes('whitening') || normalizedTreatment.includes('bleaching'))) {
                            console.log(`✅ Condition: stained teeth, Treatment: whitening → WHITENING ANIMATION`);
                            setupWhitening(mesh);
                        }
                        else if ((normalizedCondition.includes('tooth decay') || normalizedCondition.includes('decay')) &&
                                (normalizedTreatment.includes('whitening') || normalizedTreatment.includes('bleaching'))) {
                            console.log(`✅ Condition: tooth decay, Treatment: whitening → WHITENING ANIMATION`);
                            setupWhitening(mesh);
                        }
                        // Cleaning animation conditions
                        else if ((normalizedCondition.includes('tooth cavity') || normalizedCondition.includes('cavity')) &&
                                (normalizedTreatment.includes('cleaning') || normalizedTreatment.includes('clean') || normalizedTreatment.includes('cavity cleaning'))) {
                            console.log(`✅ Condition: tooth cavity, Treatment: cleaning → CLEANING ANIMATION`);
                            setupCleaning(mesh);
                        }
                        else if ((normalizedCondition.includes('stained teeth') || normalizedCondition.includes('stained')) &&
                                (normalizedTreatment.includes('cleaning') || normalizedTreatment.includes('clean'))) {
                            console.log(`✅ Condition: stained teeth, Treatment: cleaning → CLEANING ANIMATION`);
                            setupCleaning(mesh);
                        }
                        else if ((normalizedCondition.includes('tooth decay') || normalizedCondition.includes('decay')) &&
                                (normalizedTreatment.includes('cleaning') || normalizedTreatment.includes('clean'))) {
                            console.log(`✅ Condition: tooth decay, Treatment: cleaning → CLEANING ANIMATION`);
                            setupCleaning(mesh);
                        }
                        else {
                            // Default to cleaning animation
                            console.log(`🦷 Default animation for: "${treatment}" → CLEANING ANIMATION`);
                            setupCleaning(mesh);
                        }
                    } else {
                        // NO TREATMENT FOUND AT ALL - show dim color (no animation)
                        console.log(`📭 No treatment specified for tooth ${toothNum} - showing dim color`);
                        setVisuals(mesh, COLOR_DIM);
                    }
                } else {
                    // Tooth is not selected/highlighted
                    console.log(`❌ Tooth ${toothNum} not highlighted - dimming`);
                    setVisuals(mesh, COLOR_DIM);
                }
            }
        });
    });

    console.log('=== ANIMATION COUNTS ===');
    console.log('Removal animations:', state.removalMeshes.length);
    console.log('Whitening animations:', state.whiteningMeshes.length);
    console.log('Cleaning animations:', state.cleaningMeshes.length);
    console.log('Pulsing meshes:', state.pulsingMeshes.length);

    }, [status, toothStates, selectedTeeth, viewMode, selectedRecord, timelineRecords, toothTreatments, defaultTreatment, defaultCondition, isToothMissing, timelineSelectedTooth]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {status === "error" && (
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: 'red', 
          background: 'rgba(0,0,0,0.5)' 
        }}>
          **ERROR:** Could not load Teeth.obj. Check browser console for network or file errors.
        </div>
      )}
      <div style={{ width: '100%', height: '100%' }} ref={mountRef} />
    </div>
  );
}