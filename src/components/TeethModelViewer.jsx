import React from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

// Paths to external assets
const TEETH_MODEL_PATH = "/models/Teeth.obj"; 
const TEETH_TEXTURE_PATH = "/models/AlysonTeeth.png"; 

// --- ANIMATION CONSTANTS ---
const REMOVAL_DURATION = 10.0; 
const REMOVAL_DISTANCE = 20; 
// NEW CONSTANT: Duration for the one-way whitening animation
const WHITENING_DURATION = 5.0; // 5 seconds to go from stained to white
// NEW CONSTANT: Duration for cavity cleaning animation
const CAVITY_CLEAN_DURATION = 4.0; // 4 seconds to clean the cavity

// --- Easing Function for Slow Start (Ease-In Cubic - Unchanged) ---
const easeCubicIn = (t) => t * t * t;

// --- DUMMY TREATMENT/CONDITION DATA (Unchanged) ---
const getOngoingTreatmentForTooth = (toothNum) => {
    const timelineData = {
        42: { condition: 'stained teeth', treatment: 'teeth whitening' }, 
        41: { condition: 'tooth decay', treatment: 'tooth removal' },
        33: { condition: 'tooth decay', treatment: 'Tooth Removal' },
        34: { condition: 'tooth decay', treatment: 'Tooth Removal' },
        35: { condition: 'tooth decay', treatment: 'Tooth Removal' },
        22: { condition: 'tooth cavity', treatment: 'Tooth Removal' },
        23: { condition: 'tooth cavity', treatment: 'Tooth Removal' },
        24: { condition: 'tooth cavity', treatment: 'Tooth Removal' },
        25: { condition: 'tooth cavity', treatment: 'Tooth Removal' },
        26: { condition: 'tooth cavity', treatment: 'Tooth Removal' }, 
        11: { condition: 'missing', treatment: null }, 
        13: { condition: 'stained teeth', treatment: 'teeth whitening' },
    };
    return timelineData[toothNum] || { condition: 'healthy', treatment: null };
};

