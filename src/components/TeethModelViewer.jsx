import React from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

// Paths to external assets
const TEETH_MODEL_PATH = "/models/Teeth.obj"; 
const TEETH_TEXTURE_PATH = "/models/AlysonTeeth.png"; 
const ADHESIVE_MODEL_PATH = "/models/dental adhesive.obj";
const BRACKET_MODEL_PATH = "/models/brace bracket.obj";
const WIRES_MODEL_PATH = "/models/dental wires.obj";
const RETAINERS_MODEL_PATH = "/models/orthodontic retainers.obj";
const DENTAL_FILLING_PATH = "/models/dental filling.obj";

// --- ANIMATION CONSTANTS ---
const REMOVAL_DURATION = 2.5;
const REMOVAL_DISTANCE = 20; 
const WHITENING_DURATION = 3.0;
const CLEANING_DURATION = 3.0;
const BRACES_STEP_DURATION = 2.0; // Duration for each step of the braces animation
const RETAINER_DURATION = 2.0; // Duration for retainer insertion animation
const FILLING_DURATION = 3.0; // Duration for falling droplets filling

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
    const [modelAssetTick, setModelAssetTick] = React.useState(0);
  const toothMeshMapRef = React.useRef({}); 
  const sceneRef = React.useRef(null);
  const rendererRef = React.useRef(null);
  const clockRef = React.useRef(new THREE.Clock()); 
  const animationFrameIdRef = React.useRef(null);

  // Track previous viewMode to detect changes
  const prevViewModeRef = React.useRef(viewMode);
    const prevSelectedRecordKeyRef = React.useRef("__none__");
  
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
  const COLOR_CROOKED = new THREE.Color(0xdcdcdc); // Light grey/bone color for crooked
  const COLOR_CORRODED = new THREE.Color(0x2c2c2c); // Very dark, almost black for corroded interior
  
  // --- ANIMATION TRACKING ---
  const animationStateRef = React.useRef({
    pulsingMeshes: [],
    whiteningMeshes: [],
    removalMeshes: [],
    cleaningMeshes: [],
    bracesMeshes: [], // Meshes undergoing braces treatment
    retainerMeshes: [], // Meshes undergoing retainer insertion
    fillingMeshes: [], // Meshes undergoing dental filling (droplets)
    completedAnimations: new Set(),
    // Track animation start times
    animationStartTimes: new Map(),
    // Store loaded models for cloning
    cachedModels: {}
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

    const isUpperArchTooth = (mesh) => {
        const toothIdMatch = (mesh?.name || "").match(/(\d{2})/);
        const toothId = toothIdMatch ? parseInt(toothIdMatch[1], 10) : 0;
        return toothId >= 11 && toothId <= 28;
    };

    const keepOnlySelectedArchParts = (object3d, keepUpperArch) => {
        if (!object3d) return;
        object3d.updateMatrixWorld(true);

        const parseToothIdFromName = (name) => {
            const text = (name || "").toString();
            const matches = Array.from(text.matchAll(/(\d{2,3})/g));
            if (!matches.length) return null;
            const lastNumericToken = matches[matches.length - 1][1];
            const twoDigitId = parseInt(lastNumericToken.slice(-2), 10);
            return Number.isNaN(twoDigitId) ? null : twoDigitId;
        };

        const isUpperToothId = (id) => id >= 11 && id <= 28;
        const isLowerToothId = (id) => id >= 31 && id <= 48;

        const rootBox = new THREE.Box3().setFromObject(object3d);
        const rootCenterY = rootBox.getCenter(new THREE.Vector3()).y;
        const splitTolerance = Math.max(0.002, (rootBox.max.y - rootBox.min.y) * 0.05);

        const partsToRemove = [];
        object3d.traverse(child => {
            if (!child.isMesh || !child.geometry) return;

            // Primary rule: if mesh name carries tooth numbering (e.g. .038/.048),
            // classify by tooth id so 38/48 are always lower-arch parts.
            const childToothId = parseToothIdFromName(child.name);
            if (childToothId !== null) {
                const keepByToothId = keepUpperArch ? isUpperToothId(childToothId) : isLowerToothId(childToothId);
                if (!keepByToothId) {
                    partsToRemove.push(child);
                }
                return;
            }

            child.geometry.computeBoundingBox();
            if (!child.geometry.boundingBox) return;

            const localCenter = child.geometry.boundingBox.getCenter(new THREE.Vector3());
            const worldCenter = localCenter.clone().applyMatrix4(child.matrixWorld);
            const yDelta = worldCenter.y - rootCenterY;
            const keepThisPart = keepUpperArch
                // For upper arch: remove only parts that are clearly lower.
                ? yDelta >= -splitTolerance
                // For lower arch: remove only parts that are clearly upper.
                : yDelta <= splitTolerance;

            // Keep near-boundary parts to avoid clipping edge/end teeth geometry.
            if (!keepThisPart) {
                partsToRemove.push(child);
            }
        });

        partsToRemove.forEach(part => {
            if (part.parent) part.parent.remove(part);
        });
    };

    const validPermanentToothId = (idNum) =>
        (idNum >= 11 && idNum <= 28) || (idNum >= 31 && idNum <= 48);

    const parsePermanentToothIdFromName = (name) => {
        const text = (name || '').toString();
        const matches = Array.from(text.matchAll(/(\d{2,3})/g));
        for (let i = matches.length - 1; i >= 0; i--) {
            const token = matches[i][1];
            const id = parseInt(token.slice(-2), 10);
            if (validPermanentToothId(id)) return id;
        }
        return null;
    };

    const getToothIdFromMeshNode = (meshNode) => {
        let current = meshNode;
        while (current) {
            const id = parsePermanentToothIdFromName(current.name);
            if (id !== null) return id;
            current = current.parent;
        }
        return null;
    };

    const keepOnlyTargetToothParts = (object3d, toothId) => {
        if (!object3d || !toothId) return;

        const removable = [];
        let foundTaggedToothParts = 0;

        object3d.traverse(child => {
            if (!child.isMesh) return;
            const childToothId = parsePermanentToothIdFromName(child.name);
            if (childToothId === null) return;

            foundTaggedToothParts += 1;
            if (childToothId !== toothId) {
                removable.push(child);
            }
        });

        // Only prune when the model actually contains tooth-tagged parts.
        if (foundTaggedToothParts > 0) {
            removable.forEach(part => {
                if (part.parent) part.parent.remove(part);
            });
        }
    };

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

    // Update braces animations
    state.bracesMeshes.forEach((mesh, index) => {
        // Missing teeth must never receive adhesive/brackets/wires.
        if (mesh.userData.isMissing) {
            clearBraceParts(mesh);
            mesh.userData.bracesStartTime = undefined;
            mesh.userData.bracesCompleted = false;
            state.bracesMeshes.splice(index, 1);
            return;
        }

        if (!mesh.userData.bracesStartTime) {
            mesh.userData.bracesStartTime = elapsedTime;
            mesh.userData.originalRotationXVal = mesh.rotation.x;
            mesh.userData.originalRotationZVal = mesh.rotation.z;
        }

        const startTime = mesh.userData.bracesStartTime;
        const totalDuration = BRACES_STEP_DURATION * 3;
        const progress = Math.min(1, (elapsedTime - startTime) / totalDuration);

        // --- STEP 1: DENTAL ADHESIVE ---
        if (progress > 0 && !mesh.userData.adhesiveAdded && state.cachedModels.adhesive) {
            const adhesive = state.cachedModels.adhesive.clone();
            keepOnlySelectedArchParts(adhesive, isUpperArchTooth(mesh));
            keepOnlyTargetToothParts(adhesive, getToothIdFromMeshNode(mesh));
            // Since mesh center is inside the tooth, we move it forward in Z to stick to the surface
            // Resetting any global transformation and using local offsets
            adhesive.position.set(0, 0, 0); 
            adhesive.scale.set(1.0, 1.0, 1.0); 
            adhesive.userData.isBracePart = true;
            mesh.add(adhesive); 
            mesh.userData.adhesive = adhesive;
            mesh.userData.adhesiveAdded = true;
            adhesive.traverse(child => { 
                if(child.isMesh) {
                    child.material = new THREE.MeshStandardMaterial({ 
                        color: 0xeeeeee, 
                        transparent: true, 
                        opacity: 0,
                        metalness: 0,
                        roughness: 1
                    }); 
                }
            });
        }
        if (progress > 0 && progress <= 1/3) {
            const stepProgress = Math.min(1, progress * 3);
            if (mesh.userData.adhesive) {
                mesh.userData.adhesive.traverse(child => { 
                    if(child.isMesh) child.material.opacity = stepProgress; 
                });
            }
        }

        // --- STEP 2: BRACE BRACKET ---
        if (progress > 1/3 && !mesh.userData.bracketAdded && state.cachedModels.bracket) {
            const bracket = state.cachedModels.bracket.clone();
            keepOnlySelectedArchParts(bracket, isUpperArchTooth(mesh));
            keepOnlyTargetToothParts(bracket, getToothIdFromMeshNode(mesh));
            // Place on top of adhesive
            bracket.position.set(0, 0, 0); 
            bracket.scale.set(1.0, 1.0, 1.0); 
            bracket.userData.isBracePart = true;
            mesh.add(bracket);
            mesh.userData.bracket = bracket;
            mesh.userData.bracketAdded = true;
            bracket.traverse(child => { 
                if(child.isMesh) {
                    child.material = new THREE.MeshStandardMaterial({ 
                        color: 0xcccccc, 
                        metalness: 0.8, 
                        roughness: 0.2, 
                        transparent: true, 
                        opacity: 0 
                    }); 
                }
            });
        }
        if (progress > 1/3 && progress <= 2/3) {
            const stepProgress = Math.min(1, (progress - 1/3) * 3);
            if (mesh.userData.bracket) {
                mesh.userData.bracket.traverse(child => { 
                    if(child.isMesh) child.material.opacity = stepProgress; 
                });
            }
        }

        // --- STEP 3: DENTAL WIRES AND REALIGNMENT ---
        if (progress > 2/3 && !mesh.userData.wiresAdded && state.cachedModels.wires) {
            const wires = state.cachedModels.wires.clone();
            keepOnlySelectedArchParts(wires, isUpperArchTooth(mesh));
            // Place in center of bracket slot
            wires.position.set(0, 0, 0); 
            wires.scale.set(1.0, 1.0, 1.0); 
            wires.userData.isBracePart = true;
            mesh.add(wires);
            mesh.userData.wires = wires;
            mesh.userData.wiresAdded = true;
            wires.traverse(child => { 
                if(child.isMesh) {
                    child.material = new THREE.MeshStandardMaterial({ 
                        color: 0x888888, 
                        metalness: 0.9, 
                        roughness: 0.1, 
                        transparent: true, 
                        opacity: 0 
                    }); 
                }
            });
        }
        if (progress > 2/3) {
            const stepProgress = Math.min(1, (progress - 2/3) * 3);
            if (mesh.userData.wires) {
                mesh.userData.wires.traverse(child => { 
                    if(child.isMesh) child.material.opacity = stepProgress; 
                });
            }

            // REALIGNMENT (Straightening the crooked tooth)
            const ease = 1 - Math.pow(1 - stepProgress, 3);
            mesh.rotation.z = mesh.userData.originalRotationZVal * (1 - ease);
            mesh.rotation.x = mesh.userData.originalRotationXVal * (1 - ease);

            // Pivot compensation to KEEP tooth in place while rotating
            if (mesh.userData.localCenter) {
                const localP = mesh.userData.localCenter.clone();
                const rotatedP = localP.clone();
                rotatedP.applyAxisAngle(new THREE.Vector3(1, 0, 0), mesh.rotation.x);
                rotatedP.applyAxisAngle(new THREE.Vector3(0, 0, 1), mesh.rotation.z);
                const diff = localP.sub(rotatedP);
                // Important: apply offset to original position to avoid cumulative error
                mesh.position.copy(mesh.userData.originalPosition).add(diff);
            }
        }

        if (progress >= 1) {
            mesh.userData.bracesCompleted = true;
            // Remove from active animation array
            state.bracesMeshes.splice(index, 1);
        }
    });

    // Update retainer animations (arch-wide visual)
    state.retainerMeshes.forEach((mesh, index) => {
        const retainer = mesh.userData.retainer;
        if (!retainer) {
            // Nothing to animate for this tooth
            state.retainerMeshes.splice(index, 1);
            return;
        }

        if (!mesh.userData.retainerStartTime) {
            mesh.userData.retainerStartTime = elapsedTime;
            // Cache start and target positions for smooth interpolation
            const startPos = new THREE.Vector3(0, 0, 2); // slightly forward of the tooth
            const targetPos = new THREE.Vector3(0, 0, 0);  // seated on teeth
            retainer.userData.startPosition = startPos;
            retainer.userData.targetPosition = targetPos;
            retainer.position.copy(startPos);
        }

        const startTime = mesh.userData.retainerStartTime;
        const progress = Math.min(1, (elapsedTime - startTime) / RETAINER_DURATION);

        // Smoother "slide in" using smoothstep easing (soft start + soft stop)
        const easedProgress = progress * progress * (3 - 2 * progress);

        const startPos = retainer.userData.startPosition || new THREE.Vector3(0, 0, 2);
        const targetPos = retainer.userData.targetPosition || new THREE.Vector3(0, 0, 0);
        const currentPos = new THREE.Vector3().lerpVectors(startPos, targetPos, easedProgress);

        // Add a subtle arc for a more natural insertion feel
        currentPos.y += Math.sin(easedProgress * Math.PI) * 0.03;
        retainer.position.copy(currentPos);

        // Fade in with eased timing so opacity matches the smoother movement
        const opacity = easedProgress;
        retainer.traverse(child => {
            if (child.isMesh && child.material) {
                child.material.transparent = true;
                child.material.opacity = opacity;
            }
        });

        if (progress >= 1) {
            mesh.userData.retainerCompleted = true;
            state.retainerMeshes.splice(index, 1);
        }
    });

    // Use constant for duration to make it easier to change
    const FILLING_DURATION = 3.0; // Wait, let's make it 3 seconds total

    // Help determine if a tooth is upper or lower for positioning
    const isUpperTooth = (name) => {
        const idMatch = (name || "").match(/(\d{2})/);
        const id = idMatch ? parseInt(idMatch[1]) : 0;
        return (id >= 11 && id <= 28) || (id >= 51 && id <= 65);
    };

    // Helper for adding filling droplets to animation
    const spawnDroplet = (mesh) => {
        if (state.cachedModels.filling) {
            const drop = state.cachedModels.filling.clone();
            
            // Calculate center of tooth to align drop with the hole
            mesh.geometry.computeBoundingBox();
            const c = new THREE.Vector3();
            mesh.geometry.boundingBox.getCenter(c);
            const { min, max } = mesh.geometry.boundingBox;
            
            const isUpper = isUpperTooth(mesh.name);
            
            // Target Y is the biting surface (where the hole is)
            const targetY = isUpper ? min.y : max.y;
            
            // Start Y is CLOSE to the tooth "inside the mouth"
            // Using 0.8 units offset instead of 4.0 or 5.0
            const startY = isUpper ? targetY - 0.8 : targetY + 0.8;
            
            // Set initial position
            drop.position.set(c.x, startY, c.z); 
            
            // Smaller size for continuous stream
            drop.scale.set(0.12, 0.12, 0.12); 
            drop.userData.isFillingPart = true;
            
            // Ensure material is visible
            drop.traverse(child => {
                if(child.isMesh) {
                    if (child.material) {
                         // Clone to avoid affecting the cached model
                         child.material = child.material.clone();
                    } else {
                         child.material = new THREE.MeshStandardMaterial();
                    }
                    child.material.color.set(0xffffff);
                    child.material.metalness = 0.8;
                    child.material.roughness = 0.2;
                    child.material.emissive.set(0x666666);
                    child.material.emissiveIntensity = 0.4;
                    child.material.transparent = true;
                    child.material.opacity = 1.0;
                    child.visible = true; // FORCE VISIBILITY
                }
            });
            drop.visible = true; // FORCE VISIBILITY ON PARENT

            mesh.add(drop);
            if (!mesh.userData.fillingDrops) mesh.userData.fillingDrops = [];
            
            mesh.userData.fillingDrops.push({
                mesh: drop,
                startTime: clockRef.current.getElapsedTime(),
                startY: startY,
                targetY: targetY,
                landed: false
            });
        }
    };

    // Update filling animations (droplets)
    for (let i = state.fillingMeshes.length - 1; i >= 0; i--) {
        const mesh = state.fillingMeshes[i];
        
        if (!mesh.userData.fillingStartTime) {
            mesh.userData.fillingStartTime = elapsedTime;
            mesh.userData.lastDropTime = 0;
            // Ensure drops array initializes
            mesh.userData.fillingDrops = mesh.userData.fillingDrops || [];
        }

        const startTime = mesh.userData.fillingStartTime;
        const totalProgress = Math.min(1, (elapsedTime - startTime) / FILLING_DURATION);
        const elapsedSinceStart = elapsedTime - startTime;

        // CONTINUOUS STREAM LOGIC
        // Drop frequently (every 0.15s) until 90% completion
        // FORCE SPAWN if no drops exist yet
        if (totalProgress < 0.9) { 
            const shouldSpawn = !mesh.userData.lastDropTime || (elapsedSinceStart - mesh.userData.lastDropTime) > 0.15;
            if (shouldSpawn) {
                spawnDroplet(mesh);
                mesh.userData.lastDropTime = elapsedSinceStart;
            }
        }
        
        // Initial force spawn just in case
        if (elapsedSinceStart > 0 && (!mesh.userData.fillingDrops || mesh.userData.fillingDrops.length === 0)) {
             spawnDroplet(mesh);
             mesh.userData.lastDropTime = elapsedSinceStart;
        }

        // Animate existing drops falling VERTICALLY
        if (mesh.userData.fillingDrops) {
            const DROP_FALL_DURATION = 0.35; // Fast fall for short distance
            
            mesh.userData.fillingDrops.forEach(dropObj => {
                const dropElapsed = elapsedTime - dropObj.startTime;
                
                if (!dropObj.landed) {
                    const dropProgress = Math.min(1, dropElapsed / DROP_FALL_DURATION);
                    // Linear fall is fine for short distance, but ease-in looks heavier
                    const eased = dropProgress * dropProgress;
                    dropObj.mesh.position.y = dropObj.startY + (dropObj.targetY - dropObj.startY) * eased;

                    if (dropProgress >= 1) {
                        dropObj.landed = true;
                        // Flatten significantly on impact
                        dropObj.mesh.scale.set(0.25, 0.02, 0.25); 
                        
                        // Force update matrix to ensure visual update
                        dropObj.mesh.updateMatrix();
                        
                        const isUpper = isUpperTooth(mesh.name);
                        dropObj.mesh.position.y = dropObj.targetY + (isUpper ? -0.005 : 0.005);
                    }
                } else {
                    // Start fading out the landed droplets so they don't accumulate infinitely
                    // This simulates the material fusing into the tooth
                    dropObj.mesh.traverse(c => {
                        if(c.isMesh && c.material) {
                            c.material.transparent = true;
                            c.material.opacity = Math.max(0, c.material.opacity - 0.03);
                            if (c.material.opacity <= 0.05) c.visible = false;
                        }
                    });
                }
            });
        }

        // Smoothly fade out the black hole continuously
        if (mesh.userData.corrosionHole) {
            // Map total progress (0 to 1) to opacity (1 to 0)
            const opacity = Math.max(0, 1 - totalProgress);
            mesh.userData.corrosionHole.material.transparent = true;
            mesh.userData.corrosionHole.material.opacity = opacity;
            
            // Also shrink it
            const scale = Math.max(0.01, 1 - totalProgress);
            mesh.userData.corrosionHole.scale.set(scale, scale * 0.2, scale);
        }

        if (totalProgress >= 1) {
            mesh.userData.fillingCompleted = true;
            state.fillingMeshes.splice(i, 1);
            
            // Clean up: Remove drops and hole
            if (mesh.userData.fillingDrops) {
                mesh.userData.fillingDrops.forEach(d => mesh.remove(d.mesh));
                mesh.userData.fillingDrops = [];
            }
            if (mesh.userData.corrosionHole) {
                mesh.remove(mesh.userData.corrosionHole);
                mesh.userData.corrosionHole = null;
            }
            
            // FINAL STATE: Clean white tooth
            mesh.material.color.set(COLOR_DEFAULT); 
            mesh.material.emissive.set(0x000000);
            console.log("✅ FILLING SEQUENCE FINISHED");
        }
    }
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

        const validPermanentToothId = (idNum) =>
            (idNum >= 11 && idNum <= 18) ||
            (idNum >= 21 && idNum <= 28) ||
            (idNum >= 31 && idNum <= 38) ||
            (idNum >= 41 && idNum <= 48);

        const getToothIdFromNode = (node) => {
            let current = node;
            while (current) {
                const label = (current.name || "").toLowerCase();

                // Prefer explicit tooth object names like "tooth28".
                const toothNamed = label.match(/tooth\s*([1-4][0-9])/);
                if (toothNamed && toothNamed[1]) {
                    const num = parseInt(toothNamed[1], 10);
                    if (validPermanentToothId(num)) return toothNamed[1];
                }

                // Fallback: use the last 2-digit token in the name if it is a valid tooth id.
                const tokens = Array.from(label.matchAll(/(\d{2})/g));
                for (let i = tokens.length - 1; i >= 0; i -= 1) {
                    const candidate = tokens[i][1];
                    const num = parseInt(candidate, 10);
                    if (validPermanentToothId(num)) return candidate;
                }

                current = current.parent;
            }
            return null;
        };

        object.traverse((child) => {
          if (child.isMesh) {
                child.material = sharedMaterial.clone(); 
                child.userData.originalColor = new THREE.Color(0xffffff); 
                child.userData.originalPosition = child.position.clone();
                child.userData.originalScale = child.scale.clone();
                child.userData.originalOpacity = 1;

                // Pre-calculate geometry center for "rotate in place" logic
                child.geometry.computeBoundingBox();
                const localCenter = new THREE.Vector3();
                child.geometry.boundingBox.getCenter(localCenter);
                child.userData.localCenter = localCenter;

                const id = getToothIdFromNode(child);
                if (id) {
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

    // CACHE BRACES MODELS
    objLoader.load(ADHESIVE_MODEL_PATH, (obj) => { 
        obj.scale.set(1.0, 1.0, 1.0); 
        animationStateRef.current.cachedModels.adhesive = obj; 
        setModelAssetTick(v => v + 1);
    });
    objLoader.load(BRACKET_MODEL_PATH, (obj) => { 
        obj.scale.set(1.0, 1.0, 1.0); 
        animationStateRef.current.cachedModels.bracket = obj; 
        setModelAssetTick(v => v + 1);
    });
    objLoader.load(WIRES_MODEL_PATH, (obj) => { 
        obj.scale.set(1.0, 1.0, 1.0); 
        animationStateRef.current.cachedModels.wires = obj; 
        setModelAssetTick(v => v + 1);
    });
    objLoader.load(RETAINERS_MODEL_PATH, (obj) => { 
        obj.scale.set(1.0, 1.0, 1.0); 
        animationStateRef.current.cachedModels.retainer = obj; 
        setModelAssetTick(v => v + 1);
    });
    objLoader.load(DENTAL_FILLING_PATH, (obj) => { 
        obj.scale.set(0.05, 0.05, 0.05); // Assume filling model is normal size, scale it small for droplets
        animationStateRef.current.cachedModels.filling = obj; 
        setModelAssetTick(v => v + 1);
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
        const toothStr = String(toothNum);
        const recordHasTooth = (record) => {
            if (!record) return false;
            if (Array.isArray(record.toothNumbers)) {
                return record.toothNumbers.map(String).includes(toothStr);
            }
            return record.toothNumber !== undefined && String(record.toothNumber) === toothStr;
        };

        const isMissingLabel = (value) => {
            if (value === undefined || value === null) return false;
            return String(value).toLowerCase().includes('missing');
        };

        const isRemovalProcedure = (value) => {
            if (value === undefined || value === null) return false;
            const normalized = String(value).toLowerCase();
            return normalized.includes('removal') || normalized.includes('extract');
        };

        const toToothArray = (value) => {
            if (value === undefined || value === null) return [];
            const raw = Array.isArray(value) ? value : [value];
            return raw
                .map((item) => {
                    if (typeof item === 'object' && item !== null) {
                        return item.toothNumber ?? item.tooth ?? item.number ?? null;
                    }
                    return item;
                })
                .filter((item) => item !== null && item !== undefined && item !== '')
                .map(String);
        };

        const recordMissingToothSet = (record) => {
            if (!record) return new Set();
            const candidates = [
                record.missingToothNumbers,
                record.missingTeeth,
                record.missing_tooth,
                record.missingTooth,
                record.missing,
            ];
            const merged = candidates.flatMap(toToothArray);
            return new Set(merged.map(String));
        };

        const recordMarksToothMissing = (record) => {
            if (!record || !recordHasTooth(record)) return false;
            const explicitMissing = recordMissingToothSet(record);
            const conditionText = String(record.condition || '').toLowerCase();
            const hasVisibleCondition =
                conditionText.includes('cavity') ||
                conditionText.includes('decay') ||
                conditionText.includes('stain') ||
                conditionText.includes('corroded') ||
                conditionText.includes('crooked');
            const hasCompletedRemoval =
                (isRemovalProcedure(record.treatment) || isRemovalProcedure(record.procedure)) &&
                record.done !== false;
            if (explicitMissing.size > 0) {
                return explicitMissing.has(toothStr) || hasCompletedRemoval;
            }
            return isMissingLabel(record.condition) || (!hasVisibleCondition && hasCompletedRemoval);
        };

        const selectedRecordToothSet = new Set(toToothArray(selectedRecord?.toothNumbers ?? selectedRecord?.toothNumber));
        const selectedRecordShowsRemoval =
            selectedRecord &&
            selectedRecordToothSet.has(toothStr) &&
            (isRemovalProcedure(selectedRecord.treatment) || isRemovalProcedure(selectedRecord.procedure));

        if (selectedRecordShowsRemoval) {
            return false;
        }

    // Check toothStates first
        if (isMissingLabel(toothStates[toothNum])) {
      console.log(`Tooth ${toothNum} marked as missing in toothStates`);
      return true;
    }
    
    // Check timeline records for missing condition
    if (timelineRecords && timelineRecords.length > 0) {
            const missingRecords = timelineRecords.filter(record => 
                                recordHasTooth(record) && 
                recordMarksToothMissing(record)
            );
      
      if (missingRecords.length > 0) {
        console.log(`Tooth ${toothNum} found as missing in timeline records:`, missingRecords);
        return true;
      }
    }
    
    // Check selected record for missing condition
        if (selectedRecord && recordHasTooth(selectedRecord)) {
                                                if (recordMarksToothMissing(selectedRecord)) {
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
    
    const previousViewMode = prevViewModeRef.current;
    const selectedRecordKey = selectedRecord
        ? `${selectedRecord.id ?? "no-id"}|${(Array.isArray(selectedRecord.toothNumbers) ? selectedRecord.toothNumbers : (selectedRecord.toothNumber !== undefined ? [selectedRecord.toothNumber] : [])).map(String).sort().join(",")}|${selectedRecord.treatment || selectedRecord.procedure || ""}|${selectedRecord.condition || ""}`
        : "__none__";
    const selectedRecordChanged = prevSelectedRecordKeyRef.current !== selectedRecordKey;

    // Clear all animation lists when viewMode changes
    if (previousViewMode !== viewMode) {
        console.log("View mode changed from", previousViewMode, "to", viewMode);
        state.pulsingMeshes = [];
        state.whiteningMeshes = [];
        state.removalMeshes = [];
        state.cleaningMeshes = [];
        state.completedAnimations.clear();
        state.animationStartTimes.clear();
    }

    // Also clear active animation state when switching to a different treatment record.
    if (selectedRecordChanged) {
        state.pulsingMeshes = [];
        state.whiteningMeshes = [];
        state.removalMeshes = [];
        state.cleaningMeshes = [];
        state.bracesMeshes = [];
        state.retainerMeshes = [];
        state.fillingMeshes = [];
        state.completedAnimations.clear();
        state.animationStartTimes.clear();
    }

    const getMeshes = (id) => map[String(id)] || [];
    const isMeshAssociatedWithTooth = (node, toothId) => {
        let current = node;
        while (current) {
            const label = (current.name || '').toString();
            const matches = Array.from(label.matchAll(/(\d{2,3})/g));
            for (let i = matches.length - 1; i >= 0; i -= 1) {
                const candidate = parseInt(matches[i][1].slice(-2), 10);
                if (((candidate >= 11 && candidate <= 28) || (candidate >= 31 && candidate <= 48)) && candidate === toothId) {
                    return true;
                }
            }
            current = current.parent;
        }
        return false;
    };

    // Reset all teeth to default state first
    Object.values(map).flat().forEach(mesh => {
            mesh.visible = true;
            mesh.position.copy(mesh.userData.originalPosition || new THREE.Vector3(0, 0, 0));
            mesh.scale.copy(mesh.userData.originalScale || new THREE.Vector3(1, 1, 1));
            mesh.rotation.set(0, 0, 0); // Explicitly reset all axes
            mesh.material.opacity = mesh.userData.originalOpacity || 1;
            mesh.material.transparent = false;
            mesh.material.color.set(COLOR_DEFAULT);
            mesh.material.emissive.setHex(0x000000); 
            mesh.material.emissiveIntensity = 0;

            // Keep only currently animating meshes intact during this frame.
            const isAnimatingBrace = state.bracesMeshes.includes(mesh);
            const isAnimatingRetainer = state.retainerMeshes.includes(mesh);
            
            if (!isAnimatingBrace) {
                if (mesh.userData.adhesive) mesh.remove(mesh.userData.adhesive);
                if (mesh.userData.bracket) mesh.remove(mesh.userData.bracket);
                if (mesh.userData.wires) mesh.remove(mesh.userData.wires);

                const toRemove = [];
                mesh.children.forEach(child => {
                    if (child.userData?.isBracePart === true) toRemove.push(child);
                });
                toRemove.forEach(child => mesh.remove(child));

                mesh.userData.adhesive = null;
                mesh.userData.bracket = null;
                mesh.userData.wires = null;
                mesh.userData.adhesiveAdded = false;
                mesh.userData.bracketAdded = false;
                mesh.userData.wiresAdded = false;
            }

            if (!isAnimatingRetainer) {
                if (mesh.userData.retainer) mesh.remove(mesh.userData.retainer);

                const retainerParts = [];
                mesh.children.forEach(child => {
                    if (child.userData?.isRetainerPart === true) retainerParts.push(child);
                });
                retainerParts.forEach(child => mesh.remove(child));

                mesh.userData.retainer = null;
                mesh.userData.retainerAdded = false;
            }
            
            if (viewMode !== 'treatment') {
                mesh.userData.bracesCompleted = false;
                mesh.userData.bracesStartTime = undefined;
                mesh.userData.retainerCompleted = false;
                mesh.userData.retainerStartTime = undefined;
                mesh.userData.removalCompleted = false;
                mesh.userData.removalStartTime = undefined;
                mesh.userData.whiteningCompleted = false;
                mesh.userData.whiteningStartTime = undefined;
                mesh.userData.cleaningCompleted = false;
                mesh.userData.cleaningStartTime = undefined;
            }
    });

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
    
    const setupFilling = (mesh) => {
        if (mesh.userData.isMissing) {
            clearBraceParts(mesh);
            return;
        }

        // Ensure corrosion hole exists visually to start the fade effect
        if (!mesh.userData.corrosionHoleAdded) {
            setupCorrosionHole(mesh);
        }
        
        // Prepare the hole material for fading
        if (mesh.userData.corrosionHole) {
             const mat = mesh.userData.corrosionHole.material;
             mat.transparent = true;
             mat.opacity = 1;
        }

        if (!state.fillingMeshes.includes(mesh) && !mesh.userData.fillingCompleted) {
            console.log("🦷 SETTING UP FILLING ANIMATION");
            state.fillingMeshes.push(mesh);
            mesh.userData.fillingStartTime = undefined;
            mesh.userData.fillingCompleted = false;
            mesh.userData.fillingDrops = []; 
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

    const setupBraces = (mesh) => {
        if (mesh.userData.isMissing) {
            clearBraceParts(mesh);
            return;
        }

        if (!state.bracesMeshes.includes(mesh) && !mesh.userData.bracesCompleted) {
            console.log("🦷 SETTING UP BRACES ANIMATION");
            mesh.userData.bracesStartTime = undefined;
            mesh.userData.bracesCompleted = false;
            mesh.userData.adhesiveAdded = false;
            mesh.userData.bracketAdded = false;
            mesh.userData.wiresAdded = false;
            
            // CLEAN FIRST (Remove any old props if they still exist)
            if (mesh.userData.adhesive) mesh.remove(mesh.userData.adhesive);
            if (mesh.userData.bracket) mesh.remove(mesh.userData.bracket);
            if (mesh.userData.wires) mesh.remove(mesh.userData.wires);
            
            // Deep clean for any orphan parts
            const toRemove = [];
            mesh.children.forEach(child => {
                if (child.userData?.isBracePart === true) toRemove.push(child);
            });
            toRemove.forEach(child => mesh.remove(child));

            mesh.userData.adhesive = null; 
            mesh.userData.bracket = null; 
            mesh.userData.wires = null;
            
            if (!state.bracesMeshes.includes(mesh)) {
                state.bracesMeshes.push(mesh);
            }
        }
    };

    const setupRetainers = (mesh) => {
        if (mesh.userData.isMissing) {
            clearBraceParts(mesh);
            return;
        }

        if (!mesh.userData.retainerAdded && state.cachedModels.retainer) {
            console.log("🦷 SETTING UP RETAINERS VISUAL");
            const retainer = state.cachedModels.retainer.clone();

            // Keep only the selected arch from the full retainer OBJ (top or bottom)
            const toothIdMatch = (mesh.name || "").match(/(\d{2})/);
            const toothId = toothIdMatch ? parseInt(toothIdMatch[1], 10) : 0;
            const keepUpperArch = toothId >= 11 && toothId <= 28;

            // Compute reference center Y of the whole retainer object
            const rootBox = new THREE.Box3().setFromObject(retainer);
            const rootCenterY = rootBox.getCenter(new THREE.Vector3()).y;

            // Remove meshes belonging to the opposite arch
            const partsToRemove = [];
            retainer.traverse(child => {
                if (!child.isMesh || !child.geometry) return;

                child.geometry.computeBoundingBox();
                if (!child.geometry.boundingBox) return;

                const localCenter = child.geometry.boundingBox.getCenter(new THREE.Vector3());
                const worldCenter = localCenter.clone().applyMatrix4(child.matrixWorld);
                const isChildUpper = worldCenter.y >= rootCenterY;

                if ((keepUpperArch && !isChildUpper) || (!keepUpperArch && isChildUpper)) {
                    partsToRemove.push(child);
                }
            });

            partsToRemove.forEach(part => {
                if (part.parent) part.parent.remove(part);
            });

            // Start from an offset position and animate in
            retainer.position.set(0, 0, 2);
            retainer.scale.set(1.0, 1.0, 1.0);
            retainer.userData.isRetainerPart = true;
            mesh.add(retainer);
            mesh.userData.retainer = retainer;
            mesh.userData.retainerAdded = true;
            mesh.userData.retainerStartTime = undefined;
            mesh.userData.retainerCompleted = false;

            if (!state.retainerMeshes.includes(mesh)) {
                state.retainerMeshes.push(mesh);
            }
            
            retainer.traverse(child => {
                if (child.isMesh) {
                    child.material = new THREE.MeshStandardMaterial({
                        color: 0xcccccc,
                        metalness: 0.8,
                        roughness: 0.2,
                        transparent: true,
                        opacity: 0
                    });
                }
            });
        }
    };

    const setupCorrosionHole = (mesh) => {
        if (!mesh.userData.corrosionHoleAdded) {
            console.log("🦷 SETTING UP CORROSION HOLE for", mesh.name);
            
            // Compute bounding box to find the surface
            mesh.geometry.computeBoundingBox();
            const { min, max } = mesh.geometry.boundingBox;
            const c = new THREE.Vector3();
            mesh.geometry.boundingBox.getCenter(c);

            // Determine orientation based on position in arch (Radial logic)
            // If the tooth acts as a "Side" tooth, place on the outer X face.
            // If "Front", place on outer Z face.
            
            const holePos = new THREE.Vector3(c.x, c.y, c.z);
            let rotationY = 0;

            // Heuristic for Arch Position:
            // Abs(X) > Abs(Z) implies side teeth (Molars/Premolars)
            // Abs(Z) > Abs(X) + threshold? Usually front teeth are around X=0, Z=Front.
            
            // Note: We want "Buccal" (Cheek) surface.
            
            // NEW LOGIC: Place on the Occlusal Surface (Top/Biting surface) in the Center
            const match = (mesh.name || "").match(/(\d{2})/);
            const id = match ? parseInt(match[1]) : 0;
            const isUpper = (id >= 11 && id <= 28) || (id >= 51 && id <= 65);

            // Use a TINY sphere radius
            const holeGeometry = new THREE.SphereGeometry(0.004, 16, 16); 
            holeGeometry.scale(1, 0.2, 1); // Flatten vertically

            const holeMaterial = new THREE.MeshStandardMaterial({
                color: 0x000000, 
                roughness: 1,
                metalness: 0
            });
            const hole = new THREE.Mesh(holeGeometry, holeMaterial);
            
            // Position on the Occlusal surface (Center X, Center Z)
            // Lower teeth (31-48): Biting surface is at +Y (Max Y)
            // Upper teeth (11-28): Biting surface is at -Y (Min Y)
            
            holePos.x = c.x;
            holePos.z = c.z;

            if (isUpper) {
                 // Upper tooth - Place at bottom (biting surface)
                 // Typically min.y is the tip of the crown for upper teeth
                 holePos.y = min.y + 0.005; 
            } else {
                 // Lower tooth - Place at top (biting surface)
                 holePos.y = max.y - 0.005;
            }
            
            // No rotation needed for sphere, but if we flattened it:
            // It was flattened on Y axis (scale 1, 0.2, 1). This effectively makes it a "pancake" on the XZ plane.
            // This is exactly what we want for top/bottom placement.
            hole.rotation.set(0, 0, 0);

            hole.position.copy(holePos);
            
            hole.userData.isCorrosionPart = true;
            mesh.add(hole);
            mesh.userData.corrosionHole = hole;
            mesh.userData.corrosionHoleAdded = true;
        }
    };

    const clearBraceParts = (mesh) => {
        if (mesh.userData.adhesive) mesh.remove(mesh.userData.adhesive);
        if (mesh.userData.bracket) mesh.remove(mesh.userData.bracket);
        if (mesh.userData.wires) mesh.remove(mesh.userData.wires);
        if (mesh.userData.retainer) mesh.remove(mesh.userData.retainer);
        if (mesh.userData.corrosionHole) mesh.remove(mesh.userData.corrosionHole);
        if (mesh.userData.fillingDrops) {
            mesh.userData.fillingDrops.forEach(d => mesh.remove(d.mesh));
            mesh.userData.fillingDrops = null;
        }

        const toRemove = [];
        mesh.children.forEach(child => {
            if (child.userData?.isBracePart === true || 
                child.userData?.isRetainerPart === true ||
                child.userData?.isCorrosionPart === true ||
                child.userData?.isFillingPart === true) {
                toRemove.push(child);
            }
        });

        const keywordParts = [];
        mesh.traverse(child => {
            if (child === mesh) return;
            const childName = (child.name || '').toLowerCase();
            if (
                childName.includes('adhesive') ||
                childName.includes('bracket') ||
                childName.includes('wire') ||
                childName.includes('retainer')
            ) {
                keywordParts.push(child);
            }
        });

        toRemove.forEach(child => mesh.remove(child));
        keywordParts.forEach(child => {
            if (child.parent) child.parent.remove(child);
        });

        mesh.userData.adhesive = null;
        mesh.userData.bracket = null;
        mesh.userData.wires = null;
        mesh.userData.retainer = null;
        mesh.userData.corrosionHole = null;
        mesh.userData.adhesiveAdded = false;
        mesh.userData.bracketAdded = false;
        mesh.userData.wiresAdded = false;
        mesh.userData.retainerAdded = false;
        mesh.userData.corrosionHoleAdded = false;
        mesh.userData.bracesCompleted = false;
        mesh.userData.bracesStartTime = undefined;
        mesh.userData.retainerStartTime = undefined;
        mesh.userData.retainerCompleted = false;
        mesh.userData.fillingStartTime = undefined;
        mesh.userData.fillingCompleted = false;

        state.bracesMeshes = state.bracesMeshes.filter(m => m !== mesh);
        state.retainerMeshes = state.retainerMeshes.filter(m => m !== mesh);
        state.fillingMeshes = state.fillingMeshes.filter(m => m !== mesh);
    };

    const setVisuals = (mesh, color, pulse = false, pulseColor2 = null) => {
        // Only clear treatment/corrosion parts if we are NOT in treatment or condition mode
        if (viewMode !== 'treatment' && viewMode !== 'condition') {
            // 1. CLEAR EXPLICIT REFS
            if (mesh.userData.adhesive) mesh.remove(mesh.userData.adhesive);
            if (mesh.userData.bracket) mesh.remove(mesh.userData.bracket);
            if (mesh.userData.wires) mesh.remove(mesh.userData.wires);
            if (mesh.userData.retainer) mesh.remove(mesh.userData.retainer);
            if (mesh.userData.corrosionHole) mesh.remove(mesh.userData.corrosionHole);
            
            // 2. SEARCH & DESTROY ANY ORPHAN BRACE/RETAINER/CORROSION PARTS (Deep Clean)
            const toRemove = [];
            mesh.children.forEach(child => {
                if (child.userData?.isBracePart === true || 
                    child.userData?.isRetainerPart === true ||
                    child.userData?.isCorrosionPart === true ||
                    child.userData?.isFillingPart === true) {
                    toRemove.push(child);
                }
            });
            toRemove.forEach(child => {
                console.log("Cleaning up orphan treatment part from", mesh.name || "tooth");
                mesh.remove(child);
            });

            mesh.userData.adhesive = null;
            mesh.userData.bracket = null;
            mesh.userData.wires = null;
            mesh.userData.retainer = null;
            mesh.userData.corrosionHole = null;
            mesh.userData.adhesiveAdded = false;
            mesh.userData.bracketAdded = false;
            mesh.userData.wiresAdded = false;
            mesh.userData.retainerAdded = false;
            mesh.userData.corrosionHoleAdded = false;
            mesh.userData.bracesCompleted = false;
            mesh.userData.bracesStartTime = undefined;
            mesh.userData.retainerStartTime = undefined;
            mesh.userData.retainerCompleted = false;
            mesh.userData.fillingStartTime = undefined;
            mesh.userData.fillingCompleted = false;
        }

        // Logic for cleaning up ONLY treatment parts if we ARE in condition mode
        if (viewMode === 'condition') {
            if (mesh.userData.adhesive) mesh.remove(mesh.userData.adhesive);
            if (mesh.userData.bracket) mesh.remove(mesh.userData.bracket);
            if (mesh.userData.wires) mesh.remove(mesh.userData.wires);
            if (mesh.userData.retainer) mesh.remove(mesh.userData.retainer);

            const treatmentParts = [];
            mesh.children.forEach(child => {
                if (child.userData?.isBracePart === true || 
                    child.userData?.isRetainerPart === true) {
                    treatmentParts.push(child);
                }
            });
            treatmentParts.forEach(child => mesh.remove(child));
            
            mesh.userData.adhesiveAdded = false;
            mesh.userData.bracketAdded = false;
            mesh.userData.wiresAdded = false;
            mesh.userData.retainerAdded = false;
        }

        // Don't set visuals if tooth is currently animating
        if (state.whiteningMeshes.includes(mesh) || 
            state.removalMeshes.includes(mesh) || 
            state.cleaningMeshes.includes(mesh) ||
            state.bracesMeshes.includes(mesh) ||
            state.retainerMeshes.includes(mesh) ||
            state.fillingMeshes.includes(mesh)) {
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
        const teethToShow = selectedRecord
            ? (Array.isArray(selectedRecord.toothNumbers)
                    ? selectedRecord.toothNumbers
                    : (selectedRecord.toothNumber !== undefined ? [selectedRecord.toothNumber] : []))
            : [];
        const selectedRecordToothSet = new Set(teethToShow.map(String));
    
    // Prepare a string-based set for selected teeth to avoid type mismatch (string vs number)
    const selectedSet = new Set((selectedTeeth || []).map(String));
    const selectedNonMissingSet = new Set(
        Array.from(selectedSet).filter(id => !isToothMissing(parseInt(id, 10)))
    );
    const upperPermanent = [11,12,13,14,15,16,17,18,21,22,23,24,25,26,27,28];
    const lowerPermanent = [31,32,33,34,35,36,37,38,41,42,43,44,45,46,47,48];

    const hasUpperSelected = Array.from(selectedNonMissingSet).some(id => upperPermanent.includes(parseInt(id, 10)));
    const hasLowerSelected = Array.from(selectedNonMissingSet).some(id => lowerPermanent.includes(parseInt(id, 10)));
    const hasSelectedRecord = Boolean(selectedRecord && teethToShow.length > 0);
    const selectedRecordTreatmentText = (selectedRecord?.treatment || selectedRecord?.procedure || "").toLowerCase();
    const isOrthodonticRowTreatment = selectedRecordTreatmentText.includes('apply dental braces') ||
        selectedRecordTreatmentText.includes('apply retainer') ||
        selectedRecordTreatmentText.includes('orthodontic retainer');

    // GLOBAL BRACES CLEANUP: This MUST run before anything else to ensure unselected arches 
    // are stripped of 3D objects immediately.
    if (viewMode === 'treatment' && isOrthodonticRowTreatment) {
        if (!hasUpperSelected) {
            upperPermanent.forEach(num => {
                getMeshes(num).forEach(mesh => {
                    clearBraceParts(mesh);
                    mesh.userData.bracesCompleted = false;
                    mesh.userData.bracesStartTime = undefined;
                    state.bracesMeshes = state.bracesMeshes.filter(m => m !== mesh);
                    // Force remove children with specific keywords to be safe
                    const toRemove = mesh.children.filter(c => 
                        c.userData?.isBracePart || 
                        c.name.includes("bracket") || 
                        c.name.includes("wire") || 
                        c.name.includes("adhesive")
                    );
                    toRemove.forEach(c => mesh.remove(c));
                });
            });
        }
        if (!hasLowerSelected) {
            lowerPermanent.forEach(num => {
                getMeshes(num).forEach(mesh => {
                    clearBraceParts(mesh);
                    mesh.userData.bracesCompleted = false;
                    mesh.userData.bracesStartTime = undefined;
                    state.bracesMeshes = state.bracesMeshes.filter(m => m !== mesh);
                    const toRemove = mesh.children.filter(c => 
                        c.userData?.isBracePart || 
                        c.name.includes("bracket") || 
                        c.name.includes("wire") || 
                        c.name.includes("adhesive")
                    );
                    toRemove.forEach(c => mesh.remove(c));
                });
            });
        }
    }

    // Get all teeth we need to process
        const baseIds = hasSelectedRecord
                ? [
                        ...selectedTeeth.map(String),
                        ...teethToShow.map(String)
                    ]
                : [
                        ...Object.keys(toothStates),
                        ...selectedTeeth.map(String),
                        ...teethToShow.map(String)
                    ];

    // If in treatment mode, ONLY include the specific arches that have selections.
    // This prevents the code from processing (and thus dimming/blackening) teeth in an arch
    // that the user isn't currently interested in.
    if (viewMode === 'treatment' && isOrthodonticRowTreatment) {
        if (hasUpperSelected) {
            baseIds.push(...upperPermanent.map(String));
        } else {
            // EXPLICITLY filter out upper teeth from processing if no selection
            upperPermanent.forEach(id => {
                const meshes = getMeshes(id);
                meshes.forEach(m => clearBraceParts(m));
            });
        }
        if (hasLowerSelected) {
            baseIds.push(...lowerPermanent.map(String));
        } else {
            // EXPLICITLY filter out lower teeth from processing if no selection
            lowerPermanent.forEach(id => {
                const meshes = getMeshes(id);
                meshes.forEach(m => clearBraceParts(m));
            });
        }
    }

    const allToothIds = new Set(baseIds);

    // GLOBAL ANIMATION PROTECTOR: 
    // If an arch has NO selections, we must clear it from the active animation arrays immediately.
    if (viewMode === 'treatment' && isOrthodonticRowTreatment) {
        const selectedNums = Array.from(selectedSet).map(Number);
        if (!hasUpperSelected) {
            state.bracesMeshes = state.bracesMeshes.filter(m => {
                const idMatch = (m.name || "").match(/(\d{2})/);
                const id = idMatch ? parseInt(idMatch[1]) : null;
                return !id || !upperPermanent.includes(id);
            });
        }
        if (!hasLowerSelected) {
            state.bracesMeshes = state.bracesMeshes.filter(m => {
                const idMatch = (m.name || "").match(/(\d{2})/);
                const id = idMatch ? parseInt(idMatch[1]) : null;
                return !id || !lowerPermanent.includes(id);
            });
        }
    }

    // GLOBAL BRACES CLEANUP: Remove braces from unselected arches to prevent them from sticking
    // on unhighlighted rows (since unselected teeth aren't otherwise processed in the loop).
    if (viewMode === 'treatment' && isOrthodonticRowTreatment) {
        if (!hasUpperSelected) {
            upperPermanent.forEach(toothNum => {
                const meshes = getMeshes(toothNum);
                meshes.forEach(mesh => {
                    clearBraceParts(mesh);
                    // EXTREME CLEANUP: Manually scan and remove any leftover brace parts
                    const toRemove = [];
                    mesh.children.forEach(child => {
                        if (child.userData?.isBracePart === true) toRemove.push(child);
                    });
                    toRemove.forEach(child => mesh.remove(child));
                });
            });
        }
        if (!hasLowerSelected) {
            lowerPermanent.forEach(toothNum => {
                const meshes = getMeshes(toothNum);
                meshes.forEach(mesh => {
                    clearBraceParts(mesh);
                    const toRemove = [];
                    mesh.children.forEach(child => {
                        if (child.userData?.isBracePart === true) toRemove.push(child);
                    });
                    toRemove.forEach(child => mesh.remove(child));
                });
            });
        }

        // NEW: Cleanup for INDIVIDUAL MISSING teeth within an active arch
        allToothIds.forEach(toothNumStr => {
            const num = parseInt(toothNumStr);
            if (isToothMissing(num)) {
                getMeshes(num).forEach(mesh => {
                    clearBraceParts(mesh);
                    const toRemove = [];
                    mesh.children.forEach(c => { if(c.userData?.isBracePart) toRemove.push(c); });
                    toRemove.forEach(c => mesh.remove(c));
                    mesh.userData.bracesCompleted = false;
                    mesh.userData.bracesStartTime = undefined;
                    state.bracesMeshes = state.bracesMeshes.filter(bm => bm !== mesh);
                });
            }
        });
    }

    // For non-orthodontic treatments, ensure no row-level braces/retainer visuals leak in.
    if (viewMode === 'treatment' && !isOrthodonticRowTreatment) {
        Object.values(map).flat().forEach(mesh => {
            clearBraceParts(mesh);
            mesh.userData.bracesCompleted = false;
            mesh.userData.bracesStartTime = undefined;
            mesh.userData.retainerCompleted = false;
            mesh.userData.retainerStartTime = undefined;
        });
        state.bracesMeshes = [];
        state.retainerMeshes = [];
    }

    // --- VIEWMODE RESET LOGIC ---
    // If viewMode changed from 'treatment' to something else, CLEAN UP braces
    if (previousViewMode === 'treatment' && viewMode !== 'treatment') {
        console.log("🔄 VIEWMODE CHANGED: Cleaning up treatment visual effects...");
        // Clear animation arrays
        state.bracesMeshes = [];
        state.whiteningMeshes = [];
        state.cleaningMeshes = [];
        state.removalMeshes = [];
        
        // Remove 3D objects from ALL teeth meshes
        Object.values(toothMeshMapRef.current).forEach(meshes => {
            if (Array.isArray(meshes)) {
                meshes.forEach(mesh => {
                    // Reset animation state
                    mesh.userData.bracesStartTime = undefined;
                    mesh.userData.bracesCompleted = false;
                    mesh.userData.adhesiveAdded = false;
                    mesh.userData.bracketAdded = false;
                    mesh.userData.wiresAdded = false;
                    mesh.userData.whiteningStartTime = undefined;
                    mesh.userData.cleaningStartTime = undefined;
                    mesh.userData.removalStartTime = undefined;
                    mesh.userData.removalCompleted = false;
                    mesh.userData.whiteningCompleted = false;
                    mesh.userData.cleaningCompleted = false;

                    // Remove children (braces objects)
                    if (mesh.userData.adhesive) mesh.remove(mesh.userData.adhesive);
                    if (mesh.userData.bracket) mesh.remove(mesh.userData.bracket);
                    if (mesh.userData.wires) mesh.remove(mesh.userData.wires);
                    
                    mesh.userData.adhesive = null;
                    mesh.userData.bracket = null;
                    mesh.userData.wires = null;

                    // Reset transformation if it was crooked/straightened
                    mesh.rotation.set(0, 0, 0);
                    if (mesh.userData.originalPosition) {
                        mesh.position.copy(mesh.userData.originalPosition);
                    }
                    mesh.scale.set(1, 1, 1);
                    mesh.visible = true;
                    if (mesh.material) {
                        mesh.material.opacity = 1;
                        mesh.material.transparent = false;
                    }
                });
            }
        });
    }

    // Always restart braces animation when entering treatment mode
    if (previousViewMode !== 'treatment' && viewMode === 'treatment') {
        state.bracesMeshes = []; // Reset list so they can be re-added
        Object.values(toothMeshMapRef.current).forEach(meshes => {
            if (Array.isArray(meshes)) {
                meshes.forEach(mesh => {
                    mesh.userData.bracesCompleted = false;
                    mesh.userData.bracesStartTime = undefined;
                });
            }
        });
    }

    // Update the ref for the next render
    prevViewModeRef.current = viewMode;
    prevSelectedRecordKeyRef.current = selectedRecordKey;

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
            console.log(`🚫 Tooth ${toothNum} is marked as MISSING - hiding in ${viewMode} view and cleaning braces`);
            const meshesToHide = new Set(meshes);
            if (sceneRef.current) {
                sceneRef.current.traverse((node) => {
                    if (node.isMesh && isMeshAssociatedWithTooth(node, toothNum)) {
                        meshesToHide.add(node);
                    }
                });
            }

            meshesToHide.forEach(mesh => {
                mesh.userData.isMissing = true;
                mesh.visible = false;
                clearBraceParts(mesh);

                // Scrub from all active animation lists
                state.pulsingMeshes = state.pulsingMeshes.filter(m => m !== mesh);
                state.whiteningMeshes = state.whiteningMeshes.filter(m => m !== mesh);
                state.removalMeshes = state.removalMeshes.filter(m => m !== mesh);
                state.cleaningMeshes = state.cleaningMeshes.filter(m => m !== mesh);
                state.bracesMeshes = state.bracesMeshes.filter(m => m !== mesh);
                state.retainerMeshes = state.retainerMeshes.filter(m => m !== mesh);
                state.fillingMeshes = state.fillingMeshes.filter(m => m !== mesh);
            });
            return;
        }
        
        // Determine if this tooth is in the selected record
        const isInSelectedRecord = selectedRecordToothSet.has(String(toothNum));

        meshes.forEach(mesh => {
            mesh.userData.isMissing = isMissing;
            if (viewMode === 'status') {
                mesh.visible = true;

                if (selectedSet.has(String(toothNum))) {
                    console.log(`Highlighting tooth ${toothNum} in status view (selected in odontogram)`);
                    setVisuals(mesh, COLOR_SELECTED_TREAT, true, new THREE.Color(0x7397c5));
                    return;
                }

                if (hasSelectedRecord && !isInSelectedRecord) {
                    setVisuals(mesh, COLOR_DEFAULT);
                } else if (toothState === 'treated') {
                    setVisuals(mesh, COLOR_TREATED);
                } else if (toothState === 'issue') {
                    setVisuals(mesh, COLOR_ISSUE);
                } else {
                    setVisuals(mesh, COLOR_DEFAULT);
                }
            } else if (viewMode === 'condition') {
                console.log(`=== CONDITION VIEW - Tooth ${toothNum} ===`);
                mesh.visible = true;

                if (isMissing) {
                    mesh.visible = false;
                    return;
                }
                
                // Find condition from any source. Prefer selectedRecord, then timelineRecords, then toothStates.
                let actualCondition = '';

                // If a defaultCondition is provided by the parent, prefer that for the selected record.
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
                if (!actualCondition && !hasSelectedRecord && timelineRecords && timelineRecords.length > 0) {
                    const timelineRecord = timelineRecords.find(record => {
                        const hasTooth = Array.isArray(record.toothNumbers)
                            ? record.toothNumbers.map(String).includes(String(toothNum))
                            : String(record.toothNumber) === String(toothNum);
                        return hasTooth && record.condition;
                    });
                    if (timelineRecord) {
                        actualCondition = timelineRecord.condition.toLowerCase().trim();
                        console.log(`Found condition in timelineRecords: "${actualCondition}"`);
                    }
                }
                // Finally, check toothStates as fallback (non-missing)
                if (!actualCondition && !hasSelectedRecord && toothState && toothState !== 'healthy') {
                    actualCondition = toothState.toLowerCase().trim();
                    console.log(`Found condition in toothStates: "${actualCondition}"`);
                }
                
                console.log(`Final condition for tooth ${toothNum}: "${actualCondition}"`);
                
                // Apply correct color based on condition
                if (actualCondition.includes('stained')) {
                    setVisuals(mesh, COLOR_STAINED_BASE);
                    mesh.rotation.z = 0; // Ensure no tilt for other conditions
                    console.log(`Setting tooth ${toothNum} as stained (yellow)`);
                } else if (actualCondition.includes('corroded')) {
                    setVisuals(mesh, COLOR_DEFAULT); // Keep the tooth white/normal
                    setupCorrosionHole(mesh); // Add the small "hole" in the middle
                    mesh.rotation.z = 0;
                    console.log(`Setting tooth ${toothNum} as corroded (small hole)`);
                } else if (actualCondition.includes('decay')) {
                    setVisuals(mesh, COLOR_DECAY);
                    mesh.rotation.z = 0; // Ensure no tilt for other conditions
                    console.log(`Setting tooth ${toothNum} as decay (dark red)`);
                } else if (actualCondition.includes('cavity')) {
                    setVisuals(mesh, COLOR_CAVITY);
                    mesh.rotation.z = 0; // Ensure no tilt for other conditions
                    console.log(`Setting tooth ${toothNum} as cavity (brown)`);
                } else if (actualCondition.includes('crooked')) {
                    setVisuals(mesh, COLOR_CROOKED);
                    console.log(`Setting tooth ${toothNum} as crooked (light color)`);
                    
                    if (selectedSet.has(String(toothNum)) && mesh.userData.localCenter) {
                        console.log(`Applying "in-place" tilt for crooked tooth ${toothNum}`);
                        
                        // Varied angles based on tooth ID for more "crooked" realism.
                        const deterministicShift = (parseInt(toothNum) % 10) * 0.01;
                        const zAngle = 0.14 + deterministicShift; 
                        const xAngle = 0.08 - deterministicShift; 
                        
                        mesh.rotation.z = zAngle;
                        mesh.rotation.x = xAngle;
                        
                        // Compensation logic to keep the tooth at its gum position
                        const localP = mesh.userData.localCenter.clone();
                        
                        // Apply rotation to center point (matching object rotation order)
                        const rotatedP = localP.clone();
                        rotatedP.applyAxisAngle(new THREE.Vector3(1, 0, 0), xAngle);
                        rotatedP.applyAxisAngle(new THREE.Vector3(0, 0, 1), zAngle);
                        
                        // Subtract the change to cancel the translation component of the "orbit"
                        const diff = localP.sub(rotatedP);
                        mesh.position.add(diff);
                    } else {
                        mesh.rotation.z = 0;
                        mesh.rotation.x = 0;
                        mesh.rotation.y = 0;
                    }
                } else {
                    setVisuals(mesh, hasSelectedRecord ? COLOR_DEFAULT : COLOR_DIM);
                    mesh.rotation.z = 0; // Ensure no tilt for other conditions
                    mesh.rotation.x = 0;
                    mesh.rotation.y = 0;
                    console.log(`Setting tooth ${toothNum} as dim (no specific condition)`);
                }
                
            } else if (viewMode === 'treatment') {
                console.log(`=== TREATMENT VIEW - Tooth ${toothNum} ===`);
                
                // Check if tooth is selected (highlighted in odontogram)
                const isToothSelected = selectedSet.has(String(toothNum)) && !isMissing;
                console.log(`Tooth ${toothNum} is in selectedTeeth: ${isToothSelected}`);

                // --- SPECIAL BRACES LOGIC: Apply to entire row if any tooth in that row is selected for braces ---
                let rowTreatment = null;

                const isUpper = upperPermanent.includes(toothNum);
                const isLower = lowerPermanent.includes(toothNum);

                // --- BRACES ROW PROTECTION ---
                // If this is an upper tooth but NO upper teeth are highlighted in the odontogram,
                // we force-clear any brace parts and prevent the treatment logic from running.
                if (isUpper && !hasUpperSelected) {
                    clearBraceParts(mesh);
                    // Force complete removal of all brace visual children
                    const braceParts = mesh.children.filter(c => c.userData?.isBracePart);
                    braceParts.forEach(c => mesh.remove(c));
                    
                    // Scrub from active animation arrays
                    state.bracesMeshes = state.bracesMeshes.filter(m => m !== mesh);
                    mesh.userData.bracesStartTime = undefined;
                    mesh.userData.bracesCompleted = false;

                    // Continue with normal non-treatment visuals
                    if (toothState === 'treated') setVisuals(mesh, COLOR_TREATED);
                    else if (toothState === 'issue') setVisuals(mesh, COLOR_ISSUE);
                    else setVisuals(mesh, hasSelectedRecord ? COLOR_DEFAULT : COLOR_DIM);
                    return;
                }
                
                // If this is a lower tooth but NO lower teeth are highlighted, do the same.
                if (isLower && !hasLowerSelected) {
                    clearBraceParts(mesh);
                    
                    // Scrub from active animation arrays
                    state.bracesMeshes = state.bracesMeshes.filter(m => m !== mesh);
                    mesh.userData.bracesStartTime = undefined;
                    mesh.userData.bracesCompleted = false;

                    if (toothState === 'treated') setVisuals(mesh, COLOR_TREATED);
                    else if (toothState === 'issue') setVisuals(mesh, COLOR_ISSUE);
                    else setVisuals(mesh, hasSelectedRecord ? COLOR_DEFAULT : COLOR_DIM);
                    return;
                }

                // --- SPECIAL BRACES LOGIC: Apply to entire row if any tooth in that row is selected for braces ---
                selectedNonMissingSet.forEach(selId => {
                    const selNum = parseInt(selId);
                    const selIsUpper = upperPermanent.includes(selNum);
                    const selIsLower = lowerPermanent.includes(selNum);
                    
                    // Rule: Only apply row logic if we are checking the same dental arch (upper or lower)
                    if ((isUpper && selIsUpper) || (isLower && selIsLower)) {
                        // Check if this selected tooth has braces in props
                        let t = null;
                        if (Array.isArray(toothTreatments)) {
                            const found = toothTreatments.find(obj => obj?.toothNumber === selNum);
                            t = found?.treatment;
                        } else {
                            t = toothTreatments[selNum];
                        }
                        if (!t && selectedRecordToothSet.has(String(selNum))) t = selectedRecord?.treatment;
                        if (!t) {
                            // Only check defaultTreatment if the tooth is EXPLICITLY selected in the odontogram
                            const isSelToothInSet = selectedNonMissingSet.has(String(selNum));
                            if (isSelToothInSet && defaultTreatment) {
                                t = defaultTreatment;
                            }
                        }

                        if (t && t.toLowerCase().includes('apply dental braces')) {
                            // Row-level braces: activate the whole selected arch.
                            rowTreatment = 'apply dental braces';
                        }
                        if (t && (t.toLowerCase().includes('apply retainer') || t.toLowerCase().includes('orthodontic retainer'))) {
                            rowTreatment = 'apply retainer';
                        }
                    }
                });

                // We show animations if:
                // 1. The tooth itself is selected (highlighted)
                // 2. OR it's part of a row that has braces or retainer treatment
                if (isToothSelected || (rowTreatment === 'apply dental braces') || (rowTreatment === 'apply retainer')) {
                    console.log(`🔄 Tooth ${toothNum} is active for treatment view (selected or row-treatment)`);
                    
                    // Get treatment AND condition for this specific tooth
                    let treatment = rowTreatment || null;
                    let condition = null;
                    
                    // If not already set by row logic, get treatment normally
                    if (!treatment) {
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
                    }
                    
                    // 2. If no treatment from toothTreatments, check selectedRecord
                    if (!treatment && selectedRecord && selectedRecord.treatment) {
                        if (selectedRecordToothSet.has(String(toothNum))) {
                            treatment = selectedRecord.treatment;
                            console.log(`📋 Found treatment in selectedRecord: "${treatment}"`);
                        }
                    }

                    // 3. If still no treatment, use the parent's defaultTreatment (e.g. selected in side-panel)
                    if (!treatment && defaultTreatment && isToothSelected) {
                        treatment = defaultTreatment;
                        console.log(`📌 Using defaultTreatment prop (because tooth is selected): "${treatment}"`);
                    }
                    
                    // Get condition for this tooth
                    if (selectedRecord?.condition) {
                        condition = selectedRecord.condition.toLowerCase().trim();
                        console.log(`Found condition in selectedRecord: "${condition}"`);
                    } else if (toothState && toothState !== 'healthy') {
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
                            console.log(`Default treatment for stained teeth: "${treatment}"`);
                        }
                        else if (condition.includes('cavity') || condition.includes('tooth cavity')) {
                            treatment = 'dental filling';
                            console.log(`Default treatment for cavity: "${treatment}"`);
                        }
                        else if (condition.includes('decay') || condition.includes('tooth decay')) {
                            treatment = 'tooth removal';
                            console.log(`Default treatment for decay: "${treatment}"`);
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
                        
                        console.log(`FINAL: Condition="${normalizedCondition}", Treatment="${normalizedTreatment}"`);

                        // If the staff explicitly selected a removal/extraction as the current procedure,
                        // prioritize the removal animation regardless of the recorded condition (unless missing).
                        if (normalizedTreatment.includes('remov') || normalizedTreatment.includes('extract')) {
                            console.log(`Staff-selected removal detected → FORCE REMOVAL ANIMATION`);
                            setupRemoval(mesh);
                        }
                        // Dental Filling animation
                        else if (normalizedTreatment.includes('filling') || normalizedTreatment.includes('dental filling')) {
                            console.log(`Treatment: filling → FILLING ANIMATION`);
                            // Ensure a hole exists before filling starts
                            if (!mesh.userData.corrosionHoleAdded) {
                                setupCorrosionHole(mesh);
                            }
                            setupFilling(mesh);
                        }
                        // Otherwise, run condition+treatment rules
                        else if ((normalizedCondition.includes('tooth cavity') || normalizedCondition.includes('cavity')) &&
                            (normalizedTreatment.includes('removal') || normalizedTreatment.includes('extraction'))) {
                            console.log(`Condition: tooth cavity, Treatment: removal → REMOVAL ANIMATION`);
                            setupRemoval(mesh);
                        }
                        else if ((normalizedCondition.includes('stained teeth') || normalizedCondition.includes('stained')) &&
                                (normalizedTreatment.includes('removal') || normalizedTreatment.includes('extraction'))) {
                            console.log(`Condition: stained teeth, Treatment: removal → REMOVAL ANIMATION`);
                            setupRemoval(mesh);
                        }
                        else if ((normalizedCondition.includes('tooth decay') || normalizedCondition.includes('decay')) &&
                                (normalizedTreatment.includes('removal') || normalizedTreatment.includes('extraction'))) {
                            console.log(`Condition: tooth decay, Treatment: removal → REMOVAL ANIMATION`);
                            setupRemoval(mesh);
                        }
                        // Whitening animation conditions
                        else if ((normalizedCondition.includes('tooth cavity') || normalizedCondition.includes('cavity')) &&
                                (normalizedTreatment.includes('whitening') || normalizedTreatment.includes('bleaching'))) {
                            console.log(`Condition: tooth cavity, Treatment: whitening → WHITENING ANIMATION`);
                            setupWhitening(mesh);
                        }
                        else if ((normalizedCondition.includes('stained teeth') || normalizedCondition.includes('stained')) &&
                                (normalizedTreatment.includes('whitening') || normalizedTreatment.includes('bleaching'))) {
                            console.log(`Condition: stained teeth, Treatment: whitening → WHITENING ANIMATION`);
                            setupWhitening(mesh);
                        }
                        else if ((normalizedCondition.includes('tooth decay') || normalizedCondition.includes('decay')) &&
                                (normalizedTreatment.includes('whitening') || normalizedTreatment.includes('bleaching'))) {
                            console.log(`Condition: tooth decay, Treatment: whitening → WHITENING ANIMATION`);
                            setupWhitening(mesh);
                        }
                        // Cleaning animation conditions
                        else if ((normalizedCondition.includes('tooth cavity') || normalizedCondition.includes('cavity')) &&
                                (normalizedTreatment.includes('cleaning') || normalizedTreatment.includes('clean') || normalizedTreatment.includes('cavity cleaning'))) {
                            console.log(`Condition: tooth cavity, Treatment: cleaning → CLEANING ANIMATION`);
                            setVisuals(mesh, COLOR_CAVITY);
                            setupCleaning(mesh);
                        }
                        else if ((normalizedCondition.includes('stained teeth') || normalizedCondition.includes('stained')) &&
                                (normalizedTreatment.includes('cleaning') || normalizedTreatment.includes('clean'))) {
                            console.log(`Condition: stained teeth, Treatment: cleaning → CLEANING ANIMATION`);
                            setVisuals(mesh, COLOR_STAINED_BASE);
                            setupCleaning(mesh);
                        }
                        else if ((normalizedCondition.includes('tooth decay') || normalizedCondition.includes('decay')) &&
                                (normalizedTreatment.includes('cleaning') || normalizedTreatment.includes('clean'))) {
                            console.log(`Condition: tooth decay, Treatment: cleaning → CLEANING ANIMATION`);
                            setVisuals(mesh, COLOR_DECAY);
                            setupCleaning(mesh);
                        }
                        // Apply Dental Braces animation
                        else if (normalizedTreatment.includes('apply dental braces')) {
                            // Check arch selection again to be absolutely sure
                            if ((isUpper && hasUpperSelected) || (isLower && hasLowerSelected)) {
                                console.log(`Treatment: apply dental braces → BRACES ANIMATION for ${toothNum}`);
                                setupBraces(mesh);
                            } else {
                                console.log(`Rejecting braces for ${toothNum} - Arch selection mismatch`);
                                clearBraceParts(mesh);
                                setVisuals(mesh, COLOR_DIM);
                            }
                        }
                        // Apply Retainers visual
                        else if (normalizedTreatment.includes('apply retainer') || normalizedTreatment.includes('orthodontic retainer')) {
                             // Check arch selection again to be absolutely sure
                             if ((isUpper && hasUpperSelected) || (isLower && hasLowerSelected)) {
                                console.log(`Treatment: apply retainer → RETAINER VISUAL for ${toothNum}`);
                                setupRetainers(mesh);
                            } else {
                                console.log(`Rejecting retainer for ${toothNum} - Arch selection mismatch`);
                                clearBraceParts(mesh);
                                setVisuals(mesh, COLOR_DIM);
                            }
                        }
                        else if (isToothSelected) {
                            // Only default to cleaning animation if the tooth is explicitly selected
                            console.log(`Default animation for selected: "${treatment}" → CLEANING ANIMATION`);
                            setupCleaning(mesh);
                        } else {
                            // SYNC: If tooth is part of a row treatment BUT not selected, 
                            // it should remain visible with its original color/texture, not DIMmed (black).
                            mesh.material.color.set(COLOR_DEFAULT);
                            mesh.material.emissive.setHex(0x000000);
                            mesh.material.emissiveIntensity = 0;
                            console.log(`Tooth ${toothNum} has rowTreatment - maintaining default material`);
                        }
                    } else {
                        // NO TREATMENT FOUND AT ALL - but it's in an active row. 
                        // Keep it looking normal.
                        mesh.material.color.set(COLOR_DEFAULT);
                        mesh.material.emissive.setHex(0x000000);
                        console.log(`📭 No treatment specified for tooth ${toothNum} in active row - showing default`);
                    }
                } else {
                    // Tooth is not selected AND not in an active row.
                    console.log(`Tooth ${toothNum} not highlighted/arch-active - dimming`);
                    setVisuals(mesh, hasSelectedRecord ? COLOR_DEFAULT : COLOR_DIM);
                }
            }
        });
    });

    console.log('=== ANIMATION COUNTS ===');
    console.log('Removal animations:', state.removalMeshes.length);
    console.log('Whitening animations:', state.whiteningMeshes.length);
    console.log('Cleaning animations:', state.cleaningMeshes.length);
    console.log('Pulsing meshes:', state.pulsingMeshes.length);

    }, [status, modelAssetTick, toothStates, selectedTeeth, viewMode, selectedRecord, timelineRecords, toothTreatments, defaultTreatment, defaultCondition, isToothMissing, timelineSelectedTooth]);

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
          ERROR: Could not load Teeth.obj. Check browser console for network or file errors.
        </div>
      )}
      <div style={{ width: '100%', height: '100%' }} ref={mountRef} />
    </div>
  );
}