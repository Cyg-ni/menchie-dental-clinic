// TeethModelViewer.jsx (Complete Code)
import React from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

// ASSUMPTION: You move the files to 'public/models/'
const TEETH_MODEL_PATH = "/models/Teeth.obj";
const TEETH_TEXTURE_PATH = "/models/AlysonTeeth.png"; 

export default function TeethModelViewer({ 
  className = "", 
  selectedTeeth = [],
  toothStates = {} // Use toothStates map 
}) {
  const mountRef = React.useRef(null);
  const [status, setStatus] = React.useState("loading");
  const toothMeshMapRef = React.useRef({}); // { toothId: THREE.Mesh[] }
  const sceneRef = React.useRef(null);

  // Define Colors for 3D rendering
  const COLOR_DEFAULT = new THREE.Color(0xffffff);
  const COLOR_SELECTED_TREAT = new THREE.Color(0x2452a2); // Dark Blue for Selected/Treatment
  const COLOR_ISSUE = new THREE.Color(0xd23c3c); // Red for Issue/Problem
  const COLOR_TREATED = new THREE.Color(0xd2f5e4); // Soft treated color

  React.useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode) return undefined;

    const sizes = {
      width: mountNode.clientWidth || 640,
      height: mountNode.clientHeight || 360,
    };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(sizes.width, sizes.height);
    mountNode.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableZoom = true;
    controls.zoomSpeed = 1.2;
    controls.rotateSpeed = 0.9;

    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(80, 120, 60);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xb5c7ff, 0.6);
    fillLight.position.set(-60, 80, -40);
    scene.add(fillLight);

    const loader = new OBJLoader();
    const textureLoader = new THREE.TextureLoader();
    
    const texture = textureLoader.load(TEETH_TEXTURE_PATH); 

    let model = null;
    let resizeObserver = null;
    let windowResizeHandler = null;

    loader.load(
      TEETH_MODEL_PATH, 
      (object) => {
        const toothMeshMap = { all: [] };
        object.traverse((child) => {
          if (child.isMesh) {
            const baseMaterial = new THREE.MeshStandardMaterial({
              color: 0xffffff,
              map: texture,
              roughness: 0.5,
              metalness: 0.05,
            });
            child.material = baseMaterial;
            child.castShadow = true;
            child.receiveShadow = true;

            const name = (child.name || "").toLowerCase();
            const match = name.match(/(tooth[_-]?|\b)(\d{2,3})\b/);
            if (match && match[2]) {
              const id = match[2];
              if (!toothMeshMap[id]) toothMeshMap[id] = [];
              toothMeshMap[id].push(child);
            } else {
              toothMeshMap.all.push(child);
            }
          }
        });
        toothMeshMapRef.current = toothMeshMap;
        
        const boundingBox = new THREE.Box3().setFromObject(object);
        const center = boundingBox.getCenter(new THREE.Vector3());
        const size = boundingBox.getSize(new THREE.Vector3());
        const maxAxis = Math.max(size.x, size.y, size.z) || 1;

        const desiredSize = 40; 
        const scaleFactor = desiredSize / maxAxis;
        object.scale.setScalar(scaleFactor);

        const scaledBox = new THREE.Box3().setFromObject(object);
        const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
        const sphere = scaledBox.getBoundingSphere(new THREE.Sphere());

        object.position.sub(scaledCenter);

        const radius = sphere.radius || desiredSize / 2;
        const fov = THREE.MathUtils.degToRad(camera.fov);
        const distance = radius / Math.sin(fov / 2);
        camera.position.set(0, 0, distance * 1.2);
        camera.near = Math.max(distance / 100, 0.1);
        camera.far = distance * 10;
        camera.updateProjectionMatrix();

        controls.minDistance = distance * 0.4;
        controls.maxDistance = distance * 3;

        model = object;
        scene.add(object);
        controls.target.set(0, 0, 0);
        controls.update();
        setStatus("ready");
      },
      undefined,
      (error) => {
        console.error("Failed to load teeth OBJ model:", error);
        setStatus("error");
      },
    );

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver((entries) => {
        const { contentRect } = entries[0];
        const width = contentRect.width || sizes.width;
        const height = contentRect.height || sizes.height;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      });
      resizeObserver.observe(mountNode);
    } else {
      windowResizeHandler = () => {
        const width = mountNode.clientWidth || sizes.width;
        const height = mountNode.clientHeight || sizes.height;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };
      window.addEventListener("resize", windowResizeHandler);
    }

    let animationFrameId = null;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (windowResizeHandler) {
        window.removeEventListener("resize", windowResizeHandler);
      }
      controls.dispose();
      renderer.dispose();
      mountNode.replaceChildren();
    };
  }, []);

  // Update highlighting whenever selected teeth or shaded teeth change
  React.useEffect(() => {
    const map = toothMeshMapRef.current;
    if (!map || Object.keys(map).length === 0 || status !== 'ready') {
      return;
    }

    // Function to safely iterate meshes for a given tooth ID
    const processMeshes = (id, callback) => {
        const possibleIds = [String(id), String(id).padStart(3, '0'), String(id).padStart(2, '0')];
        for (const checkId of possibleIds) {
            if (map[checkId] && Array.isArray(map[checkId])) {
                map[checkId].forEach(callback);
                return true;
            }
        }
        return false;
    };
    
    // 1. Reset all teeth materials (visibility true, default color)
    Object.keys(map).forEach((key) => {
        if (Array.isArray(map[key])) {
            map[key].forEach((mesh) => {
                if (!mesh.material) return;
                mesh.visible = true; // Default visible
                mesh.material.color = COLOR_DEFAULT;
                mesh.material.emissive = new THREE.Color(0x000000);
                mesh.material.emissiveIntensity = 0;
            });
        }
    });

    // 2. Apply permanent states (Missing / Issue / Treated)
    Object.entries(toothStates).forEach(([toothIdStr, state]) => {
        const toothId = Number(toothIdStr);
        
        processMeshes(toothId, (mesh) => {
            if (state === 'missing') {
                mesh.visible = false; // Hide the mesh
            } else if (state === 'issue') {
                mesh.material.color = COLOR_ISSUE; // Red
                mesh.material.emissive = COLOR_ISSUE;
                mesh.material.emissiveIntensity = 0.2;
            } else if (state === 'treated') {
                // Use a soft green/white for treated teeth
                mesh.material.color = COLOR_TREATED;
                mesh.material.emissive = new THREE.Color(0xaaaaaa);
                mesh.material.emissiveIntensity = 0.1;
            }
        });
    });

    // 3. Apply temporary selection/treatment status (Blue)
    selectedTeeth.forEach((t) => {
        processMeshes(t, (mesh) => {
            // Apply blue coloring (overrides previous colors)
            mesh.material.color = COLOR_SELECTED_TREAT;
            mesh.material.emissive = COLOR_SELECTED_TREAT;
            mesh.material.emissiveIntensity = 0.4;
        });
    });

  }, [selectedTeeth, toothStates, status]);

  return (
    <div className={`teeth-viewer ${className}`.trim()}>
      {status !== "ready" && (
        <div className={`teeth-viewer-overlay ${status}`}>
          {status === "loading" ? "Loading 3D model…" : "Unable to load model"}
        </div>
      )}
      <div className="teeth-viewer-canvas" ref={mountRef} />
    </div>
  );
}