export default function TeethModelViewer({ 
  className = "", 
  selectedTeeth = [],
  toothStates = { '11': 'missing' }, 
  viewMode = 'status' 
}) {
  const mountRef = React.useRef(null);
  const [status, setStatus] = React.useState("loading");
  const toothMeshMapRef = React.useRef({}); 
  const sceneRef = React.useRef(null);
  const clockRef = React.useRef(new THREE.Clock()); 

  // --- COLORS (Unchanged) ---
  const COLOR_DEFAULT = new THREE.Color(0xffffff);
  const COLOR_SELECTED_TREAT = new THREE.Color(0x2452a2); 
  const COLOR_TREATED = new THREE.Color(0x89c994);
  const COLOR_ISSUE = new THREE.Color(0xd23c3c);
  const COLOR_DECAY = new THREE.Color(0x6b0000);
  const COLOR_CAVITY = new THREE.Color(0xa89080); // Subtle cavity stain - appears at top
  const COLOR_STAINED_BASE = new THREE.Color(0xa89000);
  const COLOR_WHITENING_TARGET = new THREE.Color(0xf0ffff);
  const COLOR_DIM = new THREE.Color(0x444444); 
  
  // --- ANIMATION TRACKING ---
  const pulsingMeshesRef = React.useRef([]);
  const whiteningMeshesRef = React.useRef([]);
  const toothRemovalMeshesRef = React.useRef([]); 
  const cavityCleaningMeshesRef = React.useRef([]);

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

    // --- ANIMATION LOOP (Core Update) ---
    let frameId;
    const animate = () => {
        frameId = requestAnimationFrame(animate);
        controls.update();
        
        const elapsedTime = clockRef.current.getElapsedTime();
        const sinePulse = (Math.sin(elapsedTime * 3) + 1) / 2; 

        // 1. STANDARD PULSING ANIMATION (Unchanged)
        pulsingMeshesRef.current.forEach(mesh => {
            if (!mesh.userData.pulseColor1 || !mesh.userData.pulseColor2) return;
            mesh.material.color.copy(mesh.userData.pulseColor1);
            mesh.material.color.lerp(mesh.userData.pulseColor2, sinePulse * 0.5); 
            mesh.material.emissiveIntensity = 0.3 + sinePulse * 0.2;
        });
        
        // 2. TEETH WHITENING ANIMATION (UPDATED to one-way progression)
        whiteningMeshesRef.current.forEach(mesh => {
            if (!mesh.userData.whiteningStartTime) {
                // Initialize start time if needed
                mesh.userData.whiteningStartTime = elapsedTime;
            }
            
            const startTime = mesh.userData.whiteningStartTime;
            // Calculate linear progress, clamping it at 1.0
            const progress = Math.min(1, (elapsedTime - startTime) / WHITENING_DURATION);
            
            const startColor = mesh.userData.whiteningStartColor;
            const endColor = mesh.userData.whiteningEndColor;

            // Lerp the color using the one-way progress
            mesh.material.color.copy(startColor);
            mesh.material.color.lerp(endColor, progress); 
            
            // Set a static emissive glow for whitening visibility (no pulsing)
            mesh.material.emissiveIntensity = 0.1;

            if (progress === 1) {
                // If whitening is complete, remove it from the animation list 
                // to prevent constant calculation. It retains the final color.
                mesh.userData.whiteningCompleted = true;
            }
        });

        // Cleanup: Remove completed whitening meshes from the tracking list
        if (whiteningMeshesRef.current.some(m => m.userData.whiteningCompleted)) {
            whiteningMeshesRef.current = whiteningMeshesRef.current.filter(
                mesh => !mesh.userData.whiteningCompleted
            );
        }

        // 3. TEETH REMOVAL ANIMATION (Unchanged from last slow version)
        toothRemovalMeshesRef.current.forEach(mesh => {
            const startTime = mesh.userData.removalStartTime;
            const linearProgress = Math.min(1, (elapsedTime - startTime) / REMOVAL_DURATION);

            if (linearProgress < 1) {
                const easedProgress = easeCubicIn(linearProgress); 
                
                mesh.position.set(0, easedProgress * REMOVAL_DISTANCE, easedProgress * (REMOVAL_DISTANCE / 4)); 
                
                const scale = 1 - easedProgress * 0.5;
                mesh.scale.set(scale, scale, scale);
            } else {
                mesh.visible = false;
                mesh.userData.removalCompleted = true; 
            }
        });

        // Cleanup: Remove meshes that have completed their removal animation
        if (toothRemovalMeshesRef.current.some(m => m.userData.removalCompleted)) {
            toothRemovalMeshesRef.current = toothRemovalMeshesRef.current.filter(
                mesh => !mesh.userData.removalCompleted
            );
        }
        
        // 4. CAVITY CLEANING ANIMATION (NEW - Gradually fade cavity color)
        cavityCleaningMeshesRef.current.forEach(mesh => {
            if (!mesh.userData.cavityCleanStartTime) {
                mesh.userData.cavityCleanStartTime = elapsedTime;
            }
            
            const startTime = mesh.userData.cavityCleanStartTime;
            const progress = Math.min(1, (elapsedTime - startTime) / CAVITY_CLEAN_DURATION);
            
            const startColor = mesh.userData.cavityCleanStartColor;
            const endColor = new THREE.Color(0xffffff); // Clean white tooth
            
            mesh.material.color.copy(startColor);
            mesh.material.color.lerp(endColor, progress);
            
            if (progress === 1) {
                mesh.userData.cavityCleanCompleted = true;
            }
        });
        
        // Cleanup: Remove completed cavity cleaning meshes from the tracking list
        if (cavityCleaningMeshesRef.current.some(m => m.userData.cavityCleanCompleted)) {
            cavityCleaningMeshesRef.current = cavityCleaningMeshesRef.current.filter(
                mesh => !mesh.userData.cavityCleanCompleted
            );
        }
        
        renderer.render(scene, camera);
    };
    animate();

    // Cleanup (omitted for brevity)
    const handleResize = () => { /* ... resize logic ... */ };
    window.addEventListener('resize', handleResize);
    return () => {
        isMounted = false;
        cancelAnimationFrame(frameId);
        window.removeEventListener('resize', handleResize);
        controls.dispose();
        renderer.dispose();
        if(mountNode) mountNode.innerHTML = '';
    };
  }, []); 

  // --- STATE/COLOR UPDATER EFFECT (Updated Whitening Setup) ---
  React.useEffect(() => {
    if (status !== 'ready') return;
    const map = toothMeshMapRef.current;
    
    // 1. Reset all non-permanent animation flags and lists
    pulsingMeshesRef.current = []; 

    const getMeshes = (id) => map[String(id)] || [];

    // Reset All Visuals & clear removal/whitening flags
    Object.values(map).flat().forEach(mesh => {
      mesh.visible = true;
      mesh.position.set(0, 0, 0);
      mesh.scale.set(1, 1, 1);
      
      mesh.material.color.copy(mesh.userData.originalColor || COLOR_DEFAULT);
      mesh.material.emissive.setHex(0x000000); 
      mesh.material.emissiveIntensity = 0;
      
      mesh.userData.isBeingRemoved = false;
      if (!whiteningMeshesRef.current.includes(mesh) && !mesh.userData.removalCompleted && !cavityCleaningMeshesRef.current.includes(mesh)) {
        mesh.userData.isWhitening = false;
        mesh.userData.whiteningStartTime = undefined;
        mesh.userData.whiteningCompleted = false;
        mesh.userData.isCavityClean = false;
        mesh.userData.cavityCleanStartTime = undefined;
        mesh.userData.cavityCleanCompleted = false;
      }
    });

    const setupWhitening = (mesh) => {
      if (!whiteningMeshesRef.current.includes(mesh) && !mesh.userData.whiteningCompleted) {
        mesh.userData.whiteningStartColor = COLOR_STAINED_BASE.clone();
        mesh.userData.whiteningEndColor = COLOR_WHITENING_TARGET.clone();
        mesh.userData.isWhitening = true;
        whiteningMeshesRef.current.push(mesh);
      } else if (mesh.userData.whiteningCompleted) {
        mesh.material.color.copy(COLOR_WHITENING_TARGET);
      }
    };
    
    const setupCavityCleaning = (mesh) => {
      if (!cavityCleaningMeshesRef.current.includes(mesh) && !mesh.userData.cavityCleanCompleted) {
        mesh.userData.cavityCleanStartColor = COLOR_CAVITY.clone();
        mesh.userData.isCavityClean = true;
        cavityCleaningMeshesRef.current.push(mesh);
      } else if (mesh.userData.cavityCleanCompleted) {
        mesh.material.color.copy(COLOR_DEFAULT);
      }
    };

    const setVisuals = (mesh, color, pulse = false, pulseColor2 = null) => {
      if (mesh.userData.isWhitening || mesh.userData.isBeingRemoved || mesh.userData.removalCompleted) return; 
      
      mesh.material.color.set(color);
      mesh.material.emissive.set(color);
      mesh.material.emissiveIntensity = pulse ? 0.3 : 0.1;

      if (pulse) {
        mesh.userData.pulseColor1 = color;
        mesh.userData.pulseColor2 = pulseColor2 || new THREE.Color(color).clone().lerp(new THREE.Color(0xffffff), 0.3);
        pulsingMeshesRef.current.push(mesh);
      }
    };

    const allToothIds = new Set([
      ...Object.keys(toothStates),
      ...Object.keys(getOngoingTreatmentForTooth({})).map(String),
      ...selectedTeeth.map(String)
    ]);

    const meshesToAnimateRemoval = [];

    allToothIds.forEach(toothNumStr => {
      const toothNum = parseInt(toothNumStr);
      const meshes = getMeshes(toothNum);
      const state = toothStates[toothNum];
      const record = getOngoingTreatmentForTooth(toothNum);

      meshes.forEach(mesh => {
        // --- LOGIC SWITCH (Whitening and Removal logic updated) ---
        if (viewMode === 'status') {
                if (state === 'missing') {
                    mesh.visible = false;
                } else if (selectedTeeth.includes(toothNum)) {
                    setVisuals(mesh, COLOR_SELECTED_TREAT, true, new THREE.Color(0x7397c5)); 
                } else if (state === 'treated') {
                    setVisuals(mesh, COLOR_TREATED); 
                } else if (state === 'issue') {
                    setVisuals(mesh, COLOR_ISSUE);
                } 
            } else if (viewMode === 'condition') {
                const condition = (record.condition || '').toLowerCase();
                if (condition === 'missing') {
                    mesh.visible = false;
                } else if (condition.includes('decay')) {
                    setVisuals(mesh, COLOR_DECAY, true, new THREE.Color(0xaa0000)); 
                } else if (condition.includes('cavity')) {
                    setVisuals(mesh, COLOR_CAVITY);
                } else if (condition.includes('stained')) {
                    setVisuals(mesh, COLOR_STAINED_BASE);
                } else {
                    setVisuals(mesh, COLOR_DIM);
                }
            } else if (viewMode === 'treatment') {
                const treatment = (record.treatment || '').toLowerCase();
                const isRemovalTreatment = treatment.includes('removal');

                if (state === 'missing') {
                    mesh.visible = false;
                } else if (isRemovalTreatment) {
                    if (mesh.userData.removalCompleted) {
                        mesh.visible = false;
                    } else if (toothRemovalMeshesRef.current.includes(mesh)) {
                        // Mid-removal animation
                    } else {
                        meshesToAnimateRemoval.push(mesh);
                    }
                } else if (treatment.includes('whitening')) {
                    setupWhitening(mesh); // Handles checking if already completed/in progress
                } else if (record.condition && record.condition.toLowerCase().includes('cavity')) {
                    // Cavity cleaning animation - clean cavity teeth
                    setupCavityCleaning(mesh);
                } else if (treatment && treatment !== 'null') {
                    setVisuals(mesh, COLOR_SELECTED_TREAT);
                } else {
                    setVisuals(mesh, COLOR_DIM); 
                }
            }
        });
    });
    
    // Finalize removal animation tracking
    meshesToAnimateRemoval.forEach(mesh => {
        mesh.userData.isBeingRemoved = true;
        mesh.userData.removalStartTime = clockRef.current.getElapsedTime();
        toothRemovalMeshesRef.current.push(mesh);
    });

    // Clean up removal tracking list (for meshes no longer needing removal)
    toothRemovalMeshesRef.current = toothRemovalMeshesRef.current.filter(mesh => {
        const id = mesh.parent.name.match(/(\d{2})/)?.[1];
        const record = getOngoingTreatmentForTooth(parseInt(id));
        const treatment = (record.treatment || '').toLowerCase();
        
        if (treatment.includes('removal') || !mesh.userData.removalCompleted) {
            return true;
        } else {
            return false;
        }
    });

    // Clean up whitening tracking list (for meshes no longer needing whitening)
    whiteningMeshesRef.current = whiteningMeshesRef.current.filter(mesh => {
        const id = mesh.parent.name.match(/(\d{2})/)?.[1];
        const record = getOngoingTreatmentForTooth(parseInt(id));
        const treatment = (record.treatment || '').toLowerCase();
        
        if (treatment.includes('whitening') || !mesh.userData.whiteningCompleted) {
            return true;
        } else {
            // If whitening treatment is gone, reset its completed state so it can be re-whitened later.
            mesh.userData.whiteningCompleted = false;
            return false;
        }
    });

    // Clean up cavity cleaning tracking list
    cavityCleaningMeshesRef.current = cavityCleaningMeshesRef.current.filter(mesh => {
        const id = mesh.parent.name.match(/(\d{2})/)?.[1];
        const record = getOngoingTreatmentForTooth(parseInt(id));
        const condition = (record.condition || '').toLowerCase();
        
        if (condition.includes('cavity') || !mesh.userData.cavityCleanCompleted) {
            return true;
        } else {
            // If cavity condition is gone, reset completed state
            mesh.userData.cavityCleanCompleted = false;
            return false;
        }
    });

  }, [status, toothStates, selectedTeeth, viewMode]);

  return (
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {status === "error" && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red', background: 'rgba(0,0,0,0.5)' }}>
          **ERROR:** Could not load Teeth.obj. Check browser console for network or file errors.
        </div>
      )}
      <div style={{ width: '100%', height: '100%' }} ref={mountRef} />
    </div>
  );
}
