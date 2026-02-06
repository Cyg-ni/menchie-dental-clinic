import React from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";

// Paths to external assets
const TEETH_MODEL_PATH = "/models/Teeth.obj"; 
const TEETH_TEXTURE_PATH = "/models/AlysonTeeth.png"; 

// --- ANIMATION CONSTANTS ---
const REMOVAL_DURATION = 2.5;
const REMOVAL_DISTANCE = 20; 
const WHITENING_DURATION = 3.0;
const CLEANING_DURATION = 3.0;

// --- COLORS (Defined outside component to prevent recreation) ---
const COLOR_DEFAULT = new THREE.Color(0xffffff);
const COLOR_SELECTED_TREAT = new THREE.Color(0x2452a2); 
const COLOR_TREATED = new THREE.Color(0x89c994);
const COLOR_ISSUE = new THREE.Color(0xd23c3c);
const COLOR_DECAY = new THREE.Color(0x333333);
const COLOR_CAVITY = new THREE.Color(0xa89080);
const COLOR_STAINED_BASE = new THREE.Color(0xffe699);
const COLOR_WHITENING_TARGET = new THREE.Color(0xffffff);
const COLOR_DIM = new THREE.Color(0x444444); 
const COLOR_CLEANING_TARGET = new THREE.Color(0xffffff);

