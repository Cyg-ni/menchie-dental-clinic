import React from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

// Paths to external assets
const TEETH_MODEL_PATH = "/models/Teeth.obj"; 
const TEETH_TEXTURE_PATH = "/models/AlysonTeeth.png"; 

// --- ANIMATION CONSTANTS ---
const REMOVAL_DURATION = 2.0; // Time in seconds for the removal animation

// --- DUMMY TREATMENT/CONDITION DATA ---
const getOngoingTreatmentForTooth = (toothNum) => {
    const timelineData = {
        42: { condition: 'stained teeth', treatment: 'teeth whitening' }, 
        41: { condition: 'tooth decay', treatment: 'tooth removal' }, // Tooth to be removed
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

  // --- COLORS ---
  const COLOR_DEFAULT = new THREE.Color(0xffffff);
  const COLOR_SELECTED_TREAT = new THREE.Color(0x2452a2); 
  const COLOR_TREATED = new THREE.Color(0x89c994);
  const COLOR_ISSUE = new THREE.Color(0xd23c3c);
  const COLOR_DECAY = new THREE.Color(0x6b0000);
  const COLOR_CAVITY = new THREE.Color(0x200000);
  const COLOR_STAINED_BASE = new THREE.Color(0xa89000);
  const COLOR_WHITENING_TARGET = new THREE.Color(0xf0ffff);
  const COLOR_DIM = new THREE.Color(0x444444); 
  
  // --- ANIMATION TRACKING ---
  const pulsingMeshesRef = React.useRef([]);
  const whiteningMeshesRef = React.useRef([]);
  // NEW: Ref for tracking teeth currently being removed
  const toothRemovalMeshesRef = React.useRef([]); 

  // --- INITIALIZATION EFFECT (Model and Scene Setup) ---
  React.useEffect(() => {
    // Scene, Camera, Renderer Setup (omitted for brevity)
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
    
    // Load Geometry
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
        // Auto Scale & Center (omitted for brevity)
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

        // 1. STANDARD PULSING ANIMATION
        pulsingMeshesRef.current.forEach(mesh => {
            // ... (pulsing animation logic as before)
            if (!mesh.userData.pulseColor1 || !mesh.userData.pulseColor2) return;
            mesh.material.color.copy(mesh.userData.pulseColor1);
            mesh.material.color.lerp(mesh.userData.pulseColor2, sinePulse * 0.5); 
            mesh.material.emissiveIntensity = 0.3 + sinePulse * 0.2;
        });
        
        // 2. TEETH WHITENING ANIMATION
        const cycleTime = 10;
        const whiteningProgress = (Math.sin((elapsedTime / cycleTime) * Math.PI * 2) + 1) / 2; 
        
        whiteningMeshesRef.current.forEach(mesh => {
            // ... (whitening animation logic as before)
            const startColor = mesh.userData.whiteningStartColor;
            const endColor = mesh.userData.whiteningEndColor;
            mesh.material.color.copy(startColor);
            mesh.material.color.lerp(endColor, whiteningProgress); 
            mesh.material.emissiveIntensity = 0.1 + sinePulse * 0.05;
        });

        // 3. NEW: TEETH REMOVAL ANIMATION (Move up and out)
        toothRemovalMeshesRef.current.forEach(mesh => {
            const startTime = mesh.userData.removalStartTime;
            const progress = Math.min(1, (elapsedTime - startTime) / REMOVAL_DURATION);

            if (progress < 1) {
                // Raise it up (Y+) and slightly forward (Z+)
                // Using its original position as the base offset (since position is relative to model center)
                mesh.position.set(0, progress * 10, progress * 5); 
                // Scale down for a fading effect
                const scale = 1 - progress * 0.5;
                mesh.scale.set(scale, scale, scale);
            } else {
                // Animation complete, hide the mesh permanently
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

  // --- STATE/COLOR UPDATER EFFECT (Updated Logic for Removal) ---
  React.useEffect(() => {
    if (status !== 'ready') return;
    const map = toothMeshMapRef.current;
    
    // 1. Reset all non-permanent animation flags and lists
    pulsingMeshesRef.current = []; 
    whiteningMeshesRef.current = [];
    // IMPORTANT: Do NOT clear toothRemovalMeshesRef.current here,
    // as it holds meshes mid-animation. The logic below will re-add them if needed.

    const getMeshes = (id) => map[String(id)] || [];

    // Reset All Visuals & clear removal flags
    Object.values(map).flat().forEach(mesh => {
        mesh.visible = true;
        // Reset position and scale to original state (important for removal anim reset)
        mesh.position.set(0, 0, 0);
        mesh.scale.set(1, 1, 1);
        
        // Reset colors
        mesh.material.color.copy(mesh.userData.originalColor || COLOR_DEFAULT);
        mesh.material.emissive.setHex(0x000000); 
        mesh.material.emissiveIntensity = 0;
        
        // Reset animation flags, but keep removalCompleted if it was set
        mesh.userData.isWhitening = false;
        mesh.userData.isBeingRemoved = false;
        // mesh.userData.removalStartTime is managed in the removal tracking below
    });

    // Helper functions (setVisuals and setupWhitening, unchanged)
    const setVisuals = (mesh, color, pulse = false, pulseColor2 = null) => {
        if (mesh.userData.isWhitening || mesh.userData.isBeingRemoved) return; 
        
        mesh.material.color.set(color);
        mesh.material.emissive.set(color);
        mesh.material.emissiveIntensity = pulse ? 0.3 : 0.1;

        if (pulse) {
            mesh.userData.pulseColor1 = color;
            mesh.userData.pulseColor2 = pulseColor2 || new THREE.Color(color).clone().lerp(new THREE.Color(0xffffff), 0.3);
            pulsingMeshesRef.current.push(mesh);
        }
    };
    
    const setupWhitening = (mesh) => {
        mesh.userData.whiteningStartColor = COLOR_STAINED_BASE.clone();
        mesh.userData.whiteningEndColor = COLOR_WHITENING_TARGET.clone();
        mesh.userData.isWhitening = true;
        whiteningMeshesRef.current.push(mesh);
    };

    // Collect all relevant tooth IDs
    const allToothIds = new Set([
        ...Object.keys(toothStates),
        ...Object.keys(getOngoingTreatmentForTooth({})).map(String),
        ...selectedTeeth.map(String)
    ]);
    
    // Set for keeping track of meshes that are NOT in a removal animation but SHOULD be
    const meshesToAnimateRemoval = [];

    allToothIds.forEach(id => {
        const toothNum = parseInt(id);
        const state = (toothStates[id] || '').toLowerCase();
        const record = getOngoingTreatmentForTooth(toothNum);
        const meshes = getMeshes(id);
        
        if (meshes.length === 0) return;

        meshes.forEach(mesh => {
            
            // --- LOGIC SWITCH ---
            
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
            } 
            
            else if (viewMode === 'condition') {
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
            } 
            
            else if (viewMode === 'treatment') {
                const treatment = (record.treatment || '').toLowerCase();
                const isRemovalTreatment = treatment.includes('removal');

                if (state === 'missing') {
                    // Permanently missing teeth are hidden instantly
                    mesh.visible = false;
                } else if (isRemovalTreatment) {
                    // Start Removal Animation logic
                    if (mesh.userData.removalCompleted) {
                        mesh.visible = false; // Stay hidden if animation is done
                    } else if (toothRemovalMeshesRef.current.includes(mesh)) {
                        // Already mid-animation, do nothing
                    } else {
                        // Start the animation
                        meshesToAnimateRemoval.push(mesh);
                    }
                } else if (treatment.includes('whitening')) {
                    setupWhitening(mesh);
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

    // Remove any meshes from the removal tracking list that are no longer marked for removal
    // (e.g., if user switches away from 'treatment' mode)
    toothRemovalMeshesRef.current = toothRemovalMeshesRef.current.filter(mesh => {
        const id = mesh.parent.name.match(/(\d{2})/)?.[1];
        const record = getOngoingTreatmentForTooth(parseInt(id));
        const treatment = (record.treatment || '').toLowerCase();
        
        // Keep the mesh in the list only if it's currently marked for removal OR the animation is not complete
        if (treatment.includes('removal') || !mesh.userData.removalCompleted) {
            return true;
        } else {
            // If the mesh is no longer being treated for removal AND the animation is complete, remove it
            return false;
        }
    });

  }, [selectedTeeth, toothStates, status, viewMode]);

  return (
    <div className={`teeth-viewer ${className}`} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {status === "loading" && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', background: 'rgba(0,0,0,0.5)' }}>
          Loading Anatomical Model...
        </div>
      )}
      {status === "error" && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red', background: 'rgba(0,0,0,0.5)' }}>
          **ERROR:** Could not load Teeth.obj. Check browser console for network or file errors.
        </div>
      )}
      <div style={{ width: '100%', height: '100%' }} ref={mountRef} />
    </div>
  );
}