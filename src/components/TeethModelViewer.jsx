import React from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

// Paths to external assets
const TEETH_MODEL_PATH = "/models/Teeth.obj"; 
const TEETH_TEXTURE_PATH = "/models/AlysonTeeth.png"; 

export default function TeethModelViewer({ 
  className = "", 
  selectedTeeth = [],
  toothStates = {} 
}) {
  const mountRef = React.useRef(null);
  const [status, setStatus] = React.useState("loading");
  const toothMeshMapRef = React.useRef({}); 
  const sceneRef = React.useRef(null);

  // --- COLORS ---
  const COLOR_DEFAULT = new THREE.Color(0xffffff);
  const COLOR_SELECTED_TREAT = new THREE.Color(0x2452a2); // Blue
  const COLOR_ISSUE = new THREE.Color(0xd23c3c); // Red
  const COLOR_TREATED = new THREE.Color(0xd2f5e4); // Green

  // --- HELPER: Create Fallback Geometry if OBJ missing ---
  const createFallbackModel = () => {
      const group = new THREE.Group();
      const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
      const geometry = new THREE.BoxGeometry(2.5, 3.5, 2.5); // Simple block tooth

      const addTooth = (id, x, y, z, rotY) => {
          const mesh = new THREE.Mesh(geometry, material.clone());
          mesh.name = `Tooth_${id}`; 
          mesh.position.set(x, y, z);
          mesh.rotation.y = rotY;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          group.add(mesh);
      };

      const quadrants = [
          { start: 11, dir: 1, y: 2.5, xMod: -1 }, 
          { start: 21, dir: 1, y: 2.5, xMod: 1 },  
          { start: 41, dir: 1, y: -2.5, xMod: -1 },
          { start: 31, dir: 1, y: -2.5, xMod: 1 }, 
      ];

      quadrants.forEach(q => {
          for(let i=0; i<8; i++) {
              const toothNum = q.start + (i * q.dir); 
              const offset = 1.5 + (i * 2.8); 
              const curvature = (i * i) * 0.15; 
              
              const x = offset * q.xMod;
              const z = curvature;
              const rot = i * 0.15 * -q.xMod; 

              addTooth(toothNum, x, q.y, z, rot);
          }
      });

      return group;
  };

  React.useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode) return undefined;
    
    let isMounted = true;

    // 1. Scene Setup
    const width = mountNode.clientWidth || 640;
    const height = mountNode.clientHeight || 360;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e121b); 
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    // Initial position (will be updated by loader)
    camera.position.set(0, 0, 50); 

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    mountNode.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 50, 50);
    scene.add(dirLight);

    const loader = new OBJLoader();
    const textureLoader = new THREE.TextureLoader();
    
    // Attempt texture load (non-critical)
    const texture = textureLoader.load(TEETH_TEXTURE_PATH, undefined, undefined, () => {});

    // Common function to process the loaded/generated object
    const processModel = (object, isFallback = false) => {
        if (!isMounted) return;

        const toothMeshMap = { all: [] };
        
        object.traverse((child) => {
          if (child.isMesh) {
            if (!isFallback) {
                child.material = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    map: texture,
                    roughness: 0.5,
                    metalness: 0.1,
                });
            }
            
            const name = (child.name || "").toLowerCase();
            const match = name.match(/(?:tooth[_-]?|^)(\d{2})/);
            
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

        // Auto Scale & Center
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        object.position.sub(center); // Center at 0,0,0
        
        // --- ZOOM FIX HERE ---
        // Calculate optimal camera distance
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        
        // Use a smaller multiplier (e.g., 0.8 or 1.0) to zoom in closer. 
        // Previously it might have been 1.5 or 2.0.
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.2; // 1.2 provides a nice fit without cutting off edges

        camera.position.set(0, 0, cameraZ);
        camera.updateProjectionMatrix();
        
        // Update controls to orbit around center properly
        controls.target.set(0, 0, 0);
        controls.update();
        
        scene.add(object);
        setStatus("ready");
    };

    // Attempt to load OBJ
    loader.load(
        TEETH_MODEL_PATH,
        (obj) => { processModel(obj, false); },
        undefined,
        (err) => {
            console.warn("OBJ Load failed, using fallback geometry.", err);
            const fallbackObj = createFallbackModel();
            processModel(fallbackObj, true);
        }
    );

    // Animation Loop
    let frameId;
    const animate = () => {
        frameId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
        if(!mountNode) return;
        const w = mountNode.clientWidth;
        const h = mountNode.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    };
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

  // --- COLOR UPDATER ---
  React.useEffect(() => {
    if (status !== 'ready') return;
    const map = toothMeshMapRef.current;

    const getMeshes = (id) => map[String(id)] || [];

    // 1. Reset All
    Object.values(map).flat().forEach(mesh => {
        mesh.visible = true;
        mesh.material.color.set(COLOR_DEFAULT);
        mesh.material.emissive.setHex(0x000000);
    });

    // 2. Apply States
    Object.entries(toothStates).forEach(([id, state]) => {
        getMeshes(id).forEach(mesh => {
            if (state === 'missing') {
                mesh.visible = false; 
            } else if (state === 'issue') {
                mesh.material.color.set(COLOR_ISSUE);
                mesh.material.emissive.set(COLOR_ISSUE);
                mesh.material.emissiveIntensity = 0.3;
            } else if (state === 'treated') {
                mesh.material.color.set(COLOR_TREATED);
            }
        });
    });

    // 3. Apply Selection
    selectedTeeth.forEach(id => {
        getMeshes(id).forEach(mesh => {
            mesh.visible = true; 
            mesh.material.color.set(COLOR_SELECTED_TREAT);
            mesh.material.emissive.set(COLOR_SELECTED_TREAT);
            mesh.material.emissiveIntensity = 0.4;
        });
    });

  }, [selectedTeeth, toothStates, status]);

  return (
    <div className={`teeth-viewer ${className}`} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {status === "loading" && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', background: 'rgba(0,0,0,0.5)' }}>
          Loading Model...
        </div>
      )}
      <div style={{ width: '100%', height: '100%' }} ref={mountRef} />
    </div>
  );
}