// Pulse secondary color
const COLOR_PULSE_SECONDARY = new THREE.Color(0x7397c5);

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
  
  // --- ANIMATION TRACKING ---
  const animationStateRef = React.useRef({
    pulsingMeshes: new Set(), // Use Set for performance
    whiteningMeshes: [],
    removalMeshes: [],
    cleaningMeshes: [],
    completedAnimations: new Set(),
    animationStartTimes: new Map()
  });

  // Animation update function
  const updateAnimations = React.useCallback(() => {
    if (status !== 'ready') return;
    
    const elapsedTime = clockRef.current.getElapsedTime();
    const state = animationStateRef.current;

    // ------------------------------------
    // Pulse Animations (REMOVED due to lerpVectors error)
    // ------------------------------------
    // The previous pulsing logic caused crashes with mesh.material.emissive.lerpVectors.
    // We are simplifying to just static colors for now in Status mode to ensure stability.
    // ------------------------------------
    
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
    scene.background = new THREE.Color(0xf9fafb);  // MATCHING BG
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


  // Helper: Check if a tooth is missing from any source
  const isToothMissing = React.useCallback((toothNum) => {
    // Check toothStates first
    if (toothStates[toothNum] === 'missing') return true;
    
    // Check timeline records for missing condition
    if (timelineRecords && timelineRecords.length > 0) {
      const missingRecords = timelineRecords.filter(record => 
        (record.toothNumber === toothNum || (record.toothNumbers && record.toothNumbers.includes(toothNum))) && 
        record.condition && 
        record.condition.toLowerCase().includes('missing')
      );
      if (missingRecords.length > 0) return true;
    }
    
    // Check selected record for missing condition
    if (selectedRecord && selectedRecord.condition) {
      if (selectedRecord.condition.toLowerCase().includes('missing') && 
          selectedRecord.toothNumbers && selectedRecord.toothNumbers.includes(toothNum)) {
        return true;
      }
    }
    return false;
  }, [toothStates, timelineRecords, selectedRecord]);

  // --- MAIN RENDER LOGIC: Update materials based on state ---
  React.useEffect(() => {
    if (status !== 'ready' || !toothMeshMapRef.current) return;

    const map = toothMeshMapRef.current;
    const state = animationStateRef.current;
    
    // Clear all animation lists when viewMode changes
    if (prevViewModeRef.current !== viewMode) {
        state.pulsingMeshes.clear();
        state.whiteningMeshes = [];
        state.removalMeshes = [];
        state.cleaningMeshes = [];
        state.completedAnimations.clear();
        state.animationStartTimes.clear();
        prevViewModeRef.current = viewMode;
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
            // Clear default colors
            mesh.material.color.setHex(0xffffff);
        }
    });

    // Helper functions for animations
    const setupWhitening = (mesh) => {
        if (!state.whiteningMeshes.includes(mesh) && !mesh.userData.whiteningCompleted) {
            mesh.userData.whiteningStartTime = undefined;
            mesh.userData.whiteningStartColor = mesh.material.color.clone();
            mesh.userData.whiteningCompleted = false;
            mesh.material.color.copy(COLOR_STAINED_BASE);
            if (!state.whiteningMeshes.includes(mesh)) state.whiteningMeshes.push(mesh);
        }
    };
    
    const setupRemoval = (mesh) => {
        if (!state.removalMeshes.includes(mesh) && !mesh.userData.removalCompleted) {
            mesh.userData.removalStartTime = undefined;
            mesh.userData.removalCompleted = false;
            if (!state.removalMeshes.includes(mesh)) state.removalMeshes.push(mesh);
        }
    };
    
    const setupCleaning = (mesh) => {
        if (!state.cleaningMeshes.includes(mesh) && !mesh.userData.cleaningCompleted) {
            mesh.userData.cleaningStartTime = undefined;
            mesh.userData.cleaningStartColor = mesh.material.color.clone();
            mesh.userData.cleaningCompleted = false;
            if (!state.cleaningMeshes.includes(mesh)) state.cleaningMeshes.push(mesh);
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
        // Ensure no emissive glow is left over from previous states
        mesh.material.emissive.setHex(0x000000); 
        mesh.material.emissiveIntensity = 0;
        
        // Remove from pulsing set (since we removed the pulsing logic)
        state.pulsingMeshes.delete(mesh);
    };

    // Determine teeth to process
    const recordToothNumbers = selectedRecord ? (selectedRecord.toothNumbers || []) : [];
    const teethToShow = recordToothNumbers.map(String);
    const selectedSet = new Set((selectedTeeth || []).map(String));

    // Get all tooth IDs involved
    const allToothIds = new Set([
        ...Object.keys(toothStates),
        ...teethToShow,
        ...Array.from(selectedSet)
    ]);

    // Process each tooth based on viewMode
    allToothIds.forEach(toothNumStr => {
        const toothNum = parseInt(toothNumStr);
        const meshes = getMeshes(toothNum);
        const toothState = toothStates[toothNum];
        const isMissing = isToothMissing(toothNum);
        
        if (isMissing) {
            meshes.forEach(mesh => {
                mesh.visible = false;
                state.pulsingMeshes.delete(mesh);
            });
            return;
        }

        const isInSelectedRecord = selectedSet.has(toothNumStr);

        meshes.forEach(mesh => {
            if (viewMode === 'status') {
                // Status View: Highlight selected teeth with blue pulse
                if (isInSelectedRecord) {
                    setVisuals(mesh, COLOR_SELECTED_TREAT, true, COLOR_PULSE_SECONDARY);
                } else {
                    // Show standard heatmap colors
                    if (toothState === 'treated') setVisuals(mesh, COLOR_TREATED);
                    else if (toothState === 'issue' || toothState === 'cavity' || toothState === 'decay') setVisuals(mesh, COLOR_ISSUE);
                    else setVisuals(mesh, COLOR_DEFAULT);
                }
            } 
            else if (viewMode === 'condition') {

                // Condition View: Explicitly show conditions (Stains, Decay, Cavity)
                // If selected, check specific condition from record; otherwise use state.
                let condition = '';
                
                if (isInSelectedRecord && selectedRecord && selectedRecord.condition) {
                     condition = selectedRecord.condition.toLowerCase();
                } else if (toothState) {
                     condition = toothState.toLowerCase();
                }

                if (condition.includes('stained')) setVisuals(mesh, COLOR_STAINED_BASE);
                else if (condition.includes('decay')) setVisuals(mesh, COLOR_DECAY);
                else if (condition.includes('cavity')) setVisuals(mesh, COLOR_CAVITY);
                else setVisuals(mesh, COLOR_DIM); // Dim others to focus on conditions
            }
            else if (viewMode === 'treatment') {
                // Treatment View: Show treatment animations for selected, others dim
                if (isInSelectedRecord) {
                    let treatment = selectedRecord?.treatment || "";
                    let condition = selectedRecord?.condition || "";
                    
                    const normalizedTreatment = treatment.toLowerCase();
                    const normalizedCondition = condition.toLowerCase();

                    // Logic ported from staff app (simplified for readibility)
                    if (normalizedTreatment.includes('remov') || normalizedTreatment.includes('extract')) {
                        setupRemoval(mesh);
                    }
                    else if (normalizedTreatment.includes('whiten') || normalizedTreatment.includes('bleach')) {
                         setupWhitening(mesh);
                    }
                    else if (normalizedTreatment.includes('cleaning') || normalizedTreatment.includes('clean')) {
                         setupCleaning(mesh);
                    }
                    // Fallback based on condition if treatment is generic or missing logic
                    else if (normalizedCondition.includes('cavity') || normalizedCondition.includes('decay')) {
                        // Usually implies filling/cleaning or removal
                         setupCleaning(mesh); // Default cleaning/filling visuals
                    }
                    else if (normalizedCondition.includes('stained')) {
                         setupWhitening(mesh);
                    } 
                    else {
                        // Default animation if nothing matches
                        setupCleaning(mesh);
                    }
                } else {
                    setVisuals(mesh, COLOR_DIM);
                }
            }
        });
    });

  }, [status, toothStates, selectedTeeth, viewMode, selectedRecord, timelineRecords]); // Re-run when these change

  return (
    <div ref={mountRef} className={`relative w-full h-full ${className}`} />
  );
}

