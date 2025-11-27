import React from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

// 🛑 REMOVE the previous import statements that used "?url"
// import teethModelUrl from "../assets/source/Teeth.obj?url";
// import teethTextureUrl from "../assets/textures/AlysonTeeth.png?url";

// ✅ Use hardcoded paths that point to the public directory
// ASSUMPTION: You move the files to 'public/models/'
const TEETH_MODEL_PATH = "/models/Teeth.obj";
const TEETH_TEXTURE_PATH = "/models/AlysonTeeth.png"; 

export default function TeethModelViewer({ 
  className = "", 
  selectedTeeth = [],
  shadedTeeth = [],
  shadedStatus = {}
}) {
  const mountRef = React.useRef(null);
  const [status, setStatus] = React.useState("loading");
  const toothMeshMapRef = React.useRef({}); // { toothId: THREE.Mesh[] }
  const sceneRef = React.useRef(null);

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
    
    // ✅ Use the public path for the texture
    const texture = textureLoader.load(TEETH_TEXTURE_PATH); 

    let model = null;
    let resizeObserver = null;
    let windowResizeHandler = null;

    loader.load(
      // ✅ Use the public path for the model
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

            // Try to detect tooth id from mesh name (many OBJ exports include part names)
            // Accept patterns like 'tooth_11', 'tooth11', '11', 'Tooth.11', etc.
            const name = (child.name || "").toLowerCase();
            const match = name.match(/(tooth[_-]?|\b)(\d{2,3})\b/);
            if (match && match[2]) {
              const id = match[2];
              if (!toothMeshMap[id]) toothMeshMap[id] = [];
              toothMeshMap[id].push(child);
              console.log("Found mesh with tooth ID:", id, "from name:", child.name);
            } else {
              // If no tooth id found, add to 'all' fallback
              toothMeshMap.all.push(child);
              console.log("No tooth ID detected from mesh name:", child.name);
            }
          }
        });
        toothMeshMapRef.current = toothMeshMap;
        console.log("Tooth mesh map:", toothMeshMap);
        const boundingBox = new THREE.Box3().setFromObject(object);
        const center = boundingBox.getCenter(new THREE.Vector3());
        const size = boundingBox.getSize(new THREE.Vector3());
        const maxAxis = Math.max(size.x, size.y, size.z) || 1;

        // First, scale model so it has a reasonable size in our world
        const desiredSize = 40; // world units
        const scaleFactor = desiredSize / maxAxis;
        object.scale.setScalar(scaleFactor);

        // Recompute bounds after scaling
        const scaledBox = new THREE.Box3().setFromObject(object);
        const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
        const sphere = scaledBox.getBoundingSphere(new THREE.Sphere());

        // Center model at origin
        object.position.sub(scaledCenter);

        // Position camera so the whole model fits in view
        const radius = sphere.radius || desiredSize / 2;
        const fov = THREE.MathUtils.degToRad(camera.fov);
        const distance = radius / Math.sin(fov / 2);
        camera.position.set(0, 0, distance * 1.2);
        camera.near = Math.max(distance / 100, 0.1);
        camera.far = distance * 10;
        camera.updateProjectionMatrix();

        // Configure zoom limits around this distance
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
        // eslint-disable-next-line no-console
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
    if (!map || Object.keys(map).length === 0) {
      console.warn("toothMeshMap is empty");
      return;
    }

    console.log("Updating shading. selectedTeeth:", selectedTeeth, "shadedTeeth:", shadedTeeth, "shadedStatus:", shadedStatus, "map keys:", Object.keys(map));

    // Check if we collected any meshes
    const allMeshes = [];
    Object.keys(map).forEach((key) => {
      if (Array.isArray(map[key])) {
        allMeshes.push(...map[key]);
      }
    });
    
    if (allMeshes.length === 0) {
      console.warn("No meshes found in toothMeshMap");
      return;
    }

    // If we have per-tooth meshes, shade only those corresponding to selectedTeeth.
    const hasPerTooth = Object.keys(map).some((k) => k !== "all" && Array.isArray(map[k]) && map[k].length > 0);
    if (hasPerTooth) {
      // Reset all materials first
      Object.keys(map).forEach((key) => {
        if (Array.isArray(map[key])) {
          map[key].forEach((mesh) => {
            if (!mesh.material) return;
            mesh.material.color = new THREE.Color(0xffffff);
            mesh.material.emissive = new THREE.Color(0x000000);
            mesh.material.emissiveIntensity = 0;
          });
        }
      });
      
      // Apply colors based on shaded status first (treatment record)
      shadedTeeth.forEach((t) => {
        const id = String(t);
        // Try both the tooth ID and zero-padded versions (54, 054, etc.)
        const possibleIds = [id, id.padStart(3, '0'), id.padStart(2, '0')];
        let found = false;
        
        for (const checkId of possibleIds) {
          if (map[checkId] && Array.isArray(map[checkId])) {
            console.log("Found shaded tooth", t, "as ID:", checkId, "with", map[checkId].length, "meshes");
            const treatmentStatus = shadedStatus[t];
            // Green for done treatments, orange for ongoing
            const color = treatmentStatus === 'done' ? 0x4caf50 : 0xff9800;
            map[checkId].forEach((mesh) => {
              if (!mesh.material) return;
              mesh.material.color = new THREE.Color(color);
              mesh.material.emissive = new THREE.Color(color);
              mesh.material.emissiveIntensity = 0.2;
            });
            found = true;
            break;
          }
        }
        
        if (!found) {
          console.log("Shaded tooth ID", id, "NOT found in map. Tried:", possibleIds, "Available keys:", Object.keys(map));
        }
      });
      
      // Then apply red color to selected teeth (overrides shaded status for visual priority)
      selectedTeeth.forEach((t) => {
        const id = String(t);
        // Try both the tooth ID and zero-padded versions (54, 054, etc.)
        const possibleIds = [id, id.padStart(3, '0'), id.padStart(2, '0')];
        let found = false;
        
        for (const checkId of possibleIds) {
          if (map[checkId] && Array.isArray(map[checkId])) {
            console.log("Found selected tooth", t, "as ID:", checkId, "with", map[checkId].length, "meshes");
            map[checkId].forEach((mesh) => {
              if (!mesh.material) return;
              mesh.material.color = new THREE.Color(0xff4d4d);
              mesh.material.emissive = new THREE.Color(0xff4d4d);
              mesh.material.emissiveIntensity = 0.3;
            });
            found = true;
            break;
          }
        }
        
        if (!found) {
          console.log("Selected tooth ID", id, "NOT found in map. Tried:", possibleIds);
        }
      });
    } else {
      // Fallback: shade the whole model when any selection exists
      const hasSelected = selectedTeeth.length > 0;
      const hasShaded = shadedTeeth.length > 0;
      if (map.all && Array.isArray(map.all)) {
        map.all.forEach((mesh) => {
          if (!mesh.material) return;
          let color, emissive, intensity;
          
          if (hasSelected) {
            color = 0xff4d4d;
            emissive = 0xff4d4d;
            intensity = 0.3;
          } else if (hasShaded) {
            // Use first shaded tooth status for whole model
            const firstTeethStatus = shadedStatus[shadedTeeth[0]];
            color = firstTeethStatus === 'done' ? 0x4caf50 : 0xff9800;
            emissive = color;
            intensity = 0.2;
          } else {
            color = 0xffffff;
            emissive = 0x000000;
            intensity = 0.0;
          }
          
          mesh.material.color = new THREE.Color(color);
          mesh.material.emissive = new THREE.Color(emissive);
          mesh.material.emissiveIntensity = intensity;
        });
      }
    }
  }, [selectedTeeth, shadedTeeth, shadedStatus, status]);

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