import React from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import teethModelUrl from "../assets/source/Teeth.obj?url";
import teethTextureUrl from "../assets/textures/AlysonTeeth.png?url";

export default function TeethModelViewer({ className = "", selectedTeeth = [] }) {
  const mountRef = React.useRef(null);
  const [status, setStatus] = React.useState("loading");
  const toothMeshMapRef = React.useRef({}); // { toothId: THREE.Mesh[] }

  React.useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode) return undefined;

    const sizes = {
      width: mountNode.clientWidth || 640,
      height: mountNode.clientHeight || 360,
    };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712);

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
    const texture = textureLoader.load(teethTextureUrl);

    let model = null;
    let resizeObserver = null;
    let windowResizeHandler = null;

    loader.load(
      teethModelUrl,
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

            // Collect all meshes so we can highlight the whole model
            toothMeshMap.all.push(child);
          }
        });
        toothMeshMapRef.current = toothMeshMap;
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

  // Update highlighting whenever selected teeth change
  React.useEffect(() => {
    const map = toothMeshMapRef.current;
    if (!map || !map.all || map.all.length === 0) return;

    const isAnySelected = selectedTeeth.length > 0;
    map.all.forEach((mesh) => {
      if (!mesh.material) return;
      mesh.material.emissive = new THREE.Color(isAnySelected ? 0x2b6cb0 : 0x000000);
      mesh.material.emissiveIntensity = isAnySelected ? 0.7 : 0.0;
    });
  }, [selectedTeeth]);

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

